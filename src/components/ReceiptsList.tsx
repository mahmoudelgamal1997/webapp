// ReceiptsList.tsx
import React from 'react';
import { Table, Typography, Tag, Space } from 'antd';
import { Receipt } from '../components/type';
import moment from 'moment';

interface ReceiptsListProps {
  receipts: Receipt[];
  onPrintReceipt?: (receipt: Receipt) => void;
}

const ReceiptsList: React.FC<ReceiptsListProps> = ({ receipts, onPrintReceipt }) => {
  // If no receipts, show a message
  if (!receipts || receipts.length === 0) {
    return <Typography.Text type="secondary">No receipts available</Typography.Text>;
  }

  // Columns for receipts table
  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => moment(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: 'Drugs',
      dataIndex: 'drugs',
      key: 'drugs',
      render: (drugs: any[]) => (
        <Space direction="vertical">
          {drugs.map((drug, index) => (
            <div key={index}>
              <Typography.Text strong>{drug.drug}</Typography.Text>
              <Typography.Text type="secondary"> - {drug.frequency}, {drug.period}, {drug.timing}</Typography.Text>
            </div>
          ))}
        </Space>
      )
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes'
    },
    {
      title: 'Drug Model',
      dataIndex: 'drugModel',
      key: 'drugModel',
      render: (drugModel: string) => <Tag>{drugModel}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: any, record: Receipt) => (
        onPrintReceipt ? (
          <a onClick={() => onPrintReceipt(record)}>Print</a>
        ) : null
      )
    }
  ];

  return (
    <Table 
      dataSource={receipts} 
      columns={columns} 
      rowKey="_id"
      locale={{
        emptyText: 'No receipts available'
      }}
    />
  );
};

export default ReceiptsList;