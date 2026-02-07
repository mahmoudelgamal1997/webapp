import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  Popconfirm,
  message,
  Tag,
  Switch,
  Row,
  Col,
  Divider,
  Spin
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  MedicineBoxOutlined,
  DollarOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API from '../config/api';
import { ClinicService } from './type';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const SERVICE_CATEGORIES = [
  { value: 'imaging', label: 'Imaging / أشعة', labelAr: 'أشعة' },
  { value: 'lab', label: 'Laboratory / معمل', labelAr: 'معمل' },
  { value: 'procedure', label: 'Procedure / إجراء', labelAr: 'إجراء' },
  { value: 'examination', label: 'Examination / فحص', labelAr: 'فحص' },
  { value: 'therapy', label: 'Therapy / علاج', labelAr: 'علاج' },
  { value: 'general', label: 'General / عام', labelAr: 'عام' }
];

const ServicesManagement: React.FC = () => {
  const [services, setServices] = useState<ClinicService[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<ClinicService | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // Consultation fees state
  const [consultationFee, setConsultationFee] = useState<number>(0);
  const [revisitFee, setRevisitFee] = useState<number>(0);
  const [estisharaFee, setEstisharaFee] = useState<number>(0);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feesSaving, setFeesSaving] = useState(false);

  const doctorId = localStorage.getItem('doctorId');

  useEffect(() => {
    fetchServices();
    fetchConsultationFees();
  }, []);

  const fetchServices = async () => {
    if (!doctorId) return;

    try {
      setLoading(true);
      const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SERVICES(doctorId)}`, {
        params: { includeInactive: 'true' }
      });

      if (response.data.success) {
        setServices(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      message.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  // Fetch consultation fees from doctor settings
  const fetchConsultationFees = async () => {
    if (!doctorId) return;

    try {
      setFeesLoading(true);
      const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SETTINGS(doctorId)}`);

      if (response.data.settings) {
        setConsultationFee(response.data.settings.consultationFee || 0);
        setRevisitFee(response.data.settings.revisitFee || 0);
        setEstisharaFee(response.data.settings.estisharaFee || 0);
      }
    } catch (error) {
      console.error('Error fetching consultation fees:', error);
    } finally {
      setFeesLoading(false);
    }
  };

  // Save consultation fees
  const saveConsultationFees = async () => {
    if (!doctorId) return;

    try {
      setFeesSaving(true);
      const response = await axios.put(`${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SETTINGS(doctorId)}`, {
        consultationFee,
        revisitFee,
        estisharaFee
      });

      if (response.data.settings) {
        message.success('Consultation fees saved successfully');
      }
    } catch (error) {
      console.error('Error saving consultation fees:', error);
      message.error('Failed to save consultation fees');
    } finally {
      setFeesSaving(false);
    }
  };

  const handleAddService = () => {
    setEditingService(null);
    form.resetFields();
    form.setFieldsValue({ category: 'general', isActive: true });
    setModalVisible(true);
  };

  const handleEditService = (service: ClinicService) => {
    setEditingService(service);
    form.setFieldsValue({
      name: service.name,
      description: service.description,
      price: service.price,
      category: service.category || 'general',
      isActive: service.isActive !== false
    });
    setModalVisible(true);
  };

  const handleDeleteService = async (service: ClinicService) => {
    if (!doctorId) return;

    try {
      const response = await axios.delete(
        `${API.BASE_URL}${API.ENDPOINTS.SERVICE(doctorId, service.service_id)}`
      );

      if (response.data.success) {
        message.success('Service deactivated successfully');
        fetchServices();
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      message.error('Failed to delete service');
    }
  };

  const handleSubmit = async (values: any) => {
    if (!doctorId) {
      message.error('Doctor ID not found. Please log in again.');
      return;
    }

    try {
      if (editingService) {
        // Update existing service
        const response = await axios.put(
          `${API.BASE_URL}${API.ENDPOINTS.SERVICE(doctorId, editingService.service_id)}`,
          values
        );

        if (response.data.success) {
          message.success('Service updated successfully');
          setModalVisible(false);
          fetchServices();
        }
      } else {
        // Create new service
        const response = await axios.post(`${API.BASE_URL}${API.ENDPOINTS.SERVICES}`, {
          ...values,
          doctor_id: doctorId
        });

        if (response.data.success) {
          message.success('Service created successfully');
          setModalVisible(false);
          fetchServices();
        }
      }
    } catch (error) {
      console.error('Error saving service:', error);
      message.error('Failed to save service');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      imaging: 'blue',
      lab: 'purple',
      procedure: 'orange',
      examination: 'green',
      therapy: 'cyan',
      general: 'default'
    };
    return colors[category] || 'default';
  };

  const columns = [
    {
      title: 'Service Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => {
        const cat = SERVICE_CATEGORIES.find(c => c.value === category);
        return <Tag color={getCategoryColor(category)}>{cat?.labelAr || category}</Tag>;
      }
    },
    {
      title: 'Price (EGP)',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => (
        <Text strong style={{ color: '#52c41a' }}>{price.toLocaleString()} EGP</Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive !== false ? 'green' : 'red'}>
          {isActive !== false ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ClinicService) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditService(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to deactivate this service?"
            onConfirm={() => handleDeleteService(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <DashboardSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <Layout>
        <DashboardHeader
          onSettingsClick={() => navigate('/settings')}
          onMenuClick={() => { }}
          isMobile={false}
        />

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5' }}>
          <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
            <Col>
              <Space>
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate('/dashboard')}
                >
                  Back to Dashboard
                </Button>
                <Title level={3} style={{ margin: 0 }}>
                  <MedicineBoxOutlined style={{ marginRight: 8 }} />
                  Services Management
                </Title>
              </Space>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddService}
                size="large"
              >
                Add New Service
              </Button>
            </Col>
          </Row>

          {/* Consultation Fees Card */}
          <Card
            style={{ marginBottom: 24 }}
            title={
              <Space>
                <DollarOutlined style={{ color: '#52c41a' }} />
                <span>Consultation Fees / رسوم الكشف</span>
              </Space>
            }
          >
            <Spin spinning={feesLoading}>
              <Row gutter={24} align="middle">
                <Col xs={24} sm={12} md={6}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Consultation Fee / كشف
                  </Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    size="large"
                    min={0}
                    value={consultationFee}
                    onChange={(val) => setConsultationFee(val || 0)}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
                    addonAfter="EGP"
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Revisit Fee / اعاده كشف
                  </Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    size="large"
                    min={0}
                    value={revisitFee}
                    onChange={(val) => setRevisitFee(val || 0)}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
                    addonAfter="EGP"
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Estishara Fee / استشارة
                  </Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    size="large"
                    min={0}
                    value={estisharaFee}
                    onChange={(val) => setEstisharaFee(val || 0)}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
                    addonAfter="EGP"
                  />
                </Col>
                <Col xs={24} sm={24} md={6} style={{ marginTop: 24 }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={saveConsultationFees}
                    loading={feesSaving}
                    size="large"
                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', width: '100%' }}
                  >
                    Save Fees
                  </Button>
                </Col>
              </Row>
              <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
                These fees will auto-fill when creating bills based on selected consultation type.
              </Text>
            </Spin>
          </Card>

          {/* Additional Services Card */}
          <Card
            title={
              <Space>
                <MedicineBoxOutlined style={{ color: '#1890ff' }} />
                <span>Additional Services / خدمات إضافية</span>
              </Space>
            }
          >
            <Table
              columns={columns}
              dataSource={services}
              rowKey="service_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>

          {/* Add/Edit Service Modal */}
          <Modal
            title={editingService ? 'Edit Service' : 'Add New Service'}
            open={modalVisible}
            onCancel={() => setModalVisible(false)}
            footer={null}
            width={600}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Form.Item
                name="name"
                label="Service Name"
                rules={[{ required: true, message: 'Please enter service name' }]}
              >
                <Input placeholder="e.g., Ultrasound / سونار" />
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
              >
                <Input.TextArea rows={2} placeholder="Brief description of the service" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="price"
                    label="Price (EGP)"
                    rules={[
                      { required: true, message: 'Please enter price' },
                      { type: 'number', min: 0, message: 'Price cannot be negative' }
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0"
                      min={0}
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="category"
                    label="Category"
                    rules={[{ required: true, message: 'Please select a category' }]}
                  >
                    <Select placeholder="Select category">
                      {SERVICE_CATEGORIES.map(cat => (
                        <Option key={cat.value} value={cat.value}>
                          {cat.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="isActive"
                label="Active Status"
                valuePropName="checked"
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setModalVisible(false)}>
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit">
                    {editingService ? 'Update Service' : 'Add Service'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout >
  );
};

export default ServicesManagement;

