// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { usePatientContext } from './PatientContext';
import { useDoctorContext } from './DoctorContext';
import { Receipt } from './type';
import moment from 'moment';

// Import extracted components
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';
import PatientsList from './PatientsList';
import PatientDetail from './PatientDetail';
import ReceiptModal from './ReceiptPatient';
import ReceiptDetail from './ReceiptDetails';
import { 
  SettingOutlined 
} from '@ant-design/icons';
const { Content } = Layout;
const { Title } = Typography;

const Dashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState<boolean>(false);
  const navigate = useNavigate();
  
  // Get data from contexts
  const { username } = useAuth();
  const { 
    selectedPatient, 
    setSelectedPatient,
    fetchPatients
  } = usePatientContext();
  
  // Get doctor settings for receipt customization
  const { settings: doctorSettings, fetchSettings } = useDoctorContext();

  // Load data on component mount
  useEffect(() => {
    console.log('Dashboard rendering with', selectedPatient?.patient_name || 'no selected patient');
    
    // Fetch doctor settings on component mount
    fetchSettings();
  }, [selectedPatient, fetchSettings]);

  // Manual refresh function
  const handleRefresh = () => {
    console.log('Manual refresh requested');
    fetchPatients();
  };

  // Navigate to settings page
  const handleSettingsClick = () => {
    navigate('/settings');
  };

  // Handle print receipt with dynamic header
  const handlePrintReceipt = (receipt: Receipt) => {
    console.log('Printing receipt:', receipt);
    
    // Format the clinic information for the header
    const clinicInfo = [];
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
      {/* Use the extracted sidebar component */}
      <DashboardSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <Layout>
        {/* Use the extracted header component */}
        <DashboardHeader onSettingsClick={handleSettingsClick} />
        
        <Content style={{ margin: '24px 16px', padding: 24, background: 'white' }}>
          {/* Dashboard Controls */}
          <Card style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={4}>Patient Management Dashboard</Title>
              <Space>
                <Button type="primary" onClick={handleRefresh}>
                  Refresh Data
                </Button>
                <Button onClick={handleSettingsClick} icon={<SettingOutlined />}>
                  Receipt Settings
                </Button>
              </Space>
            </Space>
          </Card>

          {/* Patient data section */}
          {!selectedPatient ? (
            <Card title="Patients List">
              <PatientsList />
            </Card>
          ) : (
            <PatientDetail 
              isReceiptModalVisible={isReceiptModalVisible}
              setIsReceiptModalVisible={setIsReceiptModalVisible}
              onPrintReceipt={handlePrintReceipt}
              onBackToList={() => setSelectedPatient(null)}
            />
          )}
        </Content>
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
    </Layout>
  );
};

export default Dashboard;