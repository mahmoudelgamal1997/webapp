import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Radio, Checkbox, Button, Divider, Space, message, Spin, Collapse } from 'antd';
import { SaveOutlined, HistoryOutlined } from '@ant-design/icons';
import axios from 'axios';
import API from '../config/api';
import moment from 'moment';

const { TextArea } = Input;
const { Panel } = Collapse;

interface DynamicHistoryFormProps {
    visible: boolean;
    onCancel: () => void;
    patient: any;
    doctorId: string;
}

const DynamicHistoryForm: React.FC<DynamicHistoryFormProps> = ({
    visible,
    onCancel,
    patient,
    doctorId
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [template, setTemplate] = useState<any>(null);
    const [historyTimeline, setHistoryTimeline] = useState<any[]>([]);
    const [showTimeline, setShowTimeline] = useState(false);

    useEffect(() => {
        if (visible && patient && doctorId) {
            loadTemplateAndHistory();
        }
    }, [visible, patient, doctorId]);

    const loadTemplateAndHistory = async () => {
        try {
            setLoading(true);

            // Load template
            const templateResponse = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.MEDICAL_HISTORY_TEMPLATE}`, {
                params: { doctor_id: doctorId }
            });

            if (templateResponse.data.success) {
                setTemplate(templateResponse.data.data);
            }

            // Load latest patient history for pre-filling
            const historyResponse = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.MEDICAL_HISTORY_PATIENT}`, {
                params: {
                    patient_id: patient.patient_id,
                    doctor_id: doctorId
                }
            });

            if (historyResponse.data.success && historyResponse.data.data) {
                const latestHistory = historyResponse.data.data;

                // Convert Map data to form values
                const formValues: any = {};
                if (latestHistory.data) {
                    Object.keys(latestHistory.data).forEach(key => {
                        const value = latestHistory.data[key];
                        // Handle checkbox values (stored as "true"/"false" strings)
                        if (value === 'true') {
                            formValues[key] = true;
                        } else if (value === 'false') {
                            formValues[key] = false;
                        } else {
                            formValues[key] = value;
                        }
                    });
                }

                form.setFieldsValue(formValues);
            }

            // Load history timeline
            const timelineResponse = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.MEDICAL_HISTORY_TIMELINE}`, {
                params: {
                    patient_id: patient.patient_id,
                    doctor_id: doctorId,
                    limit: 5
                }
            });

            if (timelineResponse.data.success) {
                setHistoryTimeline(timelineResponse.data.data || []);
            }

        } catch (error) {
            console.error('Error loading template and history:', error);
            message.error('Failed to load medical history');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            // Convert form values to string Map
            const dataMap: any = {};
            Object.keys(values).forEach(key => {
                const value = values[key];
                // Convert all values to strings
                if (typeof value === 'boolean') {
                    dataMap[key] = value.toString();
                } else if (value !== undefined && value !== null) {
                    dataMap[key] = value.toString();
                }
            });

            await axios.post(`${API.BASE_URL}${API.ENDPOINTS.MEDICAL_HISTORY_PATIENT}`, {
                patient_id: patient.patient_id,
                doctor_id: doctorId,
                patient_name: patient.patient_name,
                data: dataMap,
                template_snapshot: template,
                recorded_by: doctorId
            });

            message.success('Medical history saved successfully');
            onCancel();
        } catch (error: any) {
            console.error('Error saving history:', error);
            if (error.errorFields) {
                message.error('Please fill in all required fields');
            } else {
                message.error('Failed to save medical history');
            }
        } finally {
            setLoading(false);
        }
    };

    const renderField = (sectionId: string, field: any) => {
        const fieldKey = `${sectionId}.${field.field_id}`;

        switch (field.type) {
            case 'long-text':
                return (
                    <Form.Item
                        key={fieldKey}
                        name={fieldKey}
                        label={field.label}
                        rules={field.required ? [{ required: true, message: 'هذا الحقل مطلوب' }] : []}
                    >
                        <TextArea rows={3} placeholder={field.label} />
                    </Form.Item>
                );

            case 'radio':
                return (
                    <Form.Item
                        key={fieldKey}
                        name={fieldKey}
                        label={field.label}
                        rules={field.required ? [{ required: true, message: 'هذا الحقل مطلوب' }] : []}
                    >
                        <Radio.Group>
                            <Space direction="horizontal">
                                {field.options?.map((option: string) => (
                                    <Radio key={option} value={option}>
                                        {option}
                                    </Radio>
                                ))}
                            </Space>
                        </Radio.Group>
                    </Form.Item>
                );

            case 'checkbox':
                return (
                    <Form.Item
                        key={fieldKey}
                        name={fieldKey}
                        valuePropName="checked"
                    >
                        <Checkbox>{field.label}</Checkbox>
                    </Form.Item>
                );

            case 'text':
            default:
                return (
                    <Form.Item
                        key={fieldKey}
                        name={fieldKey}
                        label={field.label}
                        rules={field.required ? [{ required: true, message: 'هذا الحقل مطلوب' }] : []}
                    >
                        <Input placeholder={field.label} />
                    </Form.Item>
                );
        }
    };

    return (
        <Modal
            title={`التاريخ الطبي - ${patient?.patient_name}`}
            open={visible}
            onCancel={onCancel}
            width={900}
            footer={[
                <Button
                    key="timeline"
                    icon={<HistoryOutlined />}
                    onClick={() => setShowTimeline(!showTimeline)}
                >
                    {showTimeline ? 'إخفاء السجل' : 'عرض السجل'}
                </Button>,
                <Button key="cancel" onClick={onCancel}>
                    إلغاء
                </Button>,
                <Button
                    key="save"
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={loading}
                    onClick={handleSave}
                >
                    حفظ
                </Button>
            ]}
            style={{ direction: 'rtl' }}
        >
            {loading && !template ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin size="large" />
                </div>
            ) : (
                <>
                    {/* Timeline View */}
                    {showTimeline && historyTimeline.length > 0 && (
                        <div style={{ marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                            <h4>السجل الطبي السابق</h4>
                            {historyTimeline.map((record, index) => (
                                <div key={record._id} style={{ marginBottom: 8 }}>
                                    <strong>{moment(record.createdAt).format('YYYY-MM-DD HH:mm')}</strong>
                                    {index === 0 && <span style={{ marginLeft: 8, color: '#1890ff' }}>(الأحدث)</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Form */}
                    <Form
                        form={form}
                        layout="vertical"
                        style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 8px' }}
                    >
                        {template?.sections?.map((section: any) => (
                            <div key={section.section_id} style={{ marginBottom: 24 }}>
                                <Divider orientation="right">{section.title}</Divider>
                                {section.fields?.map((field: any) => renderField(section.section_id, field))}
                            </div>
                        ))}
                    </Form>
                </>
            )}
        </Modal>
    );
};

export default DynamicHistoryForm;
