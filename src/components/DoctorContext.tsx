// components/DoctorContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
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
  logoUrl: '',
};

const DoctorContext = createContext<DoctorContextType | undefined>(undefined);

export const DoctorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<DoctorSettings>(defaultSettings);
  const [loading, setLoading] = useState<boolean>(false);
  const doctorId = localStorage.getItem('doctorId');

  // Fetch doctor's settings
  const fetchSettings = useCallback(async () => {
    if (!doctorId) {
      console.warn('No doctor ID found in localStorage');
      return;
    }

    try {
      setLoading(true);
      console.log(`Fetching settings from: ${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SETTINGS(doctorId)}`);
      
      const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SETTINGS(doctorId)}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('Raw settings received:', response.data);
      
      if (response.data && response.data.settings) {
        // Clean the address if it has the double quotes issue
        const cleanedSettings = {
          ...response.data.settings,
          clinicAddress: response.data.settings.clinicAddress === '""' ? '' : response.data.settings.clinicAddress
        };
        
        console.log('Cleaned settings:', cleanedSettings);
        setSettings(cleanedSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      message.error('Failed to load settings');
    } finally {
      setLoading(false);
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
      
      // Send all fields explicitly, even if they're empty strings
      const response = await axios.put(
        `${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SETTINGS(doctorId)}`, 
        newSettings,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log('Update response:', response.data);
      
      if (response.data && response.data.settings) {
        const updatedSettings = {
          ...response.data.settings,
          clinicAddress: response.data.settings.clinicAddress === '""' ? '' : response.data.settings.clinicAddress
        };
        
        setSettings(updatedSettings);
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
  }, [fetchSettings]);

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