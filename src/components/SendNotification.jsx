import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Select, message, Space, Card, Typography, Tag, Popconfirm } from 'antd';
import { SendOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  sendNotificationToAssistant,
  getAssistantsForDoctorClinic,
  saveNotificationTemplate,
  getNotificationTemplates,
  deleteNotificationTemplate
} from '../services/notificationService';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useDoctorContext } from './DoctorContext';
import { useClinicContext } from './ClinicContext';
import { usePatientContext } from './PatientContext';

// Get doctorId from localStorage as fallback
const getDoctorId = () => {
  return localStorage.getItem('doctorId') || '';
};

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const SendNotification = ({ visible, onCancel, patientName, quickSend = false }) => {
  const [form] = Form.useForm();
  const [assistants, setAssistants] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  const doctorContext = useDoctorContext();
  const doctorId = doctorContext?.doctorId || getDoctorId();
  const { selectedClinicId, selectedClinic } = useClinicContext();
  const { selectedPatient } = usePatientContext();
  
  // Use patientName prop or selectedPatient
  const currentPatientName = patientName || selectedPatient?.patient_name || '';

  useEffect(() => {
    if (visible && doctorId && selectedClinicId) {
      loadAssistants();
      loadTemplates();
      // Reset form when modal opens (unless quick send)
      if (!quickSend) {
        form.resetFields();
      }
    }
  }, [visible, doctorId, selectedClinicId]);

  // Auto-select first assistant when assistants are loaded
  useEffect(() => {
    if (assistants.length > 0 && !form.getFieldValue('assistant_id')) {
      form.setFieldsValue({ assistant_id: assistants[0].id });
    }
  }, [assistants]);

  // Handle quick send - auto-fill form
  useEffect(() => {
    if (visible && quickSend && assistants.length > 0) {
      const defaultMessage = currentPatientName 
        ? `Please get payment from ${currentPatientName}`
        : 'Please get payment';
      form.setFieldsValue({ 
        assistant_id: assistants[0].id,
        message: defaultMessage
      });
    }
  }, [visible, quickSend, assistants, currentPatientName]);

  const loadAssistants = async () => {
    try {
      console.log('Loading assistants for doctorId:', doctorId, 'clinicId:', selectedClinicId);
      const assistantsList = await getAssistantsForDoctorClinic(doctorId, selectedClinicId);
      console.log('Loaded assistants:', assistantsList);
      setAssistants(assistantsList);
      
      // Select first assistant by default
      if (assistantsList.length > 0 && !form.getFieldValue('assistant_id')) {
        form.setFieldsValue({ assistant_id: assistantsList[0].id });
      }
      
      if (assistantsList.length === 0) {
        message.warning('No assistants found for this doctor-clinic combination. Please create relationships in the admin portal.');
      }
    } catch (error) {
      console.error('Error loading assistants:', error);
      message.error('Failed to load assistants: ' + (error.message || 'Unknown error'));
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const templatesList = await getNotificationTemplates(doctorId);
      setTemplates(templatesList.filter(t => !t.deleted));
    } catch (error) {
      console.error('Error loading templates:', error);
      // If index error, try without orderBy
      if (error.message && error.message.includes('index')) {
        try {
          const templatesRef = collection(db, 'notification_templates');
          const q = query(
            templatesRef,
            where('doctor_id', '==', doctorId),
            limit(20)
          );
          const snapshot = await getDocs(q);
          const templatesList = snapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data };
          });
          const filteredTemplates = templatesList.filter(t => !t.deleted);
          // Sort by createdAt if available
          filteredTemplates.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              return b.createdAt.toMillis() - a.createdAt.toMillis();
            }
            return 0;
          });
          setTemplates(filteredTemplates);
        } catch (retryError) {
          console.error('Error loading templates (retry):', retryError);
          setTemplates([]);
        }
      } else {
        setTemplates([]);
      }
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSend = async (values) => {
    if (!values.assistant_id) {
      message.error('Please select an assistant');
      return;
    }

    if (!values.message || values.message.trim() === '') {
      message.error('Please enter a message');
      return;
    }

    setLoading(true);
    try {
      const selectedAssistant = assistants.find(a => a.id === values.assistant_id);
      
      // Patient name is included in notification title, not message body
      await sendNotificationToAssistant({
        doctor_id: doctorId,
        clinic_id: selectedClinicId,
        assistant_id: values.assistant_id,
        message: values.message.trim(),
        doctor_name: '', // Will be filled from doctor context if available
        clinic_name: selectedClinic?.name || '',
        patient_name: currentPatientName || ''
      });

      message.success('Notification sent successfully!');
      form.resetFields();
      onCancel();
    } catch (error) {
      console.error('Error sending notification:', error);
      message.error('Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    const messageValue = form.getFieldValue('message');
    if (!messageValue || messageValue.trim() === '') {
      message.error('Please enter a message to save as template');
      return;
    }

    try {
      await saveNotificationTemplate(doctorId, messageValue.trim());
      message.success('Template saved successfully!');
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      message.error('Failed to save template');
    }
  };

  const handleUseTemplate = (templateText) => {
    form.setFieldsValue({ message: templateText });
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await deleteNotificationTemplate(templateId);
      message.success('Template deleted');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      message.error('Failed to delete template');
    }
  };

  return (
    <Modal
      title={quickSend ? "Quick Notify Assistant" : "Send Notification to Assistant"}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={quickSend ? 500 : 600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSend}
      >
        <Form.Item
          label="Select Assistant"
          name="assistant_id"
          rules={[{ required: true, message: 'Please select an assistant' }]}
        >
          <Select
            placeholder={assistants.length === 0 ? "No assistants found. Create relationships in admin portal." : "Select an assistant"}
            showSearch
            disabled={assistants.length === 0}
            filterOption={(input, option) =>
              option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {assistants.length === 0 ? (
              <Option value="" disabled>No assistants available</Option>
            ) : (
              assistants.map(assistant => (
                <Option key={assistant.id} value={assistant.id}>
                  {assistant.name || assistant.email || assistant.id}
                </Option>
              ))
            )}
          </Select>
        </Form.Item>
        
        {assistants.length === 0 && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fff7e6', 
            border: '1px solid #ffd591',
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            <Text type="warning">
              <strong>No assistants found!</strong><br/>
              To send notifications, you need to create relationships between doctors, clinics, and assistants in the admin portal.
            </Text>
          </div>
        )}

        {currentPatientName && (
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#e6f7ff', 
            border: '1px solid #91d5ff',
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            <Text strong>Patient: {currentPatientName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>Patient name will be included in notification</Text>
          </div>
        )}

        <Form.Item
          label="Message"
          name="message"
          rules={[{ required: true, message: 'Please enter a message' }]}
        >
          <TextArea
            rows={4}
            placeholder={currentPatientName ? `Enter message for ${currentPatientName} (e.g., Please get 500 EGP)` : "Enter your message (e.g., Please get 500 EGP)"}
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* Templates Section - Show in both quick send and regular mode */}
        {templates.length > 0 && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Title level={quickSend ? 5 : 5}>Saved Templates</Title>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {templates.slice(0, quickSend ? 3 : templates.length).map(template => (
                <Card
                  key={template.id}
                  size="small"
                  style={{ backgroundColor: '#f5f5f5' }}
                  actions={[
                    <Button
                      type="link"
                      size="small"
                      onClick={() => handleUseTemplate(template.template_text)}
                    >
                      Use
                    </Button>,
                    <Popconfirm
                      title="Delete this template?"
                      onConfirm={() => handleDeleteTemplate(template.id)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                        Delete
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <Text>{template.template_text}</Text>
                </Card>
              ))}
            </Space>
          </Card>
        )}

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SendOutlined />}
              loading={loading}
              size={quickSend ? "large" : "default"}
              style={quickSend ? { minWidth: '200px' } : {}}
            >
              {quickSend ? 'Send Now' : 'Send Notification'}
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={handleSaveTemplate}
              size={quickSend ? "default" : "default"}
            >
              Save as Template
            </Button>
            <Button onClick={onCancel}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SendNotification;

