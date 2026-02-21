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
import MedicalReportModal from './MedicalReportModal';
import { sendBillingNotificationToAllAssistants } from '../services/notificationService';
import { useDoctorContext } from './DoctorContext';

const { Title, Text } = Typography;

/**
 * Helper function to get the correct image URL
 * Handles both Firebase Storage URLs (full URLs) and legacy local paths
 */
const getImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `${API.BASE_URL}${imageUrl}`;
};

/** Returns true if the URL points to a PDF file */
const isPdf = (url: string): boolean => {
  if (!url) return false;
  // Firebase Storage URLs encode the path — decode to check extension
  try {
    const decoded = decodeURIComponent(url);
    return decoded.toLowerCase().includes('.pdf');
  } catch {
    return url.toLowerCase().includes('.pdf');
  }
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
  const { settings: doctorSettings } = useDoctorContext();

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

  // Medical Report state
  const [medicalReportModalVisible, setMedicalReportModalVisible] = useState(false);
  const [patientMedicalReports, setPatientMedicalReports] = useState<any[]>([]);
  const [medicalReportsLoading, setMedicalReportsLoading] = useState(false);

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

    const fetchMedicalReports = async () => {
      if (!selectedPatient?._id) return;
      try {
        setMedicalReportsLoading(true);
        const response = await axios.get(
          `${API.BASE_URL}${API.ENDPOINTS.MEDICAL_REPORTS(selectedPatient._id)}`
        );
        if (response.data?.success) {
          const sorted = (response.data.medical_reports || []).slice().reverse();
          setPatientMedicalReports(sorted);
        }
      } catch (error) {
        console.error('Error fetching medical reports:', error);
      } finally {
        setMedicalReportsLoading(false);
      }
    };

    fetchPatientHistory();
    fetchPatientReports();
    fetchExternalServices();
    fetchExternalRequests();
    fetchMedicalReports();

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



  const handlePrintSavedMedicalReport = (report: any) => {
    const printSettings = (doctorSettings as any).printSettings || {
      paperSize: 'a4',
      marginTop: 0,
      showHeader: true,
      showFooter: true,
      showPatientInfo: true,
    };
    const isCustomPaper = !printSettings.showHeader;

    const clinicInfoParts: string[] = [];
    if (doctorSettings.clinicName) clinicInfoParts.push(`<h1 style="margin:4px 0">${doctorSettings.clinicName}</h1>`);
    if (doctorSettings.doctorTitle) clinicInfoParts.push(`<h3 style="margin:4px 0">${doctorSettings.doctorTitle}</h3>`);
    if (doctorSettings.clinicAddress) clinicInfoParts.push(`<p style="margin:2px 0">${doctorSettings.clinicAddress}</p>`);
    if (doctorSettings.clinicPhone) clinicInfoParts.push(`<p style="margin:2px 0">هاتف: ${doctorSettings.clinicPhone}</p>`);

    const diagnosis = report.diagnosis || '';
    const medicalReportText = report.medical_report || '';
    const signature = report.signature || '';
    const reportDate = report.date ? moment(report.date).format('DD / MM / YYYY') : moment().format('DD / MM / YYYY');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>تقرير طبي</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; direction: rtl; margin: 0; padding: 0; color: #222; }
            @page {
              size: ${printSettings.paperSize === 'custom' ? 'auto' : (printSettings.paperSize || 'a4')};
              margin: 0;
            }
            .receipt {
              position: ${isCustomPaper ? 'absolute' : 'static'};
              top: ${isCustomPaper ? (printSettings.marginTop || 0) + 'mm' : 'auto'};
              left: 0; right: 0;
              padding: 0 30px;
              max-width: 800px;
              margin: 0 auto;
              width: 100%;
            }
            .header {
              text-align: center;
              border-bottom: ${isCustomPaper ? 'none' : '2px solid #333'};
              padding-bottom: 14px;
              margin-bottom: 20px;
              display: ${isCustomPaper ? 'none' : 'block'};
            }
            .title { font-size: 20px; font-weight: bold; margin: 16px 0 6px; text-align: center; letter-spacing: 1px; }
            .patient-info {
              background: ${isCustomPaper ? 'transparent' : '#f8f8f8'};
              border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; font-size: 14px;
              display: ${printSettings.showPatientInfo ? 'block' : 'none'};
            }
            .patient-info p { margin: 4px 0; }
            .section { margin-bottom: 18px; }
            .section-label { font-weight: bold; font-size: 15px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; color: #444; }
            .section-content { font-size: 14px; line-height: 1.8; white-space: pre-wrap; }
            .signature-area { margin-top: 50px; display: flex; justify-content: flex-end; }
            .signature-box { text-align: center; min-width: 180px; }
            .signature-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 6px; font-size: 13px; }
            .footer {
              margin-top: 30px;
              border-top: ${isCustomPaper ? 'none' : '1px solid #ccc'};
              padding-top: 10px; text-align: center; font-style: italic; font-size: 12px; color: #666;
              display: ${printSettings.showFooter ? 'block' : 'none'};
              position: ${isCustomPaper ? 'absolute' : 'static'};
              bottom: ${isCustomPaper ? '0' : 'auto'};
              width: 100%;
            }
            h1, h2, h3 { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              ${clinicInfoParts.length > 0 ? clinicInfoParts.join('') : '<h2>عيادة طبية</h2>'}
              ${(doctorSettings as any).receiptHeader ? `<div>${(doctorSettings as any).receiptHeader}</div>` : ''}
            </div>
            <div class="title">تقـريـر طـبـي &nbsp;|&nbsp; Medical Report</div>
            <div class="patient-info">
              <p><strong>اسم المريض:</strong> ${selectedPatient?.patient_name || ''}</p>
              <p><strong>العمر:</strong> ${selectedPatient?.age || ''}</p>
              <p><strong>التاريخ:</strong> ${reportDate}</p>
            </div>
            ${diagnosis ? `<div class="section"><div class="section-label">التشخيص</div><div class="section-content">${diagnosis.replace(/\n/g, '<br/>')}</div></div>` : ''}
            ${medicalReportText ? `<div class="section"><div class="section-label">التقرير الطبي</div><div class="section-content">${medicalReportText.replace(/\n/g, '<br/>')}</div></div>` : ''}
            <div class="signature-area">
              <div class="signature-box">
                <div class="signature-line">${signature || 'توقيع الطبيب'}</div>
              </div>
            </div>
            ${printSettings.showFooter && (doctorSettings as any).receiptFooter ? `<div class="footer">${(doctorSettings as any).receiptFooter}</div>` : ''}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

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
    const pendingRequests = externalRequests.filter(r => r.status === 'pending');

    if (pendingRequests.length === 0) {
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printSettings = doctorSettings.printSettings || {
      paperSize: 'a4',
      marginTop: 0,
      showHeader: true,
      showFooter: true,
      showPatientInfo: true
    };

    // Same logic as prescription: when showHeader is false, content is positioned on pre-printed paper
    const isCustomPaper = !printSettings.showHeader;

    printWindow.document.write(`
      <html>
        <head>
          <title>طلب فحوصات</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              direction: rtl;
              margin: 0;
              padding: 0;
            }
            @page {
              size: ${printSettings.paperSize === 'custom' ? 'auto' : printSettings.paperSize};
              margin: 0;
            }
            .content {
              position: ${isCustomPaper ? 'absolute' : 'static'};
              top: ${isCustomPaper ? (printSettings.marginTop || 0) + 'mm' : 'auto'};
              left: 0;
              right: 0;
              padding: 0 20px;
              max-width: 800px;
              margin: 0 auto;
              width: 100%;
              box-sizing: border-box;
            }
            .patient-info {
              margin-bottom: 16px;
              padding: 10px;
              background-color: ${isCustomPaper ? 'transparent' : '#f8f8f8'};
              display: ${printSettings.showPatientInfo ? 'block' : 'none'};
            }
            .patient-info p { margin: 4px 0; font-size: 14px; }
            .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 6px; margin-bottom: 12px; }
            .service-item { display: flex; align-items: center; padding: 8px 4px; border-bottom: 1px dashed #ddd; font-size: 15px; }
            .service-num { font-weight: bold; margin-left: 10px; min-width: 24px; }
            .service-name { flex: 1; }
          </style>
        </head>
        <body>
          <div class="content">
            <div class="patient-info">
              <p><strong>اسم المريض:</strong> ${selectedPatient?.patient_name || ''}</p>
              <p><strong>العمر:</strong> ${selectedPatient?.age || ''}</p>
              <p><strong>الهاتف:</strong> ${selectedPatient?.patient_phone || ''}</p>
              <p><strong>التاريخ:</strong> ${moment().format('YYYY-MM-DD')}</p>
            </div>

            <div class="section-title">Lab & Radiology Orders</div>

            ${pendingRequests.map((req, i) => `
              <div class="service-item">
                <span class="service-num">${i + 1}.</span>
                <span class="service-name">${req.service_name}</span>
              </div>
            `).join('')}
          </div>
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
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  onClick={() => setMedicalReportModalVisible(true)}
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                  تقرير طبي
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

        {/* File Number */}
        {(selectedPatient as any).file_number && (
          <div style={{ marginBottom: 16 }}>
            <Tag color="gold" style={{ fontSize: 15, padding: '4px 14px', fontWeight: 700, letterSpacing: 1 }}>
              رقم ملف: {(selectedPatient as any).file_number}
            </Tag>
          </div>
        )}

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
              {patientReports.map((report) => {
                const url = getImageUrl(report.image_url);
                const pdf = isPdf(url);
                const handleOpen = () => {
                  if (pdf) {
                    window.open(url, '_blank');
                  } else {
                    setPreviewImage(url);
                    setImagePreviewVisible(true);
                  }
                };
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={report.report_id}>
                    <Card
                      hoverable
                      cover={
                        <div
                          onClick={handleOpen}
                          style={{ height: 150, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', cursor: 'pointer' }}
                        >
                          {pdf ? (
                            <div style={{ textAlign: 'center', color: '#d32f2f' }}>
                              <div style={{ fontSize: 52 }}>📄</div>
                              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>PDF</div>
                              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Click to open</div>
                            </div>
                          ) : (
                            <img
                              alt={report.description || 'Report'}
                              src={url}
                              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            />
                          )}
                        </div>
                      }
                      actions={[
                        pdf ? (
                          <span
                            key="open"
                            onClick={handleOpen}
                            style={{ cursor: 'pointer', color: '#1677ff', fontSize: 13 }}
                          >
                            <PrinterOutlined /> Open PDF
                          </span>
                        ) : (
                          <EyeOutlined key="view" onClick={handleOpen} />
                        )
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
                );
              })}
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
              disabled={externalRequests.filter(r => r.status === 'pending').length === 0}
              title={externalRequests.filter(r => r.status === 'pending').length === 0 ? 'No pending orders to print' : 'Print pending lab/radiology orders'}
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

        {/* Prescription History */}
        <Title level={4}>Prescription History</Title>
        <div style={{ overflowX: 'auto' }}>
          <Table
            dataSource={allReceipts}
            columns={receiptsColumns}
            rowKey="receipt_id"
            scroll={{ x: 'max-content' }}
            onRow={(record) => {
              return {
                onClick: () => {
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

        <Divider />

        {/* Medical Reports Section */}
        <Title level={4}>
          <FileTextOutlined style={{ color: '#52c41a' }} /> Medical Reports / التقارير الطبية
        </Title>
        {medicalReportsLoading ? (
          <div style={{ marginBottom: 24, color: '#999' }}>Loading reports...</div>
        ) : patientMedicalReports.length > 0 ? (
          <div style={{ marginBottom: 24 }}>
            {patientMedicalReports.map((report: any, idx: number) => (
              <Card
                key={report.report_id || idx}
                style={{ marginBottom: 12, borderLeft: '4px solid #52c41a' }}
                size="small"
                extra={
                  <Button
                    size="small"
                    icon={<PrinterOutlined />}
                    onClick={() => handlePrintSavedMedicalReport(report)}
                  >
                    Print
                  </Button>
                }
              >
                <Row gutter={[16, 8]}>
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Date</Text>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {report.date ? moment(report.date).format('DD MMM YYYY, HH:mm') : '—'}
                    </div>
                    {report.doctor_name && (
                      <div style={{ fontSize: 12, color: '#888' }}>Dr. {report.doctor_name}</div>
                    )}
                  </Col>
                  {report.diagnosis && (
                    <Col xs={24} sm={12}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Diagnosis / التشخيص</Text>
                      <div style={{ marginTop: 2 }}>{report.diagnosis}</div>
                    </Col>
                  )}
                  <Col xs={24}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Medical Report / التقرير الطبي</Text>
                    <div
                      style={{
                        marginTop: 4,
                        padding: '8px 12px',
                        background: '#f8fff8',
                        borderRadius: 6,
                        fontSize: 14,
                        lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                        border: '1px solid #e8f5e9',
                      }}
                    >
                      {report.medical_report}
                    </div>
                  </Col>
                  {report.signature && (
                    <Col xs={24}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Signature / التوقيع</Text>
                      <div style={{ marginTop: 2, fontStyle: 'italic' }}>{report.signature}</div>
                    </Col>
                  )}
                </Row>
              </Card>
            ))}
          </div>
        ) : (
          <div style={{ marginBottom: 24, color: '#999' }}>No medical reports yet</div>
        )}

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

      {/* Medical Report Modal */}
      <MedicalReportModal
        visible={medicalReportModalVisible}
        onCancel={() => setMedicalReportModalVisible(false)}
        patient={selectedPatient}
        previousDiagnoses={
          patientHistory?.visits
            ?.map(v => v.diagnosis)
            .filter((d): d is string => !!(d && d.trim())) ?? []
        }
        onReportSaved={async () => {
          setMedicalReportModalVisible(false);
          if (selectedPatient?._id) {
            try {
              const res = await axios.get(
                `${API.BASE_URL}${API.ENDPOINTS.MEDICAL_REPORTS(selectedPatient._id)}`
              );
              if (res.data?.success) {
                const sorted = (res.data.medical_reports || []).slice().reverse();
                setPatientMedicalReports(sorted);
              }
            } catch {}
          }
        }}
      />
    </>
  );
};

export default PatientDetail;