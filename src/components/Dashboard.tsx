// import React, { useState, useEffect } from 'react';
// import { 
//   Layout, 
//   Menu, 
//   Input, 
//   Table, 
//   Card, 
//   Typography, 
//   Button, 
//   Form, 
//   Modal, 
//   message,
//   Space,
//   Tag,
//   Divider,
//   Row,
//   Col,
//   Empty,
//   DatePicker
// } from 'antd';
// import { 
//   MenuUnfoldOutlined, 
//   MenuFoldOutlined, 
//   UserOutlined,
//   LogoutOutlined,
//   PlusOutlined,
//   FileTextOutlined,
//   PrinterOutlined,
//   CalendarOutlined,
//   FilterOutlined
// } from '@ant-design/icons';
// import axios from 'axios';
// import { useNavigate } from 'react-router-dom';
// import { useAuth } from './AuthContext';
// import ReceiptModal from '../components/ReceiptPatient';
// import moment from 'moment';
// import dayjs from 'dayjs';
// import type { Dayjs } from 'dayjs';
// import { SortOrder } from 'antd/lib/table/interface';

// const { Header, Sider, Content } = Layout;
// const { Title, Text } = Typography;
// const { RangePicker } = DatePicker;

// // Drug interface
// interface Drug {
//   _id: string;
//   drug: string;
//   frequency: string;
//   period: string;
//   timing: string;
// }

// // Receipt interface
// interface Receipt {
//   _id: string;
//   drugModel: string;
//   drugs: Drug[];
//   notes: string;
//   date: string;
// }

// // Patient interface with receipts array
// interface Patient {
//   id: string;
//   _id: string;
//   patient_name: string;
//   email: string;
//   patient_phone: string;
//   address: string;
//   age: string;
//   date: string;
//   receipt?: string;
//   receipts?: Receipt[];
//   doctor_id?: string;
// }

// const Dashboard: React.FC = () => {
//   const [collapsed, setCollapsed] = useState<boolean>(false);
//   const [patients, setPatients] = useState<Patient[]>([]);
//   const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
//   const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
//   const [searchTerm, setSearchTerm] = useState<string>('');
//   const [isReceiptModalVisible, setIsReceiptModalVisible] = useState<boolean>(false);
//   const [receiptForm] = Form.useForm();
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
//   const [isViewReceiptModalVisible, setIsViewReceiptModalVisible] = useState<boolean>(false);
//   const [forceRender, setForceRender] = useState<number>(0);
//   const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
//   const [isDateFilterVisible, setIsDateFilterVisible] = useState<boolean>(false);

//   const navigate = useNavigate();
//   const { username, logout } = useAuth();
//   const userId = localStorage.getItem('doctorId'); // Get doctor ID from localStorage

//   // Sort function to sort by date (newest first) and then by _id for same dates
//   const sortByLatestDate = (data: Patient[]) => {
//     return [...data].sort((a: Patient, b: Patient) => {
//       // Handle missing dates
//       if (!a.date) return 1;
//       if (!b.date) return -1;
      
//       const dateA = new Date(a.date).getTime();
//       const dateB = new Date(b.date).getTime();
      
//       // If dates are different, sort by date
//       if (dateA !== dateB) {
//         return dateB - dateA;
//       }
      
//       // If dates are the same, sort by _id to put newest first
//       if (a._id && b._id) {
//         return b._id.localeCompare(a._id);
//       }
      
//       return 0;
//     });
//   };

//   // Fetch patients from API
//   const fetchPatients = async () => {
//     try {
//       // Use the doctor-specific endpoint if userId is available
//       let endpoint = 'http://localhost:7000/api/patients';
//       if (userId) {
//         endpoint = `http://localhost:7000/api/patients/doctor/${userId}`;
//       }
      
//       const response = await axios.get(endpoint);
//       const updatedPatients = response.data;
      
//       // Always sort by date (newest first)
//       const sortedPatients = sortByLatestDate(updatedPatients);
      
//       setPatients(sortedPatients);
//       setFilteredPatients(sortedPatients);
      
