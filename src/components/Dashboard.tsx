// src/components/Dashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Layout, Card, Typography, Button, Space, Alert, Row, Col, Drawer, Grid } from 'antd';
import { 
  SettingOutlined,
  WarningOutlined,
  ItalicOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { usePatientContext } from './PatientContext';
import { useDoctorContext } from './DoctorContext';
import { useClinicContext } from './ClinicContext';
import { Receipt } from './type';
import moment from 'moment';
import { getFirestore, collection, query, onSnapshot, doc } from 'firebase/firestore';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';
import PatientsList from './PatientsList';
import PatientDetail from './PatientDetail';
import ReceiptModal from './ReceiptPatient';
import ReceiptDetail from './ReceiptDetails';
import ClinicSelector from './ClinicSelector';
import SidebarWaitingList from './SidebarWaitingList';
import SendNotification from './SendNotification';
import NextVisits from './NextVisits';

const { useBreakpoint } = Grid;
const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState<boolean>(false);
  const [waitingListVisible, setWaitingListVisible] = useState<boolean>(true);
  const [sidebarDrawerVisible, setSidebarDrawerVisible] = useState<boolean>(false);
  const [waitingListDrawerVisible, setWaitingListDrawerVisible] = useState<boolean>(false);
  const waitingListUnsubscribe = useRef<any>(null);
  const [waitingListRefreshTrigger, setWaitingListRefreshTrigger] = useState<number>(0);
  const sidebarWaitingListRef = useRef<any>(null);
  const [patientsNeedRefresh, setPatientsNeedRefresh] = useState<boolean>(false);
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState<number>(0);
  const lastRefreshTimestampRef = useRef<number>(0);
  const [notificationModalVisible, setNotificationModalVisible] = useState<boolean>(false);
  
  // Responsive breakpoints using Ant Design Grid
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md breakpoint is 768px
  const isTablet = screens.md && !screens.lg; // lg breakpoint is 992px
  
  const navigate = useNavigate();
  
  // Get data from contexts
  const { username } = useAuth();
  const { 
    selectedPatient, 
    setSelectedPatient,
    fetchPatients
  } = usePatientContext();
  
  // Get doctor settings for receipt customization
  const { settings: doctorSettings, fetchSettings, doctorId } = useDoctorContext();
  
  // Get clinic context
  const { selectedClinicId, selectedClinic, setSelectedClinicId, clinics } = useClinicContext();

  // Load data on component mount - only fetch settings once on mount
  useEffect(() => {
    console.log('Dashboard rendering with', selectedPatient?.patient_name || 'no selected patient');
    
    // Fetch doctor settings only once on component mount
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Setup Firestore listener for waiting list changes
  useEffect(() => {
    if (selectedClinicId) {
      setupWaitingListListener(selectedClinicId);
    }
    
    // Cleanup function to remove listener when component unmounts or clinic changes
    return () => {
      if (waitingListUnsubscribe.current) {
        waitingListUnsubscribe.current();
        waitingListUnsubscribe.current = null;
      }
    };
  }, [selectedClinicId]);

  // Auto-refresh patients list when needed - with reduced debounce for better responsiveness
  useEffect(() => {
    if (patientsNeedRefresh && !isReceiptModalVisible) {
      const currentTime = Date.now();
      // Reduced delay to 1 second for better real-time experience
      if (currentTime - lastRefreshTimestamp > 1000) {
        console.log('Auto-refreshing patients list after waiting list change');
        // Refresh both the context data and trigger PatientsList refresh
        fetchPatients().then(() => {
          setPatientsNeedRefresh(false);
          setLastRefreshTimestamp(currentTime);
          lastRefreshTimestampRef.current = currentTime;
          // Also trigger PatientsList refresh via refreshTrigger
          setWaitingListRefreshTrigger(prev => prev + 1);
        }).catch((error) => {
          console.error('Error auto-refreshing patients list:', error);
          setPatientsNeedRefresh(false);
        });
      } else {
        // If too soon, schedule a retry after the delay period
        const delay = 1000 - (currentTime - lastRefreshTimestamp);
        setTimeout(() => {
          if (patientsNeedRefresh && !isReceiptModalVisible) {
            console.log('Retrying auto-refresh after delay');
            fetchPatients().then(() => {
              setPatientsNeedRefresh(false);
              setLastRefreshTimestamp(Date.now());
              setWaitingListRefreshTrigger(prev => prev + 1);
            });
          }
        }, delay);
      }
    }
  }, [patientsNeedRefresh, isReceiptModalVisible, lastRefreshTimestamp, fetchPatients]);

  // Function to format date as used in Firebase
  const formatDate = (date?: Date): string => {
    const d = date || new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  // Function to setup Firestore listener for waiting list changes
  const setupWaitingListListener = (clinicId: string) => {
    try {
      const db = getFirestore();
      const currentDate = formatDate();
      
      console.log('Setting up Firestore listener for clinic:', clinicId, 'date:', currentDate);
      
      // Define path variations as complete strings to avoid TypeScript spread error
      const pathVariations = [
        // Variation 1: Standard path
        `clinics/${clinicId}/waiting_list/${currentDate}/patients`,
        // Variation 2: Alternative collection name
        `clinics/${clinicId}/waitingList/${currentDate}/patients`,
        // Variation 3: Direct patients collection
        `clinics/${clinicId}/patients`
      ];
      
      // Remove existing listener if there is one
      if (waitingListUnsubscribe.current) {
        waitingListUnsubscribe.current();
        waitingListUnsubscribe.current = null;
      }
      
      // Try each path for setting up the listener
      let listenerSet = false;
      
      for (const path of pathVariations) {
        try {
          console.log('Trying to set up listener on path:', path);
          // Use collection() with the path string directly
          const collRef = collection(db, path);
          
          // Set up new listener
          const unsubscribe = onSnapshot(collRef, (snapshot) => {
            console.log('Waiting list update detected in path:', path);
            console.log('Snapshot size:', snapshot.size, 'documents');
            
            // When waiting list changes, refresh the waiting list sidebar immediately
            refreshWaitingListOnly();
            
            // Also mark patients list for refresh immediately when waiting list changes
            // This ensures patients that are removed from waiting list (status changed) appear in Patient List
            setPatientsNeedRefresh(true);
            
            // Force an immediate refresh trigger as well for better responsiveness
            // Use ref to access current timestamp value
            const currentTime = Date.now();
            if (currentTime - lastRefreshTimestampRef.current > 1000) {
              console.log('Immediate refresh triggered from waiting list change');
              fetchPatients().then(() => {
                const newTimestamp = Date.now();
                setLastRefreshTimestamp(newTimestamp);
                lastRefreshTimestampRef.current = newTimestamp;
                setWaitingListRefreshTrigger(prev => prev + 1);
              });
            }
          }, (error) => {
            console.error('Error in waiting list listener for path:', path, error);
          });
          
          waitingListUnsubscribe.current = unsubscribe;
          listenerSet = true;
          console.log('Firestore waiting list listener set up for path:', path);
          break;
        } catch (error) {
          console.log('Could not set up listener for path:', path, error);
        }
      }
      
      if (!listenerSet) {
        console.error('Failed to set up listener for any path variation');
      }
    } catch (error) {
      console.error('Error setting up Firestore listener:', error);
    }
  };

  // Function to refresh only the waiting list data
  const refreshWaitingListOnly = () => {
    console.log('Refreshing waiting list only...');
    
    // Method 1: If SidebarWaitingList exposes a refresh function through a ref
    if (sidebarWaitingListRef.current && sidebarWaitingListRef.current.refreshData) {
      console.log('Refreshing via ref method');
      sidebarWaitingListRef.current.refreshData();
    } 
    // Method 2: Trigger a refresh through a state update
    else {
      console.log('Refreshing via trigger method');
      setWaitingListRefreshTrigger(prev => prev + 1);
    }
  };
  
  // Handle clinic selection
  const handleClinicSelect = (clinicId: string) => {
    setSelectedClinicId(clinicId);
    // After clinic selection, fetch patients for this clinic
    fetchPatients();
  };

  // Manual refresh function
  const handleRefresh = () => {
    console.log('Manual refresh requested');
    fetchPatients();
    refreshWaitingListOnly();
    setPatientsNeedRefresh(false); // Clear the auto-refresh flag
    setLastRefreshTimestamp(Date.now());
  };

  // Navigate to settings page
  const handleSettingsClick = () => {
    navigate('/settings');
  };

  // Toggle waiting list sidebar/drawer
  const toggleWaitingList = () => {
    if (isMobile) {
      setWaitingListDrawerVisible(!waitingListDrawerVisible);
    } else {
      setWaitingListVisible(!waitingListVisible);
    }
  };

  // Update button text based on visibility
  const getWaitingListButtonText = () => {
    if (isMobile) {
      return waitingListDrawerVisible ? 'Hide Waiting List' : 'Show Waiting List';
    }
    return waitingListVisible ? 'Hide Waiting List' : 'Show Waiting List';
  };

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  // Handle print receipt with dynamic header
  const handlePrintReceipt = (receipt: Receipt) => {
    console.log('Printing receipt:', receipt);
    
    // Format the clinic information for the header
    const clinicInfo = [];
    
    // First try to use clinic from context if available
    if (selectedClinic) {
      clinicInfo.push(`<h1>${selectedClinic.name || 'عيادة'}</h1>`);
      if (selectedClinic.address) {
        clinicInfo.push(`<p>${selectedClinic.address}</p>`);
      }
      if (selectedClinic.phone) {
        clinicInfo.push(`<p>هاتف: ${selectedClinic.phone}</p>`);
      }
    }
    
    // Then override with doctor settings if available
    if (doctorSettings.clinicName) clinicInfo.push(`<h1>${doctorSettings.clinicName}</h1>`);
    if (doctorSettings.doctorTitle) clinicInfo.push(`<h3>${doctorSettings.doctorTitle}</h3>`);
    if (doctorSettings.clinicAddress) clinicInfo.push(`<p>${doctorSettings.clinicAddress}</p>`);
    if (doctorSettings.clinicPhone) clinicInfo.push(`<p>هاتف: ${doctorSettings.clinicPhone}</p>`);
    
    // Implement print functionality here
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Patient Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; direction: rtl; }
              .receipt { padding: 20px; max-width: 800px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 15px; }
              .clinic-info { margin-bottom: 15px; }
              .patient-info { margin-bottom: 20px; padding: 10px; background-color: #f8f8f8; border-radius: 5px; }
              .drug-item { margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 5px; }
              .notes { margin-top: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }
              .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 15px; text-align: center; font-style: italic; }
              h1, h2, h3 { margin: 5px 0; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <div class="clinic-info">
                  ${clinicInfo.length > 0 ? clinicInfo.join('') : '<h2>روشتة طبية</h2>'}
                </div>
                ${doctorSettings.receiptHeader ? `<div class="custom-header">${doctorSettings.receiptHeader}</div>` : ''}
              </div>
              
              <div class="patient-info">
                <h3>اسم المريض: ${selectedPatient?.patient_name}</h3>
                <p>العمر: ${selectedPatient?.age}</p>
                <p>تاريخ: ${moment(receipt.date).format('YYYY-MM-DD')}</p>
              </div>
              
              <div class="drugs">
                <h3>الأدوية:</h3>
                ${receipt.drugs.map((drug, index) => `
                  <div class="drug-item">
                    <h4>${index + 1}. ${drug.drug}</h4>
                    <p>التكرار: ${drug.frequency} | المدة: ${drug.period} | التوقيت: ${drug.timing}</p>
                  </div>
                `).join('')}
              </div>
              
              ${receipt.notes ? `
                <div class="notes">
                  <h3>ملاحظات:</h3>
                  <p>${receipt.notes}</p>
                </div>
              ` : ''}
              
              ${doctorSettings.receiptFooter ? `
                <div class="footer">
                  ${doctorSettings.receiptFooter}
                </div>
              ` : ''}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Left sidebar - Drawer on mobile, Sidebar on desktop */}
      {isMobile ? (
        <Drawer
          title="Menu"
          placement="left"
          onClose={() => setSidebarDrawerVisible(false)}
          open={sidebarDrawerVisible}
          bodyStyle={{ padding: 0 }}
          width={256}
        >
          <DashboardSidebar collapsed={false} setCollapsed={() => {}} />
        </Drawer>
      ) : (
        <DashboardSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      )}
      
      <Layout>
        {/* Header */}
        <DashboardHeader 
          onSettingsClick={handleSettingsClick}
          onMenuClick={() => isMobile && setSidebarDrawerVisible(true)}
          isMobile={isMobile}
        />
        
        {/* Main content and right sidebar */}
        <Layout>
          {/* Main content area */}
          <Content style={{ 
            margin: isMobile ? '16px 8px' : '24px 16px', 
            padding: isMobile ? 12 : 24, 
            background: 'white' 
          }}>
            {/* Clinic Selector */}
            <ClinicSelector onClinicSelect={handleClinicSelect} />
            
            {/* Dashboard Controls */}
            <Card style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Title level={isMobile ? 5 : 4}>Dr Waiting Dashboard</Title>
                <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    onClick={handleRefresh} 
                    disabled={!selectedClinicId}
                    loading={patientsNeedRefresh}
                    block={isMobile}
                  >
                    Refresh Data
                  </Button>
                  <Button 
                    type="default"
                    onClick={() => setNotificationModalVisible(true)}
                    disabled={!selectedClinicId || !doctorId}
                    block={isMobile}
                  >
                    Send Notification
                  </Button>
                  <Button 
                    icon={isMobile ? (waitingListDrawerVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />) : (waitingListVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />)}
                    onClick={toggleWaitingList}
                    block={isMobile}
                  >
                    {getWaitingListButtonText()}
                  </Button>
                </Space>
              </Space>
            </Card>

            {/* Patient data section */}
            {selectedClinicId && !selectedPatient ? (
              <>
                <Card title="Patients List" style={{ marginBottom: 16 }}>
                  <PatientsList refreshTrigger={waitingListRefreshTrigger} />
                </Card>
                <Card title="Scheduled Visit Reminders">
                  <NextVisits />
                </Card>
              </>
            ) : selectedPatient ? (
              <PatientDetail 
                isReceiptModalVisible={isReceiptModalVisible}
                setIsReceiptModalVisible={setIsReceiptModalVisible}
                onPrintReceipt={handlePrintReceipt}
                onBackToList={() => setSelectedPatient(null)}
              />
            ) : (
              <>
                <Card>
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Title level={4}>Select a clinic to view patients</Title>
                  </div>
                </Card>
                <Card title="Scheduled Visit Reminders" style={{ marginTop: 16 }}>
                  <NextVisits />
                </Card>
              </>
            )}
          </Content>
          
          {/* Right sidebar for waiting list - Drawer on mobile, Sidebar on desktop */}
          {selectedClinicId && (
            <>
              {isMobile ? (
                <Drawer
                  title="Waiting List"
                  placement="right"
                  onClose={() => setWaitingListDrawerVisible(false)}
                  open={waitingListDrawerVisible}
                  width={280}
                  bodyStyle={{ padding: 0 }}
                >
                  <SidebarWaitingList 
                    ref={sidebarWaitingListRef}
                    refreshTrigger={waitingListRefreshTrigger}
                  />
                </Drawer>
              ) : (
                waitingListVisible && (
                  <Sider 
                    width={280} 
                    theme="light"
                    style={{ 
                      background: '#fff',
                      margin: '24px 16px 24px 0',
                      borderRadius: '4px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}
                  >
                    <SidebarWaitingList 
                      ref={sidebarWaitingListRef}
                      refreshTrigger={waitingListRefreshTrigger}
                    />
                  </Sider>
                )
              )}
            </>
          )}
        </Layout>
      </Layout>

      {/* Receipt Modal for adding new receipt */}
      {isReceiptModalVisible && (
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

      {/* Notification Modal */}
      <SendNotification
        visible={notificationModalVisible}
        onCancel={() => setNotificationModalVisible(false)}
        patientName={selectedPatient?.patient_name}
      />
    </Layout>
  );
};

export default Dashboard;