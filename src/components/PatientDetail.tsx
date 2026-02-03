import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Row, Col, Typography, Button, Divider, Table, Modal, Space, List, Image } from 'antd';
import { PlusOutlined, FileTextOutlined, BellOutlined, CalendarOutlined, FileImageOutlined, EyeOutlined, DollarOutlined } from '@ant-design/icons';
import moment from 'moment';
import ReceiptsList from './ReceiptsList';
import { Receipt, Patient, Visit } from '../components/type';
import { usePatientContext } from './PatientContext';
import API from '../config/api';
import SendNotification from './SendNotification';
import NextVisitForm from './NextVisitForm';
import BillingModal from './BillingModal';

const { Title, Text } = Typography;

/**
 * Helper function to get the correct image URL
 * Handles both Firebase Storage URLs (full URLs) and legacy local paths
 */
const getImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  // If it's already a full URL (Firebase Storage or any http/https URL), use it directly
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  // Otherwise, it's a legacy local path - prepend the API base URL
  return `${API.BASE_URL}${imageUrl}`;
};

interface PatientDetailProps {
  isReceiptModalVisible: boolean;
  setIsReceiptModalVisible: (visible: boolean) => void;
  onPrintReceipt: (receipt: Receipt) => void;
  onBackToList: () => void;
}

interface PatientHistoryResponse {
  patient_info: {
    name: string;
    phone: string;
    age: string;
    address: string;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalVisits: number;
  };
  visits: Visit[];
}