//       // If there's a selected patient, update it with fresh data
//       if (selectedPatient) {
//         const freshPatient = updatedPatients.find((p: Patient) => p._id === selectedPatient._id);
//         if (freshPatient) {
//           // Sort receipts with the newest first if they exist
//           if (freshPatient.receipts && freshPatient.receipts.length > 0) {
//             freshPatient.receipts = [...freshPatient.receipts].sort((a: Receipt, b: Receipt) => 
//               new Date(b.date).getTime() - new Date(a.date).getTime()
//             );
//           }
//           setSelectedPatient(freshPatient);
//         }
//       }
      
//       // Force re-render of the table to maintain sort order
//       setForceRender(prev => prev + 1);
      
//       return sortedPatients;
//     } catch (error) {
//       console.error('Error fetching patients', error);
//       message.error('Failed to fetch patients');
//       return [];
//     }
//   };

//   // Initial fetch and search effect with interval to maintain sort
//   useEffect(() => {
//     fetchPatients();
    
//     // Set up interval to re-sort data every few seconds
//     const sortInterval = setInterval(() => {
//       if (patients.length > 0 && !selectedPatient) {
//         setPatients(prev => sortByLatestDate([...prev]));
//         setFilteredPatients(prev => sortByLatestDate([...prev]));
//       }
//     }, 2000);
    
//     return () => clearInterval(sortInterval);
//   }, []); // No need for userId dependency anymore since we check it in fetchPatients
  
//   // Apply all filters: search term and date range
//   const applyFilters = () => {
//     let filtered = [...patients];
    
//     // Apply search filter
//     if (searchTerm.trim()) {
//       filtered = filtered.filter(patient => 
//         patient.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         patient.patient_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         patient.address?.toLowerCase().includes(searchTerm.toLowerCase()) 
//       );
//     }
    
//     // Apply date filter
//     if (dateRange[0] && dateRange[1]) {
//       filtered = filtered.filter(patient => {
//         if (!patient.date) return false;
        
//         const patientDate = dayjs(patient.date);
//         const startDate = dateRange[0]?.startOf('day');
//         const endDate = dateRange[1]?.endOf('day');
        
//         return (patientDate.isAfter(startDate) || patientDate.isSame(startDate)) && 
//                (patientDate.isBefore(endDate) || patientDate.isSame(endDate));
//       });
//     }
    
//     // Maintain the sort for filtered results
//     setFilteredPatients(sortByLatestDate(filtered));
//   };
  
//   // Apply filters whenever search term or date range changes
//   useEffect(() => {
//     applyFilters();
//   }, [searchTerm, dateRange, patients]);
  
//   // Sort receipts by date (newest first) when selected patient changes
//   useEffect(() => {
//     if (selectedPatient && selectedPatient.receipts && selectedPatient.receipts.length > 0) {
//       const sortedReceipts = [...selectedPatient.receipts].sort((a: Receipt, b: Receipt) => 
//         new Date(b.date).getTime() - new Date(a.date).getTime()
//       );
//       setSelectedPatient({
//         ...selectedPatient,
//         receipts: sortedReceipts
//       });
//     }
//   }, [selectedPatient?._id]);

//   // Handle date range change
//   const handleDateRangeChange = (dates: any) => {
//     setDateRange(dates);
//   };
  
//   // Clear all filters
//   const clearFilters = () => {
//     setSearchTerm('');
//     setDateRange([null, null]);
//     setFilteredPatients(sortByLatestDate([...patients]));
//   };

//   // Handle logout
//   const handleLogout = () => {
//     logout();
//     navigate('/login');
//   };

//   // View receipt details
//   const handleViewReceipt = (receipt: Receipt) => {
//     setSelectedReceipt(receipt);
//     setIsViewReceiptModalVisible(true);
//   };

