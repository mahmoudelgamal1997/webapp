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
  /** Optional: ID of the parent center clinic. Present only for branch clinics. */
  parent_clinic_id?: string | null;
  /** Optional: when true (on a center clinic), patient files are shared across all branches. */
  sharedPatientFile?: boolean;
}

interface ClinicContextType {
  clinics: Clinic[];
  selectedClinicId: string | null;
  selectedClinic: Clinic | null;
  setSelectedClinicId: (clinicId: string) => void;
  fetchClinics: () => Promise<Clinic[]>;
  loading: boolean;
  /**
   * When non-null, the selected clinic has shared patient file enabled.
   * Contains the center clinic_id plus all branch clinic_ids that should be queried together.
   * When null, use normal single-doctor behavior (no shared scope).
   */
  clinicScopeIds: string[] | null;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(
    localStorage.getItem('clinicId')
  );
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  // null = no shared scope (single-doctor mode); string[] = IDs to query together
  const [clinicScopeIds, setClinicScopeIds] = useState<string[] | null>(null);

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
            phone: doc.data().phone,
            parent_clinic_id: doc.data().parent_clinic_id || null,
            sharedPatientFile: !!doc.data().sharedPatientFile
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
                phone: clinicDocSnap.data().phone,
                parent_clinic_id: clinicDocSnap.data().parent_clinic_id || null,
                sharedPatientFile: !!clinicDocSnap.data().sharedPatientFile
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

  /**
   * Compute clinicScopeIds whenever the selected clinic changes.
   * - Center with sharedPatientFile=true → [centerId, ...branchIds]
   * - Branch whose center has sharedPatientFile=true → [centerId, ...branchIds]
   * - Everything else → null (existing single-doctor behavior, no change)
   */
  useEffect(() => {
    if (!selectedClinicId) {
      setClinicScopeIds(null);
      return;
    }

    const resolveScope = async () => {
      try {
        const db = getFirestore();
        const clinicsRef = collection(db, 'clinics');

        const selectedData = clinics.find(c => c._id === selectedClinicId);
        const parentId = selectedData?.parent_clinic_id || null;

        let centerId: string = '';
        let centerHasSharedFile = false;

        if (!parentId) {
          // Selected clinic is a center (or standalone). Check its own sharedPatientFile flag.
          centerId = selectedClinicId as string; // guarded by the early return above
          centerHasSharedFile = !!selectedData?.sharedPatientFile;
        } else {
          // Selected clinic is a branch. Look up the parent center's sharedPatientFile flag.
          centerId = parentId;
          try {
            const centerDocSnap = await getDoc(doc(db, 'clinics', centerId));
            centerHasSharedFile = centerDocSnap.exists() ? !!centerDocSnap.data()?.sharedPatientFile : false;
          } catch (_err) {
            centerHasSharedFile = false;
          }
        }

        if (!centerHasSharedFile || !centerId) {
          // Feature not enabled — keep existing single-clinic behavior unchanged
          setClinicScopeIds(null);
          return;
        }

        // Fetch all branch clinics under this center
        const branchesSnap = await getDocs(query(clinicsRef, where('parent_clinic_id', '==', centerId)));
        const branchIds = branchesSnap.docs.map(d => d.id);

        // Scope = center + all branches
        const scopeIds = [centerId, ...branchIds.filter(id => id !== centerId)];
        setClinicScopeIds(scopeIds);
      } catch (err) {
        console.error('Error resolving clinic scope:', err);
        setClinicScopeIds(null);
      }
    };

    resolveScope();
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
    loading,
    clinicScopeIds
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