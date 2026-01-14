// src/components/DashboardWaitingList.tsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Select, DatePicker } from 'antd';
import { ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import moment from 'moment';
import { useWaitingList } from './WaitingListContext';

const { Option } = Select;

interface DashboardWaitingListProps {
  onSelectPatient?: (patientId: string) => void;
}

const DashboardWaitingList: React.FC<DashboardWaitingListProps> = ({ onSelectPatient }) => {
  const { 
    waitingPatients, 
    loading, 
    fetchWaitingList, 
    clinics,
    selectedClinicId,
    setSelectedClinicId 
  } = useWaitingList();
  const [selectedDate, setSelectedDate] = useState(moment());

  useEffect(() => {
    // Fetch waiting list when component mounts or clinic changes
    if (selectedClinicId) {
      fetchWaitingList(selectedDate.format('YYYY-M-D'));
    }
  }, [selectedClinicId]);

  // Handle clinic selection
  const handleClinicChange = (clinicId: string) => {
    setSelectedClinicId(clinicId);
    localStorage.setItem('clinicId', clinicId);
  };

  // Handle date change
  const handleDateChange = (date: moment.Moment | null) => {
    if (date) {
      setSelectedDate(date);
      fetchWaitingList(date.format('YYYY-M-D'));
    }
  };

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'blue';
      case 'in-progress': return 'orange';
      case 'completed': return 'green';
      default: return 'default';
    }
  };

  // Columns for waiting list
  const columns = [
    {
      title: 'Patient',
      dataIndex: 'patient_name',
      key: 'patient_name',
      render: (text: string, record: any) => (
        <a onClick={() => onSelectPatient && onSelectPatient(record._id)}>
          {text}
        </a>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'arrivalTime',
      key: 'arrivalTime',
      render: (time: any) => moment(time?.toDate?.() || time).format('HH:mm'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status?.toUpperCase() || 'WAITING'}
        </Tag>
      ),
    }
  ];

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            Waiting List
          </span>
          <Button 
            type="text" 
            icon={<ReloadOutlined />} 
            onClick={() => fetchWaitingList(selectedDate.format('YYYY-M-D'))}
            loading={loading}
          />
        </div>
      }
      style={{ 
        width: '100%', 
        maxHeight: '400px', 
        overflowY: 'auto' 
      }}
    >
      {/* Clinic and Date Selectors */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: 16 
      }}>
        {clinics && clinics.length > 0 && (
          <Select
            style={{ width: '48%' }}
            placeholder="Select Clinic"
            value={selectedClinicId || undefined}
            onChange={handleClinicChange}
          >
            {clinics.map((clinic: { _id: string; name: string }) => (
              <Option key={clinic._id} value={clinic._id}>{clinic.name}</Option>
            ))}
          </Select>
        )}
        <DatePicker 
          style={{ width: '48%' }}
          value={selectedDate} 
          onChange={handleDateChange} 
          allowClear={false}
          format="YYYY-MM-DD"
        />
      </div>

      {/* Waiting List Table */}
      console.log("mmmmmmmmm"+waitingPatients);
      
      <Table 
        columns={columns}
        dataSource={waitingPatients}
        rowKey="waitingId"
        loading={loading}
        pagination={false}
        size="small"
        locale={{ emptyText: 'No patients in waiting list' }}
      />
    </Card>
  );
};

export default DashboardWaitingList;