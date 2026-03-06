// components/OwnerContext.tsx
// Determines if the current doctor can see owner-only data (revenue & analytics).
// Legacy: doctors without is_owner field (undefined) always see it. New doctors default to false.
import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface OwnerContextType {
  /** True if current doctor can see revenue & analytics (owner or legacy). */
  canSeeRevenueAnalytics: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const OwnerContext = createContext<OwnerContextType | undefined>(undefined);

const getDoctorId = () => localStorage.getItem('doctorId');

export const OwnerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [canSeeRevenueAnalytics, setCanSeeRevenueAnalytics] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchOwnerFlag = useCallback(async () => {
    const doctorId = getDoctorId();
    if (!doctorId) {
      setCanSeeRevenueAnalytics(true);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const doctorRef = doc(db, 'doctors', doctorId);
      const snap = await getDoc(doctorRef);
      const data = snap.exists() ? snap.data() : null;
      // Legacy: no is_owner field = treat as owner (always show). New: is_owner === false = hide.
      const isOwner = data?.is_owner;
      setCanSeeRevenueAnalytics(isOwner === true || isOwner === undefined);
    } catch (err) {
      console.error('Error fetching doctor owner flag:', err);
      setCanSeeRevenueAnalytics(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOwnerFlag();
    const onDoctorIdChange = () => fetchOwnerFlag();
    window.addEventListener('doctorIdChanged', onDoctorIdChange);
    return () => window.removeEventListener('doctorIdChanged', onDoctorIdChange);
  }, [fetchOwnerFlag]);

  const value: OwnerContextType = {
    canSeeRevenueAnalytics,
    loading,
    refresh: fetchOwnerFlag,
  };

  return (
    <OwnerContext.Provider value={value}>
      {children}
    </OwnerContext.Provider>
  );
};

export const useOwnerContext = (): OwnerContextType => {
  const context = useContext(OwnerContext);
  if (context === undefined) {
    throw new Error('useOwnerContext must be used within an OwnerProvider');
  }
  return context;
};
