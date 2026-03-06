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
  Row,
  Col,
  Spin,
  Empty
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  GiftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API from '../config/api';
import { Package as PackageType, ClinicService } from './type';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const PackagesManagement: React.FC = () => {
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [services, setServices] = useState<ClinicService[]>([]);
  const [loading, setLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const doctorId = localStorage.getItem('doctorId');

  useEffect(() => {
    fetchPackages();
    fetchServices();
  }, []);

  const fetchPackages = async () => {
    if (!doctorId) return;
    try {
      setLoading(true);
      const response = await axios.get(
        `${API.BASE_URL}${API.ENDPOINTS.DOCTOR_PACKAGES(doctorId)}`,
        { params: { activeOnly: 'false' } }
      );
      if (response.data.success) {
        setPackages(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      message.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    if (!doctorId) return;
    try {
      setServicesLoading(true);
      const response = await axios.get(
        `${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SERVICES(doctorId)}`,
        { params: { includeInactive: 'true' } }
      );
      if (response.data.success) {
        setServices(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setServicesLoading(false);
    }
  };

  const handleAddPackage = () => {
    setEditingPackage(null);
    form.resetFields();
    form.setFieldsValue({
      sessions_count: 1,
      price: 0,
      expiry_days: undefined
    });
    setModalVisible(true);
  };

  const handleEditPackage = (pkg: PackageType) => {
    setEditingPackage(pkg);
    form.setFieldsValue({
      name: pkg.name,
      service_id: pkg.service_id,
      sessions_count: pkg.sessions_count,
      price: pkg.price,
      description: pkg.description || '',
      expiry_days: pkg.expiry_days != null ? pkg.expiry_days : undefined
    });
    setModalVisible(true);
  };

  const handleDeletePackage = async (pkg: PackageType) => {
    if (!doctorId) return;
    try {
      const response = await axios.delete(
        `${API.BASE_URL}${API.ENDPOINTS.PACKAGE(doctorId, pkg.package_id)}`
      );
      if (response.data.success) {
        message.success('Package deleted');
        fetchPackages();
      }
    } catch (error: any) {
      console.error('Error deleting package:', error);
      message.error(error.response?.data?.message || 'Failed to delete package');
    }
  };

  const handleSubmit = async (values: {
    name: string;
    service_id: string;
    sessions_count?: number | null;
    price?: number | null;
    description?: string;
    expiry_days?: number | null;
  }) => {
    if (!doctorId) return;
    const sessionsCount = Number(values.sessions_count);
    const price = Number(values.price);
    if (!Number.isFinite(sessionsCount) || sessionsCount < 1) {
      message.error('Number of sessions must be at least 1');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      message.error('Total price must be 0 or greater');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        doctor_id: doctorId,
        name: values.name,
        service_id: values.service_id,
        sessions_count: sessionsCount,
        price,
        description: values.description || '',
        expiry_days: values.expiry_days != null && Number(values.expiry_days) > 0 ? Number(values.expiry_days) : null
      };

      if (editingPackage) {
        const response = await axios.put(
          `${API.BASE_URL}${API.ENDPOINTS.PACKAGE(doctorId, editingPackage.package_id)}`,
          payload
        );
        if (response.data.success) {
          message.success('Package updated');
          setModalVisible(false);
          fetchPackages();
        }
      } else {
        const response = await axios.post(`${API.BASE_URL}${API.ENDPOINTS.PACKAGES}`, payload);
        if (response.data.success) {
          message.success('Package created');
          setModalVisible(false);
          fetchPackages();
        }
      }
    } catch (error: any) {
      console.error('Error saving package:', error);
      const msg = error.response?.data?.message || error.response?.data?.error;
      const fallback = error.response ? 'Failed to save package' : 'Network error. Is the API running? Check REACT_APP_API_BASE_URL.';
      message.error(msg || fallback);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Package Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Service',
      dataIndex: 'service_name',
      key: 'service_name'
    },
    {
      title: 'Sessions',
      dataIndex: 'sessions_count',
      key: 'sessions_count',
      width: 90
    },
    {
      title: 'Total Price (EGP)',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => (
        <Text strong style={{ color: '#52c41a' }}>{price.toLocaleString()} EGP</Text>
      )
    },
    {
      title: 'Per Session (EGP)',
      dataIndex: 'price_per_session',
      key: 'price_per_session',
      render: (val: number, record: PackageType) => {
        const per = record.price_per_session ?? (record.sessions_count ? record.price / record.sessions_count : 0);
        return <Text>{per.toFixed(2)} EGP</Text>;
      }
    },
    {
      title: 'Expiry',
      dataIndex: 'expiry_days',
      key: 'expiry_days',
      width: 90,
      render: (days: number | null) =>
        days != null && days > 0 ? (
          <Tag color="orange">{days} days</Tag>
        ) : (
          <Text type="secondary">No expiry</Text>
        )
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (isActive: boolean) => (
        <Tag color={isActive !== false ? 'green' : 'red'}>
          {isActive !== false ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: any, record: PackageType) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditPackage(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this package? (Only allowed if not assigned to any patient)"
            onConfirm={() => handleDeletePackage(record)}
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
        <DashboardHeader onSettingsClick={() => navigate('/settings')} onMenuClick={() => {}} isMobile={false} />

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5' }}>
          <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
            <Col>
              <Space>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
                <Title level={3} style={{ margin: 0 }}>
                  <GiftOutlined style={{ marginRight: 8 }} />
                  Packages / Offers
                </Title>
              </Space>
            </Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPackage} size="large">
                Create Package
              </Button>
            </Col>
          </Row>

          <Card title="Session packages (e.g. Physiotherapy – 6 sessions at discounted price)">
            <Spin spinning={loading}>
              {packages.length === 0 ? (
                <Empty
                  description="No packages yet. Create a package to sell session bundles at a discounted price."
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <Table
                  dataSource={packages}
                  rowKey="package_id"
                  columns={columns}
                  pagination={{ pageSize: 10 }}
                  size="small"
                />
              )}
            </Spin>
          </Card>
        </Content>
      </Layout>

      <Modal
        title={editingPackage ? 'Edit Package' : 'Create Package'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Package name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Physiotherapy Package – 6 Sessions" />
          </Form.Item>
          <Form.Item name="service_id" label="Service type" rules={[{ required: true }]}>
            <Select
              placeholder="Select service (e.g. Physiotherapy)"
              loading={servicesLoading}
              showSearch
              optionFilterProp="children"
            >
              {services.map((s) => (
                <Option key={s.service_id} value={s.service_id}>
                  {s.name} – {s.price.toLocaleString()} EGP/session
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sessions_count"
                label="Number of sessions"
                initialValue={1}
                rules={[{ required: true, message: 'Enter number of sessions' }, { type: 'number', min: 1, message: 'At least 1 session' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="price"
                label="Total price (EGP)"
                initialValue={0}
                rules={[{ required: true, message: 'Enter total price' }, { type: 'number', min: 0, message: 'Price must be ≥ 0' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description (optional)">
            <TextArea rows={2} placeholder="Package details" />
          </Form.Item>
          <Form.Item name="expiry_days" label="Expiration (days, optional)">
            <InputNumber min={0} placeholder="Leave empty for no expiry" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingPackage ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default PackagesManagement;
