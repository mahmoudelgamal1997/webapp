import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  DatePicker,
  Space,
  Table,
  Button,
  Spin,
  Tag,
  Progress,
  Divider,
  Tabs,
  Empty
} from 'antd';
import {
  ArrowLeftOutlined,
  DollarOutlined,
  UserOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import dayjs, { Dayjs } from 'dayjs';
import API from '../config/api';
import { 
  RevenueOverview, 
  ServiceAnalyticsItem, 
  ClinicPerformance 
} from './type';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';

const { Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const RevenueAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<RevenueOverview | null>(null);
  const [servicesAnalytics, setServicesAnalytics] = useState<ServiceAnalyticsItem[]>([]);
  const [performance, setPerformance] = useState<ClinicPerformance | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ]);
  const [collapsed, setCollapsed] = useState(false);
  
  const navigate = useNavigate();
  const doctorId = localStorage.getItem('doctorId');

  useEffect(() => {
    fetchAllData();
  }, [dateRange]);

  const fetchAllData = async () => {
    if (!doctorId) return;

    try {
      setLoading(true);
      
      const params = {
        startDate: dateRange[0]?.format('YYYY-MM-DD'),
        endDate: dateRange[1]?.format('YYYY-MM-DD')
      };

      const [overviewRes, servicesRes, performanceRes] = await Promise.all([
        axios.get(`${API.BASE_URL}${API.ENDPOINTS.REVENUE_OVERVIEW(doctorId)}`, { params }),
        axios.get(`${API.BASE_URL}${API.ENDPOINTS.SERVICES_ANALYTICS(doctorId)}`, { params }),
        axios.get(`${API.BASE_URL}${API.ENDPOINTS.CLINIC_PERFORMANCE(doctorId)}`, { params })
      ]);

      if (overviewRes.data.success) {
        setOverview(overviewRes.data.data);
      }
      if (servicesRes.data.success) {
        setServicesAnalytics(servicesRes.data.data.services || []);
      }
      if (performanceRes.data.success) {
        setPerformance(performanceRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  const handlePresetPeriod = (period: 'today' | 'week' | 'month' | 'year') => {
    switch (period) {
      case 'today':
        setDateRange([dayjs().startOf('day'), dayjs().endOf('day')]);
        break;
      case 'week':
        setDateRange([dayjs().startOf('week'), dayjs().endOf('week')]);
        break;
      case 'month':
        setDateRange([dayjs().startOf('month'), dayjs().endOf('month')]);
        break;
      case 'year':
        setDateRange([dayjs().startOf('year'), dayjs().endOf('year')]);
        break;
    }
  };

  const servicesColumns = [
    {
      title: 'Service',
      dataIndex: 'service_name',
      key: 'service_name',
      render: (text: string, record: ServiceAnalyticsItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.category && <Tag>{record.category}</Tag>}
        </Space>
      )
    },
    {
      title: 'Patients',
      dataIndex: 'totalPatients',
      key: 'totalPatients',
      sorter: (a: ServiceAnalyticsItem, b: ServiceAnalyticsItem) => a.totalPatients - b.totalPatients,
      render: (value: number) => (
        <Space>
          <UserOutlined />
          {value}
        </Space>
      )
    },
    {
      title: 'Total Uses',
      dataIndex: 'totalQuantity',
      key: 'totalQuantity',
      sorter: (a: ServiceAnalyticsItem, b: ServiceAnalyticsItem) => a.totalQuantity - b.totalQuantity
    },
    {
      title: 'Total Revenue',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      sorter: (a: ServiceAnalyticsItem, b: ServiceAnalyticsItem) => a.totalRevenue - b.totalRevenue,
      render: (value: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          {value.toLocaleString()} EGP
        </Text>
      )
    },
    {
      title: 'Avg. per Patient',
      dataIndex: 'averageRevenuePerPatient',
      key: 'averageRevenuePerPatient',
      sorter: (a: ServiceAnalyticsItem, b: ServiceAnalyticsItem) => 
        a.averageRevenuePerPatient - b.averageRevenuePerPatient,
      render: (value: number) => `${value.toLocaleString()} EGP`
    }
  ];

  const maxServiceRevenue = Math.max(...servicesAnalytics.map(s => s.totalRevenue), 1);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <DashboardSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <Layout>
        <DashboardHeader 
          onSettingsClick={() => navigate('/settings')}
          onMenuClick={() => {}}
          isMobile={false}
        />
        
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f0f2f5' }}>
          {/* Header */}
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
                  <BarChartOutlined style={{ marginRight: 8 }} />
                  Revenue & Analytics
                </Title>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button onClick={() => handlePresetPeriod('today')}>Today</Button>
                <Button onClick={() => handlePresetPeriod('week')}>This Week</Button>
                <Button onClick={() => handlePresetPeriod('month')}>This Month</Button>
                <Button onClick={() => handlePresetPeriod('year')}>This Year</Button>
                <RangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  format="YYYY-MM-DD"
                />
              </Space>
            </Col>
          </Row>

          <Spin spinning={loading}>
            {/* Revenue Overview Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <Statistic
                    title={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Total Revenue</Text>}
                    value={overview?.totalRevenue || 0}
                    suffix="EGP"
                    valueStyle={{ color: '#fff', fontSize: 28 }}
                    prefix={<DollarOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
                  <Statistic
                    title={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Consultation Fees</Text>}
                    value={overview?.totalConsultationFees || 0}
                    suffix="EGP"
                    valueStyle={{ color: '#fff', fontSize: 28 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card style={{ background: 'linear-gradient(135deg, #FC466B 0%, #3F5EFB 100%)' }}>
                  <Statistic
                    title={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Services Revenue</Text>}
                    value={overview?.totalServicesRevenue || 0}
                    suffix="EGP"
                    valueStyle={{ color: '#fff', fontSize: 28 }}
                    prefix={<MedicineBoxOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                  <Statistic
                    title={<Text style={{ color: 'rgba(255,255,255,0.8)' }}>Total Discounts</Text>}
                    value={overview?.totalDiscounts || 0}
                    suffix="EGP"
                    valueStyle={{ color: '#fff', fontSize: 28 }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Performance Metrics */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Total Visits"
                    value={performance?.overview.totalVisits || 0}
                    prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Unique Patients"
                    value={performance?.overview.uniquePatientCount || 0}
                    prefix={<UserOutlined style={{ color: '#52c41a' }} />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Avg. Bill Value"
                    value={overview?.averageBillValue || 0}
                    suffix="EGP"
                    precision={2}
                    prefix={<RiseOutlined style={{ color: '#eb2f96' }} />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Pending Amount"
                    value={overview?.pendingAmount || 0}
                    suffix="EGP"
                    valueStyle={{ color: overview?.pendingAmount ? '#faad14' : '#52c41a' }}
                  />
                </Card>
              </Col>
            </Row>

            <Tabs defaultActiveKey="services" type="card">
              {/* Services Analytics Tab */}
              <TabPane 
                tab={<span><MedicineBoxOutlined /> Services Analytics</span>} 
                key="services"
              >
                <Card>
                  {servicesAnalytics.length > 0 ? (
                    <>
                      {/* Visual Summary */}
                      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        {servicesAnalytics.slice(0, 5).map((service, index) => (
                          <Col xs={24} key={service.service_id}>
                            <Card size="small">
                              <Row align="middle" gutter={16}>
                                <Col flex="200px">
                                  <Text strong>{service.service_name}</Text>
                                </Col>
                                <Col flex="auto">
                                  <Progress
                                    percent={Math.round((service.totalRevenue / maxServiceRevenue) * 100)}
                                    strokeColor={{
                                      '0%': '#108ee9',
                                      '100%': '#87d068',
                                    }}
                                    format={() => `${service.totalRevenue.toLocaleString()} EGP`}
                                  />
                                </Col>
                                <Col flex="100px" style={{ textAlign: 'right' }}>
                                  <Tag color="blue">{service.totalPatients} patients</Tag>
                                </Col>
                              </Row>
                            </Card>
                          </Col>
                        ))}
                      </Row>

                      <Divider>Detailed Services Data</Divider>

                      <Table
                        dataSource={servicesAnalytics}
                        columns={servicesColumns}
                        rowKey="service_id"
                        pagination={{ pageSize: 10 }}
                      />
                    </>
                  ) : (
                    <Empty description="No services data for selected period" />
                  )}
                </Card>
              </TabPane>

              {/* Most/Least Used Services Tab */}
              <TabPane 
                tab={<span><BarChartOutlined /> Service Usage</span>} 
                key="usage"
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Card 
                      title={
                        <Space>
                          <RiseOutlined style={{ color: '#52c41a' }} />
                          <span>Most Used Services</span>
                        </Space>
                      }
                    >
                      {performance?.mostUsedServices && performance.mostUsedServices.length > 0 ? (
                        <Table
                          dataSource={performance.mostUsedServices}
                          columns={[
                            { 
                              title: 'Service', 
                              dataIndex: 'service_name', 
                              key: 'service_name' 
                            },
                            { 
                              title: 'Uses', 
                              dataIndex: 'usageCount', 
                              key: 'usageCount',
                              render: (value: number) => <Tag color="green">{value}</Tag>
                            },
                            { 
                              title: 'Revenue', 
                              dataIndex: 'revenue', 
                              key: 'revenue',
                              render: (value: number) => `${value.toLocaleString()} EGP`
                            }
                          ]}
                          rowKey="service_id"
                          pagination={false}
                          size="small"
                        />
                      ) : (
                        <Empty description="No data" />
                      )}
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card 
                      title={
                        <Space>
                          <FallOutlined style={{ color: '#f5222d' }} />
                          <span>Least Used Services</span>
                        </Space>
                      }
                    >
                      {performance?.leastUsedServices && performance.leastUsedServices.length > 0 ? (
                        <Table
                          dataSource={performance.leastUsedServices}
                          columns={[
                            { 
                              title: 'Service', 
                              dataIndex: 'service_name', 
                              key: 'service_name' 
                            },
                            { 
                              title: 'Uses', 
                              dataIndex: 'usageCount', 
                              key: 'usageCount',
                              render: (value: number) => <Tag color="red">{value}</Tag>
                            },
                            { 
                              title: 'Revenue', 
                              dataIndex: 'revenue', 
                              key: 'revenue',
                              render: (value: number) => `${value.toLocaleString()} EGP`
                            }
                          ]}
                          rowKey="service_id"
                          pagination={false}
                          size="small"
                        />
                      ) : (
                        <Empty description="No data" />
                      )}
                    </Card>
                  </Col>
                </Row>
              </TabPane>

              {/* Consultation Types Tab */}
              <TabPane 
                tab={<span><UserOutlined /> Consultation Breakdown</span>} 
                key="consultations"
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Card title="Consultation Types">
                      {performance?.consultationTypes && performance.consultationTypes.length > 0 ? (
                        <Table
                          dataSource={performance.consultationTypes}
                          columns={[
                            { 
                              title: 'Type', 
                              dataIndex: 'type', 
                              key: 'type' 
                            },
                            { 
                              title: 'Count', 
                              dataIndex: 'count', 
                              key: 'count',
                              render: (value: number) => <Tag color="blue">{value}</Tag>
                            },
                            { 
                              title: 'Revenue', 
                              dataIndex: 'revenue', 
                              key: 'revenue',
                              render: (value: number) => `${value.toLocaleString()} EGP`
                            }
                          ]}
                          rowKey="type"
                          pagination={false}
                          size="small"
                        />
                      ) : (
                        <Empty description="No data" />
                      )}
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="Payment Methods">
                      {performance?.paymentMethods && performance.paymentMethods.length > 0 ? (
                        <Table
                          dataSource={performance.paymentMethods}
                          columns={[
                            { 
                              title: 'Method', 
                              dataIndex: 'method', 
                              key: 'method',
                              render: (method: string) => {
                                const colors: Record<string, string> = {
                                  cash: 'green',
                                  card: 'blue',
                                  insurance: 'purple',
                                  other: 'default'
                                };
                                return <Tag color={colors[method] || 'default'}>{method}</Tag>;
                              }
                            },
                            { 
                              title: 'Count', 
                              dataIndex: 'count', 
                              key: 'count'
                            },
                            { 
                              title: 'Amount', 
                              dataIndex: 'amount', 
                              key: 'amount',
                              render: (value: number) => (
                                <Text strong style={{ color: '#52c41a' }}>
                                  {value.toLocaleString()} EGP
                                </Text>
                              )
                            }
                          ]}
                          rowKey="method"
                          pagination={false}
                          size="small"
                        />
                      ) : (
                        <Empty description="No data" />
                      )}
                    </Card>
                  </Col>
                </Row>
              </TabPane>
            </Tabs>
          </Spin>
        </Content>
      </Layout>
    </Layout>
  );
};

export default RevenueAnalytics;

