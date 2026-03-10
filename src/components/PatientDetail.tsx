import React, { useState, useEffect } from 'react';
import { printHtml as triggerPrint } from './printUtils';
import axios from 'axios';
import { Card, Row, Col, Typography, Button, Divider, Table, Modal, Space, List, Image, Tag, Select, Radio, Input, InputNumber, Form, message } from 'antd';
import { PlusOutlined, FileTextOutlined, BellOutlined, CalendarOutlined, FileImageOutlined, EyeOutlined, DollarOutlined, ExperimentOutlined, CheckCircleOutlined, ClockCircleOutlined, EditOutlined, WarningOutlined, PrinterOutlined, PercentageOutlined, SwapOutlined, GiftOutlined } from '@ant-design/icons';
import moment from 'moment';
import ReceiptsList from './ReceiptsList';
import { Receipt, Patient, Visit, ExternalService, ExternalServiceRequest, PatientPackage } from '../components/type';
import { usePatientContext } from './PatientContext';
import API from '../config/api';
import SendNotification from './SendNotification';
import NextVisitForm from './NextVisitForm';
import BillingModal from './BillingModal';
import DynamicHistoryForm from './DynamicHistoryForm';
import MedicalReportModal from './MedicalReportModal';
import ReferralModal from './ReferralModal';
import { sendBillingNotificationToAllAssistants } from '../services/notificationService';
import { useDoctorContext } from './DoctorContext';
import { useClinicContext } from './ClinicContext';
import { useLanguage } from './LanguageContext';

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
  complaint_history?: { _id?: string; date: string; complaint: string; diagnosis: string; }[];
}

