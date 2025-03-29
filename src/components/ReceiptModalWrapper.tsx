// ReceiptModalWrapper.tsx
import React from 'react';
import { message } from 'antd';
import ReceiptModal from '../components/ReceiptPatient'; // Import from original path
import { usePatientContext } from './PatientContext';

interface ReceiptModalWrapperProps {
  visible: boolean;
  onCancel: () => void;
}

const ReceiptModalWrapper: React.FC<ReceiptModalWrapperProps> = ({ visible, onCancel }) => {
  const { selectedPatient, fetchPatients } = usePatientContext();

  const handleReceiptAdded = async () => {
    // First close the modal
    onCancel();
    
    // Show loading message
    const loadingMsg = message.loading('Refreshing data...', 0);
    
    // Perform multiple refresh attempts to ensure we get the latest data
    try {
      // Wait a moment before first attempt
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchPatients();
      
      // Try again after a short delay to be extra sure
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchPatients();
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      // Close loading message
      loadingMsg();
    }
  };

  return (
    <ReceiptModal
      visible={visible}
      onCancel={onCancel}
      patient={selectedPatient}
      onReceiptAdded={handleReceiptAdded}
    />
  );
};

export default ReceiptModalWrapper;