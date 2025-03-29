import React from 'react';
import { Card, Row, Col, Typography, Button, Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import moment from 'moment';
import ReceiptsList from './ReceiptsList';
import { Receipt } from '../components/type';
import { usePatientContext } from './PatientContext';

const { Title, Text } = Typography;

interface PatientDetailProps {
  isReceiptModalVisible: boolean;
  setIsReceiptModalVisible: (visible: boolean) => void;
  onPrintReceipt: (receipt: Receipt) => void;
  onBackToList: () => void;
}

const PatientDetail: React.FC<PatientDetailProps> = ({ 
  isReceiptModalVisible, 
  setIsReceiptModalVisible,
  onPrintReceipt,
  onBackToList
}) => {
  const { selectedPatient } = usePatientContext();

  if (!selectedPatient) {
    return null;
  }

  // Improved handler for back to list
  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    // Call the provided handler
    onBackToList();
    
    // Return false to prevent default behavior
    return false;
  };

  return (
    <Card 
      title={
        <Row justify="space-between" align="middle">
          <Col><span>Patient Details: {selectedPatient.patient_name}</span></Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setIsReceiptModalVisible(true)}
            >
              Add Receipt
            </Button>
          </Col>
        </Row>
      }
      extra={
        <Button 
          type="link"
          onClick={handleBackClick}
          style={{ padding: 0 }}
        >
          Back to List
        </Button>
      }
    >
      <Title level={4}>Personal Information</Title>
      <Row gutter={[16, 8]}>
        <Col span={8}><Text strong>Name: </Text><Text>{selectedPatient.patient_name}</Text></Col>
        <Col span={8}><Text strong>Date: </Text><Text>{selectedPatient.date ? moment(selectedPatient.date).format('YYYY-MM-DD') : 'N/A'}</Text></Col>
        <Col span={8}><Text strong>Age: </Text><Text>{selectedPatient.age}</Text></Col>
      </Row>
      
      <Title level={4} style={{ marginTop: '16px' }}>Address</Title>
      <Row gutter={[16, 8]}>
        <Col span={24}><Text strong>City: </Text><Text>{selectedPatient.address}</Text></Col>
      </Row>
      
      <Divider />
      
      <Title level={4}>Receipts History</Title>
      <ReceiptsList 
        receipts={selectedPatient.receipts || []} 
        onPrintReceipt={onPrintReceipt} 
      />
    </Card>
  );
};

export default PatientDetail;