// src/components/DashboardHeader.tsx
import React from 'react';
import { Layout, Button, Space } from 'antd';
import { SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const { Header } = Layout;

interface HeaderProps {
  onSettingsClick: () => void;
}

const DashboardHeader: React.FC<HeaderProps> = ({ onSettingsClick }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Header 
      style={{ 
        padding: 0, 
        background: 'white', 
        display: 'flex', 
        justifyContent: 'flex-end', 
        alignItems: 'center' 
      }}
    >
      <Space style={{ marginRight: '16px' }}>
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