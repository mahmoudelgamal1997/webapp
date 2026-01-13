// src/components/WaitingListContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { message } from 'antd';
import { Patient } from './type';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';

interface WaitingPatient extends Patient {
  waitingId: string;
  arrivalTime: string;
  status: 'waiting' | 'in-progress' | 'completed';
}

export interface Clinic {
  _id: string;
  name: string;
}

interface WaitingListContextType {
  waitingPatients: WaitingPatient[];
  loading: boolean;
  addToWaitingList: (patient: Patient) => Promise<boolean>;
  removeFromWaitingList: (waitingId: string) => Promise<boolean>;
  updatePatientStatus: (waitingId: string, status: 'waiting' | 'in-progress' | 'completed') => Promise<boolean>;
  fetchWaitingList: (date?: string) => Promise<WaitingPatient[]>;
   clinics: Clinic[];
  selectedClinicId: string | null;
  setSelectedClinicId: (clinicId: string) => void;
  fetchClinics: () => Promise<Clinic[]>;
}

const WaitingListContext = createContext<WaitingListContextType | undefined>(undefined);

export const WaitingListProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [waitingPatients, setWaitingPatients] = useState<WaitingPatient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  // Format date as YYYY-MM-DD
  const formatDate = (date?: Date): string => {
    const d = date || new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  // fetch clinics
const fetchClinics = async (): Promise<Clinic[]> => {
  console.log('Fetching clinics started');
  try {
    const doctorId = localStorage.getItem('doctorId');
    console.log('Doctor ID from localStorage:', doctorId);
    if (!doctorId) return [];
    
    const db = getFirestore();
    
    // Try using the doctor ID directly instead of a reference
    const clinicsCollectionRef = collection(db, 'clinics');
    const doctorClinicsQuery = query(clinicsCollectionRef, where('doctors', 'array-contains', doctorId));
    
    console.log('About to execute clinics query');
    const querySnapshot = await getDocs(doctorClinicsQuery);
    console.log('Query completed, snapshot size:', querySnapshot.size);
    
    const clinicsList: Clinic[] = [];
    
    querySnapshot.forEach((doc) => {
      const clinicData = doc.data();
      // Check multiple possible field names for clinic name
      const clinicName = clinicData.location_ar || 
                        clinicData.name || 
                        clinicData.clinic_name || 
                        clinicData.title || 
                        clinicData.location ||
                        'Unnamed Clinic';
      
      console.log('Found clinic:', doc.id, clinicName);
      clinicsList.push({
        _id: doc.id,
        name: clinicName
      });
    });
    
    console.log('Fetched clinics:', clinicsList);
    setClinics(clinicsList);
    
    // Set the first clinic as selected if nothing is selected
    if (clinicsList.length > 0 && !selectedClinicId) {
      console.log('Setting first clinic as selected:', clinicsList[0]._id);
      setSelectedClinicId(clinicsList[0]._id);
      localStorage.setItem('clinicId', clinicsList[0]._id);
    }
    
    return clinicsList;
  } catch (error) {
    console.error('Error fetching clinics:', error);
    return [];
  }
};

  // Fetch waiting list from Firestore
  const fetchWaitingList = async (date?: string): Promise<WaitingPatient[]> => {
    try {
      setLoading(true);
      const clinicId = localStorage.getItem('clinicId');
      if (!clinicId) {
        message.error('Clinic ID not found. Please log in again.');
        return [];
      }
      
      const currentDate = date || formatDate();
      const db = getFirestore();
      const waitingListRef = collection(db, 'clinics', clinicId, 'waiting_list', currentDate, 'patients');
      const waitingQuery = query(waitingListRef, orderBy('arrivalTime', 'asc'));
      
      const querySnapshot = await getDocs(waitingQuery);
      const patients: WaitingPatient[] = [];
      
      querySnapshot.forEach((doc) => {
        patients.push({
          ...doc.data() as Patient,
          waitingId: doc.id,
          arrivalTime: doc.data().arrivalTime?.toDate?.() || doc.data().arrivalTime || new Date().toISOString(),
          status: doc.data().status || 'waiting'
        } as WaitingPatient);
      });
      
      console.log('Fetched waiting list from Firestore:', patients);
      setWaitingPatients(patients);
      return patients;
    } catch (error) {
      console.error('Error fetching waiting list:', error);
      message.error('Failed to load waiting list');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Add a patient to the waiting list
  const addToWaitingList = async (patient: Patient): Promise<boolean> => {
    try {
      setLoading(true);
      const clinicId = localStorage.getItem('clinicId');
      const doctorId = localStorage.getItem('doctorId');
      
      if (!clinicId || !doctorId) {
        message.error('Clinic or Doctor ID not found. Please log in again.');
        return false;
      }

      if (!patient || !patient._id) {
        message.error('Patient information is incomplete');
        return false;
      }
      
      const currentDate = formatDate();
      const db = getFirestore();
      const waitingListRef = collection(db, 'clinics', clinicId, 'waiting_list', currentDate, 'patients');
      
      const waitingPatient = {
        ...patient,
        doctorId,
        status: 'waiting',
        arrivalTime: serverTimestamp()
      };
      
      const docRef = await addDoc(waitingListRef, waitingPatient);
      console.log('Patient added to waiting list with ID:', docRef.id);
      
      message.success('Patient added to waiting list');
      await fetchWaitingList(); // Refresh the waiting list
      return true;
    } catch (error) {
      console.error('Error adding patient to waiting list:', error);
      message.error('Failed to add patient to waiting list');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Remove a patient from the waiting list
  const removeFromWaitingList = async (waitingId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const clinicId = localStorage.getItem('clinicId');
      if (!clinicId) return false;
      
      const currentDate = formatDate();
      const db = getFirestore();
      const patientDocRef = doc(db, 'clinics', clinicId, 'waiting_list', currentDate, 'patients', waitingId);
      
      await deleteDoc(patientDocRef);
      console.log('Patient removed from waiting list with ID:', waitingId);
      
      message.success('Patient removed from waiting list');
      await fetchWaitingList(); // Refresh the waiting list
      return true;
    } catch (error) {
      console.error('Error removing patient from waiting list:', error);
      message.error('Failed to remove patient from waiting list');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update a patient's status in the waiting list
  const updatePatientStatus = async (waitingId: string, status: 'waiting' | 'in-progress' | 'completed'): Promise<boolean> => {
    try {
      setLoading(true);
      const clinicId = localStorage.getItem('clinicId');
      if (!clinicId) return false;
      
      const currentDate = formatDate();
      const db = getFirestore();
      const patientDocRef = doc(db, 'clinics', clinicId, 'waiting_list', currentDate, 'patients', waitingId);
      
      await updateDoc(patientDocRef, { status });
      console.log(`Patient status updated to ${status} with ID:`, waitingId);
      
      message.success(`Patient status updated to ${status}`);
      await fetchWaitingList(); // Refresh the waiting list
      return true;
    } catch (error) {
      console.error('Error updating patient status:', error);
      message.error('Failed to update patient status');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Load waiting list on initial mount
  useEffect(() => {
    fetchClinics();
    fetchWaitingList();
  }, []);
  
 const value = {
  waitingPatients,
  loading,
  fetchWaitingList,
  addToWaitingList,
  removeFromWaitingList,
  updatePatientStatus,
  clinics,
  selectedClinicId,
  setSelectedClinicId,
  fetchClinics
};

  return (
    <WaitingListContext.Provider value={value}>
      {children}
    </WaitingListContext.Provider>
  );
};

// Custom hook for using the WaitingList context
export const useWaitingList = () => {
  const context = useContext(WaitingListContext);
  if (context === undefined) {
    throw new Error('useWaitingList must be used within a WaitingListProvider');
  }
  return context;
};