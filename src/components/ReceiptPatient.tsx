import React, { useState } from 'react';
import { Form, Input, Button, Modal, Select, message, Card, AutoComplete, Tag } from 'antd';
import axios from 'axios';
import API from '../config/api';
import dayjs from 'dayjs';
import { sendReceiptNotificationToPatient } from '../services/notificationService';
import { useDoctorContext } from './DoctorContext';
import { useClinicContext } from './ClinicContext';
import { useInventoryContext } from './InventoryContext';
import { useLanguage } from './LanguageContext';
import { useDoctorSuggestions } from '../hooks/useDoctorSuggestions';

const { Option } = Select;
const { TextArea } = Input;

interface InventoryUsageItem {
  inventory_id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface Drug {
  drug: string;
  frequency: string;
  period: string;
  timing: string;
}

interface Receipt {
  _id?: string;
  drugModel: string;
  drugs: Drug[];
  notes: string;
  date: string;
}

interface Patient {
  _id: string;
  patient_name: string;
  patient_phone: string;
  visit_type?: string;
  age: string;
  address: string;
  receipts?: Receipt[];
  [key: string]: any;
}

interface ReceiptModalProps {
  visible: boolean;
  onCancel: () => void;
  patient: Patient | null;
  onReceiptAdded: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({
  visible,
  onCancel,
  patient,
  onReceiptAdded
}) => {
  const { t, isRTL } = useLanguage();
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [, setDrugModel] = useState<string>('new');
  const doctorContext = useDoctorContext();
  const doctorId = doctorContext?.doctorId || localStorage.getItem('doctorId') || '';
  const { selectedClinicId } = useClinicContext();
  const { items: inventoryItems, recordUsage } = useInventoryContext();
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<InventoryUsageItem[]>([]);

  // Suggestions
  const { diagnoses, complaints, saveDiagnosis, saveDrug, saveComplaint, filterDiagnoses, filterDrugs } = useDoctorSuggestions(doctorId);
  const watchedDiagnosis = Form.useWatch('diagnosis', form) as string | undefined;

  const CHIP_LIMIT = 15;

  // Drug names tracked outside the form entirely — this is the source of truth
  const [drugInputs, setDrugInputs] = useState<Record<number, string>>({});

  const setDrugInput = (index: number, value: string) => {
    setDrugInputs(prev => ({ ...prev, [index]: value }));
    // Also sync to form so it gets submitted in the payload
    const drugs = form.getFieldValue('drugs') || [];
    drugs[index] = { ...drugs[index], drug: value };
    form.setFieldsValue({ drugs });
  };

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      form.resetFields();
      setDrugModel('new');
      setSelectedInventoryItems([]);
      setDrugInputs({});
    }
  }, [visible, form]);

  const handleSubmit = async (values: any) => {
    if (!patient) return;

    // Capture what to save BEFORE async
    const diagToSave = values.diagnosis?.trim() || '';
    const complaintToSave = values.complaint?.trim() || '';
    const drugNamesToSave = Object.values(drugInputs).filter((v): v is string => !!v?.trim());

    try {
      setIsLoading(true);

      const payload = {
        drugModel: values.drugModel || 'new',
        drugs: values.drugs || [],
        notes: values.notes || '',
        complaint: values.complaint || '',
        diagnosis: values.diagnosis || '',
        date: dayjs().format('YYYY-MM-DD')
      };

      const response = await axios.put(
        `${API.BASE_URL}${API.ENDPOINTS.PATIENT_BY_ID(patient._id)}`,
        payload
      );

      if (patient.patient_phone) {
        sendReceiptNotificationToPatient({
          patientPhone: patient.patient_phone,
          patientName: patient.patient_name || '',
          patientId: patient._id || patient.patient_id || '',
          clinicId: selectedClinicId || patient.clinic_id || '',
          doctorId: doctorId || patient.doctor_id || '',
          doctorName: patient.doctor_name || '',
          receiptId: response.data?.patient?.visits?.[response.data.patient.visits.length - 1]?.receipts?.[response.data.patient.visits[response.data.patient.visits.length - 1].receipts.length - 1]?._id || ''
        }).catch((notificationError: any) => {
          console.error('Error sending receipt notification:', notificationError);
        });
      }

      if (selectedInventoryItems.length > 0) {
        try {
          for (const item of selectedInventoryItems) {
            await recordUsage(
              item.inventory_id,
              patient._id,
              item.quantity,
              `Used during visit on ${dayjs().format('YYYY-MM-DD')}`
            );
          }
        } catch (inventoryError) {
          console.error('Error recording inventory usage:', inventoryError);
          message.warning(t('receiptSavedInventoryFailed'));
        }
      }

      message.success(t('receiptSavedSuccess'));

      // Save suggestions
      if (diagToSave) saveDiagnosis(diagToSave);
      if (complaintToSave) saveComplaint(complaintToSave);
      drugNamesToSave.forEach(name => saveDrug(name.trim()));

      form.resetFields();
      setDrugInputs({});
      onReceiptAdded();
    } catch (error) {
      console.error('Error adding receipt:', error);
      message.error(t('receiptSaveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateChange = (value: string) => {
    setDrugModel(value);

    if (value === 'existing' && patient?.receipts && patient.receipts.length > 0) {
      message.info('Template selection feature can be implemented here');
    }
  };

  const handleAddInventoryItem = () => {
    const newItem: InventoryUsageItem = {
      inventory_id: '',
      name: '',
      quantity: 1,
      unit: ''
    };
    setSelectedInventoryItems([...selectedInventoryItems, newItem]);
  };

  const handleRemoveInventoryItem = (index: number) => {
    const updated = selectedInventoryItems.filter((_, i) => i !== index);
    setSelectedInventoryItems(updated);
  };

  const handleInventoryItemChange = (index: number, field: string, value: any) => {
    const updated = [...selectedInventoryItems];
    if (field === 'inventory_id') {
      const selectedItem = inventoryItems.find(item => item._id === value);
      if (selectedItem) {
        updated[index] = {
          inventory_id: value,
          name: selectedItem.name,
          quantity: 1,
          unit: selectedItem.unit
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setSelectedInventoryItems(updated);
  };

  return (
    <Modal
      title={t('addPrescription')}
      open={visible}
      onCancel={onCancel}
      footer={null}
      style={{ direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}
      width={700}
      destroyOnClose={true}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          drugModel: 'new',
          drugs: [{}]
        }}
      >
        <Form.Item
          name="drugModel"
          label={t('prescriptionTemplate')}
          rules={[{ required: true, message: t('selectPrescriptionTemplateRequired') }]}
        >
          <Select
            placeholder={t('selectPrescriptionTemplatePlaceholder')}
            onChange={handleTemplateChange}
          >
            <Option value="new">{t('newPrescription')}</Option>
          </Select>
        </Form.Item>

        {/* Complaint Field */}
        <Form.Item label={t('complaint')}>
          <Form.Item
            name="complaint"
            noStyle
          >
            <TextArea
              placeholder={t('complaintPlaceholder')}
              rows={2}
            />
          </Form.Item>
          {complaints.slice(0, CHIP_LIMIT).length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {complaints.slice(0, CHIP_LIMIT).map((c) => (
                <Tag
                  key={c}
                  style={{ cursor: 'pointer', marginBottom: 0 }}
                  onClick={() => form.setFieldsValue({ complaint: c })}
                >
                  {c}
                </Tag>
              ))}
            </div>
          )}
        </Form.Item>

        {/* Diagnosis Field */}
        <Form.Item label={t('diagnosis')}>
          <Form.Item
            name="diagnosis"
            noStyle
          >
            <AutoComplete
              options={filterDiagnoses(watchedDiagnosis || '')}
              filterOption={false}
              placeholder={t('diagnosisPlaceholder')}
              style={{ width: '100%' }}
            />
          </Form.Item>
          {diagnoses.slice(0, CHIP_LIMIT).length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {diagnoses.slice(0, CHIP_LIMIT).map((d) => (
                <Tag
                  key={d}
                  style={{ cursor: 'pointer', marginBottom: 0 }}
                  onClick={() => form.setFieldsValue({ diagnosis: d })}
                >
                  {d}
                </Tag>
              ))}
            </div>
          )}
        </Form.Item>

        {/* Drug Details Section */}
        <Card
          title={t('drugDetails')}
          bordered={true}
          style={{ marginBottom: '16px' }}
        >
          <Form.List name="drugs">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{
                    display: 'flex',
                    marginBottom: '8px',
                    alignItems: 'center'
                  }}>
                    {/* Drug name — NOT using Form.Item for this field, managed via local state */}
                    <div style={{ flex: 2, marginLeft: '8px' }}>
                      <AutoComplete
                        value={drugInputs[name] ?? ''}
                        options={filterDrugs(drugInputs[name] || '')}
                        filterOption={false}
                        placeholder={t('drugNamePlaceholder')}
                        onChange={(val) => setDrugInput(name, val)}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <Form.Item
                      {...restField}
                      name={[name, 'frequency']}
                      style={{ flex: 1, marginLeft: '8px' }}
                    >
                      <Select placeholder={t('frequency')}>
                        <Option value="_">_</Option>
                        <Option value="مرة واحدة">{t('frequencyOnce')}</Option>
                        <Option value="مرتين">{t('frequencyTwice')}</Option>
                        <Option value="3 مرات">{t('frequency3Times')}</Option>
                        <Option value="4 مرات">{t('frequency4Times')}</Option>
                        <Option value="يومياً">{t('frequencyDaily')}</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'period']}
                      style={{ flex: 1, marginLeft: '8px' }}
                    >
                      <Select placeholder={t('period')}>
                        <Option value="يوميًا">{t('periodDaily')}</Option>
                        <Option value="1 يوم">{t('period1Day')}</Option>
                        <Option value="2 يوم">{t('period2Days')}</Option>
                        <Option value="3 يوم">{t('period3Days')}</Option>
                        <Option value="4 يوم">{t('period4Days')}</Option>
                        <Option value="5 يوم">{t('period5Days')}</Option>
                        <Option value="6 يوم">{t('period6Days')}</Option>
                        <Option value="أسبوع">{t('periodWeek')}</Option>
                        <Option value="أسبوعين">{t('period2Weeks')}</Option>
                        <Option value="3 اسابيع">{t('period3Weeks')}</Option>
                        <Option value="شهر">{t('periodMonth')}</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'timing']}
                      style={{ flex: 1, marginLeft: '8px' }}
                    >
                      <Select placeholder={t('timing')}>
                        <Option value="_">_</Option>
                        <Option value="قبل النوم">{t('timingBeforeSleep')}</Option>
                        <Option value="بعد الأكل">{t('timingAfterMeals')}</Option>
                        <Option value="قبل الأكل">{t('timingBeforeMeals')}</Option>
                      </Select>
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button
                        type="text"
                        danger
                        onClick={() => remove(name)}
                        style={{ marginRight: '8px' }}
                      >
                        {t('delete')}
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  style={{ marginTop: '8px' }}
                >
                  {t('addAnotherDrug')}
                </Button>
              </>
            )}
          </Form.List>
        </Card>

        {/* Inventory Items Used */}
        <Card
          title={t('suppliesUsed')}
          style={{ marginBottom: '16px' }}
          size="small"
        >
          {selectedInventoryItems.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <Select
                placeholder={t('selectSupplyPlaceholder')}
                style={{ flex: 2 }}
                value={item.inventory_id || undefined}
                onChange={(value) => handleInventoryItemChange(index, 'inventory_id', value)}
                showSearch
                optionFilterProp="children"
              >
                {inventoryItems.map(invItem => (
                  <Option key={invItem._id} value={invItem._id}>
                    {invItem.name} ({invItem.quantity} {invItem.unit})
                  </Option>
                ))}
              </Select>
              <Input
                type="number"
                placeholder={t('quantity')}
                style={{ width: '100px' }}
                min={1}
                value={item.quantity}
                onChange={(e) => handleInventoryItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
              />
              <span style={{ minWidth: '50px' }}>{item.unit || ''}</span>
              <Button
                type="text"
                danger
                onClick={() => handleRemoveInventoryItem(index)}
              >
                {t('delete')}
              </Button>
            </div>
          ))}
          <Button
            type="dashed"
            onClick={handleAddInventoryItem}
            block
            style={{ marginTop: '8px' }}
          >
            {t('addSupply')}
          </Button>
        </Card>

        {/* Additional Notes */}
        <Form.Item
          name="notes"
          label={t('additionalNotes')}
        >
          <TextArea
            placeholder={t('additionalNotesPlaceholder')}
            rows={3}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={isLoading}
          >
            {t('savePrescription')}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ReceiptModal;
