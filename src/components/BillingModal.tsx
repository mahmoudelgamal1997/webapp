import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Select,
  Button,
  Space,
  Typography,
  Divider,
  Table,
  Card,
  Row,
  Col,
  Radio,
  Input,
  message,
  Statistic,
  Tag,
  Alert
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DollarOutlined,
  PercentageOutlined,
  BellOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import axios from 'axios';
import API from '../config/api';
import { ClinicService, Patient, BillingServiceItem, Discount } from './type';
import { sendBillingNotificationToAllAssistants } from '../services/notificationService';
import { useClinicContext } from './ClinicContext';

const { Title, Text } = Typography;
const { Option } = Select;

interface BillingModalProps {
  visible: boolean;
  onCancel: () => void;
  patient: Patient | null;
  visitId?: string;
  onBillingComplete?: () => void;
}

const CONSULTATION_TYPES = [
  { value: 'كشف', label: 'Consultation / كشف', feeKey: 'consultationFee' },
  { value: 'اعاده كشف', label: 'Revisit / اعاده كشف', feeKey: 'revisitFee' },
  { value: 'استشارة', label: 'Follow-up / استشارة', feeKey: 'revisitFee' },
  { value: 'متابعة', label: 'Check-up / متابعة', feeKey: 'revisitFee' },
  { value: 'طوارئ', label: 'Emergency / طوارئ', feeKey: 'consultationFee' }
];

