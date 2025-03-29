// PageHeader.tsx
import React from 'react';
import { Layout, Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const { Header } = Layout;

const PageHeader: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Header style={{ 
      padding: 0, 
      background: 'white', 
      display: 'flex', 
      justifyContent: 'flex-end', 
      alignItems: 'center' 
    }}>
      <Button 
        type="text" 
        icon={<LogoutOutlined />} 
        onClick={handleLogout}
        style={{ marginRight: '16px' }}
      >
        Logout
      </Button>
    </Header>
  );
};

export default PageHeader;