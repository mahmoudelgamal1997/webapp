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
  Tag,
  Alert
} from 'antd';
import {
  DeleteOutlined,
  DollarOutlined,
  PercentageOutlined,
  MedicineBoxOutlined
} from '@ant-design/icons';
import axios from 'axios';
import API from '../config/api';
import { ClinicService, Patient, BillingServiceItem } from './type';
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
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState('');

  const doctorId = localStorage.getItem('doctorId');
  const { selectedClinicId, selectedClinic } = useClinicContext();

  useEffect(() => {
    if (visible) {
      fetchServices();
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    form.resetFields();
    setSelectedServices([]);
    setDiscountType('fixed');
    setDiscountValue(0);
    setDiscountReason('');
    form.setFieldsValue({
      paymentMethod: 'cash',
      paymentStatus: 'pending' // Default to pending - assistant will collect payment
    });
  };

  const fetchServices = async () => {
    if (!doctorId) return;

    try {
      setLoading(true);
      const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SERVICES(doctorId)}`);
      if (response.data.success) {
        setServices(response.data.data.filter((s: ClinicService) => s.isActive));
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
    if (selectedServices.find(s => s.service_id === serviceId)) {
      message.warning('Service already added');
      return;
    }

    const newService: BillingServiceItem = {
      service_id: service.service_id,
      service_name: service.name,
      price: service.price,
      quantity: 1,
      subtotal: service.price
    };

    setSelectedServices([...selectedServices, newService]);
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

  // Calculate totals - NO consultation fee (already paid on patient arrival)
  const servicesTotal = selectedServices.reduce((sum, s) => sum + s.subtotal, 0);
  const subtotal = servicesTotal;

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

    if (selectedServices.length === 0) {
      message.warning('Please add at least one service');
      return;
    }

    try {
      const values = await form.validateFields();
      setSubmitting(true);

      // Create billing for additional services ONLY (no consultation fee)
      const billingData = {
        doctor_id: doctorId,
        patient_id: patient.patient_id,
        patient_name: patient.patient_name,
        patient_phone: patient.patient_phone,
        visit_id: visitId || '',
        clinic_id: selectedClinicId || patient.clinic_id || '',
        consultationFee: 0, // Consultation is already paid
        consultationType: 'خدمات إضافية', // Additional services
        services: selectedServices,
        discount: discountValue > 0 ? {
          type: discountType,
          value: discountValue,
          reason: discountReason
        } : null,
        paymentStatus: values.paymentStatus,
        paymentMethod: values.paymentMethod,
        amountPaid: values.paymentStatus === 'paid' ? totalAmount : (values.amountPaid || 0),
        notes: values.notes || 'Additional services bill'
      };

      const response = await axios.post(`${API.BASE_URL}${API.ENDPOINTS.BILLING}`, billingData);

      if (response.data.success) {
        message.success('Services bill created successfully');

        // Send notification to assistant about the additional services
        // Also saves billing to patient document for real-time display
        try {
          // Use patient's date (visit date) in the same format as Firebase path (yyyy-M-d)
          // If patient.date is in different format, parse it
          let dateString = patient.date || '';

          // If date is in format "2026-1-31" or "2026-01-31", use as is
          // If in other format like "2026-01-31T00:00:00Z", extract date part
          if (dateString.includes('T')) {
            dateString = dateString.split('T')[0];
          }

          // Ensure format is yyyy-M-d (single digit month/day if needed)
          if (dateString && dateString.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
            // Format is already correct, but ensure single digits for month/day
            const parts = dateString.split('-');
            dateString = `${parts[0]}-${parseInt(parts[1])}-${parseInt(parts[2])}`;
          }

          // Fallback to today if patient.date is missing
          if (!dateString) {
            const today = new Date();
            dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
          }

          console.log('📅 Using patient date for billing:', dateString);

          await sendBillingNotificationToAllAssistants({
            doctor_id: doctorId,
            clinic_id: selectedClinicId || patient.clinic_id || '',
            patient_id: patient.patient_id, // Required for saving to patient document
            date: dateString, // Required for Firebase path - use patient's visit date
            patient_name: patient.patient_name,
            totalAmount: totalAmount,
            amountPaid: values.paymentStatus === 'paid' ? totalAmount : (values.amountPaid || 0),
            paymentStatus: values.paymentStatus,
            paymentMethod: values.paymentMethod,
            consultationFee: 0,
            consultationType: 'خدمات إضافية',
            servicesTotal: servicesTotal,
            services: selectedServices,
            billing_id: response.data.data?.billing_id || '',
            clinic_name: selectedClinic?.name || '',
            doctor_name: '',
            notes: values.notes || ''
          });
          message.success('Notification sent to assistant');
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
          message.warning('Bill created but notification failed. Please notify assistant manually!');
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
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (qty: number, record: BillingServiceItem) => (
        <InputNumber
          min={1}
          max={100000}
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
      key: 'action',
      width: 50,
      render: (_: any, record: BillingServiceItem) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveService(record.service_id)}
        />
      )
    }
  ];

  if (!patient) return null;

  return (
    <Modal
      title={
        <Space>
          <MedicineBoxOutlined style={{ color: '#1890ff' }} />
          <span>Add Services for {patient.patient_name}</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
          disabled={selectedServices.length === 0}
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
        >
          Create Bill ({totalAmount.toLocaleString()} EGP)
        </Button>
      ]}
    >
      <Alert
        message="Consultation fee is already paid"
        description="This bill is for additional services only. The consultation/revisit fee was recorded when the patient was added to the waiting list."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        {/* Services Selection */}
        <Card title="Select Additional Services" size="small" style={{ marginBottom: 16 }}>
          <Select
            placeholder="Add a service..."
            style={{ width: '100%', marginBottom: 16 }}
            onChange={handleAddService}
            value={undefined}
            loading={loading}
            showSearch
            optionFilterProp="children"
          >
            {services.map(service => (
              <Option
                key={service.service_id}
                value={service.service_id}
                disabled={selectedServices.some(s => s.service_id === service.service_id)}
              >
                {service.name} - {service.price.toLocaleString()} EGP
              </Option>
            ))}
          </Select>

          {selectedServices.length > 0 ? (
            <Table
              dataSource={selectedServices}
              columns={serviceColumns}
              rowKey="service_id"
              pagination={false}
              size="small"
            />
          ) : (
            <Text type="secondary">No services added yet</Text>
          )}
        </Card>

        {/* Discount Section */}
        <Card title="Discount (Optional)" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Discount Type">
                <Radio.Group
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  size="small"
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
              <Form.Item label="Value">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={discountType === 'percentage' ? 100 : subtotal}
                  value={discountValue}
                  onChange={(val) => setDiscountValue(val || 0)}
                  addonAfter={discountType === 'percentage' ? '%' : 'EGP'}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Reason">
                <Input
                  placeholder="Reason"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Payment Section */}
        <Card title="Payment" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="paymentMethod"
                label="Payment Method"
                initialValue="cash"
              >
                <Select>
                  <Option value="cash">💵 Cash</Option>
                  <Option value="card">💳 Card</Option>
                  <Option value="insurance">🏥 Insurance</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="paymentStatus"
                label="Payment Status"
                initialValue="pending"
              >
                <Select>
                  <Option value="pending">⏳ Pending (Assistant will collect)</Option>
                  <Option value="paid">✅ Already Paid</Option>
                  <Option value="partial">📊 Partial Payment</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Additional notes..." />
          </Form.Item>
        </Card>

        {/* Summary */}
        <Card
          size="small"
          style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}
        >
          <Title level={5} style={{ margin: 0, marginBottom: 8 }}>Bill Summary</Title>
          <Row justify="space-between">
            <Text>Services Total:</Text>
            <Text>{servicesTotal.toLocaleString()} EGP</Text>
          </Row>
          {discountAmount > 0 && (
            <Row justify="space-between">
              <Text>Discount:</Text>
              <Text type="danger">-{discountAmount.toLocaleString()} EGP</Text>
            </Row>
          )}
          <Divider style={{ margin: '8px 0' }} />
          <Row justify="space-between">
            <Title level={4} style={{ margin: 0 }}>Total:</Title>
            <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
              {totalAmount.toLocaleString()} EGP
            </Title>
          </Row>
        </Card>
      </Form>
    </Modal>
  );
};

export default BillingModal;