//   // Print receipt
//   const handlePrintReceipt = (receipt: Receipt) => {
//     // Implement print functionality here
//     message.info('Printing receipt...');
//     // You could open a new window with formatted receipt for printing
//     const printWindow = window.open('', '_blank');
//     if (printWindow) {
//       printWindow.document.write(`
//         <html>
//           <head>
//             <title>Patient Receipt</title>
//             <style>
//               body { font-family: Arial, sans-serif; direction: rtl; }
//               .receipt { padding: 20px; }
//               .header { text-align: center; margin-bottom: 20px; }
//               .drug-item { margin-bottom: 10px; }
//               .notes { margin-top: 20px; }
//             </style>
//           </head>
//           <body>
//             <div class="receipt">
//               <div class="header">
//                 <h2>روشتة طبية</h2>
//                 <h3>${selectedPatient?.patient_name}</h3>
//                 <p>تاريخ: ${moment(receipt.date).format('YYYY-MM-DD')}</p>
//               </div>
//               <div class="drugs">
//                 <h4>الأدوية:</h4>
//                 ${receipt.drugs.map(drug => `
//                   <div class="drug-item">
//                     <p>الدواء: ${drug.drug} | التكرار: ${drug.frequency} | المدة: ${drug.period} | التوقيت: ${drug.timing}</p>
//                   </div>
//                 `).join('')}
//               </div>
//               ${receipt.notes ? `
//                 <div class="notes">
//                   <h4>ملاحظات:</h4>
//                   <p>${receipt.notes}</p>
//                 </div>
//               ` : ''}
//             </div>
//           </body>
//         </html>
//       `);
//       printWindow.document.close();
//       printWindow.print();
//     }
//   };

//   // Updated Patient table columns to show name, date, age
//   const columns = [
//     {
//       title: 'Name',
//       dataIndex: 'patient_name',
//       key: 'name',
//     },
//     {
//       title: 'Date',
//       dataIndex: 'date',
//       key: 'date',
//       render: (text: string) => (
//         <span>{text ? moment(text).format('YYYY-MM-DD') : 'N/A'}</span>
//       ),
//       sorter: (a: Patient, b: Patient) => {
//         if (!a.date) return 1;
//         if (!b.date) return -1;
        
//         const dateA = new Date(a.date).getTime();
//         const dateB = new Date(b.date).getTime();
        
//         // If dates are different, sort by date
//         if (dateA !== dateB) {
//           return dateB - dateA;
//         }
        
//         // If dates are the same, sort by _id
//         if (a._id && b._id) {
//           return b._id.localeCompare(a._id);
//         }
        
