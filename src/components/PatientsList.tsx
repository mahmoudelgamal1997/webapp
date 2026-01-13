// PatientsList.tsx
import React, { useState, useEffect } from 'react';
import { Table, Tag, Typography, Space, message } from 'antd';
import { SortOrder } from 'antd/lib/table/interface';
import moment from 'moment';
import { Patient, Visit } from '../components/type';
import SearchFilters from './SearchFilters';
import { usePatientContext } from './PatientContext';
import { useNavigate } from 'react-router-dom';
import API from '../config/api';

// Extended patient interface with latest visit information
interface PatientWithLatestVisit {
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  age?: string;
  address?: string;
  latestVisitDate: number; // timestamp for sorting
  latestVisitDateStr: string; // formatted date string
  latestVisitTime: string;
  latestVisitType: string;
  latestComplaint: string;
  latestDiagnosis: string;
  latestReceiptsCount: number;
  visitCount: number;
  hasVisits: boolean;
  _original_patient_id: string; // To reference back to original patient
}

interface PatientsListProps {
  refreshTrigger?: number; // Add prop to receive refresh triggers from parent
}

const PatientsList: React.FC<PatientsListProps> = ({ refreshTrigger = 0 }) => {
  const navigate = useNavigate();
  const { 
    patients,
    filteredPatients,
    setSelectedPatient, 
    setFilteredPatients,
    fetchPatients 
  } = usePatientContext();
  
  const [loading, setLoading] = useState(false);
  const [patientsToDisplay, setPatientsToDisplay] = useState<PatientWithLatestVisit[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());

  // Helper function to convert Arabic numerals to English
  const convertArabicNumerals = (str: string): string => {
    if (!str) return str;
    const arabicToEnglish: { [key: string]: string } = {
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };
    return str.split('').map(char => arabicToEnglish[char] || char).join('');
  };

  // Helper function to properly parse dates with times
  const parseDateAndTime = (dateStr: string, timeStr: string): number => {
    if (!dateStr) return 0;
    
    // Convert Arabic numerals to English in time string
    let normalizedTime = timeStr || '';
    if (normalizedTime) {
      normalizedTime = convertArabicNumerals(normalizedTime);
    }
    
    // First try to parse with time
    if (normalizedTime) {
      // Try multiple time formats
      const timeFormats = [
        'HH:mm', 'H:mm', 'HH:mm:ss', 'H:mm:ss'
      ];
      
      for (const timeFormat of timeFormats) {
        const fullDateStr = `${dateStr} ${normalizedTime}`;
        const momentDate = moment(fullDateStr, [
          `YYYY-MM-DD ${timeFormat}`,
          `YYYY-M-D ${timeFormat}`,
          `YYYY-MM-DD ${timeFormat.replace(':', '')}`,
          `YYYY-M-D ${timeFormat.replace(':', '')}`
        ], true); // strict mode
        
        if (momentDate.isValid()) {
          return momentDate.valueOf();
        }
      }
      
      // Try parsing time separately and combining
      const timeMoment = moment(normalizedTime, ['HH:mm', 'H:mm', 'HH:mm:ss', 'H:mm:ss'], true);
      if (timeMoment.isValid()) {
        const dateMoment = moment(dateStr, ['YYYY-MM-DD', 'YYYY-M-D'], true);
        if (dateMoment.isValid()) {
          dateMoment.hour(timeMoment.hour());
          dateMoment.minute(timeMoment.minute());
          dateMoment.second(timeMoment.second());
          return dateMoment.valueOf();
        }
      }
    }
    
    // Fallback to just date
    const momentDate = moment(dateStr, [
      'YYYY-MM-DD',
      'YYYY-M-D'
    ], true); // strict mode
    
    return momentDate.isValid() ? momentDate.valueOf() : 0;
  };

  // Process patients data with latest visit information
  const processPatients = (patientData: Patient[]): PatientWithLatestVisit[] => {
    return patientData.map(patient => {
      // Default values for patients with no visits
      let latestVisitDate = 0; // Use 0 for patients with no visits to sort them last
      let latestVisitDateStr = '';
      let latestVisitTime = '';
      let latestVisitType = '';
      let latestComplaint = '';
      let latestDiagnosis = '';
      let latestReceiptsCount = 0;
      let hasVisits = false;
      let visitCount = 0;
      
      // Find the latest visit if available
      if (patient.visits && patient.visits.length > 0) {
        hasVisits = true;
        visitCount = patient.visits.length;
        
        // Sort visits by date, newest first
        const sortedVisits = [...patient.visits].sort((a, b) => {
          const dateTimeA = parseDateAndTime(a.date, a.time);
          const dateTimeB = parseDateAndTime(b.date, b.time);
          return dateTimeB - dateTimeA;
        });
        
        const latestVisit = sortedVisits[0];
        
        latestVisitDate = parseDateAndTime(latestVisit.date, latestVisit.time);
        latestVisitDateStr = latestVisit.date || '';
        latestVisitTime = latestVisit.time || '';
        latestVisitType = latestVisit.visit_type || 'Regular';
        latestComplaint = latestVisit.complaint || '';
        latestDiagnosis = latestVisit.diagnosis || '';
        latestReceiptsCount = latestVisit.receipts?.length || 0;
      }
      
      return {
        patient_id: patient.patient_id,
        patient_name: patient.patient_name,
        patient_phone: patient.patient_phone,
        age: patient.age,
        address: patient.address,
        latestVisitDate,
        latestVisitDateStr,
        latestVisitTime,
        latestVisitType,
        latestComplaint,
        latestDiagnosis,
        latestReceiptsCount,
        visitCount,
        hasVisits,
        _original_patient_id: patient.patient_id // To reference back to original patient
      };
    });
  };

  // Fetch patients data with their latest visit info
  const fetchPatientsWithLatestVisit = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      // Get doctor ID from context or storage
      const doctorId = localStorage.getItem('doctor_id');
      
      console.log('fetchPatientsWithLatestVisit: Fetching patients data for PatientsList component');
      
      // First get fresh data to ensure we have the latest
      await fetchPatients();
      console.log('fetchPatientsWithLatestVisit: Fresh patient data fetched');
      
      // Update timestamp of last refresh
      setLastRefreshTime(Date.now());
      
      // Now get the updated filtered patients from context
      const patientsData = filteredPatients;
      console.log('fetchPatientsWithLatestVisit: Using filtered patients for display, count:', patientsData.length);
      
      // Process patients with latest visit information
      const processedPatients = processPatients(patientsData);
      
      // Sort patients: by latest visit date and time (newest first), then patients without visits at the end
      const sortedPatients = processedPatients.sort((a, b) => {
        // If one has visits and the other doesn't, put the one WITH visits first (newest visits should be at top)
        if (a.hasVisits && !b.hasVisits) return -1;
        if (!a.hasVisits && b.hasVisits) return 1;
        
        // Both have visits or both don't have visits, sort by latestVisitDate (newest first)
        // For patients without visits (Infinity), they'll be sorted to the end
        return b.latestVisitDate - a.latestVisitDate;
      });
      
      console.log('fetchPatientsWithLatestVisit: Processed patients count:', sortedPatients.length);
      setPatientsToDisplay(sortedPatients);
      
      // Update pagination
      setPagination({
        current: page,
        pageSize: pageSize,
        total: sortedPatients.length
      });
    } catch (error) {
      console.error('Error fetching patients data:', error);
      message.error('Failed to refresh patients data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPatientsWithLatestVisit();
  }, []);
  
  // Listen for refresh triggers from parent component
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('PatientsList refreshing due to trigger:', refreshTrigger);
      // Always refresh when trigger changes - no debouncing for waiting list changes
      fetchPatientsWithLatestVisit(pagination.current, pagination.pageSize);
    }
  }, [refreshTrigger]); // Only depend on refreshTrigger to ensure it always runs
  
  // Get paginated patients
  const getPaginatedPatients = () => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return patientsToDisplay.slice(startIndex, endIndex);
  };
  
  // Update patients when filtered patients change
  useEffect(() => {
    if (filteredPatients && filteredPatients.length > 0) {
      const processed = processPatients(filteredPatients);
      // Sort patients: by latest visit date and time (newest first), then patients without visits at the end
      const sorted = processed.sort((a, b) => {
        // If one has visits and the other doesn't, put the one WITH visits first (newest visits should be at top)
        if (a.hasVisits && !b.hasVisits) return -1;
        if (!a.hasVisits && b.hasVisits) return 1;
        
        // Both have visits or both don't have visits, sort by latestVisitDate (newest first)
        // For patients without visits (Infinity), they'll be sorted to the end
        return b.latestVisitDate - a.latestVisitDate;
      });
      setPatientsToDisplay(sorted);
    }
  }, [filteredPatients]);

  // Define columns for the patients table
  const columns = [
    {
      title: 'Patient',
      key: 'patient',
      render: (record: PatientWithLatestVisit) => (
        <Space direction="vertical" size="small">
          <Typography.Text strong>{record.patient_name}</Typography.Text>
          <Typography.Text type="secondary">{record.patient_phone}</Typography.Text>
        </Space>
      )
    },
    {
      title: 'Latest Visit',
      key: 'latestVisit',
      render: (record: PatientWithLatestVisit) => (
        record.hasVisits ? 
          <span>{record.latestVisitDateStr ? moment(record.latestVisitDateStr).format('YYYY-MM-DD') : 'N/A'}</span> :
          <Tag color="volcano">New Patient</Tag>
      ),
      sorter: (a: PatientWithLatestVisit, b: PatientWithLatestVisit) => {
        // Sort by hasVisits first (patients with visits first, then new patients)
        if (a.hasVisits && !b.hasVisits) return -1;
        if (!a.hasVisits && b.hasVisits) return 1;
        
        // Then by latest visit date (newest first)
        return b.latestVisitDate - a.latestVisitDate;
      },
      defaultSortOrder: 'descend' as SortOrder,
      sortDirections: ['descend', 'ascend'] as SortOrder[]
    },
    {
      title: 'Latest Time',
      key: 'latestTime',
      dataIndex: 'latestVisitTime',
      render: (time: string, record: PatientWithLatestVisit) => (
        record.hasVisits ? time : '-'
      )
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
      title: 'Latest Visit Type',
      key: 'latestVisitType',
      dataIndex: 'latestVisitType',
      render: (type: string, record: PatientWithLatestVisit) => (
        record.hasVisits ? <Tag color="blue">{type || 'Regular'}</Tag> : '-'
      ),
    },
    {
      title: 'Visit Count',
      key: 'visitCount',
      dataIndex: 'visitCount',
      render: (count: number) => (
        <Tag color={count > 0 ? "green" : "gray"}>{count} visit(s)</Tag>
      )
    },
    {
      title: 'Latest Receipts',
      key: 'latestReceipts',
      render: (record: PatientWithLatestVisit) => {
        if (!record.hasVisits) return '-';
        
        const count = record.latestReceiptsCount;
        return count > 0 ? 
          <Tag color="green">{count} receipt(s)</Tag> : 
          <Tag color="gray">No receipts</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: string, record: PatientWithLatestVisit) => {
        // Find the original patient - matching the original code's behavior
        const patient = patients.find(p => p.patient_id === record._original_patient_id);
        
        return (
          <a 
            onClick={(e) => {
              e.stopPropagation(); // Prevent row click from triggering
              if (patient) {
                setSelectedPatient(patient);
                // Use the correct route path with /dashboard prefix
                navigate(`/dashboard/patient/${patient.patient_id}`);
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
        dataSource={getPaginatedPatients()}
        rowKey={record => `${record.patient_id}`}
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `Total ${total} patients`
        }}
        onChange={handleTableChange}
        style={{ marginTop: 16 }}
        onRow={(record) => ({
          onClick: () => {
            // Find the original patient - matching the original code's behavior
            const patient = patients.find(p => p.patient_id === record._original_patient_id);
            if (patient) {
              setSelectedPatient(patient);
              // Navigate to the patient detail page
              navigate(`/dashboard/patient/${patient.patient_id}`);
            }
          },
          style: { cursor: 'pointer' }
        })}
      />
    </>
  );
};

export default PatientsList;