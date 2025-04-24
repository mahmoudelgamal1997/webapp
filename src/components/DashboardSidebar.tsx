// src/components/DashboardSidebar.tsx
import React from 'react';
import { Layout, Menu } from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined, 
  MenuUnfoldOutlined, 
  MenuFoldOutlined, 
  SettingOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

const DashboardSidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const { username, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const handleReportsClick = () => {
    navigate('/reports');
  };

  return (
    <Sider 
      collapsible 
      collapsed={collapsed} 
      onCollapse={(value) => setCollapsed(value)}
      trigger={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
    >
      <div 
        className="logo" 
        style={{ 
          height: '32px', 
          background: 'rgba(255, 255, 255, 0.2)', 
          margin: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          paddingLeft: collapsed ? 0 : '10px',
        }}
      >
        <UserOutlined style={{ color: 'white', marginRight: collapsed ? 0 : '10px' }} />
        {!collapsed && (
          <span style={{ color: 'white', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {username || 'User'}
          </span>
        )}
      </div>
      <Menu theme="dark" mode="inline" defaultSelectedKeys={['patients']}>
        <Menu.Item key="patients" icon={<UserOutlined />} onClick={() => navigate('/dashboard')}>
          Patients
        </Menu.Item>
        <Menu.Item key="reports" icon={<FileTextOutlined />} onClick={handleReportsClick}>
          Reports
        </Menu.Item>
        <Menu.Item key="settings" icon={<SettingOutlined />} onClick={handleSettingsClick}>
          Receipt Settings
        </Menu.Item>
        <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
          Logout
        </Menu.Item>
      </Menu>
    </Sider>
  );
};

export default DashboardSidebar;