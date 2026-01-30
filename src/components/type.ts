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
  clinic_id?: string; // Clinic ID for billing
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
  patientPhone?: string;
  doctorId: string;
  doctorName: string;
  visitDate: string;
  reminderDurationDays?: number;
  notes: string;
  notificationSent?: boolean; // Deprecated, use notificationSent3Days and notificationSent1Day
  notificationSent3Days?: boolean;
  notificationSent1Day?: boolean;
  notificationDelivered3Days?: boolean;
  notificationDelivered1Day?: boolean;
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
  billing_id?: string;
  _id?: string;
}

// ============ BILLING & SERVICES TYPES ============

// Clinic Service definition
export interface ClinicService {
  service_id: string;
  doctor_id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Billing service item (service included in a bill)
export interface BillingServiceItem {
  service_id: string;
  service_name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

// Discount applied to billing
export interface Discount {
  type: 'fixed' | 'percentage';
  value: number;
  amount: number;
  reason?: string;
}

// Billing record
export interface Billing {
  billing_id: string;
  doctor_id: string;
  patient_id: string;
  patient_name: string;
  patient_phone?: string;
  visit_id?: string;
  clinic_id?: string;
  consultationFee: number;
  consultationType?: string;
  services: BillingServiceItem[];
  servicesTotal: number;
  subtotal: number;
  discount?: Discount | null;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'partial' | 'cancelled';
  paymentMethod: 'cash' | 'card' | 'insurance' | 'other';
  amountPaid: number;
  notes?: string;
  billingDate: string;
  createdAt?: string;
  updatedAt?: string;
}

// Revenue Overview data
export interface RevenueOverview {
  totalRevenue: number;
  totalConsultationFees: number;
  totalServicesRevenue: number;
  totalDiscounts: number;
  totalBillings: number;
  totalAmountPaid: number;
  averageBillValue: number;
  pendingAmount: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

// Revenue breakdown item
export interface RevenueBreakdownItem {
  _id: string;
  revenue: number;
  consultationFees: number;
  servicesRevenue: number;
  discounts: number;
  count: number;
}

// Service analytics item
export interface ServiceAnalyticsItem {
  service_id: string;
  service_name: string;
  totalPatients: number;
  totalQuantity: number;
  totalRevenue: number;
  averageRevenuePerPatient: number;
  category?: string;
  currentPrice?: number;
}

// Clinic performance data
export interface ClinicPerformance {
  overview: {
    totalVisits: number;
    totalRevenue: number;
    totalConsultationFees: number;
    totalServicesRevenue: number;
    totalDiscounts: number;
    uniquePatientCount: number;
    averageBillValue: number;
  };
  mostUsedServices: Array<{
    service_id: string;
    service_name: string;
    usageCount: number;
    revenue: number;
  }>;
  leastUsedServices: Array<{
    service_id: string;
    service_name: string;
    usageCount: number;
    revenue: number;
  }>;
  consultationTypes: Array<{
    type: string;
    count: number;
    revenue: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  period: {
    startDate: string;
    endDate: string;
  };
}