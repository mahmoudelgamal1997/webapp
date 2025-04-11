// src/components/SidebarWaitingList.tsx
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { List, Card, Tag, Typography, Spin, Empty, Badge, Button, Tooltip, message } from 'antd';
import { UserOutlined, ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { 
  getFirestore, 
  collection, 
  query, 
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  Unsubscribe,
  orderBy,
  where
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
  date?: string;
  time?: string;
}

interface SidebarWaitingListProps {
  refreshTrigger?: number; // Prop to trigger refresh from parent
}

const SidebarWaitingList = forwardRef<{ refreshData: () => Promise<void> }, SidebarWaitingListProps>(
  ({ refreshTrigger = 0 }, ref) => {
    const [waitingPatients, setWaitingPatients] = useState<WaitingPatient[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const { selectedClinicId } = useClinicContext();
    const doctorId = localStorage.getItem('doctorId');

    // Expose refresh method to parent via ref
    useImperativeHandle(ref, () => ({
      refreshData: fetchData
    }));

    // Function to format date as was previously working in your original code
    const formatDate = (date?: Date): string => {
      const d = date || new Date();
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    };

    // Function to process patient data from snapshot - using your original approach
    const loadData = (snapshot: any) => {
      const patients: WaitingPatient[] = [];
      
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        console.log('Patient doc:', doc.id, 'data:', data);
        
        patients.push({
          patient_id: data.patient_id || doc.id,
          patient_name: data.patient_name || 'Unknown Patient',
          arrivalTime: data.arrivalTime,
          status: data.status || 'WAITING',
          position: data.position || 0,
          doctor_id: data.doctor_id || doctorId,
          visit_type: data.visit_type || 'كشف',
          date: data.date,
          time: data.time
        });
      });
      
      // Sort by position
      patients.sort((a, b) => {
        if (a.position !== undefined && b.position !== undefined) {
          return a.position - b.position;
        }
        
        // Fallback to arrivalTime sort if no position
        const timeA = a.arrivalTime ? 
          (typeof a.arrivalTime.toDate === 'function' ? a.arrivalTime.toDate().getTime() : new Date(a.arrivalTime).getTime()) 
          : 0;
        const timeB = b.arrivalTime ? 
          (typeof b.arrivalTime.toDate === 'function' ? b.arrivalTime.toDate().getTime() : new Date(b.arrivalTime).getTime()) 
          : 0;
        return timeA - timeB;
      });
      
      console.log('Processed waiting patients:', patients);
      setWaitingPatients(patients);
      setLoading(false);
    };

    // Main function to fetch data - try multiple path variations to find the right one
    const fetchData = async () => {
      if (!selectedClinicId) {
        console.log('No clinic selected, cannot fetch waiting list');
        return;
      }
      
      setLoading(true);
      console.log('Fetching waiting list for clinic:', selectedClinicId);
      
      try {
        const db = getFirestore();
        const currentDate = formatDate();
        console.log('Current date formatted:', currentDate);
        
        // Try multiple path variations
        const pathVariations = [
          // Variation 1: Your most recently updated structure
          { 
            path: `clinics/${selectedClinicId}/waiting_list/${currentDate}/patients`,
            collFn: () => collection(db, 'clinics', selectedClinicId, 'waiting_list', currentDate, 'patients')
          },
          // Variation 2: Alternative collection name
          { 
            path: `clinics/${selectedClinicId}/waitingList/${currentDate}/patients`,
            collFn: () => collection(db, 'clinics', selectedClinicId, 'waitingList', currentDate, 'patients')
          },
          // Variation 3: From WaitingListContext.tsx - patients directly under clinic
          { 
            path: `clinics/${selectedClinicId}/patients`,
            collFn: () => {
              const patientsRef = collection(db, 'clinics', selectedClinicId, 'patients');
              // Filter to only waiting patients with status WAITING
              return query(patientsRef, where('status', '==', 'WAITING'));
            }
          }
        ];
        
        let querySnapshot = null;
        let pathUsed = '';
        
        // Try each path until one works
        for (const variation of pathVariations) {
          try {
            console.log('Trying path:', variation.path);
            const collRef = variation.collFn();
            const snapshot = await getDocs(collRef);
            
            console.log(`Found ${snapshot.size} documents at path: ${variation.path}`);
            
            if (snapshot.size > 0) {
              querySnapshot = snapshot;
              pathUsed = variation.path;
              break;
            }
          } catch (error) {
            console.log('Error with path:', variation.path, error);
          }
        }
        
        if (querySnapshot) {
          console.log('Using data from path:', pathUsed);
          loadData(querySnapshot);
        } else {
          console.error('No data found in any path variation');
          // Try a direct approach using your original WaitingListContext logic
          try {
            console.log('Trying to get all patients for the clinic and filter them');
            const clinicPatientsRef = collection(db, 'clinics', selectedClinicId, 'patients');
            const allPatientsSnapshot = await getDocs(clinicPatientsRef);
            
            // Manually filter waiting patients
            const waitingPatients: WaitingPatient[] = [];
            allPatientsSnapshot.forEach(doc => {
              const data = doc.data();
              if (data.status === 'WAITING' || (data.date === currentDate)) {
                waitingPatients.push({
                  patient_id: data.patient_id || doc.id,
                  patient_name: data.patient_name || 'Unknown Patient',
                  arrivalTime: data.arrivalTime,
                  status: data.status || 'WAITING',
                  position: data.position || 0,
                  doctor_id: data.doctor_id || doctorId,
                  visit_type: data.visit_type || 'كشف',
                  date: data.date,
                  time: data.time
                });
              }
            });
            
            if (waitingPatients.length > 0) {
              console.log('Found patients by filtering all clinic patients:', waitingPatients.length);
              waitingPatients.sort((a, b) => (a.position || 0) - (b.position || 0));
              setWaitingPatients(waitingPatients);
            } else {
              setWaitingPatients([]);
            }
          } catch (error) {
            console.error('Error with direct approach:', error);
            setWaitingPatients([]);
          }
        }
      } catch (error) {
        console.error('Error fetching waiting list:', error);
        setWaitingPatients([]);
      } finally {
        setLoading(false);
      }
    };

    // Format time function that handles all timestamp formats
    const formatTime = (timestamp: any) => {
      if (!timestamp) return '';
      
      try {
        // Handle date + time fields
        if (typeof timestamp === 'string') {
          if (timestamp.includes(' ')) {
            // Handle "YYYY-M-D HH:mm" format
            return dayjs(timestamp).format('HH:mm');
          } else {
            // Just time string
            return timestamp;
          }
        }
        
        // Handle Firebase timestamp objects
        if (typeof timestamp === 'object' && timestamp.toDate) {
          return dayjs(timestamp.toDate()).format('HH:mm');
        }
        
        // Handle Date objects or ISO strings
        return dayjs(timestamp).format('HH:mm');
      } catch (error) {
        console.error('Error formatting timestamp:', error);
        return '';
      }
    };

    // Initial fetch when component mounts or selectedClinicId changes
    useEffect(() => {
      if (selectedClinicId) {
        fetchData();
      }
    }, [selectedClinicId]);

    // Respond to refreshTrigger changes from parent
    useEffect(() => {
      if (refreshTrigger > 0 && selectedClinicId) {
        console.log('Refresh triggered by parent component');
        fetchData();
      }
    }, [refreshTrigger]);

    // Manual refresh handler
    const handleRefresh = () => {
      fetchData();
    };

    // Define status tag display
    const getStatusTag = (status: string) => {
      switch (status) {
        case 'كشف':
          return <Tag color="blue">كشف</Tag>;
        case 'إعادة كشف':
          return <Tag color="orange">إعادة كشف</Tag>;
        case 'أخرى':
          return <Tag color="green">أخرى</Tag>;
        default:
          return <Tag color="blue">كشف</Tag>;
      }
    };

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
                        {patient.time || formatTime(patient.arrivalTime)}
                      </Text>
                      {getStatusTag(patient.visit_type || '')}
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
  }
);

export default SidebarWaitingList;