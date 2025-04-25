import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Modal, Select, message, Card } from 'antd';
import axios from 'axios';
import API from '../config/api';
import dayjs from 'dayjs';
import { useLocation, useNavigate } from 'react-router-dom';

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

interface Visit {
  visit_id: string;
  date: string;
  time: string;
  visit_type: string;
  complaint: string;
  diagnosis: string;
  receipts: Receipt[];
  _id?: string;
}

interface Patient {
  _id?: string;
  patient_id?: string;
  id?: string;
  patient_name: string;
  patient_phone: string;
  visit_type?: string;
  age: string;
  address: string;
  visits?: Visit[];
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
  const [todayVisit, setTodayVisit] = useState<Visit | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const doctorId = localStorage.getItem('doctorId');

  // Extract patient ID from the URL path
  const getPatientIdFromUrl = (): string | null => {
    const pathParts = location.pathname.split('/');
    const patientIndex = pathParts.findIndex(part => part === 'patient');
    
    if (patientIndex !== -1 && patientIndex < pathParts.length - 1) {
      return pathParts[patientIndex + 1];
    }
    
    return null;
  };

  // Check if the patient has a visit today
  useEffect(() => {
    if (visible && patient && patient.visits && patient.visits.length > 0) {
      const today = dayjs().format('YYYY-MM-DD');
      
      // Find today's visit
      const visitToday = patient.visits.find(visit => {
        // Handle different date formats
        const visitDate = dayjs(visit.date).format('YYYY-MM-DD');
        return visitDate === today;
      });
      
      if (visitToday) {
        setTodayVisit(visitToday);
        console.log('Found existing visit for today:', visitToday);
      } else {
        setTodayVisit(null);
        console.log('No visit found for today, will create a new one.');
      }
    } else {
      setTodayVisit(null);
    }
  }, [visible, patient]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setDrugModel('new');
      
      console.log('Modal opened with patient:', patient);
      console.log('Current pathname:', location.pathname);
      console.log('Extracted patient ID from URL:', getPatientIdFromUrl());
    }
  }, [visible, form, patient, location]);

  const handleSubmit = async (values: any) => {
    // First priority: Get patient ID from URL
    const patientIdFromUrl = getPatientIdFromUrl();
    
    // Second priority: Get from patient object if available
    const patientIdFromObject = patient ? (patient.patient_id || patient._id || patient.id) : null;
    
    // Use URL ID first, then fall back to object ID
    const patientId = patientIdFromUrl || patientIdFromObject;
    
    console.log('Using patient ID:', patientId);
    
    if (!patientId) {
      message.error('Could not determine patient ID');
      return;
    }

    if (!doctorId) {
      message.error('Doctor ID not found. Please log in again.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get drugs from form
      const drugs = values.drugs.map((drug: any) => ({
        drug: drug.drug,
        frequency: drug.frequency,
        period: drug.period,
        timing: drug.timing
      }));

      // Common drug data
      const drugData = {
        drugs,
        notes: values.notes || "",
        complaint: values.complaint || "",
        diagnosis: values.diagnosis || ""
      };

      let response;

      // AUTOMATIC DECISION: If there's a visit today, add to it. Otherwise, create new visit.
      if (todayVisit) {
        // Add receipt to today's visit
        console.log('Adding receipt to today\'s visit:', todayVisit.visit_id);
        
        response = await axios.put(
          `${API.BASE_URL}/api/patients/${patientId}/doctor/${doctorId}/visits/${todayVisit.visit_id}`,
          drugData,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('Receipt added to today\'s visit:', response.data);
        message.success('تمت إضافة الروشتة بنجاح لزيارة اليوم');
      } else {
        // Create a new visit
        const visitData = {
          patient_id: patientId,
          doctor_id: doctorId,
          visit_type: "كشف", // Default visit type
          ...drugData
        };

        console.log('Creating new visit with data:', visitData);
        
        response = await axios.post(
          `${API.BASE_URL}/api/patients/visits`,
          visitData,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('New visit created successfully:', response.data);
        message.success('تم إنشاء زيارة جديدة بنجاح');
      }
      
      form.resetFields();
      
      // First close the modal to keep the UI responsive
      onCancel();

      // Make data refresh asynchronous
      setTimeout(async () => {
        try {
          // Call onReceiptAdded which will trigger fetchPatients in the parent
          onReceiptAdded();

          // Give a slight delay to let the first refresh complete
          await new Promise(resolve => setTimeout(resolve, 500));

          // Force a second refresh
          await handleForceRefresh(patientId);

          // Re-navigate to refresh the UI
          if (location.pathname.includes('/patient/')) {
            const currentPath = location.pathname;
            navigate('/dashboard', { replace: true });
            setTimeout(() => {
              navigate(currentPath, { replace: true });
            }, 50);
          }
        } catch (err) {
          console.error('Error during refresh:', err);
        }
      }, 100);
      
    } catch (error: any) {
      console.error('Error creating/updating visit:', error);
      
      if (error.response) {
        console.error('Response error:', error.response.data);
        message.error(`فشل إضافة الروشتة: ${error.response.data.message || error.response.status}`);
      } else if (error.request) {
        message.error('فشل إضافة الروشتة: لا يوجد استجابة من الخادم');
      } else {
        message.error(`فشل إضافة الروشتة: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to force refresh patient data from the backend
  const handleForceRefresh = async (patientId: string) => {
    try {
      console.log('Force refreshing patient data for ID:', patientId);
      
      // Fetch the patient data directly
      const response = await axios.get(
        `${API.BASE_URL}/api/patients/${patientId}/doctor/${doctorId}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Refreshed patient data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error refreshing patient data:', error);
      return null;
    }
  };

  // Handle template selection
  const handleTemplateChange = (value: string) => {
    setDrugModel(value);
  };

  // Display patient info and visit status
  const displayPatientInfo = () => {
    if (patient) {
      return (
        <div>
          <strong>المريض:</strong> {patient.patient_name || 'Unknown'}
          {patient.patient_id && <div><small>رقم المريض: {patient.patient_id}</small></div>}
          
          {/* Show visit status message */}
          <div style={{ marginTop: '10px', color: todayVisit ? 'green' : 'blue' }}>
            {todayVisit ? 
              `سيتم إضافة الروشتة لزيارة اليوم (${dayjs(todayVisit.date).format('YYYY-MM-DD')})` : 
              'سيتم إنشاء زيارة جديدة لليوم الحالي'}
          </div>
        </div>
      );
    } else {
      const urlId = getPatientIdFromUrl();
      return (
        <div>
          <strong>المريض:</strong> ID: {urlId || 'Unknown'}
        </div>
      );
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
          drugs: [{}]
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          {displayPatientInfo()}
        </div>
        
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

        {/* Clinical Details */}
        <Card 
          title="تفاصيل الزيارة" 
          bordered={true} 
          style={{ marginBottom: '16px' }}
        >
          <Form.Item
            name="complaint"
            label="الشكوى"
          >
            <TextArea 
              placeholder="شكوى المريض" 
              rows={2} 
            />
          </Form.Item>
          <Form.Item
            name="diagnosis"
            label="التشخيص"
          >
            <TextArea 
              placeholder="تشخيص الطبيب" 
              rows={2} 
            />
          </Form.Item>
        </Card>

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
            {todayVisit ? 'إضافة روشتة لزيارة اليوم' : 'إنشاء زيارة جديدة مع روشتة'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ReceiptModal;