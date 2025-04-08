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

// Patient interface with receipts array
export interface Patient {
  id: string;
  _id: string;
  patient_name: string;
  email: string;
  patient_phone: string;
  address: string;
  age: string;
  date: string;
  receipt?: string;
  receipts?: Receipt[];
  doctor_id?: string;
  fcmToken?: string;
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