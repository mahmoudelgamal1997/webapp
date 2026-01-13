// src/components/ClinicSelector.tsx
import React, { useState, useEffect } from 'react';
import { Select, Typography, Space, message, Skeleton, Card } from 'antd';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const { Option } = Select;
const { Title, Text } = Typography;

interface Clinic {
  _id: string;
  name: string;
  location_ar?: string;
  clinic_id?: string;
  address?: string;
  phone?: string;
}

interface ClinicSelectorProps {
  onClinicSelect: (clinicId: string) => void;
}

const ClinicSelector: React.FC<ClinicSelectorProps> = ({ onClinicSelect }) => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load previously selected clinic from localStorage if available
    const savedClinicId = localStorage.getItem('clinicId');
    if (savedClinicId) {
      setSelectedClinic(savedClinicId);
    }
    
    fetchClinicsForUser();
  }, []);

  const fetchClinicsForUser = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('doctorId');
      
      if (!userId) {
        message.error('User ID not found. Please log in again.');
        setLoading(false);
        return;
      }
      
      const db = getFirestore();
      const clinicsList: Clinic[] = [];
      
      console.log('ClinicSelector: Fetching clinics for user:', userId);
      
      // First, check if user is a doctor with direct clinic assignments
      const clinicsRef = collection(db, 'clinics');
      const doctorClinicsQuery = query(clinicsRef, where('doctors', 'array-contains', userId));
      
      const doctorClinicsSnapshot = await getDocs(doctorClinicsQuery);
      console.log(`ClinicSelector: Found ${doctorClinicsSnapshot.size} clinics with direct doctor assignment`);
      
      doctorClinicsSnapshot.forEach((doc) => {
        const clinicData = doc.data();
        // Check multiple possible field names for clinic name
        const clinicName = clinicData.location_ar || 
                          clinicData.name || 
                          clinicData.clinic_name || 
                          clinicData.title || 
                          clinicData.location ||
                          'Unnamed Clinic';
        
        console.log(`ClinicSelector: Adding clinic from direct assignment: ${doc.id} - ${clinicName}`);
        clinicsList.push({
          _id: doc.id,
          name: clinicName,
          location_ar: clinicData.location_ar,
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
              location_ar: clinicData.location_ar,
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
              location_ar: clinicData.location_ar,
              address: clinicData.address,
              phone: clinicData.phone
            });
          }
        }
      }
      
      console.log(`ClinicSelector: Total clinics found: ${clinicsList.length}`, clinicsList);
      setClinics(clinicsList);
      
      // Set first clinic as selected if nothing is selected yet
      if (clinicsList.length > 0 && !selectedClinic) {
        setSelectedClinic(clinicsList[0]._id);
        localStorage.setItem('clinicId', clinicsList[0]._id);
        onClinicSelect(clinicsList[0]._id);
      } else if (selectedClinic) {
        // If we already have a selected clinic, call the onClinicSelect callback
        onClinicSelect(selectedClinic);
      }
    } catch (error) {
      console.error('Error fetching clinics:', error);
      message.error('Failed to load clinics');
    } finally {
      setLoading(false);
    }
  };

  const handleClinicChange = (clinicId: string) => {
    setSelectedClinic(clinicId);
    localStorage.setItem('clinicId', clinicId);
    onClinicSelect(clinicId);
    
    // Find the selected clinic to show in message
    const selectedClinicName = clinics.find(c => c._id === clinicId)?.name || 'Selected clinic';
    message.success(`Switched to ${selectedClinicName}`);
  };

  if (loading) {
    return <Skeleton active paragraph={{ rows: 1 }} />;
  }

  // Get the display name of the currently selected clinic
  const getCurrentClinicName = () => {
    const clinic = clinics.find(c => c._id === selectedClinic);
    return clinic ? clinic.name : 'Select a clinic';
  };

return (
  <Card style={{ marginBottom: 12, padding: 12 }}>
    {clinics.length > 0 ? (
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Select
          size="small"
          style={{ width: '100%' }}
          placeholder="Select a clinic"
          value={selectedClinic || undefined}
          onChange={handleClinicChange}
        >
          {clinics.map(clinic => (
            <Option key={clinic._id} value={clinic._id}>{clinic.name}</Option>
          ))}
        </Select>
        {selectedClinic && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            You are currently viewing: <span style={{ fontWeight: 500 }}>
              {clinics.find(c => c._id === selectedClinic)?.name}
            </span>
          </Text>
        )}
      </Space>
    ) : (
      <Text type="secondary" style={{ fontSize: '12px' }}>
        No clinics found. Please contact an administrator.
      </Text>
    )}
  </Card>
);

};

export default ClinicSelector;