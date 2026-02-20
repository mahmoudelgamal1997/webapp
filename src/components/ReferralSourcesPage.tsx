import React, { useState, useEffect } from 'react';
import {
  Layout, Card, Typography, Button, Input, Table, Tag,
  Space, Popconfirm, message, Select, Divider, Spin, Row, Col, Statistic,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, TeamOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDoctorContext } from './DoctorContext';
import { useClinicContext } from './ClinicContext';
import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const DEFAULT_SOURCE = 'عام';

// Generate all dates (YYYY-M-D) in a given year/month
function getDatesInMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    dates.push(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

const ReferralSourcesPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, loading: settingsLoading, updateSettings, doctorId } = useDoctorContext();
  const { selectedClinicId } = useClinicContext();

  const [newSource, setNewSource] = useState('');
  const [saving, setSaving] = useState(false);

  // Report state
  const now = new Date();
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<{ source: string; count: number }[]>([]);

  const sources: string[] = settings?.referralSources ?? [];

  // ── Source management ──────────────────────────────────────────
  const handleAddSource = async () => {
    const trimmed = newSource.trim();
    if (!trimmed) return;
    if (trimmed === DEFAULT_SOURCE || sources.includes(trimmed)) {
      message.warning('هذا المصدر موجود بالفعل');
      return;
    }
    setSaving(true);
    const updated = [...sources, trimmed];
    const ok = await updateSettings({ ...settings, referralSources: updated } as any);
    if (ok) { setNewSource(''); message.success('تم إضافة المصدر'); }
    setSaving(false);
  };

  const handleDeleteSource = async (src: string) => {
    setSaving(true);
    const updated = sources.filter((s) => s !== src);
    const ok = await updateSettings({ ...settings, referralSources: updated } as any);
    if (ok) message.success('تم حذف المصدر');
    setSaving(false);
  };

  // ── Report ─────────────────────────────────────────────────────
  const loadReport = async () => {
    if (!doctorId || !selectedClinicId) {
      message.warning('لم يتم تحديد العيادة أو الطبيب');
      return;
    }
    setReportLoading(true);
    try {
      const dates = getDatesInMonth(reportYear, reportMonth);
      const counts: Record<string, number> = {};

      await Promise.all(
        dates.map(async (date) => {
          const ref = collection(db, 'clinics', selectedClinicId, 'waiting_list', date, 'patients');
          const snap = await getDocs(ref);
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.doctor_id !== doctorId) return;
            const src = data.referral_source || DEFAULT_SOURCE;
            counts[src] = (counts[src] ?? 0) + 1;
          });
        })
      );

      const rows = Object.entries(counts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

      setReportData(rows);
    } catch (err) {
      message.error('حدث خطأ أثناء تحميل التقرير');
    } finally {
      setReportLoading(false);
    }
  };

  // Auto-load report when month/year changes
  useEffect(() => {
    if (doctorId && selectedClinicId) loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportYear, reportMonth, doctorId, selectedClinicId]);

  const totalPatients = reportData.reduce((s, r) => s + r.count, 0);

  const monthOptions = [
    { value: 1, label: 'يناير' }, { value: 2, label: 'فبراير' },
    { value: 3, label: 'مارس' }, { value: 4, label: 'أبريل' },
    { value: 5, label: 'مايو' }, { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' }, { value: 8, label: 'أغسطس' },
    { value: 9, label: 'سبتمبر' }, { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' },
  ];
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const reportColumns = [
    {
      title: 'مصدر التعريف',
      dataIndex: 'source',
      key: 'source',
      render: (src: string) => (
        <Tag color={src === DEFAULT_SOURCE ? 'default' : 'blue'} style={{ fontSize: 14 }}>
          {src}
        </Tag>
      ),
    },
    {
      title: 'عدد المرضى',
      dataIndex: 'count',
      key: 'count',
      render: (c: number) => <strong>{c}</strong>,
    },
    {
      title: 'النسبة',
      key: 'pct',
      render: (_: any, row: { source: string; count: number }) => {
        const pct = totalPatients > 0 ? Math.round((row.count / totalPatients) * 100) : 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: `${Math.max(pct * 2, 4)}px`,
                height: 12,
                background: '#1677ff',
                borderRadius: 4,
                transition: 'width 0.4s',
              }}
            />
            <span>{pct}%</span>
          </div>
        );
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', direction: 'rtl' }}>
      <Header
        style={{
          background: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')} type="text">
          العودة للوحة التحكم
        </Button>
        <Title level={4} style={{ margin: 0 }}>مصادر التعريف</Title>
      </Header>

      <Content style={{ margin: 24 }}>
        <Row gutter={[24, 24]}>
          {/* ── Source Management ── */}
          <Col xs={24} md={10}>
            <Card
              title={
                <Space>
                  <TeamOutlined />
                  <span>إدارة المصادر</span>
                </Space>
              }
            >
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                أضف المصادر التي يسمع منها مرضاك عن عيادتك (مثل: فيسبوك، صديق، جوجل…)
                <br />
                المصدر الافتراضي <Tag>عام</Tag> دائم ولا يمكن حذفه.
              </Text>

              {/* Default source badge */}
              <div style={{ marginBottom: 16 }}>
                <Tag color="default" style={{ fontSize: 14, padding: '4px 12px' }}>
                  عام (افتراضي)
                </Tag>
              </div>

              {/* Custom sources list */}
              {settingsLoading ? (
                <Spin />
              ) : sources.length === 0 ? (
                <Text type="secondary">لا توجد مصادر مخصصة بعد.</Text>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  {sources.map((src) => (
                    <div
                      key={src}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      <Tag color="blue" style={{ fontSize: 14 }}>{src}</Tag>
                      <Popconfirm
                        title={`حذف "${src}"؟`}
                        onConfirm={() => handleDeleteSource(src)}
                        okText="حذف"
                        cancelText="إلغاء"
                      >
                        <Button
                          danger
                          type="text"
                          icon={<DeleteOutlined />}
                          size="small"
                          loading={saving}
                        />
                      </Popconfirm>
                    </div>
                  ))}
                </div>
              )}

              <Divider />

              {/* Add new source */}
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="مصدر جديد (مثال: فيسبوك)"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  onPressEnter={handleAddSource}
                  disabled={saving}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddSource}
                  loading={saving}
                >
                  إضافة
                </Button>
              </Space.Compact>
            </Card>
          </Col>

          {/* ── Monthly Report ── */}
          <Col xs={24} md={14}>
            <Card
              title={
                <Space>
                  <BarChartOutlined />
                  <span>تقرير المصادر الشهري</span>
                </Space>
              }
              extra={
                <Space>
                  <Select
                    value={reportMonth}
                    onChange={setReportMonth}
                    options={monthOptions}
                    style={{ width: 110 }}
                  />
                  <Select
                    value={reportYear}
                    onChange={setReportYear}
                    options={yearOptions.map((y) => ({ value: y, label: y }))}
                    style={{ width: 90 }}
                  />
                </Space>
              }
            >
              {reportLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Spin size="large" />
                </div>
              ) : reportData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                  لا يوجد مرضى في هذا الشهر
                </div>
              ) : (
                <>
                  <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col span={12}>
                      <Statistic title="إجمالي المرضى" value={totalPatients} />
                    </Col>
                    <Col span={12}>
                      <Statistic title="عدد المصادر" value={reportData.length} />
                    </Col>
                  </Row>
                  <Table
                    dataSource={reportData}
                    columns={reportColumns}
                    rowKey="source"
                    pagination={false}
                    size="small"
                  />
                </>
              )}
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default ReferralSourcesPage;
