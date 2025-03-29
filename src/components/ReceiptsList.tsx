// ReceiptsList.tsx
import React from 'react';
import { Table, Space, Button, Empty } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import moment from 'moment';
import { Receipt } from '../components/type';
import { usePatientContext } from './PatientContext';

interface ReceiptsListProps {
  receipts: Receipt[];
  onPrintReceipt: (receipt: Receipt) => void;
}

const ReceiptsList: React.FC<ReceiptsListProps> = ({ receipts, onPrintReceipt }) => {
  const { setSelectedReceipt, setIsViewReceiptModalVisible } = usePatientContext();

  // View receipt details
  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setIsViewReceiptModalVisible(true);
  };

  // Receipt table columns
  const receiptColumns = [
    {
      title: 'Date',
      key: 'date',
      render: (text: string, record: Receipt) => (
        <span>{moment(record.date).format('YYYY-MM-DD')}</span>
      ),
    },
    {
      title: 'Drugs',
      key: 'drugs',
      render: (text: string, record: Receipt) => (
        <span>{record.drugs.length} medications</span>
      ),
    },
    {
      title: 'Notes',
      key: 'notes',
      ellipsis: true,
      render: (text: string, record: Receipt) => (
        <span>{record.notes || 'No notes'}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: string, record: Receipt) => (
        <Space size="small">
          <Button type="link" onClick={() => handleViewReceipt(record)}>View</Button>
          <Button 
            type="link" 
            icon={<PrinterOutlined />} 
            onClick={() => onPrintReceipt(record)}
          >
            Print
          </Button>
        </Space>
      ),
    }
  ];

  if (!receipts || receipts.length === 0) {
    return (
      <Empty 
        description="No receipts available" 
        image={Empty.PRESENTED_IMAGE_SIMPLE} 
      />
    );
  }

  return (
    <Table 
      columns={receiptColumns} 
      dataSource={receipts}
      rowKey="_id"
      pagination={false}
    />
  );
};

export default ReceiptsList;