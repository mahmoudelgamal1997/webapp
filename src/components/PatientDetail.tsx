import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, Divider, Tag, Table } from 'antd';
import { PlusOutlined, CalendarOutlined } from '@ant-design/icons';
import moment from 'moment';
import ReceiptsList from './ReceiptsList';
import { Receipt } from '../components/type';
import { usePatientContext } from './PatientContext';
import { useNextVisits } from './NextVisitContext';
import NextVisitForm from './NextVisitForm';
import dayjs from 'dayjs';

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
  const { nextVisits } = useNextVisits();
  const [isNextVisitModalVisible, setIsNextVisitModalVisible] = useState(false);

  if (!selectedPatient) {
    return null;
  }

  // Filter next visits for the current patient
  const patientNextVisits = nextVisits.filter(
    visit => visit.patientId === selectedPatient._id
  );

  // Improved handler for back to list
  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    // Call the provided handler
    onBackToList();
    
    // Return false to prevent default behavior
    return false;
  };

  // Columns for next visits table
  const nextVisitColumns = [
    {
      title: 'Visit Date',
      dataIndex: 'visitDate',
      key: 'visitDate',
      render: (date: string) => {
        const visitDate = dayjs(date);
        const today = dayjs().startOf('day');
        const daysUntil = visitDate.diff(today, 'day');
        
        let color = 'green';
        if (daysUntil < 0) color = 'red';
        else if (daysUntil === 0) color = 'orange';
        else if (daysUntil <= 3) color = 'blue';
        
        return (
          <>
            {visitDate.format('YYYY-MM-DD')}
            <Tag color={color} style={{ marginLeft: 8 }}>
              {daysUntil < 0 ? 'Overdue' : 
               daysUntil === 0 ? 'Today' : 
               `In ${daysUntil} days`}
            </Tag>
          </>
        );
      },
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
    }
  ];

  return (
    <>
      <Card 
        title={
          <Row justify="space-between" align="middle">
            <Col><span>Patient Details: {selectedPatient.patient_name}</span></Col>
            <Col>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setIsReceiptModalVisible(true)}
                style={{ marginRight: 8 }}
              >
                Add Receipt
              </Button>
              <Button 
                icon={<CalendarOutlined />} 
                onClick={() => setIsNextVisitModalVisible(true)}
              >
                Schedule Visit
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
        
        <Title level={4}>Upcoming Visits</Title>
        {patientNextVisits.length > 0 ? (
          <Table 
            columns={nextVisitColumns}
            dataSource={patientNextVisits}
            rowKey="_id"
            pagination={false}
            size="small"
          />
        ) : (
          <Text type="secondary">No upcoming visits scheduled</Text>
        )}
        
        <Divider />
        
        <Title level={4}>Receipts History</Title>
        <ReceiptsList 
          receipts={selectedPatient.receipts || []} 
          onPrintReceipt={onPrintReceipt} 
        />
      </Card>

      {/* Next Visit Modal */}
      <NextVisitForm
        visible={isNextVisitModalVisible}
        onCancel={() => setIsNextVisitModalVisible(false)}
        patient={selectedPatient}
      />
    </>
  );
};

export default PatientDetail;