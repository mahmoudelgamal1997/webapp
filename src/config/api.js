// src/config/api.js
const API = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'https://nowaiting-076a4d0af321.herokuapp.com',
  ENDPOINTS: {
    PATIENTS: '/api/patients',
    DOCTOR_PATIENTS: (doctorId) => `/api/patients/doctor/${doctorId}`,
    HISTORY: '/api/history', // Use history endpoint which works correctly
    PATIENT_BY_ID: (patientId) => `/api/patients/${patientId}`,
    DOCTOR_SETTINGS: (doctorId) => `/api/doctors/${doctorId}/settings`,

    // Services endpoints
    SERVICES: '/api/services',
    DOCTOR_SERVICES: (doctorId) => `/api/services/doctor/${doctorId}`,
    SERVICE: (doctorId, serviceId) => `/api/services/doctor/${doctorId}/${serviceId}`,

    // Billing endpoints
    BILLING: '/api/billing',
    RECORD_CONSULTATION: '/api/billing/consultation',  // Quick consultation record
    DOCTOR_BILLINGS: (doctorId) => `/api/billing/doctor/${doctorId}`,
    BILLING_RECORD: (doctorId, billingId) => `/api/billing/doctor/${doctorId}/${billingId}`,
    BILLING_BY_VISIT: (visitId) => `/api/billing/visit/${visitId}`,

    // Analytics endpoints
    REVENUE_OVERVIEW: (doctorId) => `/api/analytics/revenue/${doctorId}`,
    REVENUE_BREAKDOWN: (doctorId) => `/api/analytics/revenue/${doctorId}/breakdown`,
    SERVICES_ANALYTICS: (doctorId) => `/api/analytics/services/${doctorId}`,
    CLINIC_PERFORMANCE: (doctorId) => `/api/analytics/performance/${doctorId}`,
    PATIENT_BILLING_HISTORY: (doctorId, patientId) => `/api/analytics/patient/${doctorId}/${patientId}`,

    // External Services endpoints
    EXTERNAL_SERVICES: '/api/external-services/services',
    DOCTOR_EXTERNAL_SERVICES: (doctorId) => `/api/external-services/services/doctor/${doctorId}`,
    EXTERNAL_SERVICE: (doctorId, serviceId) => `/api/external-services/services/doctor/${doctorId}/${serviceId}`,
    EXTERNAL_REQUESTS: '/api/external-services/requests',
    PATIENT_EXTERNAL_REQUESTS: (patientId) => `/api/external-services/requests/patient/${patientId}`,
    EXTERNAL_REQUEST_STATUS: (requestId) => `/api/external-services/requests/${requestId}/status`,
    EXTERNAL_REQUEST_DELETE: (requestId) => `/api/external-services/requests/${requestId}`,
    EXTERNAL_REPORTS: (doctorId) => `/api/external-services/reports/doctor/${doctorId}`,

    // Medical History endpoints
    MEDICAL_HISTORY_TEMPLATE: '/api/medical-history/template',
    MEDICAL_HISTORY_PATIENT: '/api/medical-history/patient',
    MEDICAL_HISTORY_TIMELINE: '/api/medical-history/patient/timeline',
  }
};

export default API;