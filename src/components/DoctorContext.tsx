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
  const [doctorId, setDoctorId] = useState<string | null>(localStorage.getItem('doctorId'));

  // Listen for changes to doctorId in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const newDoctorId = localStorage.getItem('doctorId');
      if (newDoctorId !== doctorId) {
        setDoctorId(newDoctorId);
      }
    };

    // Check for changes periodically (since storage events don't fire in same tab)
    const interval = setInterval(handleStorageChange, 500);
    
    // Also listen to storage events (for cross-tab changes)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [doctorId]);

  // Fetch doctor's settings
  const fetchSettings = useCallback(async () => {
    const currentDoctorId = localStorage.getItem('doctorId');
    
    if (!currentDoctorId) {
      console.warn('No doctor ID found in localStorage');
      return;
    }

    try {
      setLoading(true);
      console.log(`Fetching settings from: ${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SETTINGS(currentDoctorId)}`);
      
      const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SETTINGS(currentDoctorId)}`, {
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
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      
      // Handle 404 (settings not found) gracefully - this is normal for new users
      if (error.response && error.response.status === 404) {
        console.log('Settings not found for this doctor yet. Using default settings.');
        // Don't show error message for 404 - it's expected for new users
        setSettings(defaultSettings);
      } else if (error.response && error.response.status >= 500) {
        // Only show error for server errors
        message.error('Failed to load settings. Please try again later.');
      } else if (!error.response) {
        // Network error
        console.warn('Network error when fetching settings. This might be expected if backend is not available.');
        // Don't show error for network issues to avoid annoying users
      } else {
        // Other client errors (400, 401, 403, etc.)
        console.warn('Error fetching settings:', error.response.status, error.response.data);
        // Only show error for authentication/authorization issues
        if (error.response.status === 401 || error.response.status === 403) {
          message.error('Failed to load settings. Please log in again.');
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Update doctor's settings
  const updateSettings = async (newSettings: DoctorSettings): Promise<boolean> => {
    const currentDoctorId = localStorage.getItem('doctorId');
    
    if (!currentDoctorId) {
      message.error('Doctor ID not found. Please log in again.');
      return false;
    }
    
    try {
      setLoading(true);
      console.log(`Updating doctor settings for ${currentDoctorId}:`, newSettings);
      
      // Send all fields explicitly, even if they're empty strings
      const response = await axios.put(
        `${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SETTINGS(currentDoctorId)}`, 
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
    } catch (error: any) {
      console.error('Error saving settings:', error);
      
      // Provide more specific error messages
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 404) {
          message.error('Settings endpoint not found. Please check the API configuration.');
        } else if (error.response.status === 401 || error.response.status === 403) {
          message.error('Authentication failed. Please log in again.');
        } else if (error.response.status >= 500) {
          message.error('Server error. Please try again later.');
        } else {
          message.error(`Failed to save settings: ${error.response.data?.message || error.response.statusText || 'Unknown error'}`);
        }
      } else if (error.request) {
        // Request was made but no response received
        message.error('Network error. Please check your connection and try again.');
      } else {
        // Something else happened
        message.error(`Failed to save settings: ${error.message || 'Unknown error'}`);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Load settings when doctorId is available
  useEffect(() => {
    const currentDoctorId = localStorage.getItem('doctorId');
    if (currentDoctorId) {
      fetchSettings();
    }
  }, [doctorId, fetchSettings]);

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