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
      
      // First, check if user is a doctor with direct clinic assignments
      const clinicsRef = collection(db, 'clinics');
      const doctorClinicsQuery = query(clinicsRef, where('doctors', 'array-contains', userId));
      
      const doctorClinicsSnapshot = await getDocs(doctorClinicsQuery);
      
      doctorClinicsSnapshot.forEach((doc) => {
        clinicsList.push({
          _id: doc.id,
          name: doc.data().location_ar || doc.data().name || 'Unnamed Clinic',
          location_ar: doc.data().location_ar,
          address: doc.data().address,
          phone: doc.data().phone
        });
      });
      
      // Next, check if user is an assistant with clinic assignments via doctor_clinic_assistant collection
      // This handles the case where an assistant is assigned to multiple clinics
      const doctorClinicAssistantRef = collection(db, 'doctor_clinic_assistant');
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
              location_ar: clinicDocSnap.data().location_ar,
              address: clinicDocSnap.data().address,
              phone: clinicDocSnap.data().phone
            });
          }
        }
      }
      
      console.log('Final clinics list:', clinicsList);
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
    <Card title="Select Clinic" style={{ marginBottom: 16 }}>
      {clinics.length > 0 ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
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
            <Text type="secondary">
              You are currently viewing: {clinics.find(c => c._id === selectedClinic)?.name}
            </Text>
          )}
        </Space>
      ) : (
        <Text type="secondary">No clinics found. Please contact an administrator to assign you to a clinic.</Text>
      )}
    </Card>
  );
};

export default ClinicSelector;