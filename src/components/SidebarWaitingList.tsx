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

    // Function to format date - ensure consistent format (YYYY-M-D or YYYY-MM-DD)
    const formatDate = (date?: Date): string => {
      const d = date || new Date();
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      return `${year}-${month}-${day}`;
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
          arrivalTime: data.arrivalTime || data.time, // Use time if arrivalTime doesn't exist
          status: data.status || 'WAITING',
          position: data.position || data.user_order_in_queue || 0, // Use user_order_in_queue as fallback
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

    // Main function to fetch data from Firebase - patients directly under clinic with WAITING status
    const fetchData = async () => {
      if (!selectedClinicId) {
        console.log('No clinic selected, cannot fetch waiting list');
        return;
      }
      
      setLoading(true);
      console.log('=== FETCHING WAITING LIST FROM FIREBASE ===');
      console.log('Clinic ID:', selectedClinicId);
      
      try {
        const db = getFirestore();
        const currentDate = formatDate();
        console.log('Formatted date:', currentDate);
        console.log('Fetching from: clinics/' + selectedClinicId + '/patients');
        console.log('Filtering by: status == "WAITING" AND date == "' + currentDate + '"');
        
        // Get patients directly from clinics/{clinicId}/patients collection
        // Filter by status = "WAITING" and date = currentDate
        const patientsRef = collection(db, 'clinics', selectedClinicId, 'patients');
        
        // Query for WAITING patients for today's date
        const waitingQuery = query(
          patientsRef,
          where('status', '==', 'WAITING'),
          where('date', '==', currentDate),
          orderBy('position', 'asc') // Sort by position
        );
        
        let querySnapshot;
        try {
          querySnapshot = await getDocs(waitingQuery);
          console.log(`✅ Found ${querySnapshot.size} WAITING patients for date ${currentDate}`);
        } catch (queryError: any) {
          // If orderBy fails (missing index), try without orderBy
          console.log('⚠️ Query with orderBy failed, trying without orderBy:', queryError.message);
          const simpleQuery = query(
            patientsRef,
            where('status', '==', 'WAITING'),
            where('date', '==', currentDate)
          );
          querySnapshot = await getDocs(simpleQuery);
          console.log(`✅ Found ${querySnapshot.size} WAITING patients (without orderBy)`);
        }
        
        if (querySnapshot && querySnapshot.size > 0) {
          console.log('Loading data from snapshot...');
          loadData(querySnapshot);
        } else {
          console.log('❌ No WAITING patients found');
          console.log('Checked path: clinics/' + selectedClinicId + '/patients');
          console.log('Filters: status="WAITING", date="' + currentDate + '"');
          setWaitingPatients([]);
          setLoading(false);
        }
      } catch (error: any) {
        console.error('❌ ERROR fetching waiting list from Firebase:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        setWaitingPatients([]);
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

    // Set up real-time listener for waiting list changes
    useEffect(() => {
      if (!selectedClinicId) {
        return;
      }

      const db = getFirestore();
      const currentDate = formatDate();
      const patientsRef = collection(db, 'clinics', selectedClinicId, 'patients');

      console.log('Setting up real-time listener for waiting list - Clinic:', selectedClinicId, 'Date:', currentDate);
      
      // Query for WAITING patients for today's date
      let unsubscribe: any;
      try {
        const waitingQuery = query(
          patientsRef,
          where('status', '==', 'WAITING'),
          where('date', '==', currentDate),
          orderBy('position', 'asc')
        );
        unsubscribe = onSnapshot(waitingQuery, (snapshot: any) => {
          console.log('Waiting list updated in real-time:', snapshot.size, 'WAITING patients');
          loadData(snapshot);
        }, (error: any) => {
          console.error('Error in waiting list real-time listener (with orderBy):', error);
          // Try without orderBy
          console.log('Retrying listener without orderBy');
          const simpleQuery = query(
            patientsRef,
            where('status', '==', 'WAITING'),
            where('date', '==', currentDate)
          );
          const fallbackUnsubscribe = onSnapshot(simpleQuery, (snapshot: any) => {
            console.log('Waiting list updated in real-time (no orderBy):', snapshot.size, 'patients');
            loadData(snapshot);
          }, (fallbackError: any) => {
            console.error('Error in waiting list real-time listener (without orderBy):', fallbackError);
            // If listener fails completely, try fetching once
            fetchData();
          });
          unsubscribe = fallbackUnsubscribe;
        });
      } catch (error: any) {
        console.log('Failed to create query with orderBy, using simple query:', error);
        // Fallback to query without orderBy
        const simpleQuery = query(
          patientsRef,
          where('status', '==', 'WAITING'),
          where('date', '==', currentDate)
        );
        unsubscribe = onSnapshot(simpleQuery, (snapshot: any) => {
          console.log('Waiting list updated in real-time (no orderBy):', snapshot.size, 'patients');
          loadData(snapshot);
        }, (listenerError: any) => {
          console.error('Error in waiting list real-time listener:', listenerError);
          fetchData();
        });
      }

      // Initial fetch
      fetchData();

      // Cleanup listener on unmount or clinic change
      return () => {
        console.log('Cleaning up waiting list listener');
        unsubscribe();
      };
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