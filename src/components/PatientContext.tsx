// PatientContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { message } from 'antd';
import { Patient, Receipt } from './type';
import dayjs from 'dayjs';
import API from '../config/api';
import { useClinicContext } from './ClinicContext';

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

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
  fetchPatients: (options?: {
    search?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => Promise<{ patients: Patient[]; pagination?: PaginationInfo | null }>;
  clearFilters: () => void;
  selectedReceipt: Receipt | null;
  setSelectedReceipt: (receipt: Receipt | null) => void;
  isViewReceiptModalVisible: boolean;
  setIsViewReceiptModalVisible: (visible: boolean) => void;
  forceRender: number;
  setForceRender: (value: number) => void;
  setFilteredPatients: (patients: Patient[]) => void;
  pagination: PaginationInfo | null;
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
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  // Get doctor_id from localStorage (set during login from Firebase /doctor_clinic_assistant collection)
  // Note: The Firebase UID is the assistant_id, but we need doctor_id for API calls
  // Make it reactive so it updates when doctorId changes in localStorage
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('doctorId'));
  const { selectedClinicId } = useClinicContext();
  
  // Listen for changes to doctorId in localStorage (e.g., after login)
  useEffect(() => {
    const checkDoctorId = () => {
      const currentDoctorId = localStorage.getItem('doctorId');
      if (currentDoctorId !== userId) {
        console.log('doctorId changed in localStorage:', currentDoctorId);
        setUserId(currentDoctorId);
      }
    };
    
    // Check immediately
    checkDoctorId();
    
    // Listen for custom event (when doctorId is set during login in same tab)
    window.addEventListener('doctorIdChanged', checkDoctorId);
    
    // Listen for storage events (when localStorage changes in another tab/window)
    window.addEventListener('storage', checkDoctorId);
    
    return () => {
      window.removeEventListener('doctorIdChanged', checkDoctorId);
      window.removeEventListener('storage', checkDoctorId);
    };
  }, [userId]); 
  
  // Sort function to sort by date (newest first) and then by _id for same dates
  // Handles both 'date' and 'last_visit_date' fields (history endpoint uses last_visit_date)
  const sortByLatestDate = (data: Patient[]) => {
    return [...data].sort((a: Patient, b: Patient) => {
      // Use date or last_visit_date (history endpoint format)
      const dateAStr = a.date || a.last_visit_date;
      const dateBStr = b.date || b.last_visit_date;
      
      // Handle missing dates
      if (!dateAStr) return 1;
      if (!dateBStr) return -1;
      
      const dateA = new Date(dateAStr).getTime();
      const dateB = new Date(dateBStr).getTime();
      
      // If dates are different, sort by date (newest first)
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
      // Use the /api/patients endpoint which supports filtering by doctor_id, clinic_id, and assistant_id
      // This endpoint returns data sorted by most recent first (newest to oldest)
      let endpoint = `${API.BASE_URL}${API.ENDPOINTS.PATIENTS}`;

      // Build query parameters - only essential parameters like mobile app
      // Simple GET request with URL parameters only (no payload/body)
      const params: any = {};
      
      // SECURITY: doctor_id is required - always send it from localStorage
      // IMPORTANT: Make sure we're using doctorId, NOT clinicId
      if (!userId) {
        console.log('doctorId not found in localStorage yet - waiting for login to complete');
        // Don't show error during initialization - just return empty
        // The useEffect will retry when doctorId is set
        return { patients: [], pagination: null };
      }
      
      // Debug: Log what we're getting from localStorage
      console.log('doctorId from localStorage:', userId);
      console.log('selectedClinicId:', selectedClinicId);
      
      // Ensure we're using doctorId, not clinicId
      // Double-check that userId is actually the doctorId, not clinicId
      if (userId === selectedClinicId) {
        console.error('ERROR: doctorId matches clinicId - this is wrong!');
        message.error('Configuration error: Doctor ID and Clinic ID are the same. Please log in again.');
        return { patients: [], pagination: null };
      }
      
      params.doctor_id = userId;
      
      // Only send pagination and sorting parameters (like mobile app)
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

      // Always send params (backend handles pagination only when page/limit are provided)
      // This maintains backward compatibility - if no pagination params, backend returns all results
      console.log('Fetching from endpoint:', endpoint);
      console.log('Request params:', JSON.stringify(params, null, 2));
      console.log('VERIFY: doctor_id param =', params.doctor_id);
      console.log('VERIFY: This should NOT equal clinicId:', selectedClinicId);
      
      // Simple GET request with URL parameters only (no body/payload)
      // Matches mobile app behavior exactly
      const response = await axios.get(endpoint, { 
        params,
        timeout: 30000 // 30 second timeout
      });
      console.log('API Response received');

      // Handle /api/patients endpoint response format: { success, message, data, totalItems, filters }
      // Backend already sorts by most recent first (newest to oldest) - no need to sort again
      let updatedPatients: Patient[];
      let paginationInfo: PaginationInfo | null = null;
      
      if (response.data.success && response.data.data && Array.isArray(response.data.data)) {
        // New format from /api/patients endpoint
        updatedPatients = response.data.data;
        // Use pagination info directly from response if available
        if (response.data.pagination) {
          paginationInfo = response.data.pagination;
        } else if (response.data.totalItems !== undefined) {
          // Fallback: build pagination info from totalItems
          const currentPage = options?.page || 1;
          const itemsPerPage = options?.limit || 20;
          paginationInfo = {
            currentPage,
            totalPages: Math.ceil(response.data.totalItems / itemsPerPage),
            totalItems: response.data.totalItems,
            itemsPerPage,
            hasNextPage: currentPage < Math.ceil(response.data.totalItems / itemsPerPage),
            hasPrevPage: currentPage > 1,
            nextPage: currentPage < Math.ceil(response.data.totalItems / itemsPerPage) ? currentPage + 1 : null,
            prevPage: currentPage > 1 ? currentPage - 1 : null
          };
        }
      } else if (Array.isArray(response.data)) {
        // Backward compatibility - direct array response
        updatedPatients = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // Alternative format with data property
        updatedPatients = response.data.data;
      } else {
        updatedPatients = [];
      }

      console.log('Raw patients data:', updatedPatients);
      console.log('Pagination info:', paginationInfo);
      
      // Backend already sorts by most recent first (newest to oldest) via updatedAt/createdAt
      // No need for client-side sorting - backend handles it
      const sortedPatients = updatedPatients;
      console.log('About to update state with:', sortedPatients);

      // Update state with new data
      // Backend already sorted by createdAt - preserve that order
      setPatients([...sortedPatients]);
      // Set filtered patients - useEffect will handle filtering if needed
      setFilteredPatients([...sortedPatients]);
      setPagination(paginationInfo);
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
      
      return { patients: sortedPatients, pagination: paginationInfo };
    } catch (error: any) {
      console.error('Error fetching patients', error);
      console.error('Error details:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch patients';
      message.error(`Failed to fetch patients: ${errorMessage}`);
      return { patients: [], pagination: null };
    } finally {
      setIsLoading(false);
    }
  };

  // Apply all filters: search term and date range
  const applyFilters = () => {
    console.log('Applying filters to', patients.length, 'patients');
    
    // If no patients, clear filtered patients
    if (patients.length === 0) {
      setFilteredPatients([]);
      return;
    }
    
    let filtered = [...patients];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(patient => 
        (patient.patient_name?.toLowerCase().includes(lowerSearchTerm)) ||
        (patient.patient_phone?.toLowerCase().includes(lowerSearchTerm)) ||
        (patient.email?.toLowerCase().includes(lowerSearchTerm)) ||
        (patient.address?.toLowerCase().includes(lowerSearchTerm)) ||
        ((patient as any).file_number?.toLowerCase().includes(lowerSearchTerm))
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
    
    // Don't re-sort - backend already sorted by createdAt
    // Just apply the filters and preserve the API sort order
    // Always set filteredPatients, even if empty (to show "no results")
    setFilteredPatients(filtered);
    console.log('Filtered patients updated:', filtered.length, 'patients match filters');
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setDateRange([null, null]);
    setFilteredPatients([...patients]);
  };

  // Initial fetch when component mounts OR when doctorId changes (e.g., after login)
  // Match mobile API: page=1, limit=20, sortBy=created_at, sortOrder=desc
  useEffect(() => {
    // Don't fetch if doctorId is not available yet
    if (!userId) {
      console.log('Waiting for doctorId to be set...');
      return;
    }
    
    console.log('Initial fetch effect running with doctorId:', userId);
    const loadData = async () => {
      try {
        const result = await fetchPatients({
          page: 1,
          limit: 20,
          sortBy: 'created_at',
          sortOrder: 'desc'
        });
        console.log('Initial fetch completed with', result.patients.length, 'patients');
        // Force component update
        setForceRender(prev => prev + 1);
      } catch (error) {
        console.error('Error in initial fetch:', error);
      }
    };
    
    loadData();
  }, [userId]); // Re-fetch when doctorId changes (e.g., after login)
  
  // Apply filters effect with dependencies
  // Only re-apply filters when search term or date range changes
  // Don't re-sort - backend already sorted correctly
  useEffect(() => {
    if (patients.length === 0) {
      setFilteredPatients([]);
      return;
    }
    
    // Only apply filters if user has set any filters
    if (searchTerm.trim() || (dateRange[0] && dateRange[1])) {
      console.log('Filter effect running, searchTerm:', searchTerm, 'patients:', patients.length);
      applyFilters();
    } else {
      // No filters - use API data directly (preserve backend sorting)
      setFilteredPatients([...patients]);
    }
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
    pagination,
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