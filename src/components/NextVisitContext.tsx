// src/components/NextVisitContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { message } from 'antd';
import { NextVisit, Patient } from './type';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  deleteDoc, 
  query,
  orderBy
} from 'firebase/firestore';

interface NextVisitContextType {
  nextVisits: NextVisit[];
  loading: boolean;
  addNextVisit: (patient: Patient, visitDate: string, notes?: string) => Promise<boolean>;
  deleteNextVisit: (visitId: string) => Promise<boolean>;
  fetchNextVisits: () => Promise<NextVisit[]>;
}

const NextVisitContext = createContext<NextVisitContextType | undefined>(undefined);

export const NextVisitProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [nextVisits, setNextVisits] = useState<NextVisit[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch next visits from Firestore
  const fetchNextVisits = async (): Promise<NextVisit[]> => {
    try {
      setLoading(true);
      const doctorId = localStorage.getItem('doctorId');
      if (!doctorId) return [];
      
      const db = getFirestore();
      const visitsCollectionRef = collection(db, 'nextVisits', doctorId, 'appointments');
      const visitsQuery = query(visitsCollectionRef, orderBy('visitDate', 'asc'));
      
      const querySnapshot = await getDocs(visitsQuery);
      const visits: NextVisit[] = [];
      
      querySnapshot.forEach((doc) => {
        visits.push({
          _id: doc.id,
          ...doc.data()
        } as NextVisit);
      });
      
      console.log('Fetched visits from Firestore:', visits);
      setNextVisits(visits);
      return visits;
    } catch (error) {
      console.error('Error fetching next visits:', error);
      message.error('Failed to load upcoming appointments');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Add a new next visit to Firestore
 // Updated addNextVisit function in NextVisitContext.tsx
const addNextVisit = async (patient: Patient, visitDate: string, notes?: string): Promise<boolean> => {
  try {
    setLoading(true);
    const doctorId = localStorage.getItem('doctorId');
    const doctorName = localStorage.getItem('doctorName') || localStorage.getItem('username') || '';
    
    if (!doctorId) {
      message.error('Doctor ID not found. Please log in again.');
      return false;
    }

    if (!patient || !patient._id) {
      message.error('Patient information is incomplete');
      return false;
    }
    
    console.log('Adding next visit with:', { patient, visitDate, notes });
    
    const db = getFirestore();
    const nextVisitsCollection = collection(db, 'nextVisits', doctorId, 'appointments');
    
    const nextVisit = {
      patientId: patient._id,
      patientName: patient.patient_name,
      doctorId,
      doctorName,
      visitDate,
      notes: notes || '',
      notificationSent: false,
      createdAt: new Date().toISOString(),
      fcmToken: patient.fcmToken // Use the FCM token directly from the patient object
    };
    
    console.log('Next visit object created:', nextVisit);
    
    const docRef = await addDoc(nextVisitsCollection, nextVisit);
    console.log('Document written to Firestore with ID:', docRef.id);
    
    message.success('Next visit scheduled successfully');
    await fetchNextVisits(); // Refresh the visits list
    return true;
  } catch (error) {
    console.error('Error adding next visit:', error);
    message.error('Failed to schedule next visit');
    return false;
  } finally {
    setLoading(false);
  }
};

  // Delete a next visit from Firestore
  const deleteNextVisit = async (visitId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const doctorId = localStorage.getItem('doctorId');
      if (!doctorId) return false;
      
      const db = getFirestore();
      const visitDocRef = doc(db, 'nextVisits', doctorId, 'appointments', visitId);
      
      await deleteDoc(visitDocRef);
      console.log('Visit document deleted with ID:', visitId);
      
      message.success('Visit removed from schedule');
      await fetchNextVisits(); // Refresh the visits list
      return true;
    } catch (error) {
      console.error('Error deleting next visit:', error);
      message.error('Failed to remove scheduled visit');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Load next visits on initial mount
  useEffect(() => {
    fetchNextVisits();
  }, []);
  
  const value = {
    nextVisits,
    loading,
    fetchNextVisits,
    addNextVisit,
    deleteNextVisit
  };

  return (
    <NextVisitContext.Provider value={value}>
      {children}
    </NextVisitContext.Provider>
  );
};

// Custom hook for using the NextVisit context
export const useNextVisits = () => {
  const context = useContext(NextVisitContext);
  if (context === undefined) {
    throw new Error('useNextVisits must be used within a NextVisitProvider');
  }
  return context;
};