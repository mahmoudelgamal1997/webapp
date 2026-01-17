// src/config/api.js
const API = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'https://nowaiting-076a4d0af321.herokuapp.com',
  ENDPOINTS: {
    PATIENTS: '/api/patients',
    DOCTOR_PATIENTS: (doctorId) => `/api/patients/doctor/${doctorId}`,
    HISTORY: '/api/history', // Use history endpoint which works correctly
    PATIENT_BY_ID: (patientId) => `/api/patients/${patientId}`,
    DOCTOR_SETTINGS: (doctorId) => `/api/doctors/${doctorId}/settings`,

    // Add other endpoints as needed
  }
};

export default API;