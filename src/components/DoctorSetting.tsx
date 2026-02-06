// components/DoctorSettings.tsx
import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Divider, Layout, Tabs } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, SettingOutlined, PrinterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDoctorContext } from './DoctorContext';
import { useAuth } from './AuthContext';
import PrescriptionLayoutEditor from './PrescriptionLayoutEditor';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Header, Content } = Layout;

interface SettingsFormValues {
  receiptHeader: string;
  receiptFooter: string;
  clinicName: string;
  doctorTitle: string;
  clinicAddress: string;
  clinicPhone: string;
}

const DoctorSettings: React.FC = () => {
  const [form] = Form.useForm();
  const { settings, loading, updateSettings } = useDoctorContext();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const navigate = useNavigate();
  const { username, logout } = useAuth();

  // Handle form submission
  const handleSubmit = async (values: SettingsFormValues) => {
    try {
      const success = await updateSettings(values);
      if (success) {
        message.success('Settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      message.error('Failed to save settings');
    }
  };

  // Return to dashboard
  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout>
        <Header style={{
          padding: 0,
          background: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingLeft: 16
        }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            type="text"
          >
            Back to Dashboard
          </Button>
          <div style={{ marginRight: 16 }}>
            <span>Logged in as: {username}</span>
          </div>
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: 'white' }}>
          <Card>
            <Tabs defaultActiveKey="1">
              <Tabs.TabPane
                tab={
                  <span>
                    <SettingOutlined />
                    General Settings
                  </span>
                }
                key="1"
              >
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  initialValues={settings}
                >
                  <Title level={4}>Clinic Information</Title>
                  <Form.Item
                    name="clinicName"
                    label="Clinic Name"
                    rules={[{ required: true, message: 'Please enter your clinic name' }]}
                  >
                    <Input placeholder="Enter your clinic name" />
                  </Form.Item>

                  <Form.Item
                    name="doctorTitle"
                    label="Doctor Title and Specialization"
                    rules={[{ required: true, message: 'Please enter your title and specialization' }]}
                  >
                    <Input placeholder="e.g., Dr. John Smith, Cardiologist" />
                  </Form.Item>

                  <Form.Item
                    name="clinicAddress"
                    label="Clinic Address"
                  >
                    <Input placeholder="Enter your clinic address" />
                  </Form.Item>

                  <Form.Item
                    name="clinicPhone"
                    label="Clinic Phone"
                  >
                    <Input placeholder="Enter your clinic phone number" />
                  </Form.Item>

                  <Divider />

                  <Title level={4}>Receipt Header/Footer (Standard Mode)</Title>
                  <Text type="secondary">
                    These are used when "Show System Header/Footer" is enabled or when using Standard Print Mode.
                  </Text>

                  <Form.Item
                    name="receiptHeader"
                    label="Receipt Header"
                    help="This will appear at the top of every receipt. You can include welcome messages or clinic information."
                    style={{ marginTop: 16 }}
                  >
                    <TextArea
                      placeholder="Enter custom header text"
                      autoSize={{ minRows: 2, maxRows: 6 }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="receiptFooter"
                    label="Receipt Footer"
                    help="This will appear at the bottom of every receipt. You can include follow-up instructions or general advice."
                  >
                    <TextArea
                      placeholder="Enter custom footer text"
                      autoSize={{ minRows: 2, maxRows: 6 }}
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      htmlType="submit"
                      loading={loading}
                    >
                      Save General Settings
                    </Button>
                  </Form.Item>
                </Form>
              </Tabs.TabPane>

              <Tabs.TabPane
                tab={
                  <span>
                    <PrinterOutlined />
                    Prescription Layout
                  </span>
                }
                key="2"
              >
                <div style={{ marginBottom: 16 }}>
                  <Text>
                    Use this editor to customize how prescriptions are printed. You can upload an image of your
                    pre-printed paper to use as a guide for setting margins and alignment.
                  </Text>
                </div>
                <PrescriptionLayoutEditor />
              </Tabs.TabPane>

              <Tabs.TabPane
                tab={
                  <span>
                    <SettingOutlined />
                    Medical History Template
                  </span>
                }
                key="3"
              >
                <div style={{ marginBottom: 16 }}>
                  <Text>
                    Customize the medical history form template that will be used when recording patient history.
                    You can add, remove, or modify sections and fields to match your practice needs.
                  </Text>
                </div>
                <Button
                  type="primary"
                  onClick={() => navigate('/history-template')}
                  style={{ marginTop: 16 }}
                >
                  Open Template Builder
                </Button>
              </Tabs.TabPane>
            </Tabs>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
};

export default DoctorSettings;