const PatientDetail: React.FC<PatientDetailProps> = ({ 
  isReceiptModalVisible, 
  setIsReceiptModalVisible,
  onPrintReceipt,
  onBackToList
}) => {
  const { selectedPatient } = usePatientContext();
  
  const [patientHistory, setPatientHistory] = useState<PatientHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visitDetailsVisible, setVisitDetailsVisible] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [nextVisitModalVisible, setNextVisitModalVisible] = useState(false);
  const [billingModalVisible, setBillingModalVisible] = useState(false);
  const [patientReports, setPatientReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');

  useEffect(() => {
    const fetchPatientHistory = async () => {
      if (selectedPatient) {
        try {
          setLoading(true);
          setError(null);

          const response = await axios.get<PatientHistoryResponse>(`${API.BASE_URL}/api/patients/visits`, {
            params: {
              patient_id: selectedPatient.patient_id,
              doctor_id: selectedPatient.doctor_id
            }
          });

          setPatientHistory(response.data);
        } catch (error) {
          console.error('Error fetching patient history:', error);
          setError('Failed to fetch patient history');
        } finally {
          setLoading(false);
        }
      }
    };

    const fetchPatientReports = async () => {
      if (selectedPatient) {
        try {
          setReportsLoading(true);
          const response = await axios.get(`${API.BASE_URL}/api/patients/reports`, {
            params: {
              patient_id: selectedPatient.patient_id,
              patient_phone: selectedPatient.patient_phone,
              doctor_id: selectedPatient.doctor_id
            }
          });

          if (response.data.success) {
            setPatientReports(response.data.data || []);
          }
        } catch (error) {
          console.error('Error fetching patient reports:', error);
        } finally {
          setReportsLoading(false);
        }
      }
    };

    fetchPatientHistory();
    fetchPatientReports();
  }, [selectedPatient]);

  if (!selectedPatient) {
    return null;
  }

  const allReceipts = patientHistory?.visits.flatMap((visit: Visit) => 
    visit.receipts?.map(receipt => ({
      ...receipt,
      visit_type: visit.visit_type // Add visit_type to each receipt for display
    })) || []
  ) || [];

  // Function to show visit details modal
  const showVisitDetails = (visit: Visit) => {
    setSelectedVisit(visit);
    setVisitDetailsVisible(true);
  };

  // Column definitions for the receipts table
  const receiptsColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => moment(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: 'Drugs',
      dataIndex: 'drugs',
      key: 'drugs',
      render: (drugs: any[]) => drugs && drugs.length > 0 ? 
        drugs.map(drug => `${drug.drug} - ${drug.frequency}`).join(', ') : 
        'No drugs'
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes'
    },
    {
      title: 'Visit Type',
      dataIndex: 'visit_type',
      key: 'visit_type'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Receipt) => (
        <Button type="link" onClick={() => onPrintReceipt(record)}>
          Print
        </Button>
      )
    }
  ];

  if (loading) {
    return <div>Loading patient history...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <>
    <Card 
      title={
        <Row justify="space-between" align="middle" gutter={[8, 8]}>
          <Col xs={24} sm={12}>Patient Details: {selectedPatient.patient_name}</Col>
          <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button 
                type="primary" 
                icon={<DollarOutlined />} 
                onClick={() => setBillingModalVisible(true)}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Create Bill
              </Button>
              <Button 
                type="primary" 
                icon={<CalendarOutlined />} 
                onClick={() => setNextVisitModalVisible(true)}
                style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
              >
                Schedule Reminder
              </Button>
              <Button 
                type="primary" 
                icon={<BellOutlined />} 
                onClick={() => setNotificationModalVisible(true)}
                style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
              >
                Notify Assistant
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setIsReceiptModalVisible(true)}
              >
                Add Receipt
              </Button>
              <Button onClick={onBackToList}>
                Back to List
              </Button>
            </Space>
          </Col>
        </Row>
      }
    >
      {/* Personal Information Section */}
      <Title level={4}>Personal Information</Title>
      <Row gutter={[16, 8]}>
        <Col xs={24} sm={12} md={6}><Text strong>Name: </Text>{selectedPatient.patient_name}</Col>
        <Col xs={24} sm={12} md={6}><Text strong>Phone: </Text>{selectedPatient.patient_phone}</Col>
        <Col xs={24} sm={12} md={6}><Text strong>Age: </Text>{selectedPatient.age}</Col>
        <Col xs={24} sm={12} md={6}><Text strong>Address: </Text>{selectedPatient.address}</Col>
      </Row>

      <Divider />

      {/* Reports Section */}
      <Title level={4}>Reports & Examinations</Title>
      {reportsLoading ? (
        <div>Loading reports...</div>
      ) : patientReports.length > 0 ? (
        <div style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            {patientReports.map((report) => (
              <Col xs={24} sm={12} md={8} lg={6} key={report.report_id}>
                <Card
                  hoverable
                  cover={
                    <div style={{ height: 150, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
                      <img
                        alt={report.description || 'Report'}
                        src={getImageUrl(report.image_url)}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        onClick={() => {
                          setPreviewImage(getImageUrl(report.image_url));
                          setImagePreviewVisible(true);
                        }}
                      />
                    </div>
                  }
                  actions={[
                    <EyeOutlined
                      key="view"
                      onClick={() => {
                        setPreviewImage(getImageUrl(report.image_url));
                        setImagePreviewVisible(true);
                      }}
                    />
                  ]}
                >
                  <Card.Meta
                    title={
                      <div>
                        <div style={{ textTransform: 'capitalize', marginBottom: 4 }}>
                          {report.report_type || 'Examination'}
                        </div>
                        <div style={{ fontSize: 12, color: '#999' }}>
                          {moment(report.uploaded_at).format('YYYY-MM-DD HH:mm')}
                        </div>
                      </div>
                    }
                    description={
                      report.description ? (
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          {report.description}
                        </div>
                      ) : null
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ) : (
        <div style={{ marginBottom: 24, color: '#999' }}>No reports available</div>
      )}

      <Divider />

      {/* Receipts History - Updated with Visit Type instead of Drug Model */}
      <Title level={4}>Receipts History</Title>
      <div style={{ overflowX: 'auto' }}>
        <Table 
          dataSource={allReceipts} 
          columns={receiptsColumns}
          rowKey="receipt_id"
          scroll={{ x: 'max-content' }}
          onRow={(record) => {
            return {
              onClick: () => {
                // Find the visit that contains this receipt
                const visit = patientHistory?.visits.find(v => 
                  v.receipts?.some(r => r._id === record._id)
                );
                if (visit) {
                  showVisitDetails(visit);
                }
              }
            };
          }}
          pagination={{
            pageSize: 10,
            responsive: true
          }}
        />
      </div>

      {/* Visit Details Modal */}
      <Modal
        title={`Visit Details - ${moment(selectedVisit?.date).format('YYYY-MM-DD HH:mm')}`}
        open={visitDetailsVisible}
        onCancel={() => setVisitDetailsVisible(false)}
        footer={[
          <Button key="back" onClick={() => setVisitDetailsVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedVisit && (
          <div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Visit Date: </Text>
                {moment(selectedVisit.date).format('YYYY-MM-DD HH:mm')}
              </div>
              <div>
                <Text strong>Visit Type: </Text>
                {selectedVisit.visit_type || 'Not specified'}
              </div>
              <div>
                <Text strong>Complaint: </Text>
                {selectedVisit.complaint || 'None recorded'}
              </div>
              <div>
                <Text strong>Diagnosis: </Text>
                {selectedVisit.diagnosis || 'None recorded'}
              </div>
              
              <Divider />
              
              <Title level={5}>Prescriptions</Title>
              {selectedVisit.receipts && selectedVisit.receipts.length > 0 ? (
                <List
                  itemLayout="vertical"
                  dataSource={selectedVisit.receipts}
                  renderItem={(receipt) => (
                    <List.Item
                      extra={
                        <Button 
                          type="primary" 
                          icon={<FileTextOutlined />} 
                          onClick={() => onPrintReceipt(receipt)}
                        >
                          Print
                        </Button>
                      }
                    >
                      <List.Item.Meta
                        title={`Receipt - ${moment(receipt.date).format('YYYY-MM-DD HH:mm')}`}
                      />
                      <div>
                        <Title level={5}>Medications</Title>
                        {receipt.drugs && receipt.drugs.length > 0 ? (
                          <List
                            dataSource={receipt.drugs}
                            renderItem={(drug) => (
                              <List.Item>
                                <Text strong>{drug.drug}</Text> - {drug.frequency}, {drug.period}, {drug.timing}
                              </List.Item>
                            )}
                          />
                        ) : (
                          <Text>No medications prescribed</Text>
                        )}
                        
                        {receipt.notes && (
                          <div style={{ marginTop: 16 }}>
                            <Text strong>Notes: </Text>
                            {receipt.notes}
                          </div>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Text>No prescriptions for this visit</Text>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </Card>

    {/* Quick Notification Modal */}
    <SendNotification
      visible={notificationModalVisible}
      onCancel={() => setNotificationModalVisible(false)}
      patientName={selectedPatient?.patient_name}
      quickSend={true}
    />

    {/* Next Visit Reminder Modal */}
    <NextVisitForm
      visible={nextVisitModalVisible}
      onCancel={() => setNextVisitModalVisible(false)}
      patient={selectedPatient}
    />

    {/* Billing Modal */}
    <BillingModal
      visible={billingModalVisible}
      onCancel={() => setBillingModalVisible(false)}
      patient={selectedPatient}
      onBillingComplete={() => {
        setBillingModalVisible(false);
      }}
    />

    {/* Image Preview Modal */}
    <Modal
      open={imagePreviewVisible}
      footer={null}
      onCancel={() => setImagePreviewVisible(false)}
      width={800}
      centered
    >
      <img
        alt="Preview"
        style={{ width: '100%' }}
        src={previewImage}
      />
    </Modal>
  </>
  );
};

export default PatientDetail;