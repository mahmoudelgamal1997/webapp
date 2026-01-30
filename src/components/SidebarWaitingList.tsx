// src/components/SidebarWaitingList.tsx
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { List, Card, Tag, Typography, Spin, Empty, Badge, Button, Tooltip, message, Popconfirm } from 'antd';
import { UserOutlined, ReloadOutlined, DollarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { 
  getFirestore, 
  collection, 
  query, 
  getDocs,
  onSnapshot,
  where
} from 'firebase/firestore';
import axios from 'axios';
import dayjs from 'dayjs';
import API from '../config/api';
import { useClinicContext } from './ClinicContext';

const { Text } = Typography;

interface WaitingPatient {
  patient_id: string;
  patient_name: string;
  patient_phone?: string;
  arrivalTime?: any;
  status?: 'waiting' | 'in-progress' | 'completed';
  position?: number;
  doctor_id?: string;
  visit_type?: string;
  date?: string;
  time?: string;
  consultationPaid?: boolean;
}

interface DoctorFees {
  consultationFee: number;
  revisitFee: number;
}

interface SidebarWaitingListProps {
  refreshTrigger?: number; // Prop to trigger refresh from parent
}

const SidebarWaitingList = forwardRef<{ refreshData: () => Promise<void> }, SidebarWaitingListProps>(
  ({ refreshTrigger = 0 }, ref) => {
    const [waitingPatients, setWaitingPatients] = useState<WaitingPatient[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [paidPatients, setPaidPatients] = useState<Set<string>>(new Set());
    const [doctorFees, setDoctorFees] = useState<DoctorFees>({ consultationFee: 0, revisitFee: 0 });
    const [recordingId, setRecordingId] = useState<string | null>(null);
    const { selectedClinicId } = useClinicContext();
    const doctorId = localStorage.getItem('doctorId');

    // Expose refresh method to parent via ref
    useImperativeHandle(ref, () => ({
      refreshData: fetchData
    }));

    // Fetch doctor settings (consultation fees)
    const fetchDoctorFees = async () => {
      if (!doctorId) return;
      try {
        const response = await axios.get(`${API.BASE_URL}${API.ENDPOINTS.DOCTOR_SETTINGS(doctorId)}`);
        if (response.data.settings) {
          setDoctorFees({
            consultationFee: response.data.settings.consultationFee || 0,
            revisitFee: response.data.settings.revisitFee || 0
          });
        }
      } catch (error) {
        console.error('Error fetching doctor fees:', error);
      }
    };

    // Record consultation fee for a patient
    const recordConsultation = async (patient: WaitingPatient) => {
      if (!doctorId) return;
      
      const isRevisit = patient.visit_type === 'اعاده كشف' || patient.visit_type === 'إعادة كشف';
      const fee = isRevisit ? doctorFees.revisitFee : doctorFees.consultationFee;
      
      if (fee <= 0) {
        message.warning('Please set consultation fees in Services page first');
        return;
      }

      setRecordingId(patient.patient_id);
      
      try {
        const response = await axios.post(`${API.BASE_URL}${API.ENDPOINTS.RECORD_CONSULTATION}`, {
          doctor_id: doctorId,
          patient_id: patient.patient_id,
          patient_name: patient.patient_name,
          patient_phone: patient.patient_phone || '',
          clinic_id: selectedClinicId || '',
          consultationType: isRevisit ? 'اعاده كشف' : 'كشف',
          consultationFee: fee,
          paymentMethod: 'cash'
        });

        if (response.data.success) {
          setPaidPatients(prev => {
            const newSet = new Set(Array.from(prev));
            newSet.add(patient.patient_id);
            return newSet;
          });
          message.success(`✅ ${fee} EGP recorded for ${patient.patient_name}`);
        }
      } catch (error) {
        console.error('Error recording consultation:', error);
        message.error('Failed to record consultation');
      } finally {
        setRecordingId(null);
      }
    };

    // Fetch doctor fees on mount
    useEffect(() => {
      fetchDoctorFees();
    }, [doctorId]);

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
        
        // Use the correct Firebase path: clinics/{clinicId}/waiting_list/{date}/patients
        const waitingListRef = collection(db, 'clinics', selectedClinicId, 'waiting_list', currentDate, 'patients');
        
        console.log('Fetching from path: clinics/' + selectedClinicId + '/waiting_list/' + currentDate + '/patients');
        
        // Filter to only get WAITING patients
        const waitingQuery = query(
          waitingListRef,
          where('status', '==', 'WAITING')
        );
        
        const querySnapshot = await getDocs(waitingQuery);
        console.log(`✅ Found ${querySnapshot.size} WAITING patients in waiting_list for date ${currentDate}`);
        
        // Sort by position in memory after fetching (to avoid needing composite index)
        if (querySnapshot.size > 0) {
          const sortedDocs = querySnapshot.docs.sort((a, b) => {
            const posA = a.data().position || a.data().user_order_in_queue || 0;
            const posB = b.data().position || b.data().user_order_in_queue || 0;
            return posA - posB;
          });
          
          // Create a new QuerySnapshot-like object with sorted docs
          const sortedSnapshot = {
            ...querySnapshot,
            docs: sortedDocs,
            forEach: (callback: any) => sortedDocs.forEach(callback)
          };
          
          loadData(sortedSnapshot as any);
        } else {
          console.log('No patients found in waiting_list collection');
          setWaitingPatients([]);
          setLoading(false);
        }
        
        // Data is already loaded in the try block above
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
      // Use the correct Firebase path: clinics/{clinicId}/waiting_list/{date}/patients
      const waitingListRef = collection(db, 'clinics', selectedClinicId, 'waiting_list', currentDate, 'patients');

      console.log('Setting up real-time listener for waiting list - Clinic:', selectedClinicId, 'Date:', currentDate);
      console.log('Path: clinics/' + selectedClinicId + '/waiting_list/' + currentDate + '/patients');
      
      // Filter to only listen to WAITING patients
      const waitingQuery = query(
        waitingListRef,
        where('status', '==', 'WAITING')
      );
      
      // Set up real-time listener on waiting_list collection with WAITING filter
      const unsubscribe = onSnapshot(waitingQuery, (snapshot: any) => {
        console.log('Waiting list updated in real-time:', snapshot.size, 'WAITING patients');
        
        // Sort by position in memory
        if (snapshot.size > 0) {
          const sortedDocs = snapshot.docs.sort((a: any, b: any) => {
            const posA = a.data().position || a.data().user_order_in_queue || 0;
            const posB = b.data().position || b.data().user_order_in_queue || 0;
            return posA - posB;
          });
          
          // Create sorted snapshot
          const sortedSnapshot = {
            ...snapshot,
            docs: sortedDocs,
            forEach: (callback: any) => sortedDocs.forEach(callback)
          };
          
          loadData(sortedSnapshot as any);
        } else {
          setWaitingPatients([]);
          setLoading(false);
        }
      }, (error: any) => {
        console.error('Error in waiting list real-time listener:', error);
        // If listener fails, try fetching once
        fetchData();
      });

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
            renderItem={(patient, index) => {
              const isPaid = paidPatients.has(patient.patient_id);
              const isRevisit = patient.visit_type === 'اعاده كشف' || patient.visit_type === 'إعادة كشف';
              const fee = isRevisit ? doctorFees.revisitFee : doctorFees.consultationFee;
              
              return (
                <List.Item
                  style={{ 
                    padding: '8px 12px',
                    backgroundColor: isPaid ? '#f6ffed' : (patient.status === 'in-progress' ? '#fff7e6' : 'transparent'),
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                    <div style={{ marginLeft: '12px', flexShrink: 0 }}>
                      <Badge count={index + 1} style={{ backgroundColor: isPaid ? '#52c41a' : '#1890ff' }}>
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
                    <div style={{ marginRight: '8px', flexShrink: 0 }}>
                      {isPaid ? (
                        <Tooltip title="Consultation Paid">
                          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                        </Tooltip>
                      ) : (
                        <Popconfirm
                          title={`Record ${fee} EGP for ${isRevisit ? 'Revisit' : 'Consultation'}?`}
                          onConfirm={() => recordConsultation(patient)}
                          okText="Yes"
                          cancelText="No"
                          placement="left"
                        >
                          <Button
                            type="primary"
                            size="small"
                            icon={<DollarOutlined />}
                            loading={recordingId === patient.patient_id}
                            style={{ 
                              backgroundColor: '#52c41a', 
                              borderColor: '#52c41a',
                              fontSize: '11px',
                              padding: '0 6px'
                            }}
                          >
                            {fee}
                          </Button>
                        </Popconfirm>
                      )}
                    </div>
                  </div>
                </List.Item>
              );
            }}
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