// src/components/SidebarWaitingList.tsx
import React, { useState, useEffect } from 'react';
import { List, Card, Tag, Typography, Spin, Empty, Badge, Button, Tooltip } from 'antd';
import { UserOutlined, ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import dayjs from 'dayjs';
import { useClinicContext } from './ClinicContext';

const { Text } = Typography;

interface WaitingPatient {
  patient_id: string;
  patient_name: string;
  arrivalTime?: any;
  status?: 'waiting' | 'in-progress' | 'completed';
  position?: number;
  doctor_id?: string;
  visit_type?: string;
}

const SidebarWaitingList: React.FC = () => {
  const [waitingPatients, setWaitingPatients] = useState<WaitingPatient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { selectedClinicId } = useClinicContext();
  const doctorId = localStorage.getItem('doctorId');

  // Function to get the current date in the format 'YYYY-M-D'
  const getCurrentDate = () => {
    return dayjs().format('YYYY-M-D');
  };

  // Function to process patient data from snapshot
 // Updated loadData function to match your Firestore structure
const loadData = (snapshot: any) => {
  const patients: WaitingPatient[] = [];
  
  snapshot.forEach((doc: any) => {
    const data = doc.data();
    console.log('Patient doc:', doc.id, 'data:', data);
    
    // Create combined timestamp from date and time fields
    const arrivalTime = data.date && data.time 
      ? `${data.date} ${data.time}` 
      : data.arrivalTime; // Fallback to arrivalTime if exists
    
    patients.push({
      patient_id: doc.id,
      patient_name: data.patient_name || 'Unknown Patient',
      arrivalTime: arrivalTime, // Now handles both date+time and arrivalTime
      status: data.status || 'waiting',
      position: data.position || 0,
      doctor_id: data.doctor_id,
      visit_type: data.visit_type || '',
    });
  });
  
  // Updated sorting logic
  patients.sort((a, b) => {
    // First sort by position if available
    if (a.position !== undefined && b.position !== undefined) {
      return a.position - b.position;
    }
    
    // Then sort by combined date+time
    const timeA = a.arrivalTime ? dayjs(a.arrivalTime).valueOf() : 0;
    const timeB = b.arrivalTime ? dayjs(b.arrivalTime).valueOf() : 0;
    return timeA - timeB;
  });
  
  setWaitingPatients(patients);
  setLoading(false);
};

// Updated formatTime function to handle combined date+time
const formatTime = (timestamp: any) => {
  if (!timestamp) return '';
  
  try {
    // Handle combined "YYYY-M-D HH:mm" format
    if (typeof timestamp === 'string' && timestamp.includes(' ')) {
      return dayjs(timestamp, 'YYYY-M-D HH:mm').format('HH:mm');
    }
    // Handle Firebase timestamp objects
    if (typeof timestamp === 'object' && timestamp.toDate) {
      return dayjs(timestamp.toDate()).format('HH:mm');
    }
    // Handle ISO strings or other formats
    return dayjs(timestamp).format('HH:mm');
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
};
  // Set up listener when selectedClinicId changes
  useEffect(() => {
    if (!selectedClinicId || !doctorId) return;
    
    setLoading(true);
    const db = getFirestore();
    const currentDate = getCurrentDate();
    
    console.log('Fetching waiting list for clinic:', selectedClinicId, 'doctor:', doctorId, 'date:', currentDate);
    console.log('Full Firestore Path:', `clinics/${selectedClinicId}/waiting_list/${currentDate}/patients`);

    // Create reference to the patients collection
    const waitingListRef = collection(
      db, 
      'clinics', 
      selectedClinicId, 
      'waiting_list', 
      currentDate, 
      'patients'
    );
    console.log('doctorId:', doctorId);

    // Create a query where doctor_id equals the current doctor's ID
    const doctorPatientsQuery = query(waitingListRef);
    
    // First get initial data
    getDocs(doctorPatientsQuery).then((querySnapshot) => {
      console.log(`Initial fetch found ${querySnapshot.size} patients`);
      loadData(querySnapshot);
    }).catch((error) => {
      console.error('Error fetching initial data:', error);
      setLoading(false);
    });
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(doctorPatientsQuery, (snapshot) => {
      console.log(`Real-time update found ${snapshot.size} patients`);
      loadData(snapshot);
    }, (error) => {
      console.error('Error in real-time listener:', error);
      setLoading(false);
    });
    
    // Clean up the listener when the component unmounts or when selectedClinicId changes
    return () => unsubscribe();
  }, [selectedClinicId, doctorId]);

  const handleRefresh = () => {
    // Just trigger a re-render by changing a state value
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'كشف':
        return <Tag color="blue">كشف</Tag>;
      case 'إعادة كشف':
        return <Tag color="orange">إعادة كشف</Tag>;
      case 'أخرى':
        return <Tag color="green">أخرى</Tag>;
      default:
        return <Tag>Unknown</Tag>;
    }
  };

  // Count patients by status
  const waitingCount = waitingPatients.filter(p => p.status === 'waiting').length;
  const inProgressCount = waitingPatients.filter(p => p.status === 'in-progress').length;

  if (!selectedClinicId) {
    return null;
  }

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Waiting List</span>
          <Button 
            type="text" 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh} 
            loading={loading}
            size="small"
          />
        </div>
      }
      style={{ 
        width: '100%',
        height: '100%', 
        overflowY: 'auto',
        direction: 'rtl' 
      }}
      bodyStyle={{ padding: '0' }}
      bordered
    >
      
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : waitingPatients.length > 0 ? (
        <List
          dataSource={waitingPatients}
          renderItem={(patient, index) => (
            <List.Item
              style={{ 
                padding: '8px 12px',
                backgroundColor: patient.status === 'in-progress' ? '#fff7e6' : 'transparent',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                <div style={{ marginLeft: '12px', flexShrink: 0 }}>
                  <Badge count={index + 1} style={{ backgroundColor: '#1890ff' }}>
                    <UserOutlined style={{ fontSize: '18px', padding: '4px' }} />
                  </Badge>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {patient.patient_name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatTime(patient.arrivalTime)}
                    </Text>
                    {getStatusTag(patient.visit_type ?? '')}
                  </div>
                </div>
              </div>
            </List.Item>
          )}
        />
      ) : (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          description="No patients in waiting list"
          style={{ padding: '20px' }}
        />
      )}
    </Card>
  );
};

export default SidebarWaitingList;