//         return 0;
//       },
//       defaultSortOrder: 'ascend' as SortOrder,
//       sortDirections: ['ascend', 'ascend'] as SortOrder[]
//     },
//     {
//       title: 'Address',
//       dataIndex: 'address',
//       key: 'address',
//     },
//     {
//       title: 'Age',
//       dataIndex: 'age',
//       key: 'age',
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (text: string, record: Patient) => (
//         <a onClick={() => setSelectedPatient(record)}>View Details</a>
//       ),
//     }
//   ];

//   // Receipt table columns
//   const receiptColumns = [
//     {
//       title: 'Date',
//       key: 'date',
//       render: (text: string, record: Receipt) => (
//         <span>{moment(record.date).format('YYYY-MM-DD')}</span>
//       ),
//     },
//     {
//       title: 'Drugs',
//       key: 'drugs',
//       render: (text: string, record: Receipt) => (
//         <span>{record.drugs.length} medications</span>
//       ),
//     },
//     {
//       title: 'Notes',
//       key: 'notes',
//       ellipsis: true,
//       render: (text: string, record: Receipt) => (
//         <span>{record.notes || 'No notes'}</span>
//       ),
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (text: string, record: Receipt) => (
//         <Space size="small">
//           <Button type="link" onClick={() => handleViewReceipt(record)}>View</Button>
//           <Button 
//             type="link" 
//             icon={<PrinterOutlined />} 
//             onClick={() => handlePrintReceipt(record)}
//           >
//             Print
//           </Button>
//         </Space>
//       ),
//     }
//   ];

//   return (
//     <Layout style={{ minHeight: '100vh' }}>
//       <Sider 
//         collapsible 
//         collapsed={collapsed} 
//         onCollapse={(value) => setCollapsed(value)}
//         trigger={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
//       >
//         <div 
//           className="logo" 
//           style={{ 
//             height: '32px', 
//             background: 'rgba(255, 255, 255, 0.2)', 
//             margin: '16px',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: collapsed ? 'center' : 'flex-start',
//             paddingLeft: collapsed ? 0 : '10px',
//           }}
//         >
//           <UserOutlined style={{ color: 'white', marginRight: collapsed ? 0 : '10px' }} />
//           {!collapsed && (
//             <span style={{ color: 'white', whiteSpace: 'nowrap', overflow: 'hidden' }}>
//               {username || 'User'}
//             </span>
//           )}
//         </div>
//         <Menu theme="dark" mode="inline" defaultSelectedKeys={['patients']}>
//           <Menu.Item key="patients" icon={<UserOutlined />}>
//             Patients
//           </Menu.Item>
//           <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
//             Logout
//           </Menu.Item>
//         </Menu>
//       </Sider>
      
//       <Layout>
//         <Header style={{ 
//           padding: 0, 
//           background: 'white', 
//           display: 'flex', 
//           justifyContent: 'flex-end', 
//           alignItems: 'center' 
//         }}>
//           <Button 
//             type="text" 
//             icon={<LogoutOutlined />} 
//             onClick={handleLogout}
//             style={{ marginRight: '16px' }}
//           >
//             Logout
//           </Button>
//         </Header>
        
//         <Content style={{ margin: '24px 16px', padding: 24, background: 'white' }}>
//           {!selectedPatient ? (
//             <>
//               <Row gutter={[16, 16]} align="middle">
//                 <Col xs={24} md={8}>
//                   <Input.Search 
//                     placeholder="Search patients by name, email, phone, or city" 
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     allowClear
//                   />
//                 </Col>
//                 <Col xs={24} md={13}>
//                   <Space>
//                     <Button 
//                       type={isDateFilterVisible ? "primary" : "default"}
//                       icon={<CalendarOutlined />} 
//                       onClick={() => setIsDateFilterVisible(!isDateFilterVisible)}
//                     >
//                       Date Filter
//                     </Button>
                    
//                     {isDateFilterVisible && (
//                       <RangePicker 
//                         onChange={handleDateRangeChange}
//                         value={dateRange}
//                         allowClear
//                       />
//                     )}
                    
//                     {(searchTerm || dateRange[0] || dateRange[1]) && (
//                       <Button onClick={clearFilters}>Clear Filters</Button>
//                     )}
//                   </Space>
//                 </Col>
//                 <Col xs={24} md={3} style={{ textAlign: 'right' }}>
//                   <Text type="secondary">
//                     {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
//                   </Text>
//                 </Col>
//               </Row>
              
//               {dateRange[0] && dateRange[1] && (
//                 <div style={{ marginTop: 8, marginBottom: 8 }}>
//                   <Tag color="blue">
//                     <CalendarOutlined /> Date range: {dateRange[0].format('YYYY-MM-DD')} to {dateRange[1].format('YYYY-MM-DD')}
//                   </Tag>
//                 </div>
//               )}
              
//               <Table 
//                 columns={columns} 
//                 dataSource={filteredPatients}
//                 rowKey="_id"
//                 pagination={{ defaultPageSize: 10 }}
//                 onChange={() => {
//                   // After any table interaction, restore sorting after a brief delay
//                   setTimeout(() => {
//                     setFilteredPatients(sortByLatestDate([...filteredPatients]));
//                   }, 100);
//                 }}
//                 style={{ marginTop: 16 }}
//               />
//             </>
//           ) : (
//             <>
//               <Card 
//                 title={
//                   <Row justify="space-between" align="middle">
//                     <Col><span>Patient Details: {selectedPatient.patient_name}</span></Col>
//                     <Col>
//                       <Button 
//                         type="primary" 
//                         icon={<PlusOutlined />} 
//                         onClick={() => setIsReceiptModalVisible(true)}
//                       >
//                         Add Receipt
//                       </Button>
//                     </Col>
//                   </Row>
//                 }
//                 extra={<a onClick={() => setSelectedPatient(null)}>Back to List</a>}
//               >
//                 <Title level={4}>Personal Information</Title>
//                 <Row gutter={[16, 8]}>
//                   <Col span={8}><Text strong>Name: </Text><Text>{selectedPatient.patient_name}</Text></Col>
//                   <Col span={8}><Text strong>Date: </Text><Text>{selectedPatient.date ? moment(selectedPatient.date).format('YYYY-MM-DD') : 'N/A'}</Text></Col>
//                   <Col span={8}><Text strong>Age: </Text><Text>{selectedPatient.age}</Text></Col>
//                 </Row>
                
//                 <Title level={4} style={{ marginTop: '16px' }}>Address</Title>
//                 <Row gutter={[16, 8]}>
//                   <Col span={24}><Text strong>City: </Text><Text>{selectedPatient.address}</Text></Col>
//                 </Row>
                
//                 <Divider />
                
//                 <Title level={4}>Receipts History</Title>
//                 {selectedPatient.receipts && selectedPatient.receipts.length > 0 ? (
//                   <Table 
//                     columns={receiptColumns} 
//                     dataSource={selectedPatient.receipts}
//                     rowKey="_id"
//                     pagination={false}
//                   />
//                 ) : (
//                   <Empty 
//                     description="No receipts available" 
//                     image={Empty.PRESENTED_IMAGE_SIMPLE} 
//                   />
//                 )}
//               </Card>
//             </>
//           )}
//         </Content>
//       </Layout>

//       {/* Receipt Modal for adding new receipt */}
//       <ReceiptModal
//         visible={isReceiptModalVisible}
//         onCancel={() => setIsReceiptModalVisible(false)}
//         patient={selectedPatient}
//         onReceiptAdded={async () => {
//           // First close the modal
//           setIsReceiptModalVisible(false);
          
//           // Show loading message
//           const loadingMsg = message.loading('Refreshing data...', 0);
          
//           // Perform multiple refresh attempts to ensure we get the latest data
//           try {
//             // Wait a moment before first attempt
//             await new Promise(resolve => setTimeout(resolve, 500));
//             await fetchPatients();
            
//             // Try again after a short delay to be extra sure
//             await new Promise(resolve => setTimeout(resolve, 1000));
//             await fetchPatients();
            
//             // Force sorting after adding receipt
//             setFilteredPatients(sortByLatestDate([...patients]));
//           } catch (err) {
//             console.error('Error refreshing data:', err);
//           } finally {
//             // Close loading message
//             loadingMsg();
//           }
//         }}
//       />
      
//       {/* Modal for viewing receipt details */}
//       <Modal
//         title="Receipt Details"
//         visible={isViewReceiptModalVisible}
//         onCancel={() => {
//           setIsViewReceiptModalVisible(false);
//           setSelectedReceipt(null);
//         }}
//         footer={[
//           <Button 
//             key="print" 
//             type="primary" 
//             icon={<PrinterOutlined />} 
//             onClick={() => selectedReceipt && handlePrintReceipt(selectedReceipt)}
//           >
//             Print Receipt
//           </Button>,
//           <Button 
//             key="close" 
//             onClick={() => {
//               setIsViewReceiptModalVisible(false);
//               setSelectedReceipt(null);
//             }}
//           >
//             Close
//           </Button>
//         ]}
//         width={700}
//         style={{ direction: 'rtl', textAlign: 'right' }}
//       >
//         {selectedReceipt && (
//           <div>
//             <Title level={5}>Date: {moment(selectedReceipt.date).format('YYYY-MM-DD')}</Title>
            
//             <Title level={5} style={{ marginTop: '16px' }}>Medications:</Title>
//             {selectedReceipt.drugs.map((drug, index) => (
//               <Card key={drug._id || index} size="small" style={{ marginBottom: '8px' }}>
//                 <Row gutter={[16, 8]}>
//                   <Col span={24}><Text strong>Drug: </Text><Text>{drug.drug}</Text></Col>
//                   <Col span={8}><Text strong>Frequency: </Text><Text>{drug.frequency}</Text></Col>
//                   <Col span={8}><Text strong>Period: </Text><Text>{drug.period}</Text></Col>
//                   <Col span={8}><Text strong>Timing: </Text><Text>{drug.timing}</Text></Col>
//                 </Row>
//               </Card>
//             ))}
            
//             {selectedReceipt.notes && (
//               <>
//                 <Title level={5} style={{ marginTop: '16px' }}>Notes:</Title>
//                 <Text>{selectedReceipt.notes}</Text>
//               </>
//             )}
//           </div>
//         )}
//       </Modal>
//     </Layout>
//   );
// };

// export default Dashboard;





// Dashboard.tsx
import React, { useState } from 'react';
import { Layout } from 'antd';
import moment from 'moment';
import { Receipt } from '../components/type';
import { PatientProvider, usePatientContext } from './PatientContext';
import Sidebar from './Sidebar';
import PageHeader from './PageHeader';
import PatientsList from './PatientsList';
import PatientDetail from './PatientDetail';
import ReceiptDetail from '../components/ReceiptDetails';
import ReceiptModalWrapper from './ReceiptModalWrapper';

const { Content } = Layout;

const DashboardContent: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState<boolean>(false);
  const { selectedPatient, setSelectedPatient } = usePatientContext();
  
  // Create a custom handler for returning to patient list
  const handleBackToList = () => {
    // Use a more direct approach to return to list
    console.log("Returning to patient list");
    
    // Immediately set selected patient to null
    setSelectedPatient(null);
    
    // Force a re-render after state update
    setTimeout(() => {
      if (selectedPatient) {
        console.log("Forcing null selection");
        setSelectedPatient(null);
      }
    }, 0);
  };

  // Print receipt
  const handlePrintReceipt = (receipt: Receipt) => {
    if (!selectedPatient) return;
    
    // Implement print functionality
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Patient Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; direction: rtl; }
              .receipt { padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .drug-item { margin-bottom: 10px; }
              .notes { margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <h2>روشتة طبية</h2>
                <h3>${selectedPatient.patient_name}</h3>
                <p>تاريخ: ${moment(receipt.date).format('YYYY-MM-DD')}</p>
              </div>
              <div class="drugs">
                <h4>الأدوية:</h4>
                ${receipt.drugs.map(drug => `
                  <div class="drug-item">
                    <p>الدواء: ${drug.drug} | التكرار: ${drug.frequency} | المدة: ${drug.period} | التوقيت: ${drug.timing}</p>
                  </div>
                `).join('')}
              </div>
              ${receipt.notes ? `
                <div class="notes">
                  <h4>ملاحظات:</h4>
                  <p>${receipt.notes}</p>
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <Layout>
        <PageHeader />
        
        <Content style={{ margin: '24px 16px', padding: 24, background: 'white' }}>
          {!selectedPatient ? (
            <PatientsList />
          ) : (
            <PatientDetail 
              isReceiptModalVisible={isReceiptModalVisible}
              setIsReceiptModalVisible={setIsReceiptModalVisible}
              onPrintReceipt={handlePrintReceipt}
              onBackToList={handleBackToList}
            />
          )}
        </Content>
      </Layout>

      {/* Receipt Modal for adding new receipt */}
      <ReceiptModalWrapper
        visible={isReceiptModalVisible}
        onCancel={() => setIsReceiptModalVisible(false)}
      />
      
      {/* Modal for viewing receipt details */}
      <ReceiptDetail onPrintReceipt={handlePrintReceipt} />
    </Layout>
  );
};

// Dashboard component wrapped with PatientProvider
const Dashboard: React.FC = () => {
  return (
    <PatientProvider>
      <DashboardContent />
    </PatientProvider>
  );
};

export default Dashboard;