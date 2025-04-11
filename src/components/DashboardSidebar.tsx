// src/components/DashboardSidebar.tsx
import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  UserOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

interface DashboardSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine which menu item should be active
  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.includes('/settings')) return ['settings'];
    if (path.includes('/dashboard/reports')) return ['reports'];
    if (path.includes('/dashboard')) return ['dashboard'];
    return ['dashboard']; // Default
  };

  // Navigation menu items
  const menuItems = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: 'Dashboard',
      onClick: () => navigate('/dashboard')
    },
    {
      key: 'patients',
      icon: <UserOutlined />,
      label: 'Patients',
      onClick: () => navigate('/dashboard')
    },
    {
      key: 'visits',
      icon: <MedicineBoxOutlined />,
      label: 'Visits',
      onClick: () => navigate('/dashboard')
    },
    {
      key: 'reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
      onClick: () => navigate('/dashboard/reports')
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings')
    }
  ];

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
      }}
    >
      <div className="logo" style={{ 
        height: '32px', 
        margin: '16px', 
        background: 'rgba(255, 255, 255, 0.2)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontSize: collapsed ? '12px' : '16px'
      }}>
        {collapsed ? 'CM' : 'Clinic Manager'}
      </div>
      
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={getSelectedKeys()}
        items={menuItems}
      />
    </Sider>
  );
};

export default DashboardSidebar;