const BillingModal: React.FC<BillingModalProps> = ({
  visible,
  onCancel,
  patient,
  visitId,
  onBillingComplete
}) => {
  const [form] = Form.useForm();
  const [services, setServices] = useState<ClinicService[]>([]);
  const [selectedServices, setSelectedServices] = useState<BillingServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consultationFee, setConsultationFee] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [notificationError, setNotificationError] = useState<string>('');
  const [doctorSettings, setDoctorSettings] = useState<{ consultationFee: number; revisitFee: number }>({ 
    consultationFee: 0, 
    revisitFee: 0 
  });

  const doctorId = localStorage.getItem('doctorId');
  const { selectedClinicId, selectedClinic } = useClinicContext();

  useEffect(() => {
    if (visible) {
      fetchServices();
      fetchDoctorSettings();
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    form.resetFields();
    setSelectedServices([]);
    setConsultationFee(doctorSettings.consultationFee || 0);
    setDiscountType('fixed');
    setDiscountValue(0);
    setDiscountReason('');
    form.setFieldsValue({
      consultationType: 'كشف',
      paymentMethod: 'cash',
      paymentStatus: 'paid'
    });
  };

  const fetchDoctorSettings = async () => {
    if (!doctorId) return;

    try {
      const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SETTINGS(doctorId)}`);
      if (response.data.settings) {
        const settings = response.data.settings;
        setDoctorSettings({
          consultationFee: settings.consultationFee || 0,
          revisitFee: settings.revisitFee || 0
        });
        // Set initial consultation fee
        setConsultationFee(settings.consultationFee || 0);
      }
    } catch (error) {
      console.error('Error fetching doctor settings:', error);
    }
  };

  // Handle consultation type change - auto-fill fee
  const handleConsultationTypeChange = (value: string) => {
    const selectedType = CONSULTATION_TYPES.find(t => t.value === value);
    if (selectedType) {
      const fee = selectedType.feeKey === 'consultationFee' 
        ? doctorSettings.consultationFee 
        : doctorSettings.revisitFee;
      setConsultationFee(fee);
    }
  };

  const fetchServices = async () => {
    if (!doctorId) return;

    try {
      setLoading(true);
      const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SERVICES(doctorId)}`);
      
      if (response.data.success) {
        setServices(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = (serviceId: string) => {
    const service = services.find(s => s.service_id === serviceId);
    if (!service) return;

    // Check if already added
    const existingIndex = selectedServices.findIndex(s => s.service_id === serviceId);
    
    if (existingIndex >= 0) {
      // Increase quantity
      const updated = [...selectedServices];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].subtotal = updated[existingIndex].price * updated[existingIndex].quantity;
      setSelectedServices(updated);
    } else {
      // Add new
      setSelectedServices([
        ...selectedServices,
        {
          service_id: service.service_id,
          service_name: service.name,
          price: service.price,
          quantity: 1,
          subtotal: service.price
        }
      ]);
    }
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(s => s.service_id !== serviceId));
  };

  const handleQuantityChange = (serviceId: string, quantity: number) => {
    const updated = selectedServices.map(s => {
      if (s.service_id === serviceId) {
        return {
          ...s,
          quantity,
          subtotal: s.price * quantity
        };
      }
      return s;
    });
    setSelectedServices(updated);
  };

  // Calculate totals
  const servicesTotal = selectedServices.reduce((sum, s) => sum + s.subtotal, 0);
  const subtotal = consultationFee + servicesTotal;
  
  let discountAmount = 0;
  if (discountValue > 0) {
    if (discountType === 'percentage') {
      discountAmount = (subtotal * discountValue) / 100;
    } else {
      discountAmount = Math.min(discountValue, subtotal);
    }
  }
  
  const totalAmount = Math.max(0, subtotal - discountAmount);

  const handleSubmit = async () => {
    if (!doctorId || !patient) {
      message.error('Missing required information');
      return;
    }

    try {
      const values = await form.validateFields();
      setSubmitting(true);
      setNotificationStatus('idle');
      setNotificationError('');

      const billingData = {
        doctor_id: doctorId,
        patient_id: patient.patient_id,
        patient_name: patient.patient_name,
        patient_phone: patient.patient_phone,
        visit_id: visitId || '',
        clinic_id: selectedClinicId || patient.clinic_id || '',
        consultationFee,
        consultationType: values.consultationType,
        services: selectedServices,
        discount: discountValue > 0 ? {
          type: discountType,
          value: discountValue,
          reason: discountReason
        } : null,
        paymentStatus: values.paymentStatus,
        paymentMethod: values.paymentMethod,
        amountPaid: values.paymentStatus === 'paid' ? totalAmount : (values.amountPaid || 0),
        notes: values.notes || ''
      };

      const response = await axios.post(`${API.BASE_URL}${API.ENDPOINTS.BILLING}`, billingData);

      if (response.data.success) {
        message.success('Billing record created successfully');
        
        // CRITICAL: Send notification to assistant(s) about the billing
        // This ensures the assistant is notified to collect payment
        setNotificationStatus('sending');
        
        try {
          const notificationResult = await sendBillingNotificationToAllAssistants({
            doctor_id: doctorId,
            clinic_id: selectedClinicId || patient.clinic_id || '',
            patient_name: patient.patient_name,
            totalAmount: totalAmount,
            consultationFee: consultationFee,
            services: selectedServices,
            billing_id: response.data.data?.billing_id || '',
            clinic_name: selectedClinic?.name || '',
            doctor_name: '' // Will be filled by context if available
          }) as unknown as { success: boolean; notified?: number; failed?: number; total?: number; error?: string };
          
          if (notificationResult.success) {
            setNotificationStatus('success');
            message.success(`Billing notification sent to ${notificationResult.notified || 0} assistant(s)`);
          } else {
            setNotificationStatus('failed');
            setNotificationError('No assistants found to notify. Please verify with assistant manually.');
            message.warning('No assistants found. Please notify assistant manually about this payment.');
          }
        } catch (notifError: any) {
          console.error('Failed to send billing notification:', notifError);
          setNotificationStatus('failed');
          setNotificationError(notifError.message || 'Failed to send notification');
          // Show warning but don't block - billing was still created
          message.warning('Billing created but notification failed. Please notify assistant manually!');
        }
        
        onBillingComplete?.();
        onCancel();
      }
    } catch (error) {
      console.error('Error creating billing:', error);
      message.error('Failed to create billing record');
    } finally {
      setSubmitting(false);
    }
  };

  const serviceColumns = [
    {
      title: 'Service',
      dataIndex: 'service_name',
      key: 'service_name'
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `${price.toLocaleString()} EGP`
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number, record: BillingServiceItem) => (
        <InputNumber
          min={1}
          max={99}
          value={qty}
          size="small"
          onChange={(val) => handleQuantityChange(record.service_id, val || 1)}
        />
      )
    },
    {
      title: 'Subtotal',
      dataIndex: 'subtotal',
      key: 'subtotal',
      render: (subtotal: number) => (
        <Text strong style={{ color: '#52c41a' }}>{subtotal.toLocaleString()} EGP</Text>
      )
    },
    {
      title: '',
      key: 'actions',
      render: (_: any, record: BillingServiceItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveService(record.service_id)}
        />
      )
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <DollarOutlined style={{ color: '#52c41a' }} />
          <span>Create Bill - {patient?.patient_name}</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
        >
          Create Bill
        </Button>
      ]}
    >
      <Form form={form} layout="vertical">
        <Row gutter={24}>
          {/* Left Column - Services Selection */}
          <Col span={14}>
            <Card title="Consultation Fee" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="consultationType"
                    label="Consultation Type"
                    initialValue="كشف"
                  >
                    <Select onChange={handleConsultationTypeChange}>
                      {CONSULTATION_TYPES.map(ct => (
                        <Option key={ct.value} value={ct.value}>{ct.label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Consultation Fee (EGP)">
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      value={consultationFee}
                      onChange={(val) => setConsultationFee(val || 0)}
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => Number(value!.replace(/\$\s?|(,*)/g, '')) || 0}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card 
              title="Additional Services" 
              size="small"
              extra={
                <Select
                  showSearch
                  placeholder="Add service..."
                  style={{ width: 200 }}
                  loading={loading}
                  onChange={handleAddService}
                  value={undefined}
                  optionFilterProp="children"
                >
                  {services.map(service => (
                    <Option key={service.service_id} value={service.service_id}>
                      {service.name} - {service.price} EGP
                    </Option>
                  ))}
                </Select>
              }
            >
              {selectedServices.length > 0 ? (
                <Table
                  dataSource={selectedServices}
                  columns={serviceColumns}
                  rowKey="service_id"
                  pagination={false}
                  size="small"
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                  No additional services selected. Use the dropdown above to add services.
                </div>
              )}
            </Card>

            <Card title="Discount" size="small" style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Type">
                    <Radio.Group
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                    >
                      <Radio.Button value="fixed">
                        <DollarOutlined /> Fixed
                      </Radio.Button>
                      <Radio.Button value="percentage">
                        <PercentageOutlined /> %
                      </Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={discountType === 'percentage' ? 'Percentage' : 'Amount (EGP)'}>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      max={discountType === 'percentage' ? 100 : undefined}
                      value={discountValue}
                      onChange={(val) => setDiscountValue(val || 0)}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Reason">
                    <Input
                      placeholder="Optional"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Right Column - Summary & Payment */}
          <Col span={10}>
            <Card title="Bill Summary" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row justify="space-between">
                  <Text>Consultation Fee:</Text>
                  <Text>{consultationFee.toLocaleString()} EGP</Text>
                </Row>
                <Row justify="space-between">
                  <Text>Services Total:</Text>
                  <Text>{servicesTotal.toLocaleString()} EGP</Text>
                </Row>
                <Divider style={{ margin: '8px 0' }} />
                <Row justify="space-between">
                  <Text strong>Subtotal:</Text>
                  <Text strong>{subtotal.toLocaleString()} EGP</Text>
                </Row>
                {discountAmount > 0 && (
                  <Row justify="space-between">
                    <Text type="success">
                      Discount ({discountType === 'percentage' ? `${discountValue}%` : 'Fixed'}):
                    </Text>
                    <Text type="success">-{discountAmount.toLocaleString()} EGP</Text>
                  </Row>
                )}
                <Divider style={{ margin: '8px 0' }} />
                <Row justify="space-between">
                  <Title level={4} style={{ margin: 0 }}>Total:</Title>
                  <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
                    {totalAmount.toLocaleString()} EGP
                  </Title>
                </Row>
              </Space>
            </Card>

            <Card title="Payment Details" size="small">
              <Form.Item
                name="paymentMethod"
                label="Payment Method"
                initialValue="cash"
              >
                <Select>
                  <Option value="cash">Cash</Option>
                  <Option value="card">Card</Option>
                  <Option value="insurance">Insurance</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="paymentStatus"
                label="Payment Status"
                initialValue="paid"
              >
                <Select>
                  <Option value="paid">
                    <Tag color="green">Paid</Tag>
                  </Option>
                  <Option value="pending">
                    <Tag color="orange">Pending</Tag>
                  </Option>
                  <Option value="partial">
                    <Tag color="blue">Partial</Tag>
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.paymentStatus !== currentValues.paymentStatus
                }
              >
                {({ getFieldValue }) =>
                  getFieldValue('paymentStatus') === 'partial' ? (
                    <Form.Item
                      name="amountPaid"
                      label="Amount Paid (EGP)"
                      rules={[{ required: true, message: 'Enter amount paid' }]}
                    >
                      <InputNumber style={{ width: '100%' }} min={0} max={totalAmount} />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>

              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={2} placeholder="Additional notes..." />
              </Form.Item>
            </Card>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default BillingModal;

