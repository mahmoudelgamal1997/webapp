import React, { useState } from 'react';
import { Card, Typography, Divider, Space, Select, Button } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const ReceiptPreview = () => {
  // Sample data - in a real implementation, this would come from props or context
  const [selectedClinicIndex, setSelectedClinicIndex] = useState(0);
  
  const doctorInfo = {
    doctorName: "د. ضياء منير عجلان",
    doctorTitle: "أستاذ ورئيس أقسام",
    doctorSpecialty: "أمراض النساء والتوليد والعقم",
    doctorFaculty: "كلية طب طنطا",
    receiptHeader: "",
    receiptFooter: "",
    clinics: [
      { name: "السنطة عمارة معمل البرج", address: "شارع الجلاء", phone: "01210101010" },
      { name: "طنطا - العيادة الرئيسية", address: "شارع البحر", phone: "01098765432" }
    ]
  };
  
  const patient = {
    patient_name: "يوسف",
    age: "25",
    patient_id: "123456"
  };
  
  const receipt = {
    date: new Date().toISOString(),
    drugs: [
      { drug: "كونجسال", frequency: "3 مرات", period: "أسبوع", timing: "بعد الأكل" },
      { drug: "Sterimate NDL", frequency: "مرتين", period: "5 أيام", timing: "قبل النوم" }
    ],
    notes: "تناول الدواء بانتظام وشرب الكثير من الماء"
  };
  
  const selectedClinic = doctorInfo.clinics[selectedClinicIndex];
  
const handleClinicChange = (index: string | number) => {
  setSelectedClinicIndex(Number(index));
};
  
  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>معاينة الروشتة</span>
          <Space>
            <Select 
              value={selectedClinicIndex.toString()} 
              onChange={handleClinicChange}
              style={{ width: 200 }}
            >
              {doctorInfo.clinics.map((clinic, index) => (
                <Option key={index} value={index.toString()}>{clinic.name}</Option>
              ))}
            </Select>
            <Button type="primary" icon={<PrinterOutlined size={16} />}>
              طباعة
            </Button>
          </Space>
        </div>
      }
      bordered
    >
      <div style={{ 
        fontFamily: 'Arial, sans-serif', 
        direction: 'rtl', 
        padding: '20px',
        maxWidth: '800px',
        margin: '0 auto',
        border: '1px solid #eee',
        borderRadius: '8px',
        background: '#fff'
      }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '15px' }}>
          <Title level={3} style={{ margin: '5px 0', color: '#1890ff' }}>{doctorInfo.doctorName}</Title>
          <Title level={4} style={{ margin: '5px 0' }}>{doctorInfo.doctorTitle}</Title>
          <Text strong style={{ display: 'block', fontSize: '16px' }}>{doctorInfo.doctorSpecialty}</Text>
          <Text style={{ display: 'block', fontSize: '14px' }}>{doctorInfo.doctorFaculty}</Text>
        </div>
        
        {/* Patient Information */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '10px', 
          backgroundColor: '#f8f8f8', 
          borderRadius: '5px'
        }}>
          <Space direction="horizontal" size="large" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text strong>اسم المريض: {patient.patient_name}</Text>
            <Text strong>العمر: {patient.age}</Text>
            <Text strong>تاريخ: {moment().format('YYYY-MM-DD')}</Text>
          </Space>
        </div>
        
        {/* Medications */}
        <div style={{ marginBottom: '20px' }}>
          <Title level={4}>الأدوية:</Title>
          {receipt.drugs.map((med, index) => (
            <div key={index} style={{ 
              marginBottom: '15px', 
              padding: '10px', 
              border: '1px solid #eee', 
              borderRadius: '5px'
            }}>
              <Text strong style={{ fontSize: '16px' }}>{index + 1}. {med.drug}</Text>
              <div style={{ marginTop: '5px' }}>
                <Text>التكرار: {med.frequency} | المدة: {med.period} | التوقيت: {med.timing}</Text>
              </div>
            </div>
          ))}
        </div>
        
        {/* Notes */}
        {receipt.notes && (
          <div style={{ 
            marginBottom: '20px', 
            padding: '10px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '5px'
          }}>
            <Title level={4}>ملاحظات:</Title>
            <Text>{receipt.notes}</Text>
          </div>
        )}
        
        {/* Footer with location and contact */}
        <Divider />
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Text strong style={{ display: 'block', fontSize: '16px' }}>{selectedClinic.name}</Text>
          <Text style={{ display: 'block' }}>{selectedClinic.address}</Text>
          <Text style={{ display: 'block' }}>هاتف: {selectedClinic.phone}</Text>
        </div>
      </div>
    </Card>
  );
};

export default ReceiptPreview;