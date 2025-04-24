import React from 'react';
import { Typography, Divider, Space } from 'antd';
import moment from 'moment';
import { Receipt, Patient } from './type';

const { Title, Text } = Typography;
interface DoctorInfo {
  doctorName: string;
  doctorTitle: string;
  doctorSpecialty: string;
  doctorFaculty: string;
  clinics: Array<{
    name: string;
    address: string;
    phone: string;
  }>;
  selectedClinicIndex: number;
  receiptHeader: string;
  receiptFooter: string;
}

interface ReceiptTemplateProps {
  receipt: Receipt;
  patient: Patient;
  doctorInfo: DoctorInfo;
  isPrintMode?: boolean;
}

const ReceiptTemplate: React.FC<ReceiptTemplateProps> = ({
  receipt,
  patient:patientData,
  doctorInfo,
  isPrintMode = false
}) => {
  // Sample data - this would be replaced with actual data from context
  const receiptData = {
    doctor: {
      name: "د. ضياء منير عجلان",
      title: "أستاذ ورئيس أقسام",
      specialty: "أمراض النساء والتوليد والعقم",
      faculty: "كلية طب طنطا",
      locations: [
        { name: "السنطة عمارة معمل البرج", phone: "01210101010" },
        { name: "طنطا - شارع الجلاء", phone: "01234567890" }
      ],
      selectedLocation: 0 // Index of the selected location
    },
    patient: {
      name: "يوسف",
      age: 25,
      date: "23-04-2025"
    },
    medications: [
      {
        name: "كونجسال",
        frequency: "3 مرات",
        period: "أسبوع",
        timing: "بعد الأكل"
      }
    ],
    notes: ""
  };
  
  // Destructure data for easier access
  const { doctor, patient, medications, notes } = receiptData;
  const selectedLocation = doctor.locations[doctor.selectedLocation];
  
  return (
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
        <Title level={3} style={{ margin: '5px 0', color: '#1890ff' }}>{doctor.name}</Title>
        <Title level={4} style={{ margin: '5px 0' }}>{doctor.title}</Title>
        <Text strong style={{ display: 'block', fontSize: '16px' }}>{doctor.specialty}</Text>
        <Text style={{ display: 'block', fontSize: '14px' }}>{doctor.faculty}</Text>
      </div>
      
      {/* Patient Information */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '10px', 
        backgroundColor: '#f8f8f8', 
        borderRadius: '5px'
      }}>
        <Space direction="horizontal" size="large" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text strong>اسم المريض: {patient.name}</Text>
          <Text strong>العمر: {patient.age}</Text>
          <Text strong>تاريخ: {patient.date}</Text>
        </Space>
      </div>
      
      {/* Medications */}
      <div style={{ marginBottom: '20px' }}>
        <Title level={4}>الأدوية:</Title>
        {medications.map((med, index) => (
          <div key={index} style={{ 
            marginBottom: '15px', 
            padding: '10px', 
            border: '1px solid #eee', 
            borderRadius: '5px'
          }}>
            <Text strong style={{ fontSize: '16px' }}>{index + 1}. {med.name}</Text>
            <div style={{ marginTop: '5px' }}>
              <Text>التكرار: {med.frequency} | المدة: {med.period} | التوقيت: {med.timing}</Text>
            </div>
          </div>
        ))}
      </div>
      
      {/* Notes */}
      {notes && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '10px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '5px'
        }}>
          <Title level={4}>ملاحظات:</Title>
          <Text>{notes}</Text>
        </div>
      )}
      
      {/* Footer with location and contact */}
      <Divider />
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Text strong style={{ display: 'block', fontSize: '16px' }}>{selectedLocation.name}</Text>
        <Text style={{ display: 'block' }}>هاتف: {selectedLocation.phone}</Text>
      </div>
    </div>
  );
};

export default ReceiptTemplate;