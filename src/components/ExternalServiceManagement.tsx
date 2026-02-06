import React, { useState, useEffect } from 'react';
import {
    Layout,
    Card,
    Table,
    Button,
    Modal,
    Form,
    Input,
    Space,
    Typography,
    Popconfirm,
    message,
    Tag,
    Row,
    Col,
    Tabs,
    Statistic,
    Spin,
    DatePicker,
    Select
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ArrowLeftOutlined,
    FileTextOutlined,
    BarChartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API from '../config/api';
import { ExternalService, ExternalServiceReport } from './type';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';
import moment from 'moment';
import locale from 'antd/es/date-picker/locale/en_US';

const { Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ExternalServiceManagement: React.FC = () => {
    const [services, setServices] = useState<ExternalService[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingService, setEditingService] = useState<ExternalService | null>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const [reports, setReports] = useState<ExternalServiceReport | null>(null);
    const [reportsLoading, setReportsLoading] = useState(false);
    const [dateRange, setDateRange] = useState<any>([null, null]); // Start with no date filter
    const [selectedProvider, setSelectedProvider] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [availableProviders, setAvailableProviders] = useState<string[]>([]);

    const doctorId = localStorage.getItem('doctorId');

    useEffect(() => {
        fetchServices();
        // Fetch all reports initially (no date filter)
        fetchReports();
    }, []);

    const fetchServices = async () => {
        if (!doctorId) return;

        try {
            setLoading(true);
            const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.DOCTOR_EXTERNAL_SERVICES(doctorId)}`, {
                params: { includeInactive: 'true' }
            });

            if (response.data.success) {
                setServices(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching external services:', error);
            message.error('Failed to load external services');
        } finally {
            setLoading(false);
        }
    };

    const fetchReports = async (startDate?: string, endDate?: string, status?: string) => {
        if (!doctorId) return;

        try {
            setReportsLoading(true);
            const params: any = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (status && status !== 'all') params.status = status;

            const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.EXTERNAL_REPORTS(doctorId)}`, {
                params
            });

            if (response.data.success) {
                setReports(response.data.data);
                // Extract unique providers
                const providers = response.data.data.byProvider.map((p: any) => p.provider);
                setAvailableProviders(providers);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
            message.error('Failed to load reports');
        } finally {
            setReportsLoading(false);
        }
    };

    const handleDateRangeChange = (dates: any) => {
        console.log('Date range changed:', dates);
        setDateRange(dates);
        if (dates && dates[0] && dates[1]) {
            const startDate = dates[0].format('YYYY-MM-DD');
            const endDate = dates[1].format('YYYY-MM-DD');
            console.log('Fetching reports from', startDate, 'to', endDate);
            fetchReports(startDate, endDate, selectedStatus);
        } else {
            console.log('Fetching all reports (no date filter)');
            fetchReports(undefined, undefined, selectedStatus);
        }
    };

    const handleStatusChange = (value: string) => {
        setSelectedStatus(value);
        if (dateRange && dateRange[0] && dateRange[1]) {
            fetchReports(
                dateRange[0].format('YYYY-MM-DD'),
                dateRange[1].format('YYYY-MM-DD'),
                value
            );
        } else {
            fetchReports(undefined, undefined, value);
        }
    };

    const handleProviderChange = (value: string) => {
        setSelectedProvider(value);
    };

    const handleAddService = () => {
        setEditingService(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEditService = (service: ExternalService) => {
        setEditingService(service);
        form.setFieldsValue({
            service_name: service.service_name,
            provider_name: service.provider_name
        });
        setModalVisible(true);
    };

    const handleDeleteService = async (service: ExternalService) => {
        if (!doctorId) return;

        try {
            const response = await axios.delete(
                `${API.BASE_URL}${API.ENDPOINTS.EXTERNAL_SERVICE(doctorId, service.service_id)}`
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
                    `${API.BASE_URL}${API.ENDPOINTS.EXTERNAL_SERVICE(doctorId, editingService.service_id)}`,
                    values
                );

                if (response.data.success) {
                    message.success('Service updated successfully');
                    setModalVisible(false);
                    fetchServices();
                }
            } else {
                // Create new service
                const response = await axios.post(`${API.BASE_URL}${API.ENDPOINTS.EXTERNAL_SERVICES}`, {
                    ...values,
                    doctor_id: doctorId
                });

                if (response.data.success) {
                    message.success('Service created successfully');
                    setModalVisible(false);
                    fetchServices();
                    fetchReports(); // Refresh reports
                }
            }
        } catch (error) {
            console.error('Error saving service:', error);
            message.error('Failed to save service');
        }
    };

    const servicesColumns = [
        {
            title: 'Service Name / اسم الخدمة',
            dataIndex: 'service_name',
            key: 'service_name',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: 'Provider / المزود',
            dataIndex: 'provider_name',
            key: 'provider_name',
            render: (text: string) => <Text>{text}</Text>
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
            render: (_: any, record: ExternalService) => (
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

    const detailedColumns = [
        {
            title: 'Service Name / اسم الخدمة',
            dataIndex: 'serviceName',
            key: 'serviceName',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: 'Provider / المزود',
            dataIndex: 'providerName',
            key: 'providerName',
            render: (text: string) => <Text>{text}</Text>
        },
        {
            title: 'Total / المجموع',
            dataIndex: 'total',
            key: 'total'
        },
        {
            title: 'Completed / مكتمل',
            dataIndex: 'completed',
            key: 'completed',
            render: (num: number) => <Tag color="green">{num}</Tag>
        },
        {
            title: 'Pending / قيد الانتظار',
            dataIndex: 'pending',
            key: 'pending',
            render: (num: number) => <Tag color="orange">{num}</Tag>
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
                                    <FileTextOutlined style={{ marginRight: 8 }} />
                                    External Services / الخدمات الخارجية
                                </Title>
                            </Space>
                        </Col>
                    </Row>

                    <Tabs defaultActiveKey="1">
                        <Tabs.TabPane tab={<span><FileTextOutlined /> Service Definitions</span>} key="1">
                            <Card
                                extra={
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={handleAddService}
                                    >
                                        Add New Service
                                    </Button>
                                }
                            >
                                <Table
                                    columns={servicesColumns}
                                    dataSource={services}
                                    rowKey="service_id"
                                    loading={loading}
                                    pagination={{ pageSize: 10 }}
                                />
                            </Card>
                        </Tabs.TabPane>

                        <Tabs.TabPane tab={<span><BarChartOutlined /> Reports</span>} key="2">
                            <Card style={{ marginBottom: 16 }}>
                                <Row gutter={16} align="middle">
                                    <Col xs={24} sm={12} md={8}>
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            <Text strong>Date Range / الفترة الزمنية</Text>
                                            <RangePicker
                                                style={{ width: '100%' }}
                                                value={dateRange}
                                                onChange={handleDateRangeChange}
                                                format="YYYY-MM-DD"
                                                placeholder={['Start Date', 'End Date']}
                                                locale={locale}
                                            />
                                        </Space>
                                    </Col>
                                    <Col xs={24} sm={12} md={5}>
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            <Text strong>Provider / المزود</Text>
                                            <Select
                                                style={{ width: '100%' }}
                                                value={selectedProvider}
                                                onChange={handleProviderChange}
                                            >
                                                <Option value="all">All / الكل</Option>
                                                {availableProviders.map(provider => (
                                                    <Option key={provider} value={provider}>{provider}</Option>
                                                ))}
                                            </Select>
                                        </Space>
                                    </Col>
                                    <Col xs={24} sm={12} md={6}>
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            <Text strong>Status / الحالة</Text>
                                            <Select
                                                style={{ width: '100%' }}
                                                value={selectedStatus}
                                                onChange={handleStatusChange}
                                            >
                                                <Option value="all">All / الكل</Option>
                                                <Option value="completed">Completed / مكتمل</Option>
                                                <Option value="pending">Pending / قيد الانتظار</Option>
                                            </Select>
                                        </Space>
                                    </Col>
                                    <Col xs={24} sm={24} md={8}>
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            <Text strong>&nbsp;</Text>
                                            <Space>
                                                <Button
                                                    type="primary"
                                                    onClick={() => {
                                                        const today = moment();
                                                        console.log('Today button clicked. Today is:', today.format('YYYY-MM-DD'), 'Full date:', today.toDate());
                                                        setDateRange([today, today]);
                                                        fetchReports(
                                                            today.format('YYYY-MM-DD'),
                                                            today.format('YYYY-MM-DD'),
                                                            selectedStatus
                                                        );
                                                    }}
                                                >
                                                    Today / اليوم
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setDateRange([null, null]);
                                                        setSelectedProvider('all');
                                                        setSelectedStatus('all');
                                                        fetchReports();
                                                    }}
                                                >
                                                    Clear / مسح
                                                </Button>
                                            </Space>
                                        </Space>
                                    </Col>
                                </Row>
                            </Card>
                            <Spin spinning={reportsLoading}>
                                {reports && (
                                    <>
                                        <Row gutter={16} style={{ marginBottom: 24 }}>
                                            {(() => {
                                                const filteredStats = selectedProvider === 'all'
                                                    ? reports.overview
                                                    : reports.detailedStats
                                                        .filter(p => p.providerName === selectedProvider)
                                                        .reduce((acc, curr) => ({
                                                            total: acc.total + curr.total,
                                                            completed: acc.completed + curr.completed,
                                                            pending: acc.pending + curr.pending
                                                        }), { total: 0, completed: 0, pending: 0 });

                                                return (
                                                    <>
                                                        <Col span={8}>
                                                            <Card>
                                                                <Statistic
                                                                    title="Total Requests"
                                                                    value={filteredStats.total}
                                                                    valueStyle={{ color: '#1890ff' }}
                                                                />
                                                            </Card>
                                                        </Col>
                                                        <Col span={8}>
                                                            <Card>
                                                                <Statistic
                                                                    title="Completed"
                                                                    value={filteredStats.completed}
                                                                    valueStyle={{ color: '#52c41a' }}
                                                                />
                                                            </Card>
                                                        </Col>
                                                        <Col span={8}>
                                                            <Card>
                                                                <Statistic
                                                                    title="Pending"
                                                                    value={filteredStats.pending}
                                                                    valueStyle={{ color: '#faad14' }}
                                                                />
                                                            </Card>
                                                        </Col>
                                                    </>
                                                );
                                            })()}
                                        </Row>

                                        <Card title="Detailed Report / تقرير مفصل" style={{ marginBottom: 16 }}>
                                            <Table
                                                columns={detailedColumns}
                                                dataSource={
                                                    selectedProvider === 'all'
                                                        ? reports.detailedStats
                                                        : reports.detailedStats.filter(p => p.providerName === selectedProvider)
                                                }
                                                rowKey={(record) => `${record.serviceName}-${record.providerName}`}
                                                pagination={false}
                                            />
                                        </Card>
                                    </>
                                )}
                            </Spin>
                        </Tabs.TabPane>
                    </Tabs>

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
                                name="service_name"
                                label="Service Name / اسم الخدمة"
                                rules={[{ required: true, message: 'Please enter service name' }]}
                            >
                                <Input placeholder="e.g., MRI Brain / أشعة رنين مغناطيسي" />
                            </Form.Item>

                            <Form.Item
                                name="provider_name"
                                label="Provider Name / اسم المزود"
                                rules={[{ required: true, message: 'Please enter provider name' }]}
                            >
                                <Input placeholder="e.g., Alpha Scan / ألفا سكان" />
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
        </Layout>
    );
};

export default ExternalServiceManagement;
