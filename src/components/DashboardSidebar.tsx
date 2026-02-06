// src/components/DashboardSidebar.tsx
import React from 'react';
import { Layout, Menu } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  SettingOutlined,
  MedicineBoxOutlined,
  BarChartOutlined,
  DollarOutlined,
  InboxOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { useLanguage } from './LanguageContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

const DashboardSidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, logout } = useAuth();
  const { t } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuClick = (key: string) => {
    switch (key) {
      case 'patients':
        navigate('/dashboard');
        break;
      case 'services':
        navigate('/services');
        break;
      case 'analytics':
        navigate('/analytics');
        break;
      case 'inventory':
        navigate('/inventory');
        break;
      case 'external-services':
        navigate('/external-services');
        break;
      case 'settings':
        navigate('/settings');
        break;
    }
  };

  // Determine current selected key based on path
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('/services')) return 'services';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/inventory')) return 'inventory';
    if (path.includes('/external-services')) return 'external-services';
    if (path.includes('/settings')) return 'settings';
    return 'patients';
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
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        onClick={({ key }) => key !== 'logout' && handleMenuClick(key)}
      >
        <Menu.Item key="patients" icon={<UserOutlined />}>
          {t('patients')}
        </Menu.Item>
        <Menu.Item key="services" icon={<MedicineBoxOutlined />}>
          {t('services')}
        </Menu.Item>
        <Menu.Item key="analytics" icon={<BarChartOutlined />}>
          {t('analytics')}
        </Menu.Item>
        <Menu.Item key="inventory" icon={<InboxOutlined />}>
          {t('inventory')}
        </Menu.Item>
        <Menu.Item key="external-services" icon={<ExperimentOutlined />}>
          {t('externalServices')}
        </Menu.Item>
        <Menu.Item key="settings" icon={<SettingOutlined />}>
          {t('settings')}
        </Menu.Item>
        <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
          {t('logout')}
        </Menu.Item>
      </Menu>
    </Sider>
  );
};

export default DashboardSidebar;