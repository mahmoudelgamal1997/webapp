// src/components/Dashboard/DashboardContent.tsx
import React from 'react';
import { Layout, Card, Typography, Button, Space } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, FileTextOutlined } from '@ant-design/icons';
import PatientsList from '../PatientsList';
import PatientDetail from '../PatientDetail';
import ClinicSelector from '../ClinicSelector';
import { Receipt } from '../type';

const { Content } = Layout;
const { Title } = Typography;

interface DashboardContentProps {
  children?: React.ReactNode;
  waitingListVisible: boolean;
  toggleWaitingList: () => void;
  handleRefresh: () => void;
  handleReportsClick: () => void;
  patientsNeedRefresh: boolean;
  selectedClinicId?: string;
  selectedPatient?: any;
  onClinicSelect: (clinicId: string) => void;
  waitingListRefreshTrigger: number;
  isReceiptModalVisible: boolean;
  setIsReceiptModalVisible: (visible: boolean) => void;
  onPrintReceipt: (receipt: Receipt) => void;
  onBackToList: () => void;
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  children,
  waitingListVisible,
  toggleWaitingList,
  handleRefresh,
  handleReportsClick,
  patientsNeedRefresh,
  selectedClinicId,
  selectedPatient,
  onClinicSelect,
  waitingListRefreshTrigger,
  isReceiptModalVisible,
  setIsReceiptModalVisible,
  onPrintReceipt,
  onBackToList
}) => {
  return (
    <Layout>
      {/* Main content area */}
      <Content style={{ margin: '24px 16px', padding: 24, background: 'white' }}>
        {/* Clinic Selector */}
        <ClinicSelector onClinicSelect={onClinicSelect} />
        
        {/* Dashboard Controls */}
        <Card style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={4}>No waiting Dashboard</Title>
            <Space>
              <Button 
                type="primary" 
                onClick={handleRefresh} 
                disabled={!selectedClinicId}
                loading={patientsNeedRefresh}
              >
                Refresh Data
              </Button>
              <Button 
                icon={waitingListVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                onClick={toggleWaitingList}
              >
                {waitingListVisible ? 'Hide Waiting List' : 'Show Waiting List'}
              </Button>
              <Button 
                icon={<FileTextOutlined />}
                onClick={handleReportsClick}
              >
                Reports
              </Button>
            </Space>
          </Space>
        </Card>

        {/* Patient data section */}
        {selectedClinicId && !selectedPatient ? (
          <Card title="Patients List">
            <PatientsList refreshTrigger={waitingListRefreshTrigger} />
          </Card>
        ) : selectedPatient ? (
          <PatientDetail 
            isReceiptModalVisible={isReceiptModalVisible}
            setIsReceiptModalVisible={setIsReceiptModalVisible}
            onPrintReceipt={onPrintReceipt}
            onBackToList={onBackToList}
          />
        ) : (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Title level={4}>Select a clinic to view patients</Title>
            </div>
          </Card>
        )}
      </Content>
      
      {/* Waiting list sidebar (passed as children) */}
      {children}
    </Layout>
  );
};

export default DashboardContent;