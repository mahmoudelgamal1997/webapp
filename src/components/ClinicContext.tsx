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
      const userId = localStorage.getItem('doctorId');
      
      if (!userId) {
        message.error('User ID not found. Please log in again.');
        return [];
      }
      
      const db = getFirestore();
      const clinicsList: Clinic[] = [];
      
      console.log('Fetching clinics for user:', userId);
      
      // First, check if user is a doctor with direct clinic assignments
      const clinicsRef = collection(db, 'clinics');
      const doctorClinicsQuery = query(clinicsRef, where('doctors', 'array-contains', userId));
      
      const doctorClinicsSnapshot = await getDocs(doctorClinicsQuery);
      console.log(`Found ${doctorClinicsSnapshot.size} clinics with direct doctor assignment`);
      
      doctorClinicsSnapshot.forEach((doc) => {
        const clinicData = doc.data();
        // Check multiple possible field names for clinic name
        const clinicName = clinicData.location_ar || 
                          clinicData.name || 
                          clinicData.clinic_name || 
                          clinicData.title || 
                          clinicData.location ||
                          'Unnamed Clinic';
        
        console.log(`Adding clinic from direct assignment: ${doc.id} - ${clinicName}`);
        clinicsList.push({
          _id: doc.id,
          name: clinicName,
          address: clinicData.address,
          phone: clinicData.phone
        });
      });
      
      // Next, check if user is a doctor with clinic assignments via doctor_clinic_assistant collection
      const doctorClinicAssistantRef = collection(db, 'doctor_clinic_assistant');
      const doctorAssignmentsQuery = query(doctorClinicAssistantRef, where('doctor_id', '==', userId));
      
      const doctorAssignmentsSnapshot = await getDocs(doctorAssignmentsQuery);
      
      // If we found doctor assignments via doctor_clinic_assistant
      if (!doctorAssignmentsSnapshot.empty) {
        console.log(`Found ${doctorAssignmentsSnapshot.size} clinic assignments for doctor ${userId}`);
        
        // Get all clinic IDs assigned to this doctor
        const clinicIds: string[] = [];
        
        doctorAssignmentsSnapshot.forEach((doc) => {
          const clinicId = doc.data().clinic_id;
          if (clinicId && !clinicIds.includes(clinicId)) {
            clinicIds.push(clinicId);
          }
        });
        
        console.log('Doctor is assigned to these clinics:', clinicIds);
        
        // Fetch each clinic's details
        for (const clinicId of clinicIds) {
          // Skip if we already added this clinic (from the direct doctor query)
          if (clinicsList.some(c => c._id === clinicId)) {
            continue;
          }
          
          const clinicDocRef = doc(db, 'clinics', clinicId);
          const clinicDocSnap = await getDoc(clinicDocRef);
          
          if (clinicDocSnap.exists()) {
            const clinicData = clinicDocSnap.data();
            // Check multiple possible field names for clinic name
            const clinicName = clinicData.location_ar || 
                              clinicData.name || 
                              clinicData.clinic_name || 
                              clinicData.title || 
                              clinicData.location ||
                              'Unnamed Clinic';
            
            clinicsList.push({
              _id: clinicDocSnap.id,
              name: clinicName,
              address: clinicData.address,
              phone: clinicData.phone
            });
          }
        }
      }
      
      // Also check if user is an assistant with clinic assignments via doctor_clinic_assistant collection
      const assistantAssignmentsQuery = query(doctorClinicAssistantRef, where('assistant_id', '==', userId));
      
      const assistantAssignmentsSnapshot = await getDocs(assistantAssignmentsQuery);
      
      // If we found assistant assignments
      if (!assistantAssignmentsSnapshot.empty) {
        console.log(`Found ${assistantAssignmentsSnapshot.size} clinic assignments for assistant ${userId}`);
        
        // Get all clinic IDs assigned to this assistant
        const clinicIds: string[] = [];
        
        assistantAssignmentsSnapshot.forEach((doc) => {
          const clinicId = doc.data().clinic_id;
          if (clinicId && !clinicIds.includes(clinicId)) {
            clinicIds.push(clinicId);
          }
        });
        
        console.log('Assistant is assigned to these clinics:', clinicIds);
        
        // Fetch each clinic's details
        for (const clinicId of clinicIds) {
          // Skip if we already added this clinic
          if (clinicsList.some(c => c._id === clinicId)) {
            continue;
          }
          
          const clinicDocRef = doc(db, 'clinics', clinicId);
          const clinicDocSnap = await getDoc(clinicDocRef);
          
          if (clinicDocSnap.exists()) {
            const clinicData = clinicDocSnap.data();
            // Check multiple possible field names for clinic name
            const clinicName = clinicData.location_ar || 
                              clinicData.name || 
                              clinicData.clinic_name || 
                              clinicData.title || 
                              clinicData.location ||
                              'Unnamed Clinic';
            
            clinicsList.push({
              _id: clinicDocSnap.id,
              name: clinicName,
              address: clinicData.address,
              phone: clinicData.phone
            });
          }
        }
      }
      
      console.log(`Total clinics found: ${clinicsList.length}`, clinicsList);
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

  // Load clinics on initial mount
  useEffect(() => {
    fetchClinics();
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