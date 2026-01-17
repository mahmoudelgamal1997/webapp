// types.ts
import { Dayjs } from 'dayjs';

// Drug interface
export interface Drug {
  _id: string;
  drug: string;
  frequency: string;
  period: string;
  timing: string;
}

// Receipt interface
export interface Receipt {
  _id: string;
  drugModel: string;
  drugs: Drug[];
  notes: string;
  date: string;
}



export interface Patient {
  id: string;
  _id: string;
  patient_name: string;
  email?: string;
  patient_phone: string;
  address: string;
  age: string;
  date: string;
  last_visit_date?: string; // Used by history endpoint
  patient_id: string; // Add this to match the API response
  doctor_id: string;
  doctor_name?: string; // Used by history endpoint
  status?: string; // Used by history endpoint
  total_visits?: number; // Used by history endpoint
  receipt?: string;
  receipts?: Receipt[];
  visits?: Visit[]; // Add this to match the API response
  fcmToken?: string;
  visit_type?: string;
}

// Filter state interface
export interface FilterState {
  searchTerm: string;
  dateRange: [Dayjs | null, Dayjs | null];
  isDateFilterVisible: boolean;
}

export interface NextVisit {
  _id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  visitDate: string;
  notes: string;
  notificationSent: boolean;
  createdAt: string;
  fcmToken?: string;
}

export interface Visit {
  visit_id: string;
  date: string;
  time: string;
  visit_type: string;
  complaint: string;
  diagnosis: string;
  receipts: Receipt[];
  _id?: string;
}