// src/components/ClinicContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { message } from 'antd';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

interface Clinic {
  _id: string;
  name: string;
  clinic_id?: string;
  address?: string;
  phone?: string;
}

interface ClinicContextType {
  clinics: Clinic[];
  selectedClinicId: string | null;
  selectedClinic: Clinic | null;
  setSelectedClinicId: (clinicId: string) => void;
  fetchClinics: () => Promise<Clinic[]>;
  loading: boolean;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(
    localStorage.getItem('clinicId')
  );
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch clinics for the logged in user (doctor or assistant)
  const fetchClinics = async (): Promise<Clinic[]> => {
    try {
      setLoading(true);
      const doctorId = localStorage.getItem('doctorId');
      const assistantId = localStorage.getItem('assistantId'); // Get assistant_id (Firebase UID)
      
      if (!doctorId && !assistantId) {
        console.log('Neither doctorId nor assistantId found - waiting for login to complete');
        return [];
      }
      
      const db = getFirestore();
      const clinicsList: Clinic[] = [];
      
      // First, check if user is a doctor with direct clinic assignments
      if (doctorId) {
        const clinicsRef = collection(db, 'clinics');
        const doctorClinicsQuery = query(clinicsRef, where('doctors', 'array-contains', doctorId));
        
        const doctorClinicsSnapshot = await getDocs(doctorClinicsQuery);
        
        doctorClinicsSnapshot.forEach((doc) => {
          clinicsList.push({
            _id: doc.id,
            name: doc.data().location_ar || doc.data().name || 'Unnamed Clinic',
            address: doc.data().address,
            phone: doc.data().phone
          });
        });
      }
      
      // Next, check if user is an assistant with clinic assignments via doctor_clinic_assistant collection
      // IMPORTANT: Use assistantId (Firebase UID), not doctorId
      if (assistantId) {
        const doctorClinicAssistantRef = collection(db, 'doctor_clinic_assistant');
        // Try querying by assistant_id field (trimmed and with trailing space for compatibility)
        let assistantAssignmentsQuery = query(doctorClinicAssistantRef, where('assistant_id', '==', assistantId));
        let assistantAssignmentsSnapshot = await getDocs(assistantAssignmentsQuery);
        
        // If not found, try with trailing space
        if (assistantAssignmentsSnapshot.empty) {
          assistantAssignmentsQuery = query(doctorClinicAssistantRef, where('assistant_id', '==', assistantId + ' '));
          assistantAssignmentsSnapshot = await getDocs(assistantAssignmentsQuery);
        }
        
        // If still not found, try getting document by ID
        if (assistantAssignmentsSnapshot.empty) {
          const assistantDocRef = doc(db, 'doctor_clinic_assistant', assistantId);
          const assistantDocSnap = await getDoc(assistantDocRef);
          if (assistantDocSnap.exists()) {
            // Create a mock snapshot-like structure
            assistantAssignmentsSnapshot = {
              empty: false,
              size: 1,
              docs: [assistantDocSnap]
            } as any;
          }
        }
        
        // If we found assistant assignments
        if (!assistantAssignmentsSnapshot.empty) {
          console.log(`Found ${assistantAssignmentsSnapshot.size} clinic assignments for assistant ${assistantId}`);
          
          // Get all clinic IDs assigned to this assistant
          const clinicIds: string[] = [];
          
          assistantAssignmentsSnapshot.forEach((docSnap) => {
            const clinicId = docSnap.data().clinic_id;
            if (clinicId && !clinicIds.includes(clinicId)) {
              clinicIds.push(clinicId);
            }
          });
          
          console.log('Assistant is assigned to these clinics:', clinicIds);
          
          // Fetch each clinic's details
          for (const clinicId of clinicIds) {
            // Skip if we already added this clinic (from the doctor query)
            if (clinicsList.some(c => c._id === clinicId)) {
              continue;
            }
            
            const clinicDocRef = doc(db, 'clinics', clinicId);
            const clinicDocSnap = await getDoc(clinicDocRef);
            
            if (clinicDocSnap.exists()) {
              clinicsList.push({
                _id: clinicDocSnap.id,
                name: clinicDocSnap.data().location_ar || clinicDocSnap.data().name || 'Unnamed Clinic',
                address: clinicDocSnap.data().address,
                phone: clinicDocSnap.data().phone
              });
            }
          }
        }
      }
      
      setClinics(clinicsList);
      
      // Update selected clinic if needed
      if (clinicsList.length > 0) {
        if (selectedClinicId) {
          const clinic = clinicsList.find(c => c._id === selectedClinicId);
          if (clinic) {
            setSelectedClinic(clinic);
          } else {
            // If previously selected clinic is not found, select the first one
            setSelectedClinicId(clinicsList[0]._id);
            localStorage.setItem('clinicId', clinicsList[0]._id);
            setSelectedClinic(clinicsList[0]);
          }
        } else {
          // No previous selection, select the first clinic
          setSelectedClinicId(clinicsList[0]._id);
          localStorage.setItem('clinicId', clinicsList[0]._id);
          setSelectedClinic(clinicsList[0]);
        }
      } else {
        setSelectedClinic(null);
      }
      
      return clinicsList;
    } catch (error) {
      console.error('Error fetching clinics:', error);
      message.error('Failed to load clinics');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Update selected clinic when selectedClinicId changes
  useEffect(() => {
    if (selectedClinicId && clinics.length > 0) {
      const clinic = clinics.find(c => c._id === selectedClinicId);
      if (clinic) {
        setSelectedClinic(clinic);
      }
    } else {
      setSelectedClinic(null);
    }
  }, [selectedClinicId, clinics]);

  // Load clinics on initial mount and when doctorId/assistantId changes
  useEffect(() => {
    const doctorId = localStorage.getItem('doctorId');
    const assistantId = localStorage.getItem('assistantId');
    
    // Only fetch if we have at least one ID
    if (doctorId || assistantId) {
      fetchClinics();
    }
  }, []); // Run once on mount, then re-fetch when IDs are available
  
  // Listen for doctorId/assistantId changes (e.g., after login)
  useEffect(() => {
    const checkIds = () => {
      const doctorId = localStorage.getItem('doctorId');
      const assistantId = localStorage.getItem('assistantId');
      if (doctorId || assistantId) {
        console.log('Re-fetching clinics after ID change');
        fetchClinics();
      }
    };
    
    // Listen for custom events (when IDs are set during login)
    window.addEventListener('doctorIdChanged', checkIds);
    window.addEventListener('assistantIdChanged', checkIds);
    
    return () => {
      window.removeEventListener('doctorIdChanged', checkIds);
      window.removeEventListener('assistantIdChanged', checkIds);
    };
  }, []);

  const value = {
    clinics,
    selectedClinicId,
    selectedClinic,
    setSelectedClinicId,
    fetchClinics,
    loading
  };

  return (
    <ClinicContext.Provider value={value}>
      {children}
    </ClinicContext.Provider>
  );
};

// Custom hook for using the Clinic context
export const useClinicContext = () => {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinicContext must be used within a ClinicProvider');
  }
  return context;
}