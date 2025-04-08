// src/pages/WaitingListPage.tsx
import React from 'react';
import { Layout, Typography, Button } from 'antd';
import WaitingList from '../components/WaitingList';
import { WaitingListProvider } from '../components/WaitingListContext';

const { Content } = Layout;
const { Title } = Typography;

const WaitingListPage: React.FC = () => {
  return (
    <WaitingListProvider>
      <Layout style={{ padding: '0 24px 24px' }}>
        <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center' }}>
          <Button 
            type="link" 
            onClick={() => window.history.back()}
            style={{ marginRight: '8px' }}
          >
            ← Back
          </Button>
          <Title level={2} style={{ margin: 0 }}>Waiting List</Title>
          <span style={{ marginLeft: '12px', color: 'rgba(0, 0, 0, 0.45)' }}>
            Manage patients currently waiting
          </span>
        </div>
        <Content
          className="site-layout-background"
          style={{
            padding: 24,
            margin: 0,
            minHeight: 280,
          }}
        >
          <WaitingList />
        </Content>
      </Layout>
    </WaitingListProvider>
  );
};

export default WaitingListPage;