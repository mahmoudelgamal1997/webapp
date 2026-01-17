// src/components/DashboardHeader.tsx
import React from 'react';
import { Layout, Button, Space } from 'antd';
import { SettingOutlined, LogoutOutlined, MenuOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const { Header } = Layout;

interface HeaderProps {
  onSettingsClick: () => void;
  onMenuClick?: () => void;
  isMobile?: boolean;
}

const DashboardHeader: React.FC<HeaderProps> = ({ onSettingsClick, onMenuClick, isMobile = false }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Header 
      style={{ 
        padding: isMobile ? '0 8px' : 0, 
        background: 'white', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0'
      }}
    >
      {isMobile && onMenuClick && (
        <Button 
          type="text" 
          icon={<MenuOutlined />} 
          onClick={onMenuClick}
          style={{ marginLeft: 8 }}
        />
      )}
      <Space style={{ marginRight: isMobile ? '8px' : '16px' }}>
        <Button 
          type="text" 
          icon={<SettingOutlined />} 
          onClick={onSettingsClick}
          style={isMobile ? { padding: '4px 8px' } : {}}
        >
          {isMobile ? '' : 'Receipt Settings'}
        </Button>
        <Button 
          type="text" 
          icon={<LogoutOutlined />} 
          onClick={handleLogout}
          style={isMobile ? { padding: '4px 8px' } : {}}
        >
          {isMobile ? '' : 'Logout'}
        </Button>
      </Space>
    </Header>
  );
};

export default DashboardHeader;