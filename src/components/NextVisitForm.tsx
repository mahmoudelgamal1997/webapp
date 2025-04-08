// src/components/NextVisitForm.tsx
import React from 'react';
import { Form, DatePicker, Input, Button, Modal, message } from 'antd';
import { useNextVisits } from './NextVisitContext';
import dayjs from 'dayjs';
import { Patient } from './type';

const { TextArea } = Input;

interface NextVisitFormProps {
  visible: boolean;
  onCancel: () => void;
  patient: Patient | null;
}

const NextVisitForm: React.FC<NextVisitFormProps> = ({ visible, onCancel, patient }) => {
  const [form] = Form.useForm();
  const { addNextVisit, loading } = useNextVisits();

  const handleSubmit = async (values: any) => {
    if (!patient) {
      message.error('Patient information is missing');
      return;
    }
    
    try {
      console.log('Form values:', values);
      const visitDate = values.visitDate.format('YYYY-MM-DD');
      console.log('Formatted date:', visitDate);
      
      const success = await addNextVisit(patient, visitDate, values.notes);
      
      if (success) {
        form.resetFields();
        onCancel();
      }
    } catch (error) {
      console.error('Error scheduling next visit:', error);
      message.error('Failed to schedule next visit');
    }
  };

  return (
    <Modal
      title="Schedule Next Visit"
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose={true}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          visitDate: dayjs().add(1, 'week'),
          notes: ''
        }}
        preserve={false}
      >
        <Form.Item
          name="visitDate"
          label="Next Visit Date"
          rules={[{ required: true, message: 'Please select a date' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </Form.Item>

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
            Schedule Visit
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default NextVisitForm;