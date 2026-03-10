// src/components/Dashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { printHtml as triggerPrint } from './printUtils';
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
import { useLanguage } from './LanguageContext';
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

  // Use language context for direction
  const { isRTL } = useLanguage();

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

  // Helpers to translate Arabic drug values to English (for print only)
  const formatDrugTiming = (timing: string) => {
    if (!timing) return '';
    const s = String(timing).trim();
    const arToEn: Record<string, string> = {
      "بعد الأكل": "After Eating", "قبل الأكل": "Before Eating", "قبل النوم": "Before Sleeping",
      "عند النوم": "At Bed Time", "كل 8 ساعات": "Every 8 Hours", "كل 6 ساعات": "Every 6 Hours",
      "كل 12 ساعة": "Every 12 Hours", "كل ٨ ساعات": "Every 8 Hours", "كل ٦ ساعات": "Every 6 Hours",
      "مرتين يومياً": "Twice a Day", "مرة يومياً": "Once a Day", "3 مرات يومياً": "Three Times a Day",
      "٣ مرات يومياً": "Three Times a Day", "مرة واحدة": "Once", "مره واحده": "Once",
      "عند اللزوم": "As Needed", "مع الأكل": "With Meals",
    };
    return arToEn[s] || timing;
  };
  const formatDrugFrequency = (v: string) => {
    if (!v) return '';
    const s = String(v).trim();
    const arToEn: Record<string, string> = {
      "مرة واحدة": "Once", "مره واحده": "Once", "واحدة مرة": "Once", "واحده مره": "Once",
      "مرتين يومياً": "Twice a day", "مرتين": "Twice a day", "مرة يومياً": "Once a day", "مرة يوميا": "Once a day",
      "3 مرات يومياً": "3 times a day", "3 مرات": "3 times a day", "٣ مرات يومياً": "3 times a day", "٣ مرات": "3 times a day", "3 مرات يوميا": "3 times a day",
      "4 مرات يومياً": "4 times a day", "4 مرات": "4 times a day", "٤ مرات يومياً": "4 times a day", "٤ مرات": "4 times a day", "أربع مرات يومياً": "4 times a day", "أربع مرات": "4 times a day",
      "5 مرات يومياً": "5 times a day", "5 مرات": "5 times a day", "٥ مرات": "5 times a day", "خمس مرات يومياً": "5 times a day", "خمس مرات": "5 times a day",
      "6 مرات": "6 times a day", "٦ مرات": "6 times a day",
    };
    if (arToEn[s]) return arToEn[s];
    // Fallback: "N مرات" → "N times a day"
    const timesMatch = s.match(/^([\d١٢٣٤٥٦٧٨٩٠]+)\s*مرات/);
    if (timesMatch) return timesMatch[1] + ' times a day';
    return v;
  };
  const formatDrugPeriod = (v: string) => {
    if (!v) return '';
    const s = String(v).trim();
    const arToEn: Record<string, string> = {
      "يوم": "1 day", "يوم واحد": "1 day", "1 يوم": "1 day", "١ يوم": "1 day", "1يوم": "1 day",
      "يومين": "2 days", "2 يوم": "2 days", "٢ يوم": "2 days", "3 أيام": "3 days", "٣ أيام": "3 days",
      "اسبوع": "1 week", "أسبوع": "1 week", "1 اسبوع": "1 week", "١ اسبوع": "1 week", "اسبوع واحد": "1 week",
      "اسبوعين": "2 weeks", "أسبوعين": "2 weeks", "2 اسبوع": "2 weeks", "٢ اسبوع": "2 weeks",
      "شهر": "1 month", "شهر واحد": "1 month", "1 شهر": "1 month", "شهرين": "2 months", "٢ شهر": "2 months",
    };
    if (arToEn[s]) return arToEn[s];
    const dayMatch = s.match(/^([\d١٢٣٤٥٦٧٨٩٠])\s*يوم/);
    if (dayMatch) return dayMatch[1] + " day" + (dayMatch[1] !== "1" && dayMatch[1] !== "١" ? "s" : "");
    const weekMatch = s.match(/^([\d١٢٣٤٥٦٧٨٩٠])\s*اسبوع/);
    if (weekMatch) return weekMatch[1] + " week" + (weekMatch[1] !== "1" && weekMatch[1] !== "١" ? "s" : "");
    const monthMatch = s.match(/^([\d١٢٣٤٥٦٧٨٩٠])\s*شهر/);
    if (monthMatch) return monthMatch[1] + " month" + (monthMatch[1] !== "1" && monthMatch[1] !== "١" ? "s" : "");
    return v;
  };

  // Handle print receipt with dynamic header
  const handlePrintReceipt = (receipt: Receipt) => {
    console.log('Printing receipt:', receipt);

    // Format the clinic information for the header
    // Use doctorSettings as primary source, selectedClinic as fallback only (never both)
    const clinicInfo = [];
    const clinicName = doctorSettings.clinicName || selectedClinic?.name || '';
    const clinicTitle = doctorSettings.doctorTitle || '';
    const clinicAddress = doctorSettings.clinicAddress || selectedClinic?.address || '';
    const clinicPhone = doctorSettings.clinicPhone || selectedClinic?.phone || '';

    if (clinicName) clinicInfo.push(`<h1>${clinicName}</h1>`);
    if (clinicTitle) clinicInfo.push(`<h3>${clinicTitle}</h3>`);
    if (clinicAddress) clinicInfo.push(`<p>${clinicAddress}</p>`);
    if (clinicPhone) clinicInfo.push(`<p>هاتف: ${clinicPhone}</p>`);

    const printSettings = doctorSettings.printSettings || {
      paperSize: 'a4',
      marginTop: 0,
      marginLeft: 0,
      marginRight: 0,
      showHeader: true,
      showFooter: true,
      showPatientInfo: true
    };

    const isCustomPaper = !printSettings.showHeader;

    const printHtml = `
      <html>
        <head>
          <title>Patient Receipt</title>
          <style>
            @page {
              size: ${printSettings.paperSize === 'custom' ? 'auto' : printSettings.paperSize};
              margin: 0;
            }
            html, body { 
              font-family: Arial, sans-serif; 
              direction: ${printSettings.printLocale === 'ar' ? 'rtl' : 'ltr'}; 
              margin: 0; 
              padding: 0;
            }
              .top-spacer {
                display: block;
                height: ${((printSettings.marginTop || 0) / 2)}mm;
                width: 100%;
              }
              .receipt { 
                padding-top: 0;
                padding-left: calc(${((printSettings.marginLeft || 0) / 2)}mm + 10px);
                padding-right: calc(${((printSettings.marginRight || 0) / 2)}mm + 10px);
                padding-bottom: 0;
                box-sizing: border-box;
              }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              border-bottom: ${isCustomPaper ? 'none' : '1px solid #ccc'}; 
              padding-bottom: 15px; 
              display: ${isCustomPaper ? 'none' : 'block'};
            }
            .clinic-info { margin-bottom: 15px; }
            .patient-name-block {
              margin-bottom: 8px;
              padding: 6px 10px;
            }
            .patient-name-block h3 { margin: 0; }
            .patient-info { 
              margin-bottom: 20px; 
              padding: 10px; 
              background-color: ${isCustomPaper ? 'transparent' : '#f8f8f8'}; 
              border-radius: 5px; 
              display: ${printSettings.showPatientInfo !== false ? 'block' : 'none'};
            }
            .drug-item { 
              margin-bottom: 10px; 
              padding: 5px; 
              border-bottom: 1px solid #eee;
            }
            .notes { 
              margin-top: 20px; 
              padding: 10px; 
              background-color: ${isCustomPaper ? 'transparent' : '#f5f5f5'}; 
              border-radius: 5px; 
            }
            .footer { 
              margin-top: 30px; 
              border-top: ${isCustomPaper ? 'none' : '1px solid #ccc'}; 
              padding-top: 15px; 
              text-align: center; 
              font-style: italic; 
              display: ${printSettings.showFooter ? 'block' : 'none'};
            }
            h1, h2, h3 { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="top-spacer"></div>
          <div class="receipt">
            <div class="header">
              <div class="clinic-info">
                ${clinicInfo.length > 0 ? clinicInfo.join('') : '<h2>روشتة طبية</h2>'}
              </div>
              ${doctorSettings.receiptHeader ? `<div class="custom-header">${doctorSettings.receiptHeader}</div>` : ''}
            </div>
            <div class="patient-name-block">
              ${printSettings.printLocale === 'ar'
        ? `<h3>اسم المريض: ${selectedPatient?.patient_name || ''}</h3>`
        : `<h3>Patient: ${selectedPatient?.patient_name || ''}</h3>`
      }
            </div>
            <div class="patient-info">
              ${printSettings.printLocale === 'ar'
        ? `<p>العمر: ${selectedPatient?.age || ''}</p><p>تاريخ: ${moment(receipt.date).format('DD-MM-YYYY')}</p>`
        : `<p>Age: ${selectedPatient?.age || ''}</p><p>Date: ${moment(receipt.date).format('DD-MM-YYYY')}</p>`
      }
              ${selectedPatient?.file_number ? `<p>File ID: ${selectedPatient.file_number}</p>` : ''}
            </div>
            <div class="drugs">
              <h3>${printSettings.printLocale === 'ar' ? 'الأدوية:' : 'Medications:'}</h3>
              ${receipt.drugs.map((drug, index) => `
                <div class="drug-item">
                  <h4>${index + 1}. ${drug.drug}</h4>
                  <p>${printSettings.printLocale === 'ar'
          ? `التكرار: ${drug.frequency} | المدة: ${drug.period} | التوقيت: ${drug.timing}`
          : `Frequency: ${formatDrugFrequency(drug.frequency)} | Duration: ${formatDrugPeriod(drug.period)} | Timing: ${formatDrugTiming(drug.timing)}`
        }</p>
                </div>
              `).join('')}
            </div>
            ${receipt.notes ? `
              <div class="notes">
                <h3>${printSettings.printLocale === 'ar' ? 'ملاحظات:' : 'Notes:'}</h3>
                <p>${receipt.notes}</p>
              </div>
            ` : ''}
            ${printSettings.showFooter && doctorSettings.receiptFooter ? `
              <div class="footer">${doctorSettings.receiptFooter}</div>
            ` : ''}
          </div>
        </body>
      </html>
    `;

    triggerPrint(printHtml);
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
          <DashboardSidebar collapsed={false} setCollapsed={() => { }} />
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
            {/* Clinic Selector & Dashboard Controls - Hidden when viewing patient details */}
            {!selectedPatient && (
              <>
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
              </>
            )}

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
                onBackToList={() => {
                  setSelectedPatient(null);
                  // Ensure we're on dashboard route, not services
                  if (window.location.pathname !== '/dashboard') {
                    navigate('/dashboard', { replace: true });
                  }
                }}
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
                  placement={isRTL ? "left" : "right"}
                  onClose={() => setWaitingListDrawerVisible(false)}
                  open={waitingListDrawerVisible}
                  width={280}
                  // bodyStyle={{ padding: 0 }} - Deprecated in newer AntD
                  styles={{ body: { padding: 0 } }}
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
                      margin: isRTL ? '24px 0 24px 16px' : '24px 16px 24px 0',
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