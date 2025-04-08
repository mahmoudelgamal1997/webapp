// src/components/WaitingList.tsx
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Tag, Space, DatePicker, Row, Col, Typography, Modal, message, Select } from 'antd';
import { ReloadOutlined, UserAddOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import moment from 'moment';
import { useWaitingList } from './WaitingListContext';
import { usePatientContext } from './PatientContext';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;
const { confirm } = Modal;
const { Option } = Select;

interface WaitingListProps {
  onSelectPatient?: (patientId: string) => void;
}

const WaitingList: React.FC<WaitingListProps> = ({ onSelectPatient }) => {
  const { 
    waitingPatients, 
    loading, 
    fetchWaitingList, 
    removeFromWaitingList, 
    updatePatientStatus,
    clinics,
    selectedClinicId,
    setSelectedClinicId,
    fetchClinics
  } = useWaitingList();
  
  const { patients, fetchPatients } = usePatientContext();
  const [selectedDate, setSelectedDate] = useState<moment.Moment>(moment());

  useEffect(() => {
    // Fetch clinics on initial load
    fetchClinics();
    // Initial fetch of waiting list
    handleDateChange(selectedDate);
  }, []);

  useEffect(() => {
    // Fetch waiting list when selected clinic changes
    if (selectedClinicId) {
      fetchWaitingList(selectedDate.format('YYYY-M-D'));
    }
  }, [selectedClinicId]);

  const handleDateChange = (date: moment.Moment | null) => {
    if (date) {
      setSelectedDate(date);
      fetchWaitingList(date.format('YYYY-M-D'));
    }
  };

  const handleClinicChange = (clinicId: string) => {
    setSelectedClinicId(clinicId);
    localStorage.setItem('clinicId', clinicId);
  };

  const handleRefresh = () => {
    fetchWaitingList(selectedDate.format('YYYY-M-D'));
  };

  const handleRemovePatient = (waitingId: string, patientName: string) => {
    confirm({
      title: 'Are you sure you want to remove this patient from the waiting list?',
      content: `Patient: ${patientName}`,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        const success = await removeFromWaitingList(waitingId);
        if (success) {
          handleRefresh();
        }
      },
    });
  };

  const handleStatusChange = async (waitingId: string, status: 'waiting' | 'in-progress' | 'completed') => {
    const success = await updatePatientStatus(waitingId, status);
    if (success) {
      handleRefresh();
    }
  };

  const handleSelectPatient = (patientId: string) => {
    if (onSelectPatient) {
      onSelectPatient(patientId);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    try {
      // Try to convert Firebase timestamp if it's an object with toDate()
      if (typeof timestamp === 'object' && timestamp.toDate) {
        return moment(timestamp.toDate()).format('HH:mm');
      }
      
      // Try to parse as ISO string
      return moment(timestamp).format('HH:mm');
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid Time';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'blue';
      case 'in-progress':
        return 'orange';
      case 'completed':
        return 'green';
      default:
        return 'default';
    }
  };

  const columns: ColumnsType<any> = [
    {
      title: 'No.',
      key: 'index',
      width: 60,
      render: (text, record, index) => index + 1,
    },
    {
      title: 'Patient Name',
      dataIndex: 'patient_name',
      key: 'patientName',
      render: (text, record) => (
        <a onClick={() => handleSelectPatient(record._id)}>{text}</a>
      ),
    },
    {
      title: 'Arrival Time',
      key: 'arrivalTime',
      render: (_, record) => formatTime(record.arrivalTime),
      sorter: (a, b) => {
        const timeA = moment(a.arrivalTime?.toDate?.() || a.arrivalTime || 0);
        const timeB = moment(b.arrivalTime?.toDate?.() || b.arrivalTime || 0);
        return timeA.valueOf() - timeB.valueOf();
      },
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Status',
      key: 'status',
      dataIndex: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.toUpperCase() || 'WAITING'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {record.status !== 'in-progress' && (
            <Button 
              size="small" 
              type="primary" 
              icon={<ClockCircleOutlined />}
              onClick={() => handleStatusChange(record.waitingId, 'in-progress')}
            >
              Start
            </Button>
          )}
          {record.status !== 'completed' && (
            <Button 
              size="small" 
              type="primary" 
              icon={<CheckCircleOutlined />}
              onClick={() => handleStatusChange(record.waitingId, 'completed')}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Complete
            </Button>
          )}
          <Button 
            size="small" 
            danger 
            onClick={() => handleRemovePatient(record.waitingId, record.patient_name)}
          >
            Remove
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Add a standalone control section before the table */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          {clinics && clinics.length > 0 && (
            <Select
              style={{ width: 200 }}
              placeholder="Select Clinic"
              value={selectedClinicId || undefined}
              onChange={handleClinicChange}
            >
              {clinics.map((clinic: { _id: string; name: string }) => (
                <Option key={clinic._id} value={clinic._id}>{clinic.name}</Option>
              ))}
            </Select>
          )}
        </Col>
        <Col>
          <Space>
            <DatePicker 
              value={selectedDate} 
              onChange={handleDateChange} 
              allowClear={false}
              format="YYYY-MM-DD"
            />
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      {!selectedClinicId && clinics && clinics.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>No clinics found. Please make sure you are associated with a clinic.</p>
        </div>
      ) : !selectedClinicId ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Please select a clinic to view its waiting list.</p>
        </div>
      ) : (
        <Table
          dataSource={waitingPatients}
          columns={columns}
          rowKey="waitingId"
          loading={loading}
          pagination={false}
          size="middle"
          locale={{ emptyText: 'No patients in waiting list' }}
        />
      )}
    </div>
  );
};

export default WaitingList;