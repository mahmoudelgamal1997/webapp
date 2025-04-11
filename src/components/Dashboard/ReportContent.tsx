// src/components/Dashboard/ReportContent.tsx
import React from 'react';
import { Layout, Typography } from 'antd';
import Report from '../Report';

const { Content } = Layout;
const { Title } = Typography;

interface ReportContentProps {
  // Can add additional props as needed for customization
}

const ReportContent: React.FC<ReportContentProps> = () => {
  return (
    <Content style={{ margin: '24px 16px', padding: 24, background: 'white' }}>
      <Title level={3}>Report Center</Title>
      <Report />
    </Content>
  );
};

export default ReportContent;