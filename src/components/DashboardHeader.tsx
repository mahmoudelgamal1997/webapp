import React from 'react';
import { Layout, Button, Space, Typography } from 'antd';
import { SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useClinicContext } from './ClinicContext';
import { useDoctorContext } from './DoctorContext';

const { Header } = Layout;
const { Title, Text } = Typography;

interface HeaderProps {
  onSettingsClick: () => void;
}

const DashboardHeader: React.FC<HeaderProps> = ({ onSettingsClick }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { selectedClinic } = useClinicContext();
  const { settings: doctorSettings } = useDoctorContext();
  
  // Get clinic name - prioritize doctor settings, then selected clinic
  const clinicName = doctorSettings.clinicName || selectedClinic?.name || null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Header 
      style={{ 
        padding: '0 24px',
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 64,
        boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)'
      }}
    >
      {/* Left side: No Waiting title and clinic name */}
      <Space direction="vertical" size={0}>
        <Title level={4} style={{ color: '#1890ff', margin: 0 }}>
          No Waiting
        </Title>
        {clinicName && (
          <Text type="secondary" style={{ fontSize: '12px', margin: 0 }}>
            {clinicName}
          </Text>
        )}
      </Space>

      {/* Right side: Actions */}
      <Space>
        <Button 
          type="text" 
          icon={<SettingOutlined />} 
          onClick={onSettingsClick}
        >
          Receipt Settings
        </Button>
        <Button 
          type="text" 
          icon={<LogoutOutlined />} 
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Space>
    </Header>
  );
};

export default DashboardHeader;
