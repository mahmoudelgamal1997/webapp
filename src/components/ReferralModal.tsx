import React, { useState, useEffect } from 'react';
import { printHtml } from './printUtils';
import {
    Modal, Form, Input, Button, message, Space, Typography, Divider, Row, Col, DatePicker
} from 'antd';
import { PrinterOutlined, SaveOutlined, SwapOutlined } from '@ant-design/icons';
import axios from 'axios';
import API from '../config/api';
import { useDoctorContext } from './DoctorContext';
import moment from 'moment';

const { Text } = Typography;

interface Patient {
    _id: string;
    patient_name: string;
    patient_phone: string;
    age: string;
    address?: string;
    [key: string]: any;
}

interface ReferralModalProps {
    visible: boolean;
    onCancel: () => void;
    patient: Patient | null;
    onReferralSaved?: () => void;
}

const ReferralModal: React.FC<ReferralModalProps> = ({
    visible,
    onCancel,
    patient,
    onReferralSaved
}) => {
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState(false);

    const { settings: doctorSettings, doctorId } = useDoctorContext();

    const doctorDisplayName =
        doctorSettings.doctorTitle ||
        doctorSettings.clinicName ||
        localStorage.getItem('doctorName') ||
        '';

    const doctorClinicName = doctorSettings.clinicName || '';
    const doctorPhone = doctorSettings.clinicPhone || '';

    useEffect(() => {
        if (visible) {
            form.resetFields();
            form.setFieldsValue({
                from_doctor_name: doctorDisplayName,
                from_clinic_name: doctorClinicName,
                from_doctor_phone: doctorPhone,
                referral_date: moment(),
                subject: patient
                    ? `Referral of Patient – ${patient.patient_name}`
                    : 'Patient Referral',
            });
        }
    }, [visible, form, doctorDisplayName, doctorClinicName, doctorPhone, patient]);

    const buildReferralPrintHtml = (values: any): string => {
        const referralDate = values.referral_date
            ? moment(values.referral_date).format('D MMMM YYYY')
            : moment().format('D MMMM YYYY');

        const fromDoctorName = values.from_doctor_name || '';
        const fromDoctorTitle = values.from_doctor_title || '';
        const fromClinicName = values.from_clinic_name || '';
        const fromPhone = values.from_doctor_phone || '';
        const toDoctorName = values.to_doctor_name || '';
        const toDoctorTitle = values.to_doctor_title || '';
        const toClinicName = values.to_clinic_name || '';
        const subject = values.subject || '';
        const body = values.referral_body || '';
        const signature = values.signature || fromDoctorName;

        const printSettings = (doctorSettings as any).printSettings || {
            paperSize: 'a4',
            marginTop: 0,
            marginLeft: 0,
            marginRight: 0,
            showHeader: true,
            showFooter: true,
        };
        const isCustomPaper = !printSettings.showHeader;

        const clinicHeaderParts: string[] = [];
        if (doctorSettings.clinicName)
            clinicHeaderParts.push(`<h1 style="margin:4px 0">${doctorSettings.clinicName}</h1>`);
        if (doctorSettings.doctorTitle)
            clinicHeaderParts.push(`<h3 style="margin:4px 0">${doctorSettings.doctorTitle}</h3>`);
        if (doctorSettings.clinicAddress)
            clinicHeaderParts.push(`<p style="margin:2px 0">${doctorSettings.clinicAddress}</p>`);
        if (doctorSettings.clinicPhone)
            clinicHeaderParts.push(`<p style="margin:2px 0">Phone: ${doctorSettings.clinicPhone}</p>`);

        return `
      <html>
        <head>
          <title>Referral Letter</title>
          <style>
            * { box-sizing: border-box; }
            @page {
              size: ${printSettings.paperSize === 'custom' ? 'auto' : (printSettings.paperSize || 'a4')};
              margin: 0;
            }
            html, body {
              font-family: 'Georgia', 'Times New Roman', serif;
              direction: ltr;
              margin: 0;
              padding: 0;
              color: #1a1a1a;
              font-size: 13px;
              line-height: 1.7;
            }
            .top-spacer { display: block; height: ${((printSettings.marginTop || 0) / 2)}mm; width: 100%; }
            .page {
              padding-top: 0;
              padding-left: calc(${((printSettings.marginLeft || 0) / 2)}mm + 20px);
              padding-right: calc(${((printSettings.marginRight || 0) / 2)}mm + 20px);
              padding-bottom: 0;
            }
            .header {
              text-align: center;
              border-bottom: ${isCustomPaper ? 'none' : '2px solid #1a1a1a'};
              padding-bottom: 8px;
              margin-bottom: 16px;
              display: ${isCustomPaper ? 'none' : 'block'};
            }
            h1 { margin: 3px 0; font-size: 18px; }
            h2 { margin: 3px 0; font-size: 16px; }
            h3 { margin: 2px 0; font-size: 14px; }
            .doc-date { text-align: right; margin-bottom: 20px; font-size: 13px; }
            .letter-block { margin-bottom: 14px; }
            .letter-block .label { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #555; letter-spacing: 0.5px; }
            .letter-block .value { font-size: 13px; }
            .divider { border: none; border-top: 1px solid #ccc; margin: 14px 0; }
            .subject-line { font-size: 14px; font-weight: bold; margin-bottom: 14px; text-decoration: underline; }
            .salutation { margin-bottom: 10px; }
            .body-text { white-space: pre-wrap; margin-bottom: 20px; }
            .closing { margin-bottom: 30px; }
            .signature-area { display: flex; justify-content: flex-start; }
            .signature-box { min-width: 200px; }
            .signature-name { font-weight: bold; margin-bottom: 2px; }
            .signature-title { font-size: 12px; color: #555; }
            .signature-phone { font-size: 12px; color: #555; }
            .sig-line { border-top: 1px solid #333; padding-top: 6px; margin-top: 36px; }
            .footer {
              margin-top: 20px;
              border-top: ${isCustomPaper ? 'none' : '1px solid #ccc'};
              padding-top: 8px;
              text-align: center;
              font-style: italic;
              font-size: 11px;
              color: #666;
              display: ${printSettings.showFooter ? 'block' : 'none'};
            }
          </style>
        </head>
        <body>
          <div class="top-spacer"></div>
          <div class="page">
            <!-- Clinic Header -->
            <div class="header">
              ${clinicHeaderParts.length > 0 ? clinicHeaderParts.join('') : '<h2>Medical Clinic</h2>'}
              ${(doctorSettings as any).receiptHeader ? `<div>${(doctorSettings as any).receiptHeader}</div>` : ''}
            </div>

            <!-- Date -->
            <div class="doc-date">Date: ${referralDate}</div>

            <!-- From -->
            <div class="letter-block">
              <div class="label">From:</div>
              <div class="value">
                ${fromDoctorName ? `<strong>${fromDoctorName}</strong><br/>` : ''}
                ${fromDoctorTitle ? `${fromDoctorTitle}<br/>` : ''}
                ${fromClinicName ? `${fromClinicName}` : ''}
              </div>
            </div>

            <hr class="divider"/>

            <!-- To -->
            <div class="letter-block">
              <div class="label">To:</div>
              <div class="value">
                ${toDoctorName ? `<strong>${toDoctorName}</strong><br/>` : ''}
                ${toDoctorTitle ? `${toDoctorTitle}<br/>` : ''}
                ${toClinicName ? `${toClinicName}` : ''}
              </div>
            </div>

            <hr class="divider"/>

            <!-- Subject -->
            <div class="subject-line">Subject: ${subject}</div>

            <!-- Salutation -->
            <div class="salutation">Dear ${toDoctorName ? toDoctorName.split(' ').pop() : 'Doctor'},</div>

            <!-- Body -->
            <div class="body-text">${body.replace(/\n/g, '<br/>')}</div>

            <!-- Closing -->
            <div class="closing">Kind regards,</div>

            <!-- Signature Area -->
            <div class="signature-area">
              <div class="signature-box">
                <div class="sig-line">
                  ${signature ? `<div class="signature-name">${signature}</div>` : ''}
                  ${fromDoctorTitle ? `<div class="signature-title">${fromDoctorTitle}</div>` : ''}
                  ${fromPhone ? `<div class="signature-phone">Phone: ${fromPhone}</div>` : ''}
                </div>
              </div>
            </div>

            ${printSettings.showFooter && (doctorSettings as any).receiptFooter
                ? `<div class="footer">${(doctorSettings as any).receiptFooter}</div>`
                : ''}
          </div>
        </body>
      </html>
    `;
    };

    const handleSave = async (values: any) => {
        if (!patient) return;
        try {
            setIsLoading(true);
            const payload = {
                referral_date: values.referral_date
                    ? values.referral_date.toISOString()
                    : new Date().toISOString(),
                from_doctor_name: values.from_doctor_name || '',
                from_doctor_title: values.from_doctor_title || '',
                from_clinic_name: values.from_clinic_name || '',
                from_doctor_phone: values.from_doctor_phone || '',
                to_doctor_name: values.to_doctor_name || '',
                to_doctor_title: values.to_doctor_title || '',
                to_clinic_name: values.to_clinic_name || '',
                subject: values.subject || '',
                referral_body: values.referral_body || '',
                signature: values.signature || values.from_doctor_name || '',
                doctor_id: doctorId || localStorage.getItem('doctorId') || '',
            };

            const response = await axios.post(
                `${API.BASE_URL}${API.ENDPOINTS.REFERRALS(patient._id)}`,
                payload
            );

            if (response.data?.success) {
                message.success('Referral letter saved successfully');
                onReferralSaved?.();
                onCancel();
            } else {
                message.error('Failed to save referral letter');
            }
        } catch (error) {
            console.error('Error saving referral:', error);
            message.error('Failed to save referral letter');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        const values = form.getFieldsValue();
        if (!values.to_doctor_name && !values.referral_body) {
            message.warning('Please fill in the referral details before printing');
            return;
        }
        printHtml(buildReferralPrintHtml(values));
    };

    const handleSaveAndPrint = async () => {
        try {
            await form.validateFields();
            const values = form.getFieldsValue();
            handlePrint();
            await handleSave(values);
        } catch {
            // Validation failed
        }
    };

    return (
        <Modal
            title={
                <Space>
                    <SwapOutlined style={{ color: '#1890ff' }} />
                    <span>Referral Letter / خطاب إحالة</span>
                </Space>
            }
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={720}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
            >
                {/* Date */}
                <Form.Item name="referral_date" label="Date / التاريخ">
                    <DatePicker style={{ width: '100%' }} format="D MMMM YYYY" />
                </Form.Item>

                <Divider orientation="left">
                    <Text type="secondary" style={{ fontSize: 12 }}>FROM / من</Text>
                </Divider>

                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item name="from_doctor_name" label="Doctor Name">
                            <Input placeholder="Dr. Ahmed Hassan" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="from_doctor_title" label="Title / Specialty">
                            <Input placeholder="General Practitioner" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="from_clinic_name" label="Clinic / Hospital">
                            <Input placeholder="Al-Shifa Medical Clinic" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="from_doctor_phone" label="Phone">
                            <Input placeholder="+20 XXX XXX XXXX" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left">
                    <Text type="secondary" style={{ fontSize: 12 }}>TO / إلى</Text>
                </Divider>

                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            name="to_doctor_name"
                            label="Referred To (Doctor Name)"
                            rules={[{ required: true, message: 'Please enter the referred doctor name' }]}
                        >
                            <Input placeholder="Dr. Mohamed Ali" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="to_doctor_title" label="Title / Specialty">
                            <Input placeholder="Consultant Cardiologist" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item name="to_clinic_name" label="Clinic / Hospital">
                            <Input placeholder="Heart Care Center" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left">
                    <Text type="secondary" style={{ fontSize: 12 }}>LETTER / الرسالة</Text>
                </Divider>

                {/* Subject */}
                <Form.Item name="subject" label="Subject / الموضوع">
                    <Input placeholder={`Referral of Patient – ${patient?.patient_name || ''}`} />
                </Form.Item>

                {/* Patient summary auto-hint */}
                {patient && (
                    <div style={{
                        background: '#f6f8fa',
                        border: '1px solid #e0e7ef',
                        borderRadius: 6,
                        padding: '10px 14px',
                        marginBottom: 12,
                        fontSize: 12,
                        color: '#555'
                    }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                            Patient Info (for reference):
                        </Text>
                        <strong>{patient.patient_name}</strong>
                        {patient.age ? `, ${patient.age}` : ''}
                        {patient.patient_phone ? ` · ${patient.patient_phone}` : ''}
                        {patient.address ? ` · ${patient.address}` : ''}
                    </div>
                )}

                <Form.Item
                    name="referral_body"
                    label="Referral Details / تفاصيل الإحالة"
                    rules={[{ required: true, message: 'Please enter referral details' }]}
                >
                    <Input.TextArea
                        rows={8}
                        placeholder={
                            `I am referring my patient, ${patient?.patient_name || '[Patient Name]'}, for further evaluation and management.\n\nThe patient has been experiencing...\n\nMedical history includes...\n\nCurrent medications include:\n  - ...\n\nI would appreciate your expert assessment and recommendations.`
                        }
                        style={{ fontSize: 13 }}
                    />
                </Form.Item>

                {/* Signature */}
                <Form.Item name="signature" label="Signature / التوقيع">
                    <Input placeholder="Dr. Name / Signature" />
                </Form.Item>

                {/* Action Buttons */}
                <Form.Item style={{ marginBottom: 0 }}>
                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button onClick={onCancel}>Cancel</Button>
                        <Button
                            icon={<PrinterOutlined />}
                            onClick={handlePrint}
                        >
                            Print Only
                        </Button>
                        <Button
                            icon={<PrinterOutlined />}
                            onClick={handleSaveAndPrint}
                            loading={isLoading}
                        >
                            Save & Print
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={isLoading}
                            style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
                        >
                            Save Referral
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ReferralModal;
