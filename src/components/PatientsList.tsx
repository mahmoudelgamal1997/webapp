// PatientsList.tsx
import React, { useState, useEffect } from 'react';
import { Table, Tag, Typography, Space } from 'antd';
import { SortOrder } from 'antd/lib/table/interface';
import moment from 'moment';
import axios from 'axios';
import { Patient, Visit } from '../components/type';
import SearchFilters from './SearchFilters';
import { usePatientContext } from './PatientContext';
import API from '../config/api';

// Extended visit interface with patient information
interface VisitWithPatientInfo {
  _id: string;
  visit_id: string;
  date: string;
  time: string;
  visit_type: string;
  complaint: string;
  diagnosis: string;
  receipts: any[];
  patient_name: string;
  patient_phone: string;
  patient_id: string;
  age?: string;
  address?: string;
  _original_patient_id: string; // To reference back to original patient
}

const PatientsList: React.FC = () => {
  const { 
    patients,
    filteredPatients,
    setSelectedPatient, 
    setFilteredPatients 
  } = usePatientContext();
  
  const [loading, setLoading] = useState(false);
  const [visitsToDisplay, setVisitsToDisplay] = useState<VisitWithPatientInfo[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // Extract and flatten all visits from patients
  // Reversed sort function - oldest first, newest last
const extractVisits = (patientData: Patient[]): VisitWithPatientInfo[] => {
  const allVisits: VisitWithPatientInfo[] = [];
  
  patientData.forEach(patient => {
    if (patient.visits && patient.visits.length > 0) {
      patient.visits.forEach(visit => {
        // Create a new object with explicit properties
        allVisits.push({
          _id: visit._id || '',
          visit_id: visit.visit_id || '',
          date: visit.date || '',
          time: visit.time || '',
          visit_type: visit.visit_type || '',
          complaint: visit.complaint || '',
          diagnosis: visit.diagnosis || '',
          receipts: visit.receipts || [],
          // Add patient info
          patient_name: patient.patient_name,
          patient_phone: patient.patient_phone,
          patient_id: patient.patient_id,
          age: patient.age,
          address: patient.address,
          _original_patient_id: patient.patient_id
        });
      });
    }
  });
  
  // Sort by date and time, newest first
  return allVisits.sort((a, b) => {
    // Parse dates properly
    const dateTimeA = parseDateAndTime(a.date, a.time);
    const dateTimeB = parseDateAndTime(b.date, b.time);
    
    // Sort newest first
    return dateTimeB - dateTimeA;
  });
};

// Helper function to properly parse dates with times
const parseDateAndTime = (dateStr: string, timeStr: string): number => {
  if (!dateStr) return 0;
  
  // First try to parse with time
  if (timeStr) {
    const fullDateStr = `${dateStr} ${timeStr}`;
    const momentDate = moment(fullDateStr, [
      'YYYY-MM-DD HH:mm',
      'YYYY-M-D HH:mm',
      'YYYY-MM-DD H:mm',
      'YYYY-M-D H:mm'
    ]);
    
    if (momentDate.isValid()) {
      return momentDate.valueOf();
    }
  }
  
  // Fallback to just date
  const momentDate = moment(dateStr, [
    'YYYY-MM-DD',
    'YYYY-M-D'
  ]);
  
  return momentDate.isValid() ? momentDate.valueOf() : 0;
};


  // Fetch visits data (actually fetching patients and extracting visits)
  const fetchVisits = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      // Get doctor ID from context or storage
      const doctorId = localStorage.getItem('doctor_id');
      
      const response = await axios.get(`${API.BASE_URL}/api/patients/doctor/${doctorId}`);
      
      // Process the patient data to extract all visits
      const patientsData = response.data;
      
      // Store original patients data
      setFilteredPatients(patientsData);
      
      // Extract visits for display
      const visits = extractVisits(patientsData);
      setVisitsToDisplay(visits);
      
      // Update pagination
      setPagination({
        current: page,
        pageSize: pageSize,
        total: visits.length
      });
    } catch (error) {
      console.error('Error fetching visits data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchVisits();
  }, []);
  
  // Get paginated visits
  const getPaginatedVisits = () => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return visitsToDisplay.slice(startIndex, endIndex);
  };
  
  // Update visits when filtered patients change
  useEffect(() => {
    if (filteredPatients && filteredPatients.length > 0) {
      setVisitsToDisplay(extractVisits(filteredPatients));
    }
  }, [filteredPatients]);

  // Define columns for the visits table
  const columns = [
    {
      title: 'Patient',
      key: 'patient',
      render: (record: VisitWithPatientInfo) => (
        <Space direction="vertical" size="small">
          <Typography.Text strong>{record.patient_name}</Typography.Text>
          <Typography.Text type="secondary">{record.patient_phone}</Typography.Text>
        </Space>
      )
    },
   {
  title: 'Visit Date',
  dataIndex: 'date',
  key: 'date',
  render: (text: string) => (
    <span>{text ? moment(text).format('YYYY-MM-DD') : 'N/A'}</span>
  ),
  sorter: (a: VisitWithPatientInfo, b: VisitWithPatientInfo) => {
    const dateTimeA = parseDateAndTime(a.date, a.time);
    const dateTimeB = parseDateAndTime(b.date, b.time);
    return dateTimeB - dateTimeA; // Newest first
  },
  defaultSortOrder: 'ascend' as SortOrder, // Set default to ascend (newest first)
  sortDirections: ['descend', 'ascend'] as SortOrder[]
},
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: 'Visit Type',
      dataIndex: 'visit_type',
      key: 'visit_type',
      render: (type: string) => (
        <Tag color="blue">{type || 'Regular'}</Tag>
      ),
    },
    {
      title: 'Receipts',
      key: 'receipts',
      render: (record: VisitWithPatientInfo) => {
        const count = record.receipts?.length || 0;
        return count > 0 ? 
          <Tag color="green">{count} receipt(s)</Tag> : 
          <Tag color="gray">No receipts</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: string, record: VisitWithPatientInfo) => {
        // Find the original patient
        const patient = patients.find(p => p.patient_id === record._original_patient_id);
        
        return (
          <a 
            onClick={(e) => {
              e.stopPropagation(); // Prevent row click from triggering
              if (patient) {
                setSelectedPatient(patient);
              }
            }}
          >
            View Patient
          </a>
        );
      },
    }
  ];

  // Handle table changes (pagination, filters, sort)
  const handleTableChange = (newPagination: any) => {
    setPagination({
      ...newPagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize
    });
  };

  return (
    <>
      <SearchFilters />
      
      <Table 
        columns={columns} 
        dataSource={getPaginatedVisits()}
        rowKey={record => `${record._id || ''}-${record.visit_id || ''}`}
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `Total ${total} visits`
        }}
        onChange={handleTableChange}
        style={{ marginTop: 16 }}
        onRow={(record) => ({
          onClick: () => {
            // Find the original patient
            const patient = patients.find(p => p.patient_id === record._original_patient_id);
            if (patient) {
              setSelectedPatient(patient);
            }
          },
          style: { cursor: 'pointer' }
        })}
      />
    </>
  );
};

export default PatientsList;