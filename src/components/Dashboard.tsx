// Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, Button, Table, Tag, Space, Divider, Menu, Row, Col, Modal, Input } from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined, 
  MenuUnfoldOutlined, 
  MenuFoldOutlined, 
  PlusOutlined, 
  SettingOutlined,
  PrinterOutlined,
  SearchOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { usePatientContext } from './PatientContext';
import { useDoctorContext } from './DoctorContext';
import moment from 'moment';
import { Patient, Receipt } from './type';
import ReceiptModal from './ReceiptPatient';
import SearchFilters from './SearchFilters';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState<boolean>(false);
  const navigate = useNavigate();
  const { username, logout } = useAuth();
  
  // Get data from patient context
  const { 
    patients, 
    filteredPatients, 
    selectedPatient, 
    setSelectedPatient,
    fetchPatients,
    setSelectedReceipt,
    setIsViewReceiptModalVisible,
    setSearchTerm
  } = usePatientContext();
  
  // Get doctor settings for receipt customization
  const { settings: doctorSettings, fetchSettings } = useDoctorContext();

  // Log when dashboard renders and fetch settings
  useEffect(() => {
    console.log('Dashboard rendering with', patients.length, 'patients');
    console.log('Patients data:', patients);
    
    // Fetch doctor settings on component mount
    fetchSettings();
  }, [patients, fetchSettings]);

  // Manual refresh function
  const handleRefresh = () => {
    console.log('Manual refresh requested');
    fetchPatients();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigate to settings page
  const handleSettingsClick = () => {
    navigate('/settings');
  };

  // Handle print receipt with dynamic header
  const handlePrintReceipt = (receipt: Receipt) => {
    console.log('Printing receipt:', receipt);
    
    // Format the clinic information for the header
    const clinicInfo = [];
    if (doctorSettings.clinicName) clinicInfo.push(`<h1>${doctorSettings.clinicName}</h1>`);
    if (doctorSettings.doctorTitle) clinicInfo.push(`<h3>${doctorSettings.doctorTitle}</h3>`);
    if (doctorSettings.clinicAddress) clinicInfo.push(`<p>${doctorSettings.clinicAddress}</p>`);
    if (doctorSettings.clinicPhone) clinicInfo.push(`<p>هاتف: ${doctorSettings.clinicPhone}</p>`);
    
    // Implement print functionality here
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Patient Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; direction: rtl; }
              .receipt { padding: 20px; max-width: 800px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 15px; }
              .clinic-info { margin-bottom: 15px; }
              .patient-info { margin-bottom: 20px; padding: 10px; background-color: #f8f8f8; border-radius: 5px; }
              .drug-item { margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 5px; }
              .notes { margin-top: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }
              .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 15px; text-align: center; font-style: italic; }
              h1, h2, h3 { margin: 5px 0; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <div class="clinic-info">
                  ${clinicInfo.length > 0 ? clinicInfo.join('') : '<h2>روشتة طبية</h2>'}
                </div>
                ${doctorSettings.receiptHeader ? `<div class="custom-header">${doctorSettings.receiptHeader}</div>` : ''}
              </div>
              
              <div class="patient-info">
                <h3>اسم المريض: ${selectedPatient?.patient_name}</h3>
                <p>العمر: ${selectedPatient?.age}</p>
                <p>تاريخ: ${moment(receipt.date).format('YYYY-MM-DD')}</p>
              </div>
              
              <div class="drugs">
                <h3>الأدوية:</h3>
                ${receipt.drugs.map((drug, index) => `
                  <div class="drug-item">
                    <h4>${index + 1}. ${drug.drug}</h4>
                    <p>التكرار: ${drug.frequency} | المدة: ${drug.period} | التوقيت: ${drug.timing}</p>
                  </div>
                `).join('')}
              </div>
              
              ${receipt.notes ? `
                <div class="notes">
                  <h3>ملاحظات:</h3>
                  <p>${receipt.notes}</p>
                </div>
              ` : ''}
              
              ${doctorSettings.receiptFooter ? `
                <div class="footer">
                  ${doctorSettings.receiptFooter}
                </div>
              ` : ''}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Define columns for the simple table
  const columns = [
    {
      title: 'Name',
      dataIndex: 'patient_name',
      key: 'name',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text: string) => text ? moment(text).format('YYYY-MM-DD') : 'N/A',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Patient) => (
        <Button type="link" onClick={() => setSelectedPatient(record)}>
          View Details
        </Button>
      ),
    },
  ];

  // Receipt columns
  const receiptColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text: string) => moment(text).format('YYYY-MM-DD'),
    },
    {
      title: 'Drugs',
      key: 'drugs',
      render: (_: any, record: Receipt) => `${record.drugs?.length || 0} medications`,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
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
          <Menu.Item key="patients" icon={<UserOutlined />}>
            Patients
          </Menu.Item>
          <Menu.Item key="settings" icon={<SettingOutlined />} onClick={handleSettingsClick}>
            Receipt Settings
          </Menu.Item>
          <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
            Logout
          </Menu.Item>
        </Menu>
      </Sider>
      
      <Layout>
        <Header style={{ 
          padding: 0, 
          background: 'white', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center' 
        }}>
          <Space style={{ marginRight: '16px' }}>
            <Button 
              type="text" 
              icon={<SettingOutlined />} 
              onClick={handleSettingsClick}
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
        
        <Content style={{ margin: '24px 16px', padding: 24, background: 'white' }}>
          {/* Debug info */}
          <Card style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={4}>Patient Management Dashboard</Title>
              <Space>
                <Button type="primary" onClick={handleRefresh}>
                  Refresh Data
                </Button>
                <Button onClick={handleSettingsClick} icon={<SettingOutlined />}>
                  Receipt Settings
                </Button>
              </Space>
            </Space>
          </Card>

          {/* Patient data section */}
          {!selectedPatient ? (
            <Card title="Patients List">
              {/* Add SearchFilters component here */}
              <SearchFilters />
              
              <Table 
                columns={columns}
                dataSource={filteredPatients}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
                loading={filteredPatients.length === 0}
              />
            </Card>
          ) : (
            <Card 
              title={`Patient Details: ${selectedPatient.patient_name}`}
              extra={
                <Space>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={() => setIsReceiptModalVisible(true)}
                  >
                    Add Receipt
                  </Button>
                  <Button type="link" onClick={() => setSelectedPatient(null)}>Back to List</Button>
                </Space>
              }
            >
              <Divider>Personal Information</Divider>
              <p><strong>Name:</strong> {selectedPatient.patient_name}</p>
              <p><strong>Age:</strong> {selectedPatient.age}</p>
              <p><strong>Address:</strong> {selectedPatient.address}</p>
              <p><strong>Date:</strong> {selectedPatient.date ? moment(selectedPatient.date).format('YYYY-MM-DD') : 'N/A'}</p>
              
              {selectedPatient.receipts && selectedPatient.receipts.length > 0 ? (
                <>
                  <Divider>Receipts</Divider>
                  <Table 
                    dataSource={selectedPatient.receipts}
                    rowKey="_id"
                    columns={receiptColumns}
                    pagination={false}
                    onRow={(record) => ({
                      onClick: () => {
                        // Show receipt details when a row is clicked
                        setSelectedReceipt(record);
                        setIsViewReceiptModalVisible(true);
                      },
                      style: { cursor: 'pointer' }
                    })}
                  />
                </>
              ) : (
                <p>No receipts available</p>
              )}
            </Card>
          )}
        </Content>
      </Layout>

      {/* Receipt Modal for adding new receipt */}
      {isReceiptModalVisible && (
        <ReceiptModalWrapper
          visible={isReceiptModalVisible}
          onCancel={() => setIsReceiptModalVisible(false)}
        />
      )}

      {/* Modal for viewing receipt details */}
      <ReceiptDetail onPrintReceipt={handlePrintReceipt} />
    </Layout>
  );
};

