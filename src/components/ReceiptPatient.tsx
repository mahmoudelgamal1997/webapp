import React, { useState } from 'react';
import { Form, Input, Button, Modal, Select, message, Card } from 'antd';
import axios from 'axios';
import API from '../config/api';
import dayjs from 'dayjs';
import { sendReceiptNotificationToPatient } from '../services/notificationService';
import { useDoctorContext } from './DoctorContext';
import { useClinicContext } from './ClinicContext';

const { Option } = Select;
const { TextArea } = Input;

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
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [drugModel, setDrugModel] = useState<string>('new');
  const doctorContext = useDoctorContext();
  const doctorId = doctorContext?.doctorId || localStorage.getItem('doctorId') || '';
  const { selectedClinicId } = useClinicContext();

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      form.resetFields();
      setDrugModel('new');
    }
  }, [visible, form]);

  const handleSubmit = async (values: any) => {
    if (!patient) return;
    
    try {
      setIsLoading(true);

      // Prepare the payload for the backend - match the format that works in Postman
      const payload = {
        drugModel: values.drugModel || 'new',
        drugs: values.drugs || [],
        notes: values.notes || '',
        date: dayjs().format('YYYY-MM-DD')
      };

      // Send update to backend
     const response = await axios.put(
        `${API.BASE_URL}${API.ENDPOINTS.PATIENT_BY_ID(patient._id)}`, 
        payload
      );

      // Send notification to patient
      try {
        if (patient.patient_phone) {
          await sendReceiptNotificationToPatient({
            patientPhone: patient.patient_phone,
            patientName: patient.patient_name || '',
            patientId: patient._id || patient.patient_id || '',
            clinicId: selectedClinicId || patient.clinic_id || '',
            doctorId: doctorId || patient.doctor_id || '',
            doctorName: patient.doctor_name || '',
            receiptId: response.data?.patient?.visits?.[response.data.patient.visits.length - 1]?.receipts?.[response.data.patient.visits[response.data.patient.visits.length - 1].receipts.length - 1]?._id || ''
          });
          console.log('✅ Receipt notification sent to patient');
        }
      } catch (notificationError) {
        console.error('Error sending receipt notification:', notificationError);
        // Don't fail the whole operation if notification fails
      }

      message.success('Receipt added successfully');
      form.resetFields();
      onReceiptAdded();
    } catch (error) {
      console.error('Error adding receipt:', error);
      message.error('Failed to add receipt');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle template selection if you implement saved templates
  const handleTemplateChange = (value: string) => {
    setDrugModel(value);
    
    if (value === 'existing' && patient?.receipts && patient.receipts.length > 0) {
      // You could implement logic to select a previous receipt template
      // This is just a placeholder - you would need to implement template selection
      message.info('Template selection feature can be implemented here');
    }
  };

  return (
    <Modal
      title="إضافة روشتة"
      open={visible}
      onCancel={onCancel}
      footer={null}
      style={{ direction: 'rtl', textAlign: 'right' }}
      width={700}
      destroyOnClose={true}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          drugModel: 'new',
          drugs: [{}] // Start with one empty drug entry
        }}
      >
        <Form.Item
          name="drugModel"
          label="نموذج روشتة"
          rules={[{ required: true, message: 'الرجاء اختيار نموذج الروشتة' }]}
        >
          <Select 
            placeholder="اختر نموذج روشتة"
            onChange={handleTemplateChange}
          >
            <Option value="new">روشتة جديدة</Option>
          </Select>
        </Form.Item>

        {/* Drug Details Section */}
        <Card 
          title="تفاصيل الأدوية" 
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
                    <Form.Item
                      {...restField}
                      name={[name, 'drug']}
                      style={{ flex: 1, marginLeft: '8px' }}
                      rules={[{ required: true, message: 'الرجاء إدخال اسم الدواء' }]}
                    >
                      <Input placeholder="اسم الدواء" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'frequency']}
                      style={{ flex: 1, marginLeft: '8px' }}
                      rules={[{ required: true, message: 'الرجاء اختيار التكرار' }]}
                    >
                      <Select placeholder="التكرار">
                
                        <Option value="مرة">مرة</Option>
                        <Option value="مرتين">مرتين</Option>
                        <Option value="3 مرات">3 مرات</Option>
                        <Option value="يومياً">يومياً</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'period']}
                      style={{ flex: 1, marginLeft: '8px' }}
                      rules={[{ required: true, message: 'الرجاء اختيار المدة' }]}
                    >
                      <Select placeholder="المدة">
                      <Option value="يوميًا">يوميًا</Option>
                      <Option value="1 يوم">1 يوم</Option>
                      <Option value="2 يوم">2 يوم</Option>
                      <Option value="3 يوم">3 يوم</Option>
                      <Option value="4 يوم">4 يوم</Option>
                      <Option value="5 يوم">5 يوم</Option>
                      <Option value="6 يوم">6 يوم</Option>
                        <Option value="أسبوع">أسبوع</Option>
                        <Option value="أسبوعين">أسبوعين</Option>
                        <Option value="3 اسابيع">3 اسابيع</Option>
                        <Option value="شهر">شهر</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'timing']}
                      style={{ flex: 1, marginLeft: '8px' }}
                      rules={[{ required: true, message: 'الرجاء اختيار توقيت الدواء' }]}
                    >
                      <Select placeholder="توقيت الدواء">
                       <Option value="_">_</Option>
                        <Option value="قبل النوم">قبل النوم</Option>
                        <Option value="بعد الأكل">بعد الأكل</Option>
                        <Option value="قبل الأكل">قبل الأكل</Option>
                      </Select>
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button 
                        type="text" 
                        danger 
                        onClick={() => remove(name)}
                        style={{ marginRight: '8px' }}
                      >
                        حذف
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
                  إضافة دواء آخر
                </Button>
              </>
            )}
          </Form.List>
        </Card>

        {/* Additional Notes */}
        <Form.Item
          name="notes"
          label="ملاحظات إضافية"
        >
          <TextArea 
            placeholder="أي ملاحظات أو تعليمات إضافية" 
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
            حفظ الروشتة
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ReceiptModal;