// src/components/NextVisits.tsx
import React from 'react';
import { Card, Table, Button, Space, Tag, Popconfirm, Typography, Empty } from 'antd';
import { CalendarOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNextVisits } from './NextVisitContext';
import { NextVisit } from './type';
import dayjs from 'dayjs';
// Import SortOrder from Ant Design
import { SortOrder } from 'antd/lib/table/interface';

const { Title } = Typography;

const NextVisits: React.FC = () => {
  const { nextVisits, deleteNextVisit, fetchNextVisits, loading } = useNextVisits();

  const handleDelete = async (visitId: string) => {
    await deleteNextVisit(visitId);
  };

  const columns = [
    {
      title: 'Patient Name',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'Visit Date',
      dataIndex: 'visitDate',
      key: 'visitDate',
      render: (date: string) => {
        const visitDate = dayjs(date);
        const today = dayjs().startOf('day');
        const daysUntil = visitDate.diff(today, 'day');
        
        let color = 'green';
        if (daysUntil < 0) color = 'red';
        else if (daysUntil === 0) color = 'orange';
        else if (daysUntil <= 3) color = 'blue';
        
        return (
          <Space>
            {visitDate.format('YYYY-MM-DD')}
            <Tag color={color}>
              {daysUntil < 0 ? 'Overdue' : 
               daysUntil === 0 ? 'Today' : 
               `In ${daysUntil} days`}
            </Tag>
          </Space>
        );
      },
      sorter: (a: NextVisit, b: NextVisit) => 
        new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime(),
      // Fix the type here - use 'ascend' as SortOrder
      defaultSortOrder: 'ascend' as SortOrder,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: NextVisit) => (
        <Popconfirm
          title="Are you sure you want to delete this scheduled visit?"
          onConfirm={() => record._id && handleDelete(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />}
          >
            Remove
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card 
      title={
        <Space>
          <CalendarOutlined />
          <Title level={5} style={{ margin: 0 }}>Upcoming Patient Visits</Title>
        </Space>
      }
      extra={
        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={() => fetchNextVisits()}
          loading={loading}
        >
          Refresh
        </Button>
      }
    >
      {nextVisits.length > 0 ? (
        <Table 
          columns={columns}
          dataSource={nextVisits}
          rowKey="_id"
          pagination={{ pageSize: 5 }}
          loading={loading}
        />
      ) : (
        <Empty 
          description="No upcoming visits scheduled" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  );
};

export default NextVisits;