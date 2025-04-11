// src/services/reportService.ts
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Define the base API URL from your config
const BASE_URL = process.env.REACT_APP_API_URL || 'https://nowaiting-076a4d0af321.herokuapp.com'; // Replace with your actual API URL

// Define the interface for report parameters
interface ReportParams {
  doctor_id: string;
  clinic_id?: string;
  start_date: string;
  end_date: string;
  format?: string;
  limit?: number;
  visit_types?: string[];
}

// Add authorization header helper function
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Enhanced error handling function
const handleApiError = (error: any, message: string): never => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error(`${message} - Status: ${error.response.status}`, error.response.data);
  } else if (error.request) {
    // The request was made but no response was received
    console.error(`${message} - No response received`, error.request);
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error(`${message} - Request setup error`, error.message);
  }
  throw error;
};

// Function to get patients data from existing endpoint
const getPatientsData = async (params: ReportParams): Promise<any[]> => {
  try {
    // Use the existing doctor patients endpoint
    const endpoint = `${BASE_URL}/patients/doctor/${params.doctor_id}`;
    
    // Add query parameters for filtering
    const queryParams = new URLSearchParams();
    if (params.clinic_id) {
      queryParams.append('clinic_id', params.clinic_id);
    }
    
    const url = `${endpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    console.log('Fetching patients data from:', url);
    const response = await axios.get(url, { 
      headers: getAuthHeader() 
    });
    
    // Make sure we have data
    if (!response.data || !Array.isArray(response.data)) {
      console.warn('Unexpected response format for patients data:', response.data);
      return [];
    }
    
    // Filter by date if needed
    if (params.start_date && params.end_date) {
      const startDate = new Date(params.start_date);
      const endDate = new Date(params.end_date);
      endDate.setHours(23, 59, 59, 999); // Include entire end day
      
      return response.data.filter((patient: any) => {
        // Handle date in various formats
        const patientDate = patient.date 
          ? new Date(patient.date) 
          : (patient.createdAt ? new Date(patient.createdAt) : null);
          
        if (!patientDate) return false;
        return patientDate >= startDate && patientDate <= endDate;
      });
    }
    
    return response.data || [];
  } catch (error) {
    return handleApiError(error, 'Error fetching patients data');
  }
};

// Function to get visits data by using the getPatientVisitHistory endpoint
const getVisitsData = async (params: ReportParams): Promise<any[]> => {
  try {
    // First try the visits endpoint
    const visitsEndpoint = `${BASE_URL}/patients/visits`;
    
    // Add query parameters 
    const queryParams = new URLSearchParams();
    queryParams.append('doctor_id', params.doctor_id);
    
    if (params.clinic_id) {
      queryParams.append('clinic_id', params.clinic_id);
    }
    
    // Try to get all visits (we'll filter by date later)
    queryParams.append('limit', '1000'); // Get a large number of visits
    
    const url = `${visitsEndpoint}?${queryParams.toString()}`;
    
    console.log('Fetching visits data from:', url);
    const response = await axios.get(url, {
      headers: getAuthHeader()
    });
    
    // Check response format
    if (!response.data || !response.data.visits || !Array.isArray(response.data.visits)) {
      console.warn('Unexpected response format for visits data, trying fallback method');
      throw new Error('Invalid response format for visits');
    }
    
    let allVisits = response.data.visits;
    
    // Filter by date
    if (params.start_date && params.end_date) {
      const startDate = new Date(params.start_date);
      const endDate = new Date(params.end_date);
      endDate.setHours(23, 59, 59, 999); // Include entire end day
      
      allVisits = allVisits.filter((visit: any) => {
        const visitDate = visit.date ? new Date(visit.date) : null;
        if (!visitDate) return false;
        return visitDate >= startDate && visitDate <= endDate;
      });
    }
    
    // Filter by visit type if specified
    if (params.visit_types && params.visit_types.length > 0) {
      allVisits = allVisits.filter((visit: any) => 
        params.visit_types?.includes(visit.visit_type)
      );
    }
    
    // Add patient info to each visit if available
    if (response.data.patient_info) {
      allVisits = allVisits.map((visit: any) => ({
        ...visit,
        patient_name: response.data.patient_info.name,
        patient_phone: response.data.patient_info.phone
      }));
    }
    
    return allVisits;
  } catch (error) {
    console.warn('Error with direct visits API, falling back to extracting from patients');
    
    // Fallback: Extract visits from patient data
    try {
      const patients = await getPatientsData(params);
      
      // Extract and flatten all visits
      const allVisits: any[] = [];
      
      patients.forEach(patient => {
        if (patient.visits && Array.isArray(patient.visits)) {
          patient.visits.forEach((visit: any) => {
            // Add patient info to each visit
            allVisits.push({
              ...visit,
              patient_name: patient.patient_name,
              patient_phone: patient.patient_phone,
              patient_id: patient._id || patient.patient_id
            });
          });
        }
      });
      
      // Filter by date
      let filteredVisits = allVisits;
      if (params.start_date && params.end_date) {
        const startDate = new Date(params.start_date);
        const endDate = new Date(params.end_date);
        endDate.setHours(23, 59, 59, 999); // Include entire end day
        
        filteredVisits = allVisits.filter(visit => {
          const visitDate = visit.date ? new Date(visit.date) : null;
          if (!visitDate) return false;
          return visitDate >= startDate && visitDate <= endDate;
        });
      }
      
      // Filter by visit type if specified
      if (params.visit_types && params.visit_types.length > 0) {
        filteredVisits = filteredVisits.filter(visit => 
          params.visit_types?.includes(visit.visit_type)
        );
      }
      
      return filteredVisits;
    } catch (fallbackError) {
      console.error('Error in visits fallback method:', fallbackError);
      return [];
    }
  }
};

// Function to get prescriptions data by combining patient and visit data
const getPrescriptionsData = async (params: ReportParams): Promise<any[]> => {
  try {
    // We don't have a direct prescriptions endpoint, so use visits data
    const visits = await getVisitsData(params);
    
    // Extract and flatten all prescriptions (receipts)
    const prescriptions: any[] = [];
    
    visits.forEach(visit => {
      if (visit.receipts && Array.isArray(visit.receipts)) {
        visit.receipts.forEach((receipt: any) => {
          // Add patient and visit info to each receipt
          if (receipt.drugs && Array.isArray(receipt.drugs)) {
            receipt.drugs.forEach((drug: any) => {
              prescriptions.push({
                receipt_id: receipt._id,
                visit_id: visit._id || visit.visit_id,
                patient_name: visit.patient_name,
                patient_id: visit.patient_id,
                date: receipt.date || visit.date,
                drug: drug.drug,
                frequency: drug.frequency,
                period: drug.period,
                timing: drug.timing,
                notes: receipt.notes
              });
            });
          }
        });
      }
    });
    
    return prescriptions;
  } catch (error) {
    console.error('Error getting prescriptions data:', error);
    return [];
  }
};

// Function to clean data for export (remove sensitive/unnecessary fields)
const cleanDataForExport = (data: any[], reportType: string): any[] => {
  // Fields to exclude from all report types
  const commonExcludedFields = [
    'patient_id', 'doctor_id', 'status', 'position', 'fcmToken', 
    'token', 'visits', 'createdAt', 'updatedAt', '__v', '_id'
  ];
  
  // Return cleaned data based on report type
  return data.map(item => {
    const cleanedItem: any = {};
    
    // Copy all properties except excluded ones
    Object.keys(item).forEach(key => {
      if (!commonExcludedFields.includes(key)) {
        cleanedItem[key] = item[key];
      }
    });
    
    // For patients report, keep age and address
    if (reportType !== 'patients') {
      delete cleanedItem.age;
      delete cleanedItem.address;
    }
    
    // For visits report, keep visit_type
    if (reportType !== 'visits') {
      delete cleanedItem.visit_type;
    }
    
    return cleanedItem;
  });
};

// Generate PDF for patients report
const generatePatientsPDF = (data: any[]): Blob => {
  // Clean data for export
  const cleanedData = cleanDataForExport(data, 'patients');
  
  // Create new document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text('Patients Report', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
  
  // Define columns
  const columns = [
    { header: 'Patient Name', dataKey: 'patient_name' },
    { header: 'Phone', dataKey: 'patient_phone' },
    { header: 'Age', dataKey: 'age' },
    { header: 'Address', dataKey: 'address' },
    { header: 'Registration Date', dataKey: 'date' }
  ];
  
  // Format data for autotable
  const formattedData = cleanedData.map(patient => ({
    patient_name: patient.patient_name || '',
    patient_phone: patient.patient_phone || '',
    age: patient.age || '',
    address: patient.address || '',
    date: patient.date ? new Date(patient.date).toLocaleDateString() : ''
  }));
  
  // Generate table
  (doc as any).autoTable({
    columns,
    body: formattedData,
    startY: 30,
    styles: { fontSize: 8, cellPadding: 2 },
    headerStyles: { fillColor: [22, 160, 133] }
  });
  
  // Return as blob
  return new Blob([doc.output('blob')], { type: 'application/pdf' });
};

// Generate PDF for visits report
const generateVisitsPDF = (data: any[]): Blob => {
  // Clean data for export
  const cleanedData = cleanDataForExport(data, 'visits');
  
  // Create new document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text('Visits Report', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
  
  // Define columns
  const columns = [
    { header: 'Patient Name', dataKey: 'patient_name' },
    { header: 'Visit Date', dataKey: 'date' },
    { header: 'Type', dataKey: 'visit_type' },
    { header: 'Complaint', dataKey: 'complaint' },
    { header: 'Diagnosis', dataKey: 'diagnosis' }
  ];
  
  // Format data for autotable
  const formattedData = cleanedData.map(visit => ({
    patient_name: visit.patient_name || '',
    date: visit.date ? new Date(visit.date).toLocaleDateString() : '',
    visit_type: visit.visit_type || 'Regular',
    complaint: visit.complaint || '',
    diagnosis: visit.diagnosis || ''
  }));
  
  // Generate table
  (doc as any).autoTable({
    columns,
    body: formattedData,
    startY: 30,
    styles: { fontSize: 8, cellPadding: 2 },
    headerStyles: { fillColor: [41, 128, 185] }
  });
  
  // Return as blob
  return new Blob([doc.output('blob')], { type: 'application/pdf' });
};

// Generate PDF for prescriptions report
const generatePrescriptionsPDF = (data: any[]): Blob => {
  // Clean data for export
  const cleanedData = cleanDataForExport(data, 'prescriptions');
  
  // Create new document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text('Prescriptions Report', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
  
  // Define columns
  const columns = [
    { header: 'Patient Name', dataKey: 'patient_name' },
    { header: 'Date', dataKey: 'date' },
    { header: 'Drug', dataKey: 'drug' },
    { header: 'Frequency', dataKey: 'frequency' },
    { header: 'Period', dataKey: 'period' },
    { header: 'Timing', dataKey: 'timing' }
  ];
  
  // Format data for autotable
  const formattedData = cleanedData.map(prescription => ({
    patient_name: prescription.patient_name || '',
    date: prescription.date ? new Date(prescription.date).toLocaleDateString() : '',
    drug: prescription.drug || '',
    frequency: prescription.frequency || '',
    period: prescription.period || '',
    timing: prescription.timing || ''
  }));
  
  // Generate table
  (doc as any).autoTable({
    columns,
    body: formattedData,
    startY: 30,
    styles: { fontSize: 8, cellPadding: 2 },
    headerStyles: { fillColor: [142, 68, 173] }
  });
  
  // Return as blob
  return new Blob([doc.output('blob')], { type: 'application/pdf' });
};

// Generate Excel for any report type
const generateExcel = (data: any[], reportType: string): Blob => {
  // Clean data for export
  const cleanedData = cleanDataForExport(data, reportType);
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Convert data to worksheet format
  const ws = XLSX.utils.json_to_sheet(cleanedData);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, reportType.charAt(0).toUpperCase() + reportType.slice(1));
  
  // Write to buffer
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Return as blob
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

// Function to generate patients report
export const generatePatientsReport = async (params: ReportParams): Promise<Blob> => {
  try {
    console.log('Generating patients report with params:', params);
    // Get patients data
    const data = await getPatientsData(params);
    
    if (data.length === 0) {
      console.warn('No patient data found for the specified criteria');
    }
    
    // Generate appropriate format
    if (params.format === 'excel') {
      return generateExcel(data, 'patients');
    } else {
      return generatePatientsPDF(data);
    }
  } catch (error) {
    console.error('Error generating patients report:', error);
    throw error;
  }
};

// Function to generate visits report
export const generateVisitsReport = async (params: ReportParams): Promise<Blob> => {
  try {
    console.log('Generating visits report with params:', params);
    // Get visits data
    const data = await getVisitsData(params);
    
    if (data.length === 0) {
      console.warn('No visit data found for the specified criteria');
    }
    
    // Generate appropriate format
    if (params.format === 'excel') {
      return generateExcel(data, 'visits');
    } else {
      return generateVisitsPDF(data);
    }
  } catch (error) {
    console.error('Error generating visits report:', error);
    throw error;
  }
};

// Function to generate prescriptions report
export const generatePrescriptionsReport = async (params: ReportParams): Promise<Blob> => {
  try {
    console.log('Generating prescriptions report with params:', params);
    // Get prescriptions data
    const data = await getPrescriptionsData(params);
    
    if (data.length === 0) {
      console.warn('No prescription data found for the specified criteria');
    }
    
    // Generate appropriate format
    if (params.format === 'excel') {
      return generateExcel(data, 'prescriptions');
    } else {
      return generatePrescriptionsPDF(data);
    }
  } catch (error) {
    console.error('Error generating prescriptions report:', error);
    throw error;
  }
};

// Function to get patient preview data
export const getPatientReportPreview = async (params: ReportParams): Promise<any> => {
  try {
    const data = await getPatientsData(params);
    // Return only the first 'limit' items
    return { 
      data: data.slice(0, params.limit || 10) 
    };
  } catch (error) {
    console.error('Error getting patient report preview:', error);
    return { data: [] };
  }
};

// Function to get visits preview data
export const getVisitsReportPreview = async (params: ReportParams): Promise<any> => {
  try {
    const data = await getVisitsData(params);
    // Return only the first 'limit' items
    return { 
      data: data.slice(0, params.limit || 10) 
    };
  } catch (error) {
    console.error('Error getting visits report preview:', error);
    return { data: [] };
  }
};

// Function to get prescriptions preview data
export const getPrescriptionsReportPreview = async (params: ReportParams): Promise<any> => {
  try {
    const data = await getPrescriptionsData(params);
    // Return only the first 'limit' items
    return { 
      data: data.slice(0, params.limit || 10) 
    };
  } catch (error) {
    console.error('Error getting prescriptions report preview:', error);
    return { data: [] };
  }
};

// Generic function to download the generated report
export const downloadReport = (blob: Blob, filename: string): void => {
  try {
    console.log(`Downloading report as ${filename}, size: ${blob.size} bytes`);
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
  } catch (error) {
    console.error('Error downloading report:', error);
    throw error;
  }
};

export default {
  generatePatientsReport,
  generateVisitsReport,
  generatePrescriptionsReport,
  getPatientReportPreview,
  getVisitsReportPreview,
  getPrescriptionsReportPreview,
  downloadReport
};