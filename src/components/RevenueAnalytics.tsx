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
  Divider,
  List,
  Empty
} from 'antd';
import {
  ArrowLeftOutlined,
  DollarOutlined,
  UserOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  ReloadOutlined,
  EyeOutlined,
  RetweetOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  const [activeFilter, setActiveFilter] = useState<string>('month');
  
  const navigate = useNavigate();
  const doctorId = localStorage.getItem('doctorId');

  useEffect(() => {
    fetchAllData();
  }, [dateRange]);

  const fetchAllData = async () => {
    if (!doctorId) return;

    try {
      setLoading(true);
      
      // Format dates with time component to ensure proper filtering
      // Start date: beginning of day (00:00:00)
      // End date: end of day (23:59:59) to include all records for that day
      const params = {
        startDate: dateRange[0]?.startOf('day').format('YYYY-MM-DD HH:mm:ss'),
        endDate: dateRange[1]?.endOf('day').format('YYYY-MM-DD HH:mm:ss')
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
      setActiveFilter('custom');
    }
  };

  const handlePresetPeriod = (period: 'today' | 'week' | 'month' | 'year') => {
    setActiveFilter(period);
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

  // Calculate visit vs revisit from consultationTypes
  const getVisitStats = () => {
    const consultationTypes = performance?.consultationTypes || [];
    const visitData = consultationTypes.find(ct => ct.type === 'كشف');
    const revisitData = consultationTypes.find(ct => ct.type === 'اعاده كشف');
    
    return {
      visits: visitData?.count || 0,
      visitRevenue: visitData?.revenue || 0,
      revisits: revisitData?.count || 0,
      revisitRevenue: revisitData?.revenue || 0,
      totalPatients: (visitData?.count || 0) + (revisitData?.count || 0)
    };
  };

  const visitStats = getVisitStats();

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-EG', { 
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(value);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <DashboardSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <Layout>
        <DashboardHeader 
          onSettingsClick={() => navigate('/settings')}
          onMenuClick={() => {}}
          isMobile={false}
        />
        
        <Content style={{ margin: '24px 16px', padding: 24, background: '#f5f5f5' }}>
          {/* Header */}
          <Card style={{ marginBottom: 16 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <Button 
                    icon={<ArrowLeftOutlined />} 
                    onClick={() => navigate('/dashboard')}
                  >
                    Back
                  </Button>
                  <Title level={4} style={{ margin: 0 }}>
                    📊 Revenue Report
                  </Title>
                </Space>
              </Col>
              <Col>
                <Space wrap>
                  <Button 
                    type={activeFilter === 'today' ? 'primary' : 'default'}
                    onClick={() => handlePresetPeriod('today')}
                  >
                    Today
                  </Button>
                  <Button 
                    type={activeFilter === 'week' ? 'primary' : 'default'}
                    onClick={() => handlePresetPeriod('week')}
                  >
                    This Week
                  </Button>
                  <Button 
                    type={activeFilter === 'month' ? 'primary' : 'default'}
                    onClick={() => handlePresetPeriod('month')}
                  >
                    This Month
                  </Button>
                  <Button 
                    type={activeFilter === 'year' ? 'primary' : 'default'}
                    onClick={() => handlePresetPeriod('year')}
                  >
                    This Year
                  </Button>
                  <RangePicker
                    value={dateRange}
                    onChange={handleDateRangeChange}
                    format="YYYY-MM-DD"
                  />
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={fetchAllData}
                    loading={loading}
                  >
                    Refresh
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <Spin spinning={loading}>
            {/* SECTION 1: Total Revenue - Big and Clear */}
            <Card 
              style={{ 
                marginBottom: 16, 
                background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                border: 'none'
              }}
            >
              <Row align="middle" justify="center">
                <Col>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18 }}>
                      💰 Total Revenue
                    </Text>
                    <Title level={1} style={{ color: '#fff', margin: '8px 0', fontSize: 48 }}>
                      {formatCurrency(overview?.totalRevenue || 0)} EGP
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                      {dateRange[0]?.format('DD/MM/YYYY')} - {dateRange[1]?.format('DD/MM/YYYY')}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* SECTION 2: Visit vs Revisit - Clear Breakdown */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} md={12}>
                <Card 
                  style={{ height: '100%', borderLeft: '4px solid #52c41a' }}
                  bodyStyle={{ padding: 24 }}
                >
                  <Row align="middle" gutter={16}>
                    <Col>
                      <div style={{ 
                        width: 64, 
                        height: 64, 
                        borderRadius: '50%', 
                        background: '#f6ffed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <EyeOutlined style={{ fontSize: 28, color: '#52c41a' }} />
                      </div>
                    </Col>
                    <Col flex="auto">
                      <Text type="secondary">New Consultations / كشف</Text>
                      <Title level={2} style={{ margin: '4px 0', color: '#52c41a' }}>
                        {visitStats.visits}
                      </Title>
                      <Text strong style={{ fontSize: 18 }}>
                        {formatCurrency(visitStats.visitRevenue)} EGP
                      </Text>
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card 
                  style={{ height: '100%', borderLeft: '4px solid #722ed1' }}
                  bodyStyle={{ padding: 24 }}
                >
                  <Row align="middle" gutter={16}>
                    <Col>
                      <div style={{ 
                        width: 64, 
                        height: 64, 
                        borderRadius: '50%', 
                        background: '#f9f0ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <RetweetOutlined style={{ fontSize: 28, color: '#722ed1' }} />
                      </div>
                    </Col>
                    <Col flex="auto">
                      <Text type="secondary">Revisits / اعاده كشف</Text>
                      <Title level={2} style={{ margin: '4px 0', color: '#722ed1' }}>
                        {visitStats.revisits}
                      </Title>
                      <Text strong style={{ fontSize: 18 }}>
                        {formatCurrency(visitStats.revisitRevenue)} EGP
                      </Text>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            {/* SECTION 3: Revenue Breakdown */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Consultation Fees"
                    value={overview?.totalConsultationFees || 0}
                    suffix="EGP"
                    prefix={<UserOutlined style={{ color: '#1890ff' }} />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Services Revenue"
                    value={overview?.totalServicesRevenue || 0}
                    suffix="EGP"
                    prefix={<MedicineBoxOutlined style={{ color: '#13c2c2' }} />}
                    valueStyle={{ color: '#13c2c2' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Discounts Given"
                    value={overview?.totalDiscounts || 0}
                    suffix="EGP"
                    prefix={<DollarOutlined style={{ color: '#faad14' }} />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Total Bills"
                    value={overview?.totalBillings || 0}
                    prefix={<CalendarOutlined style={{ color: '#52c41a' }} />}
                  />
                </Card>
              </Col>
            </Row>

            {/* SECTION 4: Quick Stats */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} md={8}>
                <Card style={{ textAlign: 'center' }}>
                  <Text type="secondary">Average Bill Value</Text>
                  <Title level={3} style={{ margin: '8px 0' }}>
                    {formatCurrency(overview?.averageBillValue || 0)} EGP
                  </Title>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card style={{ textAlign: 'center' }}>
                  <Text type="secondary">Total Visits</Text>
                  <Title level={3} style={{ margin: '8px 0' }}>
                    {performance?.overview.totalVisits || 0}
                  </Title>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card style={{ textAlign: 'center' }}>
                  <Text type="secondary">Unique Patients</Text>
                  <Title level={3} style={{ margin: '8px 0' }}>
                    {performance?.overview.uniquePatientCount || 0}
                  </Title>
                </Card>
              </Col>
            </Row>

            {/* SECTION 5: All Consultation Types */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} md={12}>
                <Card title="📋 All Consultation Types">
                  {performance?.consultationTypes && performance.consultationTypes.length > 0 ? (
                    <List
                      dataSource={performance.consultationTypes}
                      renderItem={(item: any) => (
                        <List.Item>
                          <List.Item.Meta
                            title={
                              <Space>
                                <Tag color={item.type === 'كشف' ? 'green' : item.type === 'اعاده كشف' ? 'purple' : 'blue'}>
                                  {item.type}
                                </Tag>
                                <Text strong>{item.count} patients</Text>
                              </Space>
                            }
                          />
                          <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
                            {formatCurrency(item.revenue)} EGP
                          </Text>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="No consultation data" />
                  )}
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="💳 Payment Methods">
                  {performance?.paymentMethods && performance.paymentMethods.length > 0 ? (
                    <List
                      dataSource={performance.paymentMethods}
                      renderItem={(item: any) => (
                        <List.Item>
                          <List.Item.Meta
                            title={
                              <Space>
                                <Tag color={
                                  item.method === 'cash' ? 'green' : 
                                  item.method === 'card' ? 'blue' : 
                                  item.method === 'insurance' ? 'purple' : 'default'
                                }>
                                  {item.method === 'cash' ? '💵 Cash' : 
                                   item.method === 'card' ? '💳 Card' : 
                                   item.method === 'insurance' ? '🏥 Insurance' : item.method}
                                </Tag>
                                <Text>{item.count} transactions</Text>
                              </Space>
                            }
                          />
                          <Text strong style={{ color: '#1890ff', fontSize: 16 }}>
                            {formatCurrency(item.amount)} EGP
                          </Text>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="No payment data" />
                  )}
                </Card>
              </Col>
            </Row>

            {/* SECTION 6: Services Revenue */}
            <Card title="🏥 Additional Services Revenue">
              {servicesAnalytics.length > 0 ? (
                <Table
                  dataSource={servicesAnalytics}
                  rowKey="service_id"
                  pagination={false}
                  columns={[
                    {
                      title: 'Service Name',
                      dataIndex: 'service_name',
                      key: 'service_name',
                      render: (text: string) => <Text strong>{text}</Text>
                    },
                    {
                      title: 'Patients',
                      dataIndex: 'totalPatients',
                      key: 'totalPatients',
                      align: 'center' as const,
                      render: (value: number) => (
                        <Tag color="blue">{value}</Tag>
                      )
                    },
                    {
                      title: 'Times Used',
                      dataIndex: 'totalQuantity',
                      key: 'totalQuantity',
                      align: 'center' as const
                    },
                    {
                      title: 'Total Revenue',
                      dataIndex: 'totalRevenue',
                      key: 'totalRevenue',
                      align: 'right' as const,
                      render: (value: number) => (
                        <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
                          {formatCurrency(value)} EGP
                        </Text>
                      ),
                      sorter: (a: ServiceAnalyticsItem, b: ServiceAnalyticsItem) => 
                        a.totalRevenue - b.totalRevenue,
                      defaultSortOrder: 'descend' as const
                    },
                    {
                      title: 'Avg per Patient',
                      dataIndex: 'averageRevenuePerPatient',
                      key: 'averageRevenuePerPatient',
                      align: 'right' as const,
                      render: (value: number) => `${formatCurrency(value)} EGP`
                    }
                  ]}
                  summary={(pageData) => {
                    const totalRev = pageData.reduce((sum, item) => sum + item.totalRevenue, 0);
                    const totalPatients = pageData.reduce((sum, item) => sum + item.totalPatients, 0);
                    return (
                      <Table.Summary.Row style={{ background: '#fafafa' }}>
                        <Table.Summary.Cell index={0}>
                          <Text strong>Total</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="center">
                          <Tag color="green">{totalPatients}</Tag>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="center">-</Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right">
                          <Text strong style={{ color: '#52c41a', fontSize: 18 }}>
                            {formatCurrency(totalRev)} EGP
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} align="right">-</Table.Summary.Cell>
                      </Table.Summary.Row>
                    );
                  }}
                />
              ) : (
                <Empty description="No services data for selected period" />
              )}
            </Card>

          </Spin>
        </Content>
      </Layout>
    </Layout>
  );
};

export default RevenueAnalytics;
