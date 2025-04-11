// src/components/Dashboard/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { Receipt } from '../type';
import { useAuth } from '../AuthContext';
import { usePatientContext } from '../PatientContext';
import { useDoctorContext } from '../DoctorContext';
import { useClinicContext } from '../ClinicContext';

// Import sub-components
import DashboardSidebar from '../DashboardSidebar';
import DashboardHeader from '../DashboardHeader';
import ReceiptModal from '../ReceiptPatient';
import ReceiptDetail from '../ReceiptDetails';
import DashboardContent from './DashboardContent';
import ReportContent from './ReportContent';
import ReceiptPrinter from './ReceiptPrinter';
import WaitingListManager from './WaitingListManager';

const Dashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState<boolean>(false);
  const [waitingListVisible, setWaitingListVisible] = useState<boolean>(true);
  const [waitingListRefreshTrigger, setWaitingListRefreshTrigger] = useState<number>(0);
  const [patientsNeedRefresh, setPatientsNeedRefresh] = useState<boolean>(false);
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState<number>(0);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine if we're on the reports page
  const isReportsPage = location.pathname.includes('/reports');
  
  // Get data from contexts
  const { username } = useAuth();
  const { selectedPatient, setSelectedPatient, fetchPatients } = usePatientContext();
  const { settings: doctorSettings, fetchSettings } = useDoctorContext();
  const { selectedClinicId, selectedClinic, setSelectedClinicId } = useClinicContext();

  // Reference for the waiting list sidebar component
  const waitingListManagerRef = useRef<any>(null);

  // Load data on component mount
  useEffect(() => {
    console.log('Dashboard rendering with', selectedPatient?.patient_name || 'no selected patient');
    fetchSettings();
  }, [selectedPatient, fetchSettings]);

  // Auto-refresh patients list when needed
  useEffect(() => {
    if (patientsNeedRefresh && !isReceiptModalVisible) {
      const currentTime = Date.now();
      // Prevent refresh spam - minimum 2 seconds between refreshes
      if (currentTime - lastRefreshTimestamp > 2000) {
        console.log('Auto-refreshing patients list');
        fetchPatients().then(() => {
          setPatientsNeedRefresh(false);
          setLastRefreshTimestamp(currentTime);
        });
      }
    }
  }, [patientsNeedRefresh, isReceiptModalVisible, lastRefreshTimestamp, fetchPatients]);

  // Handle clinic selection
  const handleClinicSelect = (clinicId: string) => {
    setSelectedClinicId(clinicId);
    fetchPatients();
  };

  // Manual refresh function
  const handleRefresh = () => {
    console.log('Manual refresh requested');
    fetchPatients();
    refreshWaitingListOnly();
    setPatientsNeedRefresh(false);
    setLastRefreshTimestamp(Date.now());
  };

  // Function to refresh only the waiting list data
  const refreshWaitingListOnly = () => {
    if (waitingListManagerRef.current && waitingListManagerRef.current.refreshData) {
      waitingListManagerRef.current.refreshData();
    } else {
      setWaitingListRefreshTrigger(prev => prev + 1);
    }
  };

  // Navigate to settings page
  const handleSettingsClick = () => {
    navigate('/settings');
  };

  // Navigate to reports page
  const handleReportsClick = () => {
    navigate('/dashboard/reports');
  };

  // Toggle waiting list sidebar
  const toggleWaitingList = () => {
    setWaitingListVisible(!waitingListVisible);
  };
  
  // Handle receipt printing
  const handlePrintReceipt = (receipt: Receipt) => {
    if (selectedPatient) {
      ReceiptPrinter.printReceipt(receipt, selectedPatient, selectedClinic || undefined, doctorSettings);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Left sidebar */}
      <DashboardSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <Layout>
        {/* Header */}
        <DashboardHeader onSettingsClick={handleSettingsClick} />
        
        {/* Dynamic main content */}
        {isReportsPage ? (
          <ReportContent />
        ) : (
          <DashboardContent 
            waitingListVisible={waitingListVisible}
            toggleWaitingList={toggleWaitingList}
            handleRefresh={handleRefresh}
            handleReportsClick={handleReportsClick}
            patientsNeedRefresh={patientsNeedRefresh}
            selectedClinicId={selectedClinicId || undefined}
            selectedPatient={selectedPatient || undefined}
            onClinicSelect={handleClinicSelect}
            waitingListRefreshTrigger={waitingListRefreshTrigger}
            isReceiptModalVisible={isReceiptModalVisible}
            setIsReceiptModalVisible={setIsReceiptModalVisible}
            onPrintReceipt={handlePrintReceipt}
            onBackToList={() => setSelectedPatient(null)}
          >
            <WaitingListManager 
              ref={waitingListManagerRef}
              visible={waitingListVisible}
              selectedClinicId={selectedClinicId || undefined}
              refreshTrigger={waitingListRefreshTrigger}
              onWaitingListChange={() => setPatientsNeedRefresh(true)}
            />
          </DashboardContent>
        )}
      </Layout>

      {/* Receipt Modal for adding new receipt */}
      {isReceiptModalVisible && selectedPatient && (
        <ReceiptModal
          visible={isReceiptModalVisible}
          onCancel={() => setIsReceiptModalVisible(false)}
          patient={selectedPatient}
          onReceiptAdded={async () => {
            setIsReceiptModalVisible(false);
            await fetchPatients();
          }}
        />
      )}

      {/* Modal for viewing receipt details */}
      <ReceiptDetail onPrintReceipt={handlePrintReceipt} />
    </Layout>
  );
};

export default Dashboard;