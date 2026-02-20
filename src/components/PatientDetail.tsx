import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Row, Col, Typography, Button, Divider, Table, Modal, Space, List, Image, Tag, Select, Radio, Input, Form, message } from 'antd';
import { PlusOutlined, FileTextOutlined, BellOutlined, CalendarOutlined, FileImageOutlined, EyeOutlined, DollarOutlined, ExperimentOutlined, CheckCircleOutlined, ClockCircleOutlined, EditOutlined, WarningOutlined, PrinterOutlined } from '@ant-design/icons';
import moment from 'moment';
import ReceiptsList from './ReceiptsList';
import { Receipt, Patient, Visit, ExternalService, ExternalServiceRequest } from '../components/type';
import { usePatientContext } from './PatientContext';
import API from '../config/api';
import SendNotification from './SendNotification';
import NextVisitForm from './NextVisitForm';
import BillingModal from './BillingModal';
import DynamicHistoryForm from './DynamicHistoryForm';
import { sendBillingNotificationToAllAssistants } from '../services/notificationService';

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
  const { selectedPatient, setSelectedPatient, fetchPatients } = usePatientContext();

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

  // External Services state
  const [externalServices, setExternalServices] = useState<ExternalService[]>([]);
  const [externalRequests, setExternalRequests] = useState<ExternalServiceRequest[]>([]);
  const [externalServicesLoading, setExternalServicesLoading] = useState(false);
  const [assignServiceModalVisible, setAssignServiceModalVisible] = useState(false);

  // Medical History state
  const [medicalHistoryModalVisible, setMedicalHistoryModalVisible] = useState(false);

  // Visit Type Editing
  const [editingVisitType, setEditingVisitType] = useState(false);
  const [availableVisitTypes, setAvailableVisitTypes] = useState<any[]>([]);
  const [selectedVisitTypeId, setSelectedVisitTypeId] = useState<string>('');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('normal');
  const [savingVisitType, setSavingVisitType] = useState(false);

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

    const fetchExternalServices = async () => {
      const doctorId = localStorage.getItem('doctorId');
      if (doctorId) {
        try {
          const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.DOCTOR_EXTERNAL_SERVICES(doctorId)}`);
          if (response.data.success) {
            setExternalServices(response.data.data || []);
          }
        } catch (error) {
          console.error('Error fetching external services:', error);
        }
      }
    };

    const fetchExternalRequests = async () => {
      if (selectedPatient) {
        try {
          setExternalServicesLoading(true);
          const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.PATIENT_EXTERNAL_REQUESTS(selectedPatient.patient_id)}`, {
            params: { doctorId: selectedPatient.doctor_id }
          });
          if (response.data.success) {
            setExternalRequests(response.data.data || []);
          }
        } catch (error) {
          console.error('Error fetching external requests:', error);
        } finally {
          setExternalServicesLoading(false);
        }
      }
    };

    fetchPatientHistory();
    fetchPatientReports();
    fetchExternalServices();
    fetchExternalRequests();

    // Reset visit type editing state
    setEditingVisitType(false);
    if (selectedPatient) {
      setSelectedVisitTypeId(selectedPatient.visit_type || '');
      setSelectedUrgency((selectedPatient as any).visit_urgency || 'normal');
    }
  }, [selectedPatient]);

  // Load visit types configuration
  useEffect(() => {
    const loadVisitTypes = async () => {
      const doctorId = localStorage.getItem('doctorId');
      if (doctorId) {
        try {
          const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.VISIT_TYPE_CONFIG(doctorId)}`);
          if (response.data.success) {
            setAvailableVisitTypes(response.data.data.visit_types || []);
          }
        } catch (error) {
          console.error('Error loading visit types:', error);
        }
      }
    };
    loadVisitTypes();
  }, []);

  const handleUpdateVisitType = async () => {
    if (!selectedPatient) return;

    try {
      setSavingVisitType(true);
      const doctorId = localStorage.getItem('doctorId');

      const response = await axios.put(`${API.BASE_URL}${API.ENDPOINTS.UPDATE_VISIT_TYPE(selectedPatient.patient_id)}`, {
        visit_type: selectedVisitTypeId,
        visit_urgency: selectedUrgency,
        doctor_id: doctorId,
        changed_by: 'doctor'
      });

      if (response.data.success) {
        message.success('Visit type updated successfully');
        setEditingVisitType(false);

        // Handle billing notification if price changed
        const { newPrice, oldPrice, priceDifference } = response.data.data;

        // If there's a price difference, notify assistant
        if (priceDifference && priceDifference !== 0) {
          const isRefund = priceDifference < 0;
          const absDiff = Math.abs(priceDifference);
          const typeLabel = isRefund ? 'Refund' : 'Payment';

          try {
            // Parse date to ensure correct format for Firebase path
            let dateString = selectedPatient.date || '';
            if (dateString.includes('T')) {
              dateString = dateString.split('T')[0];
            }

            // Format to ensure single digits for month/day (Firebase path convention: e.g. 2026-1-5 NOT 2026-01-05)
            if (dateString && dateString.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
              const parts = dateString.split('-');
              dateString = `${parts[0]}-${parseInt(parts[1])}-${parseInt(parts[2])}`;
            }

            // Fallback to today if date is missing
            if (!dateString) {
              const today = new Date();
              dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
            }

            const diffService = {
              service_id: 'visit_type_diff',
              service_name: isRefund ? 'استرداد فرق زيارة' : 'فرق تغيير نوع الكشف',
              price: absDiff,
              quantity: 1,
              subtotal: absDiff
            };

            // Create billing notification
            await sendBillingNotificationToAllAssistants({
              doctor_id: doctorId || '',
              clinic_id: selectedPatient.clinic_id || '',
              patient_id: selectedPatient.patient_id,
              date: dateString,
              patient_name: selectedPatient.patient_name,
              totalAmount: absDiff,
              amountPaid: 0,
              paymentStatus: isRefund ? 'refund_due' : 'pending',
              paymentMethod: 'cash',
              consultationFee: 0,
              consultationType: isRefund ? 'استرداد فرق زيارة' : 'فرق زيارة',
              services: [diffService],
              servicesTotal: absDiff, // Match total amount
              billing_id: 'diff_' + Date.now(),
              clinic_name: '',
              doctor_name: '',
              notes: `Changed visit type from ${selectedPatient.visit_type} to ${selectedVisitTypeId}.`
            });
            message.info(`${typeLabel} notification sent: ${absDiff} EGP`);
          } catch (notifError) {
            console.error('Failed to send billing notification:', notifError);
            message.warning('Failed to send billing notification to assistant');
          }
        }

        // Refresh patient details to show updated data
        // We might need to bubble this up or manually update selectedPatient in context if possible
        // For now, let's trigger a refresh of history which is local
        const updatedPatient = response.data.data.patient;
        // Update selected patient in context immediately
        setSelectedPatient(updatedPatient);
        // Refresh the global patient list to ensure 'outside' view is updated
        fetchPatients();
      }
    } catch (error) {
      console.error('Error updating visit type:', error);
      message.error('Failed to update visit type');
    } finally {
      setSavingVisitType(false);
    }
  };

  // Get latest visit for Personal Information display
  const latestVisit = React.useMemo(() => {
    if (!patientHistory?.visits || patientHistory.visits.length === 0) return null;
    // Sort visits by date descending using moment
    return [...patientHistory.visits].sort((a, b) =>
      moment(b.date).valueOf() - moment(a.date).valueOf()
    )[0];
  }, [patientHistory]);

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

  const handlePrintExternalServices = () => {
    const pendingRequests = externalRequests.filter(r => r.status !== 'completed');

    if (pendingRequests.length === 0) {
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>طلب فحوصات</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; margin: 0; padding: 20px; }
            @page { size: a4; margin: 15mm; }
            .patient-info { margin-bottom: 16px; }
            .patient-info p { margin: 4px 0; font-size: 14px; }
            .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 6px; margin-bottom: 12px; }
            .service-item { display: flex; align-items: center; padding: 8px 4px; border-bottom: 1px dashed #ddd; font-size: 15px; }
            .service-num { font-weight: bold; margin-left: 10px; min-width: 24px; }
            .service-name { flex: 1; }
          </style>
        </head>
        <body>
          <div class="patient-info">
            <p><strong>اسم المريض:</strong> ${selectedPatient?.patient_name || ''}</p>
            <p><strong>العمر:</strong> ${selectedPatient?.age || ''}</p>
            <p><strong>الهاتف:</strong> ${selectedPatient?.patient_phone || ''}</p>
            <p><strong>التاريخ:</strong> ${moment().format('YYYY-MM-DD')}</p>
          </div>

          <div class="section-title">طلب فحوصات راديولوجية ومعملية</div>

          ${pendingRequests.map((req, i) => `
            <div class="service-item">
              <span class="service-num">${i + 1}.</span>
              <span class="service-name">${req.service_name}</span>
            </div>
          `).join('')}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

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
                  icon={<FileTextOutlined />}
                  onClick={() => setMedicalHistoryModalVisible(true)}
                  style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
                >
                  Medical History
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsReceiptModalVisible(true)}
                >
                  Add Prescription
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
        <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f9f9f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong>Current Visit Information</Text>
            {!editingVisitType && (
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => setEditingVisitType(true)}
              >
                Change Type
              </Button>
            )}
          </div>

          {editingVisitType ? (
            <div style={{ padding: 12, backgroundColor: '#fff', borderRadius: 4, border: '1px solid #d9d9d9' }}>
              <Form layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Visit Type" style={{ marginBottom: 12 }}>
                      <Select
                        value={selectedVisitTypeId}
                        onChange={setSelectedVisitTypeId}
                        style={{ width: '100%' }}
                      >
                        {availableVisitTypes.map(type => (
                          <Select.Option key={type.type_id} value={type.type_id}>
                            {type.name} ({type.name_ar})
                          </Select.Option>
                        ))}
                        {/* Add current type if not in list (legacy support) */}
                        {selectedVisitTypeId && !availableVisitTypes.find(t => t.type_id === selectedVisitTypeId) && (
                          <Select.Option key={selectedVisitTypeId} value={selectedVisitTypeId}>
                            {selectedVisitTypeId}
                          </Select.Option>
                        )}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Urgency" style={{ marginBottom: 12 }}>
                      <Radio.Group
                        value={selectedUrgency}
                        onChange={(e) => setSelectedUrgency(e.target.value)}
                        buttonStyle="solid"
                      >
                        <Radio.Button value="normal">Normal</Radio.Button>
                        <Radio.Button value="urgent">Urgent</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                </Row>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button size="small" onClick={() => setEditingVisitType(false)}>Cancel</Button>
                  <Button
                    type="primary"
                    size="small"
                    loading={savingVisitType}
                    onClick={handleUpdateVisitType}
                  >
                    Save Changes
                  </Button>
                </div>
              </Form>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Visit Type</Text>
                <Tag color="blue">{selectedPatient.visit_type || 'Regular'}</Tag>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Urgency</Text>
                {(selectedPatient as any).visit_urgency === 'urgent' ? (
                  <Tag color="red" icon={<WarningOutlined />}>Urgent / عاجل</Tag>
                ) : (
                  <Tag color="green">Normal / عادي</Tag>
                )}
              </Col>
            </Row>
          )}
        </Card>

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

        {/* External Services Section */}
        <Title level={4}>
          <ExperimentOutlined /> External Services / الخدمات الخارجية
        </Title>
        <div style={{ marginBottom: 24 }}>
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAssignServiceModalVisible(true)}
              style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}
            >
              Assign External Service
            </Button>
            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrintExternalServices}
              disabled={externalRequests.filter(r => r.status !== 'completed').length === 0}
              title={externalRequests.filter(r => r.status !== 'completed').length === 0 ? 'No pending orders to print' : 'Print pending lab/radiology orders'}
            >
              طباعة الفحوصات المطلوبة
            </Button>
          </Space>

          {externalServicesLoading ? (
            <div>Loading external services...</div>
          ) : externalRequests.length > 0 ? (
            <List
              dataSource={externalRequests}
              renderItem={(request) => (
                <List.Item
                  actions={
                    request.status === 'pending' ? [
                      <Button
                        key="complete"
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={async () => {
                          try {
                            await axios.put(
                              `${API.BASE_URL}${API.ENDPOINTS.EXTERNAL_REQUEST_STATUS(request.request_id)}`,
                              { status: 'completed' }
                            );
                            // Refresh the list
                            const response = await axios.get(
                              `${API.BASE_URL}${API.ENDPOINTS.PATIENT_EXTERNAL_REQUESTS(selectedPatient.patient_id)}`,
                              { params: { doctorId: selectedPatient.doctor_id } }
                            );
                            if (response.data.success) {
                              setExternalRequests(response.data.data || []);
                            }
                          } catch (error) {
                            console.error('Error marking as completed:', error);
                          }
                        }}
                      >
                        Mark Completed
                      </Button>
                    ] : []
                  }
                >
                  <List.Item.Meta
                    avatar={
                      request.status === 'completed' ? (
                        <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                      ) : (
                        <ClockCircleOutlined style={{ fontSize: 24, color: '#faad14' }} />
                      )
                    }
                    title={
                      <Space>
                        <Text strong>{request.service_name}</Text>
                        <Tag color={request.status === 'completed' ? 'green' : 'orange'}>
                          {request.status === 'completed' ? 'Completed / مكتمل' : 'Pending / قيد الانتظار'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <Text type="secondary">Provider: {request.provider_name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Requested: {moment(request.requestedAt).format('YYYY-MM-DD HH:mm')}
                        </Text>
                        {request.completedAt && (
                          <>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Completed: {moment(request.completedAt).format('YYYY-MM-DD HH:mm')}
                            </Text>
                          </>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ color: '#999' }}>No external services assigned</div>
          )}
        </div>

        {/* Assign Service Modal */}
        <Modal
          title="Assign External Service"
          open={assignServiceModalVisible}
          onCancel={() => setAssignServiceModalVisible(false)}
          footer={null}
          width={600}
        >
          <List
            dataSource={externalServices.filter(s => s.isActive !== false)}
            renderItem={(service) => (
              <List.Item
                actions={[
                  <Button
                    key="assign"
                    type="primary"
                    onClick={async () => {
                      try {
                        await axios.post(`${API.BASE_URL}${API.ENDPOINTS.EXTERNAL_REQUESTS}`, {
                          doctor_id: selectedPatient.doctor_id,
                          patient_id: selectedPatient.patient_id,
                          patient_name: selectedPatient.patient_name,
                          external_service_id: service.service_id,
                          service_name: service.service_name,
                          provider_name: service.provider_name
                        });
                        setAssignServiceModalVisible(false);
                        // Refresh the requests list
                        const response = await axios.get(
                          `${API.BASE_URL}${API.ENDPOINTS.PATIENT_EXTERNAL_REQUESTS(selectedPatient.patient_id)}`,
                          { params: { doctorId: selectedPatient.doctor_id } }
                        );
                        if (response.data.success) {
                          setExternalRequests(response.data.data || []);
                        }
                      } catch (error) {
                        console.error('Error assigning service:', error);
                      }
                    }}
                  >
                    Assign
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={service.service_name}
                  description={`Provider: ${service.provider_name}`}
                />
              </List.Item>
            )}
          />
          {externalServices.filter(s => s.isActive !== false).length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
              No active external services available. Please add services in External Services Management.
            </div>
          )}
        </Modal>

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

      {/* Medical History Modal */}
      <DynamicHistoryForm
        visible={medicalHistoryModalVisible}
        onCancel={() => setMedicalHistoryModalVisible(false)}
        patient={selectedPatient}
        doctorId={selectedPatient?.doctor_id || ''}
      />
    </>
  );
};

export default PatientDetail;