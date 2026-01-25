// src/components/NextVisitForm.tsx
import React, { useState } from 'react';
import { Form, DatePicker, Input, Button, Modal, message, Radio, InputNumber } from 'antd';
import { useNextVisits } from './NextVisitContext';
import dayjs from 'dayjs';
import { Patient } from './type';

const { TextArea } = Input;

interface NextVisitFormProps {
  visible: boolean;
  onCancel: () => void;
  patient: Patient | null;
}

const REMINDER_DURATIONS = [
  { label: '3 days', value: 3 },
  { label: '7 days', value: 7 },
  { label: '10 days', value: 10 },
  { label: '14 days', value: 14 },
  { label: '21 days', value: 21 },
  { label: '30 days', value: 30 },
  { label: 'Custom', value: 'custom' },
];

const NextVisitForm: React.FC<NextVisitFormProps> = ({ visible, onCancel, patient }) => {
  const [form] = Form.useForm();
  const { addNextVisit, loading } = useNextVisits();
  const [reminderType, setReminderType] = useState<string | number>(7);

  const handleSubmit = async (values: any) => {
    if (!patient) {
      message.error('Patient information is missing');
      return;
    }
    
    try {
      console.log('Form values:', values);
      
      // Calculate visit date based on reminder duration
      let visitDate: string;
      let reminderDurationDays: number;
      
      if (reminderType === 'custom') {
        if (!values.customDays || values.customDays < 1) {
          message.error('Please enter a valid number of days (minimum 1)');
          return;
        }
        reminderDurationDays = values.customDays;
        visitDate = dayjs().add(reminderDurationDays, 'day').format('YYYY-MM-DD');
      } else {
        reminderDurationDays = reminderType as number;
        visitDate = dayjs().add(reminderDurationDays, 'day').format('YYYY-MM-DD');
      }
      
      console.log('Calculated visit date:', visitDate, 'Reminder duration:', reminderDurationDays);
      
      const success = await addNextVisit(
        patient, 
        visitDate, 
        values.notes,
        reminderDurationDays
      );
      
      if (success) {
        form.resetFields();
        setReminderType(7);
        onCancel();
      }
    } catch (error) {
      console.error('Error scheduling next visit:', error);
      message.error('Failed to schedule next visit');
    }
  };

  return (
    <Modal
      title="Schedule Next Visit Reminder"
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose={true}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          reminderDuration: 7,
          customDays: 7,
          notes: ''
        }}
        onValuesChange={(changedValues) => {
          if (changedValues.reminderDuration !== undefined) {
            setReminderType(changedValues.reminderDuration);
          }
        }}
        preserve={false}
      >
        <Form.Item
          name="reminderDuration"
          label="Reminder Duration (days before visit)"
          rules={[{ required: true, message: 'Please select reminder duration' }]}
        >
          <Radio.Group 
            value={reminderType} 
            onChange={(e) => {
              setReminderType(e.target.value);
              form.setFieldsValue({ reminderDuration: e.target.value });
            }}
            options={REMINDER_DURATIONS}
          />
        </Form.Item>

        {reminderType === 'custom' && (
          <Form.Item
            name="customDays"
            label="Custom Days"
            rules={[
              { required: true, message: 'Please enter number of days' },
              { type: 'number', min: 1, message: 'Must be at least 1 day' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              placeholder="Enter number of days"
            />
          </Form.Item>
        )}

        <Form.Item
          name="notes"
          label="Notes (Optional)"
        >
          <TextArea
            placeholder="Additional notes for the visit"
            rows={3}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
          >
            Schedule Reminder
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default NextVisitForm;