// components/DoctorSettings.tsx
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography, Divider, Space, Layout } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDoctorContext } from './DoctorContext';
import { useAuth } from './AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Header, Content, Sider } = Layout;

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

useEffect(() => {
  console.log("Raw settings received:", settings);
  if (settings) {
    const cleanedSettings = {
      ...settings,
      clinicAddress: settings.clinicAddress === '""' ? '' : settings.clinicAddress
    };
    console.log("Cleaned settings:", cleanedSettings);
    form.setFieldsValue(cleanedSettings);
  }
}, [form, settings]);

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
          <Card 
            title={<Title level={4}>Receipt Customization Settings</Title>}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              // initialValues should not be used when using form.setFieldsValue in useEffect
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
              
              <Title level={4}>Receipt Customization</Title>
              <Text type="secondary">
                Customize the header and footer that will appear on all your receipts.
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
                  Save Settings
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
};

export default DoctorSettings;