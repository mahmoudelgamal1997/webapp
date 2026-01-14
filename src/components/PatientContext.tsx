// PatientContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { message } from 'antd';
import { Patient, Receipt } from './type';
import dayjs from 'dayjs';
import API from '../config/api';
import { useClinicContext } from './ClinicContext';

interface PatientContextType {
  patients: Patient[];
  filteredPatients: Patient[];
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null];
  setDateRange: (range: [dayjs.Dayjs | null, dayjs.Dayjs | null]) => void;
  isDateFilterVisible: boolean;
  setIsDateFilterVisible: (visible: boolean) => void;
  fetchPatients: () => Promise<Patient[]>;
  clearFilters: () => void;
  selectedReceipt: Receipt | null;
  setSelectedReceipt: (receipt: Receipt | null) => void;
  isViewReceiptModalVisible: boolean;
  setIsViewReceiptModalVisible: (visible: boolean) => void;
  forceRender: number;
  setForceRender: (value: number) => void;
  setFilteredPatients: (patients: Patient[]) => void; // Add this line
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [isDateFilterVisible, setIsDateFilterVisible] = useState<boolean>(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isViewReceiptModalVisible, setIsViewReceiptModalVisible] = useState<boolean>(false);
  const [forceRender, setForceRender] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const userId = localStorage.getItem('doctorId');
  const { selectedClinicId } = useClinicContext(); 
  
  // Sort function to sort by date (newest first) and then by _id for same dates
  const sortByLatestDate = (data: Patient[]) => {
    return [...data].sort((a: Patient, b: Patient) => {
      // Handle missing dates
      if (!a.date) return 1;
      if (!b.date) return -1;
      
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      
      // If dates are different, sort by date
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      
      // If dates are the same, sort by _id to put newest first
      if (a._id && b._id) {
        return b._id.localeCompare(a._id);
      }
      
      return 0;
    });
  };

  // Custom setSelectedPatient function that includes extra checks
  const safeSetSelectedPatient = (patient: Patient | null) => {
    console.log("Setting selected patient:", patient ? patient.patient_name : "null");
    
    // Immediate state update to ensure UI responds quickly
    setSelectedPatient(patient);
    
    // Reset other related states when clearing patient selection
    if (patient === null) {
      setSelectedReceipt(null);
      setIsViewReceiptModalVisible(false);
    }
  };

  // Fetch patients from API with optional filters
  const fetchPatients = async (options?: {
    search?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    setIsLoading(true);
    try {
      // Use the doctor-specific endpoint if userId is available
      let endpoint = `${API.BASE_URL}${API.ENDPOINTS.PATIENTS}`;
      
      if (userId) {
        endpoint = `${API.BASE_URL}${API.ENDPOINTS.DOCTOR_PATIENTS(userId)}`;
      }

      // Build query parameters
      const params: any = {};
      
      // Add optional filters
      if (options?.search) {
        params.search = options.search;
      }
      if (options?.startDate) {
        params.startDate = options.startDate;
      }
      if (options?.endDate) {
        params.endDate = options.endDate;
      }
      if (options?.status) {
        params.status = options.status;
      }
      if (options?.page) {
        params.page = options.page;
      }
      if (options?.limit) {
        params.limit = options.limit;
      }
      if (options?.sortBy) {
        params.sortBy = options.sortBy;
      }
      if (options?.sortOrder) {
        params.sortOrder = options.sortOrder;
      }

      // If no pagination is specified, don't send page/limit to get all results
      // This maintains backward compatibility
      const usePagination = options?.page !== undefined || options?.limit !== undefined;
      
      console.log('Fetching from endpoint:', endpoint, 'with params:', params);
      
      const response = await axios.get(endpoint, { params: usePagination ? params : {} });
      console.log('API Response received');

      // Handle both old format (array) and new format (object with data property)
      let updatedPatients: Patient[];
      if (Array.isArray(response.data)) {
        // Old format - backward compatibility
        updatedPatients = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // New format with pagination/filters
        updatedPatients = response.data.data;
      } else {
        updatedPatients = [];
      }

      console.log('Raw patients data:', updatedPatients);
      
      // Always sort by date (newest first) for display
      const sortedPatients = sortByLatestDate(updatedPatients);
      console.log('About to update state with:', sortedPatients);

      // Update state with new data
      setPatients([...sortedPatients]);
      setFilteredPatients([...sortedPatients]);
      console.log('State updated with patient data');
      
      // If there's a selected patient, update it with fresh data
      if (selectedPatient) {
        const freshPatient = updatedPatients.find((p: Patient) => p._id === selectedPatient._id);
        if (freshPatient) {
          // Sort receipts with the newest first if they exist
          if (freshPatient.receipts && freshPatient.receipts.length > 0) {
            freshPatient.receipts = [...freshPatient.receipts].sort((a: Receipt, b: Receipt) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
          }
          setSelectedPatient(freshPatient);
        }
      }
      
      // Force re-render of the table to maintain sort order
      setForceRender(prev => prev + 1);
      
      return sortedPatients;
    } catch (error) {
      console.error('Error fetching patients', error);
      message.error('Failed to fetch patients');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Apply all filters: search term and date range
  const applyFilters = () => {
    console.log('Applying filters to', patients.length, 'patients');
    if (patients.length === 0) return;
    
    let filtered = [...patients];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(patient => 
        (patient.patient_name?.toLowerCase().includes(lowerSearchTerm)) ||
        (patient.patient_phone?.toLowerCase().includes(lowerSearchTerm)) ||
        (patient.email?.toLowerCase().includes(lowerSearchTerm)) ||
        (patient.address?.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    // Apply date filter
    if (dateRange[0] && dateRange[1]) {
      filtered = filtered.filter(patient => {
        if (!patient.date) return false;
        
        const patientDate = dayjs(patient.date);
        const startDate = dateRange[0]?.startOf('day');
        const endDate = dateRange[1]?.endOf('day');
        
        return (patientDate.isAfter(startDate) || patientDate.isSame(startDate)) && 
               (patientDate.isBefore(endDate) || patientDate.isSame(endDate));
      });
    }
    
    // Maintain the sort for filtered results
    setFilteredPatients(sortByLatestDate(filtered));
    console.log('Filtered patients updated:', filtered.length);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setDateRange([null, null]);
    setFilteredPatients([...patients]);
  };

  // Initial fetch when component mounts
  useEffect(() => {
    console.log('Initial fetch effect running');
    const loadData = async () => {
      try {
        const result = await fetchPatients();
        console.log('Initial fetch completed with', result.length, 'patients');
        // Force component update
        setForceRender(prev => prev + 1);
      } catch (error) {
        console.error('Error in initial fetch:', error);
      }
    };
    
    loadData();
    
    // Set up interval to re-sort data every few seconds
    const sortInterval = setInterval(() => {
      if (patients.length > 0 && !selectedPatient) {
        console.log('Auto-sorting patients');
        setPatients(prev => sortByLatestDate([...prev]));
        setFilteredPatients(prev => sortByLatestDate([...prev]));
      }
    }, 5000); // Every 5 seconds to reduce overhead
    
    return () => clearInterval(sortInterval);
  }, []); // Empty dependency array means this only runs once on mount
  
  // Apply filters effect with dependencies
  useEffect(() => {
    console.log('Filter effect running, searchTerm:', searchTerm, 'patients:', patients.length);
    applyFilters();
  }, [searchTerm, dateRange, patients]); // Include all dependencies
  
  // Sort receipts by date when selected patient changes
  useEffect(() => {
    if (!selectedPatient) return;
    
    if (selectedPatient.receipts && selectedPatient.receipts.length > 0) {
      console.log('Sorting receipts for selected patient');
      const sortedReceipts = [...selectedPatient.receipts].sort((a: Receipt, b: Receipt) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Avoid unnecessary re-renders by checking if the order has actually changed
      const currentReceiptIds = selectedPatient.receipts.map(r => r._id).join(',');
      const sortedReceiptIds = sortedReceipts.map(r => r._id).join(',');
      
      if (currentReceiptIds !== sortedReceiptIds) {
        setSelectedPatient({
          ...selectedPatient,
          receipts: sortedReceipts
        });
      }
    }
  }, [selectedPatient?._id]);

  // Create value object for context
  const value = {
    patients,
    filteredPatients,
    selectedPatient,
    setSelectedPatient: safeSetSelectedPatient,
    searchTerm,
    setSearchTerm,
    dateRange,
    setDateRange,
    isDateFilterVisible,
    setIsDateFilterVisible,
    fetchPatients,
    clearFilters,
    selectedReceipt,
    setSelectedReceipt,
    isViewReceiptModalVisible,
    setIsViewReceiptModalVisible,
    forceRender,
    setForceRender,
    setFilteredPatients,
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatientContext = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatientContext must be used within a PatientProvider');
  }
  return context;
};