// These are the components you need to import at the top of your file
// or define in separate files

interface ReceiptModalWrapperProps {
  visible: boolean;
  onCancel: () => void;
}

const ReceiptModalWrapper: React.FC<ReceiptModalWrapperProps> = ({ visible, onCancel }) => {
  const { selectedPatient, fetchPatients } = usePatientContext();
  
  const handleReceiptAdded = async () => {
    onCancel();
    await fetchPatients();
  };

  return (
    <ReceiptModal
      visible={visible}
      onCancel={onCancel}
      patient={selectedPatient}
      onReceiptAdded={handleReceiptAdded}
    />
  );
};

interface ReceiptDetailProps {
  onPrintReceipt: (receipt: Receipt) => void;
}

const ReceiptDetail: React.FC<ReceiptDetailProps> = ({ onPrintReceipt }) => {
  const { 
    selectedReceipt, 
    setSelectedReceipt, 
    isViewReceiptModalVisible, 
    setIsViewReceiptModalVisible 
  } = usePatientContext();

  const handleClose = () => {
    setIsViewReceiptModalVisible(false);
    setSelectedReceipt(null);
  };
  
  return (
    <Modal
      title="Receipt Details"
      visible={isViewReceiptModalVisible}
      onCancel={handleClose}
      footer={[
        <Button 
          key="print" 
          type="primary" 
          icon={<PrinterOutlined />} 
          onClick={() => selectedReceipt && onPrintReceipt(selectedReceipt)}
        >
          Print Receipt
        </Button>,
        <Button 
          key="close" 
          onClick={handleClose}
        >
          Close
        </Button>
      ]}
      width={700}
      style={{ direction: 'rtl', textAlign: 'right' }}
    >
      {selectedReceipt && (
        <div>
          <Title level={5}>Date: {moment(selectedReceipt.date).format('YYYY-MM-DD')}</Title>
          
          <Title level={5} style={{ marginTop: '16px' }}>Medications:</Title>
          {selectedReceipt.drugs.map((drug, index) => (
            <Card key={drug._id || index} size="small" style={{ marginBottom: '8px' }}>
              <Row gutter={[16, 8]}>
                <Col span={24}><Text strong>Drug: </Text><Text>{drug.drug}</Text></Col>
                <Col span={8}><Text strong>Frequency: </Text><Text>{drug.frequency}</Text></Col>
                <Col span={8}><Text strong>Period: </Text></Col>
                <Col span={8}><Text strong>Period: </Text><Text>{drug.period}</Text></Col>
                <Col span={8}><Text strong>Timing: </Text><Text>{drug.timing}</Text></Col>
              </Row>
            </Card>
          ))}
          
          {selectedReceipt.notes && (
            <>
              <Title level={5} style={{ marginTop: '16px' }}>Notes:</Title>
              <Text>{selectedReceipt.notes}</Text>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};


export default Dashboard;