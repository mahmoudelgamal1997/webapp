import React, { useState, useEffect } from 'react';
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
        message.success('تم حفظ التقرير الطبي بنجاح');
        onReportSaved?.();
      } else {
        message.error('فشل حفظ التقرير الطبي');
      }
    } catch (error) {
      console.error('Error saving medical report:', error);
      message.error('فشل حفظ التقرير الطبي');
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
    patientAge: string
  ): string => {
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
      clinicInfoParts.push(`<h1 style="margin:4px 0">${(selectedClinic as any).name || 'عيادة'}</h1>`);
      if ((selectedClinic as any).address) clinicInfoParts.push(`<p style="margin:2px 0">${(selectedClinic as any).address}</p>`);
      if ((selectedClinic as any).phone) clinicInfoParts.push(`<p style="margin:2px 0">هاتف: ${(selectedClinic as any).phone}</p>`);
    }
    if (doctorSettings.clinicName) clinicInfoParts.push(`<h1 style="margin:4px 0">${doctorSettings.clinicName}</h1>`);
    if (doctorSettings.doctorTitle) clinicInfoParts.push(`<h3 style="margin:4px 0">${doctorSettings.doctorTitle}</h3>`);
    if (doctorSettings.clinicAddress) clinicInfoParts.push(`<p style="margin:2px 0">${doctorSettings.clinicAddress}</p>`);
    if (doctorSettings.clinicPhone) clinicInfoParts.push(`<p style="margin:2px 0">هاتف: ${doctorSettings.clinicPhone}</p>`);

    return `
      <html>
        <head>
          <title>تقرير طبي</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              direction: rtl;
              margin: 0;
              padding: 0;
              color: #222;
            }
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
            .title {
              font-size: 20px;
              font-weight: bold;
              margin: 16px 0 6px;
              text-align: center;
              letter-spacing: 1px;
            }
            .patient-info {
              background: ${isCustomPaper ? 'transparent' : '#f8f8f8'};
              border-radius: 6px;
              padding: 12px 16px;
              margin-bottom: 20px;
              font-size: 14px;
              display: ${printSettings.showPatientInfo ? 'block' : 'none'};
            }
            .patient-info p { margin: 4px 0; }
            .section { margin-bottom: 18px; }
            .section-label {
              font-weight: bold;
              font-size: 15px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 4px;
              margin-bottom: 8px;
              color: #444;
            }
            .section-content {
              font-size: 14px;
              line-height: 1.8;
              white-space: pre-wrap;
            }
            .signature-area {
              margin-top: 50px;
              display: flex;
              justify-content: flex-end;
            }
            .signature-box { text-align: center; min-width: 180px; }
            .signature-line {
              border-top: 1px solid #333;
              margin-top: 40px;
              padding-top: 6px;
              font-size: 13px;
            }
            .footer {
              margin-top: 30px;
              border-top: ${isCustomPaper ? 'none' : '1px solid #ccc'};
              padding-top: 10px;
              text-align: center;
              font-style: italic;
              font-size: 12px;
              color: #666;
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
              ${doctorSettings.receiptHeader ? `<div class="custom-header">${doctorSettings.receiptHeader}</div>` : ''}
            </div>

            <div class="title">تقـريـر طـبـي &nbsp;|&nbsp; Medical Report</div>

            <div class="patient-info">
              <p><strong>اسم المريض:</strong> ${patientName}</p>
              <p><strong>العمر:</strong> ${patientAge}</p>
              <p><strong>التاريخ:</strong> ${reportDate}</p>
            </div>

            ${diagnosis ? `
            <div class="section">
              <div class="section-label">التشخيص</div>
              <div class="section-content">${diagnosis.replace(/\n/g, '<br/>')}</div>
            </div>` : ''}

            ${medicalReportText ? `
            <div class="section">
              <div class="section-label">التقرير الطبي</div>
              <div class="section-content">${medicalReportText.replace(/\n/g, '<br/>')}</div>
            </div>` : ''}

            <div class="signature-area">
              <div class="signature-box">
                <div class="signature-line">${signature || 'توقيع الطبيب'}</div>
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
      message.warning('الرجاء إدخال بيانات التقرير قبل الطباعة');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(buildMedicalReportHtml(
      diagnosis,
      medicalReportText,
      signature,
      moment().format('DD / MM / YYYY'),
      patient?.patient_name || '',
      patient?.age || ''
    ));
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Modal
      title={
        <Space>
          <MedicineBoxOutlined style={{ color: '#52c41a' }} />
          <span>تقرير طبي &nbsp;|&nbsp; Medical Report</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      style={{ direction: 'rtl', textAlign: 'right' }}
      width={640}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
      >
        {/* Diagnosis */}
        <Form.Item name="diagnosis" label="التشخيص / Diagnosis">
          <TextArea placeholder="أدخل التشخيص" rows={3} />
        </Form.Item>

        {/* Diagnosis suggestions from previous visits */}
        {diagnosisSuggestions.length > 0 && (
          <div style={{ marginTop: -12, marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              اقتراحات من الزيارات السابقة — انقر للملء:
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
          label="التقرير الطبي / Medical Report"
          rules={[{ required: true, message: 'الرجاء إدخال التقرير الطبي' }]}
        >
          <TextArea
            placeholder="أدخل التقرير الطبي هنا..."
            rows={6}
            style={{ fontSize: 14 }}
          />
        </Form.Item>

        {/* Signature */}
        <Form.Item name="signature" label="التوقيع / Signature">
          <Input placeholder="اسم الطبيب / التوقيع" />
        </Form.Item>

        {/* Action buttons */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>إلغاء</Button>
            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrint}
            >
              طباعة
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={isLoading}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              حفظ التقرير
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MedicalReportModal;
