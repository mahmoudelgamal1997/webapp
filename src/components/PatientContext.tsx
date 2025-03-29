// PatientContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { message } from 'antd';
import { Patient, Receipt } from '../components/type';
import dayjs from 'dayjs';

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

  const userId = localStorage.getItem('doctorId');

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

  // Fetch patients from API
  const fetchPatients = async () => {
    try {
      // Use the doctor-specific endpoint if userId is available
      let endpoint = 'http://localhost:7000/api/patients';
      if (userId) {
        endpoint = `http://localhost:7000/api/patients/doctor/${userId}`;
      }
      
      const response = await axios.get(endpoint);
      const updatedPatients = response.data;
      
      // Always sort by date (newest first)
      const sortedPatients = sortByLatestDate(updatedPatients);
      
      setPatients(sortedPatients);
      setFilteredPatients(sortedPatients);
      
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
    }
  };

  // Apply all filters: search term and date range
  const applyFilters = () => {
    let filtered = [...patients];
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(patient => 
        patient.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.patient_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.address?.toLowerCase().includes(searchTerm.toLowerCase()) 
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
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setDateRange([null, null]);
    setFilteredPatients(sortByLatestDate([...patients]));
  };

  // Initial fetch and search effect with interval to maintain sort
  useEffect(() => {
    fetchPatients();
    
    // Set up interval to re-sort data every few seconds
    const sortInterval = setInterval(() => {
      if (patients.length > 0 && !selectedPatient) {
        setPatients(prev => sortByLatestDate([...prev]));
        setFilteredPatients(prev => sortByLatestDate([...prev]));
      }
    }, 2000);
    
    return () => clearInterval(sortInterval);
  }, []);
  
  // Apply filters whenever search term or date range changes
  useEffect(() => {
    applyFilters();
  }, [searchTerm, dateRange, patients]);
  
  // Sort receipts by date (newest first) when selected patient changes
  useEffect(() => {
    if (selectedPatient && selectedPatient.receipts && selectedPatient.receipts.length > 0) {
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
    setForceRender
  };

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
};

export const usePatientContext = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatientContext must be used within a PatientProvider');
  }
  return context;
};