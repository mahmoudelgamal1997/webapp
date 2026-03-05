import React, { useState, useEffect } from 'react';
import { printHtml } from './printUtils';
import {
  Modal, Form, Input, Button, message, Tag, Space, Typography, Divider
} from 'antd';
import { PrinterOutlined, SaveOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import axios from 'axios';
import API from '../config/api';
import { useDoctorContext } from './DoctorContext';
import { useClinicContext } from './ClinicContext';
import moment from 'moment';

const { TextArea } = Input;
const { Text } = Typography;

interface MedicalReport {
  report_id: string;
  diagnosis: string;
  medical_report: string;
  signature: string;
  doctor_id: string;
  doctor_name: string;
  date: string;
}

interface Patient {
  _id: string;
  patient_name: string;
  patient_phone: string;
  age: string;
  address?: string;
  [key: string]: any;
}

interface MedicalReportModalProps {
  visible: boolean;
  onCancel: () => void;
  patient: Patient | null;
  previousDiagnoses?: string[];
  onReportSaved?: () => void;
}

const MedicalReportModal: React.FC<MedicalReportModalProps> = ({
  visible,
  onCancel,
  patient,
  previousDiagnoses = [],
  onReportSaved
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  // Default to English
  const [lang, setLang] = useState<'en' | 'ar'>('en');

  const { settings: doctorSettings, doctorId } = useDoctorContext();
  const { selectedClinic } = useClinicContext();

  const doctorDisplayName =
    doctorSettings.doctorTitle ||
    doctorSettings.clinicName ||
    localStorage.getItem('doctorName') ||
    '';

  // Unique non-empty suggestions
  const diagnosisSuggestions = Array.from(
    new Set(previousDiagnoses.filter(d => d && d.trim()))
  );

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({ signature: doctorDisplayName });
      setLang('en'); // always reset to EN when opened
    }
  }, [visible, form, doctorDisplayName]);

  const handleSuggestedDiagnosis = (diagnosis: string) => {
    form.setFieldsValue({ diagnosis });
  };

  const handleSave = async (values: any) => {
    if (!patient) return;
    try {
      setIsLoading(true);
      const payload = {
        diagnosis: values.diagnosis || '',
        medical_report: values.medical_report || '',
        signature: values.signature || '',
        doctor_id: doctorId || localStorage.getItem('doctorId') || '',
        doctor_name: doctorDisplayName
      };

      const response = await axios.post(
        `${API.BASE_URL}${API.ENDPOINTS.MEDICAL_REPORTS(patient._id)}`,
        payload
      );

      if (response.data?.success) {
        message.success(lang === 'ar' ? 'تم حفظ التقرير الطبي بنجاح' : 'Medical report saved successfully');
        onReportSaved?.();
      } else {
        message.error(lang === 'ar' ? 'فشل حفظ التقرير الطبي' : 'Failed to save medical report');
      }
    } catch (error) {
      console.error('Error saving medical report:', error);
      message.error(lang === 'ar' ? 'فشل حفظ التقرير الطبي' : 'Failed to save medical report');
    } finally {
      setIsLoading(false);
    }
  };

  const buildMedicalReportHtml = (
    diagnosis: string,
    medicalReportText: string,
    signature: string,
    reportDate: string,
    patientName: string,
    patientAge: string,
    printLang: 'en' | 'ar'
  ): string => {
    const isAr = printLang === 'ar';
    const dir = isAr ? 'rtl' : 'ltr';

    const printSettings = (doctorSettings as any).printSettings || {
      paperSize: 'a4',
      marginTop: 0,
      showHeader: true,
      showFooter: true,
      showPatientInfo: true,
    };
    const isCustomPaper = !printSettings.showHeader;

    const clinicInfoParts: string[] = [];
    if (selectedClinic) {
      clinicInfoParts.push(`<h1 style="margin:4px 0">${(selectedClinic as any).name || (isAr ? 'عيادة' : 'Clinic')}</h1>`);
      if ((selectedClinic as any).address) clinicInfoParts.push(`<p style="margin:2px 0">${(selectedClinic as any).address}</p>`);
      if ((selectedClinic as any).phone) clinicInfoParts.push(`<p style="margin:2px 0">${isAr ? 'هاتف' : 'Phone'}: ${(selectedClinic as any).phone}</p>`);
    }
    if (doctorSettings.clinicName) clinicInfoParts.push(`<h1 style="margin:4px 0">${doctorSettings.clinicName}</h1>`);
    if (doctorSettings.doctorTitle) clinicInfoParts.push(`<h3 style="margin:4px 0">${doctorSettings.doctorTitle}</h3>`);
    if (doctorSettings.clinicAddress) clinicInfoParts.push(`<p style="margin:2px 0">${doctorSettings.clinicAddress}</p>`);
    if (doctorSettings.clinicPhone) clinicInfoParts.push(`<p style="margin:2px 0">${isAr ? 'هاتف' : 'Phone'}: ${doctorSettings.clinicPhone}</p>`);

    const labels = isAr
      ? {
        title: 'تقـريـر طـبـي',
        patient: 'المريض',
        age: 'العمر',
        date: 'التاريخ',
        diagnosis: 'التشخيص',
        report: 'التقرير الطبي',
        signature: 'توقيع الطبيب',
        clinic: 'عيادة طبية',
      }
      : {
        title: 'Medical Report',
        patient: 'Patient',
        age: 'Age',
        date: 'Date',
        diagnosis: 'Diagnosis',
        report: 'Medical Report',
        signature: 'Doctor Signature',
        clinic: 'Medical Clinic',
      };

    return `
      <html>
        <head>
          <title>${labels.title}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              direction: ${dir};
              margin: 0;
              padding: 0;
              color: #222;
            }
            @page {
              size: ${printSettings.paperSize === 'custom' ? 'auto' : (printSettings.paperSize || 'a4')};
              margin: 0;
            }
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
              padding-bottom: 6px;
              margin-bottom: 8px;
              display: ${isCustomPaper ? 'none' : 'block'};
            }
            .title {
              font-size: 17px;
              font-weight: bold;
              margin: 6px 0 4px;
              text-align: center;
              letter-spacing: 1px;
            }
            .patient-info {
              background: ${isCustomPaper ? 'transparent' : '#f8f8f8'};
              border-radius: 4px;
              padding: 6px 10px;
              margin-bottom: 8px;
              font-size: 13px;
              display: ${printSettings.showPatientInfo ? 'block' : 'none'};
            }
            .patient-info p { margin: 2px 0; }
            .section { margin-bottom: 8px; }
            .section-label {
              font-weight: bold;
              font-size: 13px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 2px;
              margin-bottom: 4px;
              color: #444;
            }
            .section-content {
              font-size: 13px;
              line-height: 1.5;
              white-space: pre-wrap;
            }
            .signature-area {
              margin-top: 16px;
              display: flex;
              justify-content: flex-end;
            }
            .signature-box { text-align: center; min-width: 160px; }
            .signature-line {
              border-top: 1px solid #333;
              margin-top: 20px;
              padding-top: 4px;
              font-size: 12px;
            }
            .footer {
              margin-top: 10px;
              border-top: ${isCustomPaper ? 'none' : '1px solid #ccc'};
              padding-top: 6px;
              text-align: center;
              font-style: italic;
              font-size: 11px;
              color: #666;
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
              ${clinicInfoParts.length > 0 ? clinicInfoParts.join('') : `<h2>${labels.clinic}</h2>`}
              ${doctorSettings.receiptHeader ? `<div class="custom-header">${doctorSettings.receiptHeader}</div>` : ''}
            </div>

            <div class="title">${labels.title}</div>

            <div class="patient-info">
              <p><strong>${labels.patient}:</strong> ${patientName}</p>
              <p><strong>${labels.age}:</strong> ${patientAge}</p>
              <p><strong>${labels.date}:</strong> ${reportDate}</p>
            </div>

            ${diagnosis ? `
            <div class="section">
              <div class="section-label">${labels.diagnosis}</div>
              <div class="section-content">${diagnosis.replace(/\n/g, '<br/>')}</div>
            </div>` : ''}

            ${medicalReportText ? `
            <div class="section">
              <div class="section-label">${labels.report}</div>
              <div class="section-content">${medicalReportText.replace(/\n/g, '<br/>')}</div>
            </div>` : ''}

            <div class="signature-area">
              <div class="signature-box">
                <div class="signature-line">${signature || labels.signature}</div>
              </div>
            </div>

            ${printSettings.showFooter && doctorSettings.receiptFooter ? `
            <div class="footer">${doctorSettings.receiptFooter}</div>` : ''}
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const values = form.getFieldsValue();
    const diagnosis = values.diagnosis || '';
    const medicalReportText = values.medical_report || '';
    const signature = values.signature || '';

    if (!medicalReportText && !diagnosis) {
      message.warning(lang === 'ar' ? 'الرجاء إدخال بيانات التقرير قبل الطباعة' : 'Please enter report data before printing');
      return;
    }

    printHtml(buildMedicalReportHtml(
      diagnosis,
      medicalReportText,
      signature,
      moment().format('DD / MM / YYYY'),
      patient?.patient_name || '',
      patient?.age || '',
      lang
    ));
  };

  const isAr = lang === 'ar';

  return (
    <Modal
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <MedicineBoxOutlined style={{ color: '#52c41a' }} />
            <span>Medical Report {isAr ? '| تقرير طبي' : ''}</span>
          </Space>
          {/* Language toggle */}
          <Space size={4}>
            <Button
              size="small"
              type={!isAr ? 'primary' : 'default'}
              onClick={() => setLang('en')}
              style={{ minWidth: 36 }}
            >
              EN
            </Button>
            <Button
              size="small"
              type={isAr ? 'primary' : 'default'}
              onClick={() => setLang('ar')}
              style={{ minWidth: 36 }}
            >
              AR
            </Button>
          </Space>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      style={{ direction: isAr ? 'rtl' : 'ltr', textAlign: isAr ? 'right' : 'left' }}
      width={640}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        style={{ direction: isAr ? 'rtl' : 'ltr' }}
      >
        {/* Diagnosis */}
        <Form.Item
          name="diagnosis"
          label={isAr ? 'التشخيص / Diagnosis' : 'Diagnosis'}
        >
          <TextArea
            placeholder={isAr ? 'أدخل التشخيص' : 'Enter diagnosis'}
            rows={3}
            style={{ direction: isAr ? 'rtl' : 'ltr' }}
          />
        </Form.Item>

        {/* Diagnosis suggestions from previous visits */}
        {diagnosisSuggestions.length > 0 && (
          <div style={{ marginTop: -12, marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {isAr ? 'اقتراحات من الزيارات السابقة — انقر للملء:' : 'Suggestions from previous visits — click to fill:'}
            </Text>
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {diagnosisSuggestions.map((d, i) => (
                <Tag
                  key={i}
                  color="blue"
                  style={{ cursor: 'pointer', marginBottom: 4 }}
                  onClick={() => handleSuggestedDiagnosis(d)}
                >
                  {d}
                </Tag>
              ))}
            </div>
          </div>
        )}

        <Divider style={{ margin: '12px 0' }} />

        {/* Medical Report */}
        <Form.Item
          name="medical_report"
          label={isAr ? 'التقرير الطبي / Medical Report' : 'Medical Report'}
          rules={[{ required: true, message: isAr ? 'الرجاء إدخال التقرير الطبي' : 'Please enter the medical report' }]}
        >
          <TextArea
            placeholder={isAr ? 'أدخل التقرير الطبي هنا...' : 'Enter medical report here...'}
            rows={6}
            style={{ fontSize: 14, direction: isAr ? 'rtl' : 'ltr' }}
          />
        </Form.Item>

        {/* Signature */}
        <Form.Item
          name="signature"
          label={isAr ? 'التوقيع / Signature' : 'Signature'}
        >
          <Input
            placeholder={isAr ? 'اسم الطبيب / التوقيع' : 'Doctor name / Signature'}
            style={{ direction: isAr ? 'rtl' : 'ltr' }}
          />
        </Form.Item>

        {/* Action buttons */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrint}
            >
              {isAr ? 'طباعة' : 'Print'}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={isLoading}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              {isAr ? 'حفظ التقرير' : 'Save Report'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MedicalReportModal;
