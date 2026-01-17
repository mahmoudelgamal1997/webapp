// PatientsList.tsx
import React, { useState, useEffect } from 'react';
import { Table, Tag, Typography, Space, message } from 'antd';
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

interface PatientsListProps {
  refreshTrigger?: number; // Add prop to receive refresh triggers from parent
}

const PatientsList: React.FC<PatientsListProps> = ({ refreshTrigger = 0 }) => {
  const { 
    patients,
    filteredPatients,
    setSelectedPatient, 
    setFilteredPatients,
    fetchPatients,
    pagination: contextPagination
  } = usePatientContext();
  
  const [loading, setLoading] = useState(false);
  const [visitsToDisplay, setVisitsToDisplay] = useState<VisitWithPatientInfo[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());

  // Extract and flatten all visits from patients
  // Reversed sort function - newest first
  // Backend already handles date filtering, so we trust the API response
  const extractVisits = (patientData: Patient[]): VisitWithPatientInfo[] => {
    const allVisits: VisitWithPatientInfo[] = [];
    
    patientData.forEach(patient => {
      if (patient.visits && patient.visits.length > 0) {
        patient.visits.forEach(visit => {
          // Backend already filters visits based on startDate/endDate parameters
          // So we include all visits returned by the API
          // Handle both string and Date types (MongoDB may return Date objects)
          let visitDateStr: string = '';
          if (visit.date) {
            const visitDateAny = visit.date as any; // Cast to any to handle different types
            if (typeof visitDateAny === 'string') {
              // Handle ISO string format like "2026-01-17T00:00:00.000Z"
              if (visitDateAny.includes('T')) {
                visitDateStr = visitDateAny.split('T')[0];
              } else {
                visitDateStr = visitDateAny;
              }
            } else if (visitDateAny instanceof Date || visitDateAny?.toISOString) {
              // Handle Date object or MongoDB date
              visitDateStr = visitDateAny.toISOString().split('T')[0];
            } else {
              visitDateStr = String(visitDateAny);
            }
          }
          
          if (!visitDateStr) return; // Skip visits without date
          
          // Parse date string directly (format: YYYY-MM-DD or YYYY-M-D)
          const visitMoment = moment(visitDateStr, ['YYYY-MM-DD', 'YYYY-M-D', 'YYYY/MM/DD', 'YYYY/M/D', moment.ISO_8601]).startOf('day');
          
          // Skip if date is invalid
          if (!visitMoment.isValid()) return;
          
          // No need to filter by "today" - backend already handles date filtering via endDate parameter
          
          // Visit is valid (today or past) - create a new object with explicit properties
          // Use the processed visitDateStr for consistent date format
          allVisits.push({
            _id: visit._id || '',
            visit_id: visit.visit_id || '',
            date: visitDateStr || '',
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

  // Helper function to convert Arabic numerals to regular numerals
  const convertArabicNumerals = (str: string): string => {
    if (!str) return str;
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const regularNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let converted = str;
    arabicNumerals.forEach((arabic, index) => {
      converted = converted.replace(new RegExp(arabic, 'g'), regularNumerals[index]);
    });
    return converted;
  };

  // Helper function to properly parse dates with times (handles Arabic numerals)
  const parseDateAndTime = (dateStr: string, timeStr: string): number => {
    if (!dateStr) return 0;
    
    // Convert Arabic numerals to regular numerals
    const convertedDateStr = convertArabicNumerals(dateStr);
    const convertedTimeStr = convertArabicNumerals(timeStr || '');
    
    // First try to parse with time
    if (convertedTimeStr) {
      const fullDateStr = `${convertedDateStr} ${convertedTimeStr}`;
      const momentDate = moment(fullDateStr, [
        'YYYY-MM-DD HH:mm',
        'YYYY-M-D HH:mm',
        'YYYY-MM-DD H:mm',
        'YYYY-M-D H:mm',
        'YYYY-MM-DD HH:mm:ss',
        'YYYY-M-D HH:mm:ss'
      ], true); // Strict mode
      
      if (momentDate.isValid()) {
        return momentDate.valueOf();
      }
    }
    
    // Fallback to just date
    const momentDate = moment(convertedDateStr, [
      'YYYY-MM-DD',
      'YYYY-M-D'
    ], true); // Strict mode
    
    return momentDate.isValid() ? momentDate.valueOf() : 0;
  };

  // Fetch visits data (actually fetching patients and extracting visits)
  const fetchVisits = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      console.log('Fetching patients data for PatientsList component with pagination:', { page, pageSize });
      
      // Use fetchPatients from context with pagination params for server-side pagination
      const result = await fetchPatients({
        page,
        limit: pageSize,
        sortBy: 'date',
        sortOrder: 'desc'
      });
      
      // Update timestamp of last refresh
      setLastRefreshTime(Date.now());
      
      // Get the latest patients data from context
      const patientsData = result.patients;
      
      // Extract visits for display
      const visits = extractVisits(patientsData);
      setVisitsToDisplay(visits);
      
      // Update pagination from API response if available
      if (result.pagination) {
        setPagination({
          current: result.pagination.currentPage,
          pageSize: result.pagination.itemsPerPage,
          total: result.pagination.totalItems
        });
      } else {
        // Fallback to client-side pagination if no pagination info
        setPagination({
          current: page,
          pageSize: pageSize,
          total: visits.length
        });
      }
    } catch (error) {
      console.error('Error fetching visits data:', error);
      message.error('Failed to refresh patients data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchVisits();
  }, []);
  
  // Listen for refresh triggers from parent component
  useEffect(() => {
    if (refreshTrigger > 0) {
      const currentTime = Date.now();
      // Implement debouncing - only refresh if more than 2 seconds since last refresh
      if (currentTime - lastRefreshTime > 2000) {
        console.log('PatientsList refreshing due to trigger:', refreshTrigger);
        fetchVisits(pagination.current, pagination.pageSize);
      } else {
        console.log('Ignoring refresh trigger - too soon since last refresh');
      }
    }
  }, [refreshTrigger, lastRefreshTime]);
  
  // Get paginated visits - no need for client-side pagination if server-side is used
  const getPaginatedVisits = () => {
    // If we have server-side pagination, return all visits (already paginated by server)
    // Otherwise, use client-side pagination as fallback
    if (contextPagination) {
      return visitsToDisplay;
    } else {
      const startIndex = (pagination.current - 1) * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      return visitsToDisplay.slice(startIndex, endIndex);
    }
  };
  
  // Update visits when filtered patients change
  useEffect(() => {
    if (filteredPatients) {
      if (filteredPatients.length > 0) {
        setVisitsToDisplay(extractVisits(filteredPatients));
      } else {
        // Clear visits when no filtered patients (e.g., search with no results)
        setVisitsToDisplay([]);
        // Also reset pagination
        setPagination(prev => ({
          ...prev,
          total: 0
        }));
      }
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
      render: (timeStr: string) => {
        if (!timeStr) return 'N/A';
        
        // Convert Arabic numerals to regular numerals
        const convertedTime = convertArabicNumerals(timeStr);
        
        // Parse 24-hour time and convert to 12-hour format
        try {
          // Handle formats like "14:35" or "02:35" or "2:35"
          const timeMatch = convertedTime.match(/(\d{1,2}):(\d{2})/);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[2];
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
            return `${displayHours}:${minutes} ${period}`;
          }
          // If format doesn't match, return as is
          return timeStr;
        } catch (error) {
          return timeStr;
        }
      },
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
    const newPage = newPagination.current || pagination.current;
    const newPageSize = newPagination.pageSize || pagination.pageSize;
    
    // If page or page size changed, fetch new data from server
    if (newPage !== pagination.current || newPageSize !== pagination.pageSize) {
      fetchVisits(newPage, newPageSize);
    } else {
      // Just update local state if only other table properties changed
      setPagination({
        ...pagination,
        ...newPagination
      });
    }
  };

  return (
    <>
      <SearchFilters />
      
      <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <Table 
          columns={columns} 
          dataSource={getPaginatedVisits()}
          rowKey={record => `${record.patient_id || ''}-${record.visit_id || ''}-${record.date || ''}-${record.time || ''}`}
          loading={loading}
          locale={{
            emptyText: visitsToDisplay.length === 0 && !loading ? 'No visits found' : undefined
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: contextPagination ? pagination.total : visitsToDisplay.length, // Use context pagination total if available, otherwise use filtered visits length
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => {
              if (total === 0) {
                return 'No visits found';
              }
              if (contextPagination) {
                return `Showing ${range[0]}-${range[1]} of ${total} visits`;
              }
              return `Total ${total} visits`;
            },
            responsive: true
          }}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
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
      </div>
    </>
  );
};

export default PatientsList;