const PatientDetail: React.FC<PatientDetailProps> = ({
  isReceiptModalVisible,
  setIsReceiptModalVisible,
  onPrintReceipt,
  onBackToList
}) => {
  const { selectedPatient, setSelectedPatient, fetchPatients } = usePatientContext();
  const { settings: doctorSettings } = useDoctorContext();
  const { selectedClinicId } = useClinicContext();
  const { language } = useLanguage();

  const [patientHistory, setPatientHistory] = useState<PatientHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visitDetailsVisible, setVisitDetailsVisible] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [nextVisitModalVisible, setNextVisitModalVisible] = useState(false);
  const [billingModalVisible, setBillingModalVisible] = useState(false);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [discountSubmitting, setDiscountSubmitting] = useState(false);
  const [patientReports, setPatientReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');

  // External Services state
  const [externalServices, setExternalServices] = useState<ExternalService[]>([]);
  const [externalRequests, setExternalRequests] = useState<ExternalServiceRequest[]>([]);
  const [externalServicesLoading, setExternalServicesLoading] = useState(false);
  const [assignServiceModalVisible, setAssignServiceModalVisible] = useState(false);

  // Complaint history add form state
  const [addComplaintVisible, setAddComplaintVisible] = useState(false);
  const [newComplaint, setNewComplaint] = useState('');
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [addComplaintLoading, setAddComplaintLoading] = useState(false);

  // Medical History state
  const [medicalHistoryModalVisible, setMedicalHistoryModalVisible] = useState(false);

  // Medical Report state
  const [medicalReportModalVisible, setMedicalReportModalVisible] = useState(false);
  const [patientMedicalReports, setPatientMedicalReports] = useState<any[]>([]);
  const [medicalReportsLoading, setMedicalReportsLoading] = useState(false);

  // Referral state
  const [referralModalVisible, setReferralModalVisible] = useState(false);
  const [patientReferrals, setPatientReferrals] = useState<any[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);

  // Visit Type Editing
  const [editingVisitType, setEditingVisitType] = useState(false);
  const [availableVisitTypes, setAvailableVisitTypes] = useState<any[]>([]);
  const [selectedVisitTypeId, setSelectedVisitTypeId] = useState<string>('');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('normal');
  const [savingVisitType, setSavingVisitType] = useState(false);

  // Package state
  const [activePackages, setActivePackages] = useState<PatientPackage[]>([]);
  const [allPatientPackages, setAllPatientPackages] = useState<PatientPackage[]>([]);
  const [activePackagePopupVisible, setActivePackagePopupVisible] = useState(false);
  const [assignPackageModalVisible, setAssignPackageModalVisible] = useState(false);
  const [assignPackageSubmitting, setAssignPackageSubmitting] = useState(false);
  const [doctorPackagesForAssign, setDoctorPackagesForAssign] = useState<any[]>([]);
  const [selectedPackageToAssign, setSelectedPackageToAssign] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatientHistory = async () => {
      if (selectedPatient) {
        try {
          setLoading(true);
          setError(null);

          const response = await axios.get<PatientHistoryResponse>(`${API.BASE_URL}/api/patients/visits`, {
            params: {
              patient_id: selectedPatient.patient_id,
              doctor_id: selectedPatient.doctor_id,
              page: 1,
              limit: 9999
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

    const fetchReferrals = async () => {
      if (!selectedPatient?._id) return;
      try {
        setReferralsLoading(true);
        const response = await axios.get(
          `${API.BASE_URL}${API.ENDPOINTS.REFERRALS(selectedPatient._id)}`
        );
        if (response.data?.success) {
          const sorted = (response.data.referrals || []).slice().reverse();
          setPatientReferrals(sorted);
        }
      } catch (error) {
        console.error('Error fetching referrals:', error);
      } finally {
        setReferralsLoading(false);
      }
    };

    const fetchPatientPackages = async () => {
      if (!selectedPatient?.patient_id) return;
      const doctorId = localStorage.getItem('doctorId');
      try {
        const [activeRes, allRes] = await Promise.all([
          axios.get(`${API.BASE_URL}${API.ENDPOINTS.PATIENT_ACTIVE_PACKAGES(selectedPatient.patient_id)}`, { params: { doctor_id: doctorId } }),
          axios.get(`${API.BASE_URL}${API.ENDPOINTS.PATIENT_PACKAGES(selectedPatient.patient_id)}`, { params: { doctor_id: doctorId } })
        ]);
        if (activeRes.data?.success) {
          setActivePackages(activeRes.data.data || []);
          if ((activeRes.data.data || []).length > 0) setActivePackagePopupVisible(true);
        }
        if (allRes.data?.success) setAllPatientPackages(allRes.data.data || []);
      } catch (error) {
        console.error('Error fetching patient packages:', error);
      }
    };

    fetchPatientHistory();
    fetchPatientReports();
    fetchExternalServices();
    fetchExternalRequests();
    fetchMedicalReports();
    fetchReferrals();
    fetchPatientPackages();

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

  const handleAssignPackage = async () => {
    if (!selectedPatient?.patient_id || !selectedPackageToAssign) {
      message.warning('Please select a package');
      return;
    }
    const doctorId = localStorage.getItem('doctorId');
    if (!doctorId) return;
    setAssignPackageSubmitting(true);
    try {
      const res = await axios.post(`${API.BASE_URL}${API.ENDPOINTS.ASSIGN_PATIENT_PACKAGE}`, {
        patient_id: selectedPatient.patient_id,
        package_id: selectedPackageToAssign,
        doctor_id: doctorId,
        clinic_id: selectedClinicId || selectedPatient.clinic_id || '',
        patient_name: selectedPatient.patient_name
      });
      if (res.data?.success) {
        message.success('Package assigned to patient');
        setAssignPackageModalVisible(false);
        setSelectedPackageToAssign(null);
        const [activeRes, allRes] = await Promise.all([
          axios.get(`${API.BASE_URL}${API.ENDPOINTS.PATIENT_ACTIVE_PACKAGES(selectedPatient.patient_id)}`, { params: { doctor_id: doctorId } }),
          axios.get(`${API.BASE_URL}${API.ENDPOINTS.PATIENT_PACKAGES(selectedPatient.patient_id)}`, { params: { doctor_id: doctorId } })
        ]);
        if (activeRes.data?.success) {
          setActivePackages(activeRes.data.data || []);
          setActivePackagePopupVisible(true);
        }
        if (allRes.data?.success) setAllPatientPackages(allRes.data.data || []);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to assign package');
    } finally {
      setAssignPackageSubmitting(false);
    }
  };

  const handleApplyDiscount = async (values: { amount: number; reason?: string }) => {
    if (!selectedPatient) return;
    const doctorId = localStorage.getItem('doctorId');
    const amount = Number(values.amount) || 0;
    if (amount <= 0) {
      message.error('Please enter a valid discount amount');
      return;
    }
    if (discountSubmitting) return;
    setDiscountSubmitting(true);
    setDiscountModalVisible(false); // Close immediately on submit

    const patientId = selectedPatient.patient_id || (selectedPatient as any).id || selectedPatient._id;
    if (!patientId) {
      message.error('Patient ID not found. Please refresh and try again.');
      setDiscountSubmitting(false);
      setDiscountModalVisible(true);
      return;
    }

    let dateString = selectedPatient.date || '';
    if (dateString.includes('T')) dateString = dateString.split('T')[0];
    if (dateString && dateString.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      const parts = dateString.split('-');
      dateString = `${parts[0]}-${parseInt(parts[1])}-${parseInt(parts[2])}`;
    }
    if (!dateString) {
      const today = new Date();
      dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    }

    const billingId = 'discount_' + Date.now();
    const discountService = {
      service_id: 'discount',
      service_name: 'خصم',
      price: amount,
      quantity: 1,
      subtotal: amount
    };

    const clinicId = selectedPatient.clinic_id || selectedClinicId || '';

    try {
      await axios.post(`${API.BASE_URL}${API.ENDPOINTS.BILLING}`, {
        doctor_id: doctorId,
        patient_id: patientId,
        patient_name: selectedPatient.patient_name || 'Unknown',
        patient_phone: selectedPatient.patient_phone || '',
        clinic_id: clinicId,
        consultationFee: 0,
        consultationType: 'خصم',
        services: [discountService],
        paymentStatus: 'refund_due',
        paymentMethod: 'cash',
        amountPaid: 0,
        notes: values.reason || 'خصم على كشف المريض',
        billingDate: dateString,
        billing_id: billingId
      });

      try {
        await sendBillingNotificationToAllAssistants({
          doctor_id: doctorId || '',
          clinic_id: clinicId,
          patient_id: patientId,
          date: dateString,
          patient_name: selectedPatient.patient_name,
          totalAmount: amount,
          amountPaid: 0,
          paymentStatus: 'refund_due',
          paymentMethod: 'cash',
          consultationFee: 0,
          consultationType: 'خصم',
          services: [discountService],
          servicesTotal: amount,
          billing_id: billingId,
          clinic_name: '',
          doctor_name: '',
          notes: values.reason || 'خصم على كشف المريض'
        });
        message.success(`Discount of ${amount} EGP recorded. Assistant notified to refund.`);
      } catch (notifErr) {
        console.error('Failed to notify assistant:', notifErr);
        message.warning(`Discount recorded but assistant was not notified. Please notify manually.`);
      }
    } catch (err: any) {
      console.error('Failed to apply discount:', err);
      const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to record discount';
      message.error(errMsg);
      setDiscountModalVisible(true);
    } finally {
      setDiscountSubmitting(false);
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
      visit_type: visit.visit_type,
    })) || []
  ) || [];



  const handlePrintSavedMedicalReport = (report: any) => {
    const printSettings = (doctorSettings as any).printSettings || {
      paperSize: 'a4',
      marginTop: 0,
      marginLeft: 0,
      marginRight: 0,
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

    const printHtml = `
      <html>
        <head>
          <title>تقرير طبي</title>
          <style>
            * { box-sizing: border-box; }
            @page {
              size: ${printSettings.paperSize === 'custom' ? 'auto' : (printSettings.paperSize || 'a4')};
              margin: 0;
            }
            html, body { font-family: Arial, sans-serif; direction: ltr; margin: 0; padding: 0; color: #222; }
            .top-spacer { display: block; height: ${((printSettings.marginTop || 0) / 2)}mm; width: 100%; }
            .receipt {
              padding-top: 0;
              padding-left: calc(${((printSettings.marginLeft || 0) / 2)}mm + 10px);
              padding-right: calc(${((printSettings.marginRight || 0) / 2)}mm + 10px);
              padding-bottom: 0;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              border-bottom: ${isCustomPaper ? 'none' : '2px solid #333'};
              padding-bottom: 6px; margin-bottom: 8px;
              display: ${isCustomPaper ? 'none' : 'block'};
            }
            .title { font-size: 17px; font-weight: bold; margin: 6px 0 4px; text-align: center; letter-spacing: 1px; }
            .patient-info {
              background: ${isCustomPaper ? 'transparent' : '#f8f8f8'};
              border-radius: 4px; padding: 6px 10px; margin-bottom: 8px; font-size: 13px;
              display: ${printSettings.showPatientInfo ? 'block' : 'none'};
            }
            .patient-info p { margin: 2px 0; }
            .section { margin-bottom: 8px; }
            .section-label { font-weight: bold; font-size: 13px; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-bottom: 4px; color: #444; }
            .section-content { font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
            .signature-area { margin-top: 16px; display: flex; justify-content: flex-end; }
            .signature-box { text-align: center; min-width: 160px; }
            .signature-line { border-top: 1px solid #333; margin-top: 20px; padding-top: 4px; font-size: 12px; }
            .footer {
              margin-top: 10px;
              border-top: ${isCustomPaper ? 'none' : '1px solid #ccc'};
              padding-top: 6px; text-align: center; font-style: italic; font-size: 11px; color: #666;
              display: ${printSettings.showFooter ? 'block' : 'none'};
            }
            h1 { margin: 3px 0; font-size: 18px; }
            h2 { margin: 3px 0; font-size: 16px; }
            h3 { margin: 2px 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="top-spacer"></div>
          <div class="receipt">
            <div class="header">
              ${clinicInfoParts.length > 0 ? clinicInfoParts.join('') : '<h2>عيادة طبية</h2>'}
              ${(doctorSettings as any).receiptHeader ? `<div>${(doctorSettings as any).receiptHeader}</div>` : ''}
            </div>
            <div class="title">تقـريـر طـبـي &nbsp;|&nbsp; Medical Report</div>
            <div class="patient-info">
              <p><strong>Patient:</strong> ${selectedPatient?.patient_name || ''}</p>
              <p><strong>Age:</strong> ${selectedPatient?.age || ''}</p>
              <p><strong>Date:</strong> ${reportDate}</p>
            </div>
            ${diagnosis ? `<div class="section"><div class="section-label">Diagnosis</div><div class="section-content">${diagnosis.replace(/\n/g, '<br/>')}</div></div>` : ''}
            ${medicalReportText ? `<div class="section"><div class="section-label">Medical Report</div><div class="section-content">${medicalReportText.replace(/\n/g, '<br/>')}</div></div>` : ''}
            <div class="signature-area">
              <div class="signature-box">
                <div class="signature-line">${signature || 'Doctor Signature'}</div>
              </div>
            </div>
            ${printSettings.showFooter && (doctorSettings as any).receiptFooter ? `<div class="footer">${(doctorSettings as any).receiptFooter}</div>` : ''}
          </div>
        </body>
      </html>
    `;

    triggerPrint(printHtml);
  };

  // Function to show visit details modal
  const showVisitDetails = (visit: Visit) => {
    setSelectedVisit(visit);
    setVisitDetailsVisible(true);
  };

  const resolveVisitTypeName = (rawValue: string): string => {
    if (!rawValue) return '';
    const byId = availableVisitTypes.find(t => t.type_id === rawValue);
    if (byId) return language === 'en' ? (byId.name || rawValue) : (byId.name_ar || rawValue);
    const byNameAr = availableVisitTypes.find(t => t.name_ar === rawValue);
    if (byNameAr) return language === 'en' ? (byNameAr.name || rawValue) : (byNameAr.name_ar || rawValue);
    const byName = availableVisitTypes.find(t => t.name === rawValue);
    if (byName) return language === 'en' ? (byName.name || rawValue) : (byName.name_ar || rawValue);
    return rawValue;
  };

  const frequencyMap: Record<string, string> = {
    'مرة واحدة': 'Once',
    'مرتين': 'Twice',
    '3 مرات': '3 times',
    '4 مرات': '4 times',
    'يومياً': 'Daily',
  };

  const periodMap: Record<string, string> = {
    'يوميًا': 'Daily',
    'يومياً': 'Daily',
    '1 يوم': '1 day',
    '2 يوم': '2 days',
    '3 يوم': '3 days',
    '4 يوم': '4 days',
    '5 يوم': '5 days',
    '6 يوم': '6 days',
    'أسبوع': 'Week',
    'أسبوعين': '2 weeks',
    '3 اسابيع': '3 weeks',
    'شهر': 'Month',
  };

  const timingMap: Record<string, string> = {
    'قبل النوم': 'Before sleep',
    'بعد الأكل': 'After meals',
    'قبل الأكل': 'Before meals',
  };

  const translateDrugField = (value: string, map: Record<string, string>): string => {
    if (language === 'en' && value && map[value]) return map[value];
    return value || '';
  };

  // Column definitions for the receipts table
  const receiptsColumns = [
    {
      title: language === 'en' ? 'Date' : 'التاريخ',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => moment(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: language === 'en' ? 'Drugs' : 'الأدوية',
      dataIndex: 'drugs',
      key: 'drugs',
      render: (drugs: any[]) => drugs && drugs.length > 0 ?
        drugs.map(drug => {
          const freq = translateDrugField(drug.frequency, frequencyMap);
          const parts = [drug.drug];
          if (freq && freq !== '_') parts.push(freq);
          const period = translateDrugField(drug.period, periodMap);
          if (period && period !== '_') parts.push(period);
          const timing = translateDrugField(drug.timing, timingMap);
          if (timing && timing !== '_') parts.push(timing);
          return parts.join(' - ');
        }).join(', ') :
        (language === 'en' ? 'No drugs' : 'لا توجد أدوية')
    },
    {
      title: language === 'en' ? 'Notes' : 'ملاحظات',
      dataIndex: 'notes',
      key: 'notes'
    },
    {
      title: language === 'en' ? 'Visit Type' : 'نوع الزيارة',
      dataIndex: 'visit_type',
      key: 'visit_type',
      render: (vt: string) => resolveVisitTypeName(vt || '') || '—'
    },
    {
      title: language === 'en' ? 'Actions' : 'إجراءات',
      key: 'actions',
      render: (_: any, record: Receipt) => (
        <Button type="link" onClick={() => onPrintReceipt(record)}>
          {language === 'en' ? 'Print' : 'طباعة'}
        </Button>
      )
    }
  ];

  const handlePrintExternalServices = () => {
    const pendingRequests = externalRequests.filter(r => r.status === 'pending');

    if (pendingRequests.length === 0) {
      return;
    }

    const printSettings = doctorSettings.printSettings || {
      paperSize: 'a4',
      marginTop: 0,
      marginLeft: 0,
      marginRight: 0,
      showHeader: true,
      showFooter: true,
      showPatientInfo: true
    };

    const isCustomPaper = !printSettings.showHeader;

    const printHtml = `
      <html>
        <head>
          <title>طلب فحوصات</title>
          <style>
            @page {
              size: ${printSettings.paperSize === 'custom' ? 'auto' : printSettings.paperSize};
              margin: 0;
            }
            html, body { font-family: Arial, sans-serif; direction: ltr; margin: 0; padding: 0; }
            .top-spacer { display: block; height: ${((printSettings.marginTop || 0) / 2)}mm; width: 100%; }
            .content {
              padding-top: 0;
              padding-left: calc(${((printSettings.marginLeft || 0) / 2)}mm + 10px);
              padding-right: calc(${((printSettings.marginRight || 0) / 2)}mm + 10px);
              padding-bottom: 0;
              box-sizing: border-box;
            }
            .patient-info {
              margin-bottom: 16px; padding: 10px;
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
          <div class="top-spacer"></div>
          <div class="content">
            <div class="patient-info">
              <p><strong>Patient:</strong> ${selectedPatient?.patient_name || ''}</p>
              <p><strong>Age:</strong> ${selectedPatient?.age || ''}</p>
              <p><strong>Phone:</strong> ${selectedPatient?.patient_phone || ''}</p>
              <p><strong>Date:</strong> ${moment().format('DD-MM-YYYY')}</p>
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
    `;

    triggerPrint(printHtml);
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
                  icon={<GiftOutlined />}
                  onClick={() => {
                    setSelectedPackageToAssign(null);
                    const doctorId = localStorage.getItem('doctorId');
                    if (doctorId) {
                      axios.get(`${API.BASE_URL}${API.ENDPOINTS.DOCTOR_PACKAGES(doctorId)}`, { params: { activeOnly: 'true' } })
                        .then(res => { if (res.data?.success) setDoctorPackagesForAssign(res.data.data || []); });
                    }
                    setAssignPackageModalVisible(true);
                  }}
                  style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                >
                  Assign Package
                </Button>
                <Button
                  type="primary"
                  icon={<PercentageOutlined />}
                  onClick={() => setDiscountModalVisible(true)}
                  style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
                >
                  Discount
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
                <Button
                  type="primary"
                  icon={<SwapOutlined />}
                  onClick={() => setReferralModalVisible(true)}
                  style={{ backgroundColor: '#08979c', borderColor: '#08979c' }}
                >
                  Referral Letter
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
        {selectedPatient.file_number && (
          <div style={{ marginBottom: 16 }}>
            <Tag color="gold" style={{ fontSize: 15, padding: '4px 14px', fontWeight: 700, letterSpacing: 1 }}>
              رقم ملف: {selectedPatient.file_number}
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
                <Tag color="blue">{resolveVisitTypeName(selectedPatient.visit_type || '') || 'Regular'}</Tag>
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

        {/* Package balance */}
        {(allPatientPackages.length > 0 || activePackages.length > 0) && (
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f0f5ff' }} title={<Space><GiftOutlined /> Package balance</Space>}>
            <List
              size="small"
              dataSource={allPatientPackages.length > 0 ? allPatientPackages : activePackages}
              renderItem={(pp: PatientPackage) => (
                <List.Item>
                  <Space direction="vertical" size={0}>
                    <Text strong>{pp.package_name}</Text>
                    <Text type="secondary">Remaining: {pp.remaining_sessions} / {pp.total_sessions} · Status: <Tag color={pp.status === 'active' ? 'green' : pp.status === 'finished' ? 'blue' : 'default'}>{pp.status}</Tag></Text>
                    {pp.expiry_date && <Text type="secondary">Expires: {moment(pp.expiry_date).format('YYYY-MM-DD')}</Text>}
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        )}

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
        <Title level={4}>{language === 'en' ? 'Prescription History' : 'سجل الروشتات'}</Title>
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

        {/* Complaint & Diagnosis history */}
        <Title level={4}>
          <FileTextOutlined style={{ color: '#52c41a' }} /> Complaint & Diagnosis / الشكوى والتشخيص
        </Title>

        {/* Add new entry form */}
        {addComplaintVisible ? (
          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <div style={{ marginBottom: 4, fontWeight: 500 }}>Complaint / الشكوى</div>
                <textarea
                  rows={3}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14, resize: 'vertical' }}
                  value={newComplaint}
                  onChange={e => setNewComplaint(e.target.value)}
                  placeholder="Enter complaint..."
                />
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ marginBottom: 4, fontWeight: 500 }}>Diagnosis / التشخيص</div>
                <textarea
                  rows={3}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14, resize: 'vertical' }}
                  value={newDiagnosis}
                  onChange={e => setNewDiagnosis(e.target.value)}
                  placeholder="Enter diagnosis..."
                />
              </Col>
              <Col xs={24}>
                <Button
                  type="primary"
                  loading={addComplaintLoading}
                  style={{ marginRight: 8, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  onClick={async () => {
                    if (!newComplaint.trim() && !newDiagnosis.trim()) return;
                    try {
                      setAddComplaintLoading(true);
                      const doctorId = selectedPatient?.doctor_id || localStorage.getItem('doctorId');
                      await axios.post(`${API.BASE_URL}/api/patients/complaint-history`, {
                        patient_id: selectedPatient?.patient_id,
                        doctor_id: doctorId,
                        complaint: newComplaint.trim(),
                        diagnosis: newDiagnosis.trim(),
                      });
                      setNewComplaint('');
                      setNewDiagnosis('');
                      setAddComplaintVisible(false);
                      // Refresh history
                      const response = await axios.get<PatientHistoryResponse>(`${API.BASE_URL}/api/patients/visits`, {
                        params: { patient_id: selectedPatient?.patient_id, doctor_id: doctorId, page: 1, limit: 9999 }
                      });
                      setPatientHistory(response.data);
                    } catch (err) {
                      console.error('Failed to add complaint entry', err);
                    } finally {
                      setAddComplaintLoading(false);
                    }
                  }}
                >
                  Save
                </Button>
                <Button onClick={() => { setAddComplaintVisible(false); setNewComplaint(''); setNewDiagnosis(''); }}>
                  Cancel
                </Button>
              </Col>
            </Row>
          </div>
        ) : (
          <Button
            icon={<PlusOutlined />}
            style={{ marginBottom: 12 }}
            onClick={() => setAddComplaintVisible(true)}
          >
            Add Complaint & Diagnosis
          </Button>
        )}

        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <Table
            size="small"
            dataSource={(() => {
              // Combine complaint_history entries + visit-level entries, dedupe, sort newest first
              const fromHistory = (patientHistory?.complaint_history || []).map((e: any) => ({
                _key: e._id || e.date,
                date: e.date,
                complaint: e.complaint,
                diagnosis: e.diagnosis,
                source: 'history'
              }));
              const fromVisits = (patientHistory?.visits || [])
                .filter((v: Visit) => v.complaint || v.diagnosis)
                .map((v: Visit) => ({
                  _key: v.visit_id || v._id,
                  date: v.date,
                  complaint: v.complaint,
                  diagnosis: v.diagnosis,
                  source: 'visit'   // date only — v.time is queue time, not complaint time
                }));
              return [...fromHistory, ...fromVisits].sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());
            })()}
            rowKey={(r: any) => r._key || r.date}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            locale={{ emptyText: 'No complaint or diagnosis recorded yet' }}
            columns={[
              {
                title: 'Date / التاريخ',
                dataIndex: 'date',
                key: 'date',
                width: 160,
                render: (date: string, record: any) =>
                  date
                    ? record.source === 'history'
                      ? moment(date).format('DD MMM YYYY · HH:mm')  // accurate — saved by button
                      : moment(date).format('DD MMM YYYY')           // visit date only — time is queue time, not complaint time
                    : '—'
              },
              {
                title: 'Complaint / الشكوى',
                dataIndex: 'complaint',
                key: 'complaint',
                render: (text: string) => text
                  ? <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
                  : <span style={{ color: '#bbb' }}>—</span>
              },
              {
                title: 'Diagnosis / التشخيص',
                dataIndex: 'diagnosis',
                key: 'diagnosis',
                render: (text: string) => text
                  ? <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
                  : <span style={{ color: '#bbb' }}>—</span>
              }
            ]}
          />
        </div>

        <Divider />

        {/* Referrals Section */}
        <Title level={4}>
          <SwapOutlined style={{ color: '#08979c' }} /> Referral Letters / خطابات الإحالة
        </Title>
        {referralsLoading ? (
          <div style={{ marginBottom: 24, color: '#999' }}>Loading referrals...</div>
        ) : patientReferrals.length > 0 ? (
          <div style={{ marginBottom: 24 }}>
            {patientReferrals.map((ref: any, idx: number) => (
              <Card
                key={ref.referral_id || idx}
                style={{ marginBottom: 12, borderLeft: '4px solid #08979c' }}
                size="small"
                extra={
                  <Button
                    size="small"
                    icon={<PrinterOutlined />}
                    onClick={() => {
                      const printSettings = (doctorSettings as any).printSettings || { paperSize: 'a4', marginTop: 0, marginLeft: 0, marginRight: 0, showHeader: true, showFooter: true };
                      const isCustomPaper = !printSettings.showHeader;
                      const clinicHeaderParts: string[] = [];
                      if (doctorSettings.clinicName) clinicHeaderParts.push(`<h1 style="margin:4px 0">${doctorSettings.clinicName}</h1>`);
                      if (doctorSettings.doctorTitle) clinicHeaderParts.push(`<h3 style="margin:4px 0">${doctorSettings.doctorTitle}</h3>`);
                      if (doctorSettings.clinicAddress) clinicHeaderParts.push(`<p style="margin:2px 0">${doctorSettings.clinicAddress}</p>`);
                      if (doctorSettings.clinicPhone) clinicHeaderParts.push(`<p style="margin:2px 0">Phone: ${doctorSettings.clinicPhone}</p>`);
                      const referralDate = ref.referral_date ? moment(ref.referral_date).format('D MMMM YYYY') : moment().format('D MMMM YYYY');
                      const html = `
                        <html><head><title>Referral Letter</title>
                        <style>
                          * { box-sizing: border-box; }
                          @page { size: ${printSettings.paperSize === 'custom' ? 'auto' : (printSettings.paperSize || 'a4')}; margin: 0; }
                          html, body { font-family: Georgia, 'Times New Roman', serif; direction: ltr; margin: 0; padding: 0; color: #1a1a1a; font-size: 13px; line-height: 1.7; }
                          .top-spacer { display: block; height: ${((printSettings.marginTop || 0) / 2)}mm; width: 100%; }
                          .page { padding: 0 calc(${((printSettings.marginLeft || 0) / 2)}mm + 20px); }
                          .header { text-align: center; border-bottom: ${isCustomPaper ? 'none' : '2px solid #1a1a1a'}; padding-bottom: 8px; margin-bottom: 16px; display: ${isCustomPaper ? 'none' : 'block'}; }
                          h1 { margin: 3px 0; font-size: 18px; } h2 { margin: 3px 0; font-size: 16px; } h3 { margin: 2px 0; font-size: 14px; }
                          .doc-date { text-align: right; margin-bottom: 20px; }
                          .letter-block { margin-bottom: 14px; }
                          .label { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #555; letter-spacing: 0.5px; }
                          .divider { border: none; border-top: 1px solid #ccc; margin: 14px 0; }
                          .subject-line { font-size: 14px; font-weight: bold; margin-bottom: 14px; text-decoration: underline; }
                          .body-text { white-space: pre-wrap; margin-bottom: 20px; }
                          .sig-line { border-top: 1px solid #333; padding-top: 6px; margin-top: 36px; }
                          .footer { margin-top: 20px; border-top: ${isCustomPaper ? 'none' : '1px solid #ccc'}; padding-top: 8px; text-align: center; font-style: italic; font-size: 11px; color: #666; display: ${printSettings.showFooter ? 'block' : 'none'}; }
                        </style></head><body>
                        <div class="top-spacer"></div>
                        <div class="page">
                          <div class="header">${clinicHeaderParts.length > 0 ? clinicHeaderParts.join('') : '<h2>Medical Clinic</h2>'}</div>
                          <div class="doc-date">Date: ${referralDate}</div>
                          <div class="letter-block"><div class="label">From:</div><div class="value"><strong>${ref.from_doctor_name || ''}</strong>${ref.from_doctor_title ? `<br/>${ref.from_doctor_title}` : ''}${ref.from_clinic_name ? `<br/>${ref.from_clinic_name}` : ''}</div></div>
                          <hr class="divider"/>
                          <div class="letter-block"><div class="label">To:</div><div class="value"><strong>${ref.to_doctor_name || ''}</strong>${ref.to_doctor_title ? `<br/>${ref.to_doctor_title}` : ''}${ref.to_clinic_name ? `<br/>${ref.to_clinic_name}` : ''}</div></div>
                          <hr class="divider"/>
                          <div class="subject-line">Subject: ${ref.subject || ''}</div>
                          <div class="salutation">Dear ${ref.to_doctor_name ? ref.to_doctor_name.split(' ').pop() : 'Doctor'},</div>
                          <div class="body-text">${(ref.referral_body || '').replace(/\n/g, '<br/>')}</div>
                          <div>Kind regards,</div>
                          <div class="sig-line"><strong>${ref.signature || ref.from_doctor_name || ''}</strong>${ref.from_doctor_title ? `<br/><span style="font-size:12px;color:#555">${ref.from_doctor_title}</span>` : ''}${ref.from_doctor_phone ? `<br/><span style="font-size:12px;color:#555">Phone: ${ref.from_doctor_phone}</span>` : ''}</div>
                          ${printSettings.showFooter && (doctorSettings as any).receiptFooter ? `<div class="footer">${(doctorSettings as any).receiptFooter}</div>` : ''}
                        </div></body></html>`;
                      import('./printUtils').then(m => m.printHtml(html));
                    }}
                  >
                    Print
                  </Button>
                }
              >
                <Row gutter={[16, 8]}>
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Date</Text>
                    <div style={{ fontWeight: 600 }}>
                      {ref.referral_date ? moment(ref.referral_date).format('DD MMM YYYY') : '—'}
                    </div>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Subject</Text>
                    <div style={{ fontWeight: 500 }}>{ref.subject || '—'}</div>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>From</Text>
                    <div>{ref.from_doctor_name || '—'}{ref.from_doctor_title ? ` · ${ref.from_doctor_title}` : ''}</div>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>To</Text>
                    <div>{ref.to_doctor_name || '—'}{ref.to_doctor_title ? ` · ${ref.to_doctor_title}` : ''}</div>
                    {ref.to_clinic_name && <div style={{ fontSize: 12, color: '#888' }}>{ref.to_clinic_name}</div>}
                  </Col>
                  {ref.referral_body && (
                    <Col xs={24}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Summary</Text>
                      <div style={{ marginTop: 4, padding: '8px 12px', background: '#f0faff', borderRadius: 6, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', border: '1px solid #bae0ff', maxHeight: 120, overflow: 'hidden' }}>
                        {ref.referral_body.length > 300 ? ref.referral_body.slice(0, 300) + '…' : ref.referral_body}
                      </div>
                    </Col>
                  )}
                </Row>
              </Card>
            ))}
          </div>
        ) : (
          <div style={{ marginBottom: 24, color: '#999' }}>No referral letters yet</div>
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
                  {resolveVisitTypeName(selectedVisit.visit_type || '') || 'Not specified'}
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
        visitId={undefined}
        onBillingComplete={() => {
          setBillingModalVisible(false);
          if (selectedPatient?.patient_id) {
            const doctorId = localStorage.getItem('doctorId');
            if (doctorId) {
              axios.get(`${API.BASE_URL}${API.ENDPOINTS.PATIENT_ACTIVE_PACKAGES(selectedPatient.patient_id)}`, { params: { doctor_id: doctorId } })
                .then(r => { if (r.data?.success) setActivePackages(r.data.data || []); });
              axios.get(`${API.BASE_URL}${API.ENDPOINTS.PATIENT_PACKAGES(selectedPatient.patient_id)}`, { params: { doctor_id: doctorId } })
                .then(r => { if (r.data?.success) setAllPatientPackages(r.data.data || []); });
            }
          }
        }}
      />

      {/* Active package popup */}
      <Modal
        title="Patient has an active package"
        open={activePackagePopupVisible && activePackages.length > 0}
        onCancel={() => setActivePackagePopupVisible(false)}
        footer={[<Button key="ok" type="primary" onClick={() => setActivePackagePopupVisible(false)}>OK</Button>]}
      >
        {activePackages.map(pp => (
          <div key={pp.patient_package_id} style={{ marginBottom: 12 }}>
            <Text strong>{pp.package_name}</Text>
            <br />
            <Text>Remaining Sessions: {pp.remaining_sessions}</Text>
            {pp.expiry_date && <><br /><Text type="secondary">Expiry: {moment(pp.expiry_date).format('YYYY-MM-DD')}</Text></>}
          </div>
        ))}
      </Modal>

      {/* Assign Package Modal */}
      <Modal
        title="Assign Package to Patient"
        open={assignPackageModalVisible}
        onCancel={() => { setAssignPackageModalVisible(false); setSelectedPackageToAssign(null); }}
        onOk={handleAssignPackage}
        okText="Assign"
        confirmLoading={assignPackageSubmitting}
        okButtonProps={{ disabled: !selectedPackageToAssign }}
      >
        <Select
          placeholder="Select a package"
          style={{ width: '100%' }}
          value={selectedPackageToAssign || undefined}
          onChange={(v) => setSelectedPackageToAssign(v)}
          showSearch
          optionFilterProp="children"
        >
          {doctorPackagesForAssign.map((p: any) => (
            <Select.Option key={p.package_id} value={p.package_id}>
              {p.name} – {p.sessions_count} sessions, {p.price?.toLocaleString()} EGP
            </Select.Option>
          ))}
        </Select>
      </Modal>

      {/* Discount Modal */}
      <Modal
        title="Apply Discount"
        open={discountModalVisible}
        onCancel={() => setDiscountModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="vertical"
          onFinish={handleApplyDiscount}
        >
          <Form.Item
            name="amount"
            label="Discount Amount (EGP)"
            rules={[{ required: true, message: 'Enter discount amount' }, { type: 'number', min: 0.01, message: 'Amount must be greater than 0' }]}
          >
            <InputNumber min={0.01} step={1} placeholder="e.g. 50" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Reason (optional)">
            <Input.TextArea rows={2} placeholder="e.g. خصم لظروف خاصة" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setDiscountModalVisible(false)} disabled={discountSubmitting}>Cancel</Button>
              <Button type="primary" htmlType="submit" icon={<PercentageOutlined />} loading={discountSubmitting} disabled={discountSubmitting}>
                Apply Discount
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

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
            } catch { }
          }
        }}
      />

      {/* Referral Modal */}
      <ReferralModal
        visible={referralModalVisible}
        onCancel={() => setReferralModalVisible(false)}
        patient={selectedPatient}
        onReferralSaved={async () => {
          if (selectedPatient?._id) {
            try {
              const res = await axios.get(
                `${API.BASE_URL}${API.ENDPOINTS.REFERRALS(selectedPatient._id)}`
              );
              if (res.data?.success) {
                const sorted = (res.data.referrals || []).slice().reverse();
                setPatientReferrals(sorted);
              }
            } catch { }
          }
        }}
      />
    </>
  );
};

export default PatientDetail;