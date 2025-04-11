// src/components/ReportPage.tsx
import React, { useState } from 'react';
import { Layout, Typography, Button } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';
import Report from './Report';

const { Content } = Layout;
const { Title } = Typography;

const ReportPage: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  // For direct navigation to dashboard routes
  const goToPatientModule = () => {
    navigate('/dashboard/patients');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Left sidebar - with proper Link components for React Router */}
      <DashboardSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <Layout>
        {/* Header */}
        <DashboardHeader onSettingsClick={handleSettingsClick} />
        
        {/* Quick navigation bar for important sections */}
        <div style={{ padding: '0 16px', marginTop: 10, display: 'flex', gap: 10 }}>
          <Button type="link" onClick={goToPatientModule}>
            Patients
          </Button>
          <Button type="link" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
          <Button type="link" onClick={handleSettingsClick}>
            Settings
          </Button>
        </div>
        
        {/* Main content */}
        <Content style={{ margin: '24px 16px', padding: 24, background: 'white' }}>
          <Title level={3}>Report Center</Title>
          <Report />
        </Content>
      </Layout>
    </Layout>
  );
};

export default ReportPage;