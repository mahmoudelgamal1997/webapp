// src/components/Dashboard/WaitingListManager.tsx
import React, { forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { Layout } from 'antd';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import SidebarWaitingList from '../SidebarWaitingList';

const { Sider } = Layout;

interface WaitingListManagerProps {
  visible: boolean;
  selectedClinicId?: string;
  refreshTrigger: number;
  onWaitingListChange: () => void;
}

// Function to format date as used in Firebase
const formatDate = (date?: Date): string => {
  const d = date || new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

// Forward ref component to expose refresh methods to parent
const WaitingListManager = forwardRef<any, WaitingListManagerProps>(({
  visible,
  selectedClinicId,
  refreshTrigger,
  onWaitingListChange
}, ref) => {
  const waitingListUnsubscribe = useRef<any>(null);
  const sidebarWaitingListRef = useRef<any>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    refreshData: () => {
      if (sidebarWaitingListRef.current && sidebarWaitingListRef.current.refreshData) {
        sidebarWaitingListRef.current.refreshData();
      }
    }
  }));

  // Setup Firestore listener for waiting list changes
  useEffect(() => {
    if (selectedClinicId) {
      setupWaitingListListener(selectedClinicId);
    }
    
    // Cleanup function to remove listener when component unmounts or clinic changes
    return () => {
      if (waitingListUnsubscribe.current) {
        waitingListUnsubscribe.current();
        waitingListUnsubscribe.current = null;
      }
    };
  }, [selectedClinicId]);

  // Function to setup Firestore listener for waiting list changes
  const setupWaitingListListener = (clinicId: string) => {
    try {
      const db = getFirestore();
      const currentDate = formatDate();
      
      console.log('Setting up Firestore listener for clinic:', clinicId, 'date:', currentDate);
      
      // Define path variations as complete strings to avoid TypeScript spread error
      const pathVariations = [
        // Variation 1: Standard path
        `clinics/${clinicId}/waiting_list/${currentDate}/patients`,
        // Variation 2: Alternative collection name
        `clinics/${clinicId}/waitingList/${currentDate}/patients`,
        // Variation 3: Direct patients collection
        `clinics/${clinicId}/patients`
      ];
      
      // Remove existing listener if there is one
      if (waitingListUnsubscribe.current) {
        waitingListUnsubscribe.current();
        waitingListUnsubscribe.current = null;
      }
      
      // Try each path for setting up the listener
      let listenerSet = false;
      
      for (const path of pathVariations) {
        try {
          console.log('Trying to set up listener on path:', path);
          // Use collection() with the path string directly
          const collRef = collection(db, path);
          
          // Set up new listener
          const unsubscribe = onSnapshot(collRef, (snapshot) => {
            console.log('Waiting list update detected in path:', path);
            console.log('Snapshot size:', snapshot.size, 'documents');
            
            // When waiting list changes, refresh the waiting list sidebar
            if (sidebarWaitingListRef.current && sidebarWaitingListRef.current.refreshData) {
              sidebarWaitingListRef.current.refreshData();
            }
            
            // Notify parent component that waiting list has changed
            onWaitingListChange();
          }, (error) => {
            console.error('Error in waiting list listener for path:', path, error);
          });
          
          waitingListUnsubscribe.current = unsubscribe;
          listenerSet = true;
          console.log('Firestore waiting list listener set up for path:', path);
          break;
        } catch (error) {
          console.log('Could not set up listener for path:', path, error);
        }
      }
      
      if (!listenerSet) {
        console.error('Failed to set up listener for any path variation');
      }
    } catch (error) {
      console.error('Error setting up Firestore listener:', error);
    }
  };

  // If not visible or no clinic selected, don't render
  if (!visible || !selectedClinicId) {
    return null;
  }

  return (
    <Sider 
      width={280} 
      theme="light"
      style={{ 
        background: '#fff',
        margin: '24px 16px 24px 0',
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }}
    >
      <SidebarWaitingList 
        ref={sidebarWaitingListRef}
        refreshTrigger={refreshTrigger}
      />
    </Sider>
  );
});

// Add display name for debugging purposes
WaitingListManager.displayName = 'WaitingListManager';

export default WaitingListManager;