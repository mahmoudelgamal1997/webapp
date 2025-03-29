// ReceiptDetail.tsx
import React from 'react';
import { Modal, Button, Card, Row, Col, Typography } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import moment from 'moment';
import { Receipt } from '../components/type';
import { usePatientContext } from './PatientContext';

const { Title, Text } = Typography;

interface ReceiptDetailProps {
  onPrintReceipt: (receipt: Receipt) => void;
}

const ReceiptDetail: React.FC<ReceiptDetailProps> = ({ onPrintReceipt }) => {
  const { 
    selectedReceipt, 
    setSelectedReceipt, 
    isViewReceiptModalVisible, 
    setIsViewReceiptModalVisible 
  } = usePatientContext();

  const handleClose = () => {
    setIsViewReceiptModalVisible(false);
    setSelectedReceipt(null);
  };

  return (
    <Modal
      title="Receipt Details"
      visible={isViewReceiptModalVisible}
      onCancel={handleClose}
      footer={[
        <Button 
          key="print" 
          type="primary" 
          icon={<PrinterOutlined />} 
          onClick={() => selectedReceipt && onPrintReceipt(selectedReceipt)}
        >
          Print Receipt
        </Button>,
        <Button 
          key="close" 
          onClick={handleClose}
        >
          Close
        </Button>
      ]}
      width={700}
      style={{ direction: 'rtl', textAlign: 'right' }}
    >
      {selectedReceipt && (
        <div>
          <Title level={5}>Date: {moment(selectedReceipt.date).format('YYYY-MM-DD')}</Title>
          
          <Title level={5} style={{ marginTop: '16px' }}>Medications:</Title>
          {selectedReceipt.drugs.map((drug, index) => (
            <Card key={drug._id || index} size="small" style={{ marginBottom: '8px' }}>
              <Row gutter={[16, 8]}>
                <Col span={24}><Text strong>Drug: </Text><Text>{drug.drug}</Text></Col>
                <Col span={8}><Text strong>Frequency: </Text><Text>{drug.frequency}</Text></Col>
                <Col span={8}><Text strong>Period: </Text><Text>{drug.period}</Text></Col>
                <Col span={8}><Text strong>Timing: </Text><Text>{drug.timing}</Text></Col>
              </Row>
            </Card>
          ))}
          
          {selectedReceipt.notes && (
            <>
              <Title level={5} style={{ marginTop: '16px' }}>Notes:</Title>
              <Text>{selectedReceipt.notes}</Text>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ReceiptDetail;