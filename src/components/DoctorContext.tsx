// components/DoctorContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode ,useCallback} from 'react';
import axios from 'axios';
import { message } from 'antd';
import API from '../config/api';

interface DoctorSettings {
  receiptHeader: string;
  receiptFooter: string;
  clinicName: string;
  doctorTitle: string;
  clinicAddress: string;
  clinicPhone: string;
  logoUrl?: string;
}

interface DoctorContextType {
  settings: DoctorSettings;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: DoctorSettings) => Promise<boolean>;
}

const defaultSettings: DoctorSettings = {
  receiptHeader: '',
  receiptFooter: '',
  clinicName: '',
  doctorTitle: '',
  clinicAddress: '',
  clinicPhone: '',
};

const DoctorContext = createContext<DoctorContextType | undefined>(undefined);

// API endpoints
let endpoint = `${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SETTINGS}`;

// const API_BASE_URL = process.env.REACT_APP_API_URL || `'http://localhost:7000'`;
// const DOCTOR_SETTINGS_ENDPOINT = (doctorId: string) => `/api/doctors/${doctorId}/settings`;

export const DoctorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<DoctorSettings>(defaultSettings);
  const [loading, setLoading] = useState<boolean>(false);
  const doctorId = localStorage.getItem('doctorId');

  // Fetch doctor's settings
 // In your DoctorContext.tsx
const fetchSettings = useCallback(async () => {
  try {
    const response = await axios.get(API.ENDPOINTS.DOCTOR_SETTINGS(doctorId));
    // Only update if settings actually changed
    setSettings(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(response.data)) {
        return response.data;
      }
      return prev;
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
  }
}, [doctorId]);

  // Update doctor's settings
  const updateSettings = async (newSettings: DoctorSettings): Promise<boolean> => {
    if (!doctorId) {
      message.error('Doctor ID not found. Please log in again.');
      return false;
    }
    
    try {
      setLoading(true);
      console.log(`Updating doctor settings for ${doctorId}:`, newSettings);
      
     const response = await axios.post(
          `${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SETTINGS(doctorId)}`, 
          newSettings
      );      
      if (response.data && response.data.settings) {
        setSettings(response.data.settings);
        message.success('Settings saved successfully');
        return true;
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      message.error('Failed to save settings. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Load settings on initial mount
  useEffect(() => {
    fetchSettings();
  }, [doctorId]);

  const value = {
    settings,
    loading,
    fetchSettings,
    updateSettings
  };

  return (
    <DoctorContext.Provider value={value}>
      {children}
    </DoctorContext.Provider>
  );
};

export const useDoctorContext = () => {
  const context = useContext(DoctorContext);
  if (context === undefined) {
    throw new Error('useDoctorContext must be used within a DoctorProvider');
  }
  return context;
};