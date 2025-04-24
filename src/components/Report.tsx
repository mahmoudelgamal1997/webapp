// src/components/Reports.tsx
import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Card, 
  Typography, 
  Button, 
  Space, 
  DatePicker, 
  Table, 
  Select, 
  Form, 
  Row, 
  Col, 
  Input, 
  notification,
  Tabs
} from 'antd';
import { SearchOutlined, FilePdfOutlined, DownloadOutlined, BarChartOutlined } from '@ant-design/icons';
import { useAuth } from './AuthContext';
import { useClinicContext } from './ClinicContext';
import axios from 'axios';
import moment, { Moment } from 'moment';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';
import ClinicSelector from './ClinicSelector';
import API from '../config/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Patient } from './type';
import { Visit } from './type';
import { Receipt } from './type';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { arabicFont } from './utils/font';

const { Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

// Define types for the data structures
interface Drug {
  drug: string;
  frequency: string;
  period: string;
  timing: string;
  _id?: string;
}

// Define search params interface for API requests
interface SearchParams {
  doctor_id: string;
  limit?: number;
  page?: number;
  patient_phone?: string;
  patient_name?: string;
  patient_id?: string;
  start_date?: string;
  end_date?: string;
  visit_type?: string;
  status?: string;
  [key: string]: any; // Allow additional properties
}

// Define the return type for autoTable
interface AutoTableOutput {
  lastAutoTableY: number;
  finalY?: number;
  pageNumber?: number;
  pageCount?: number;
}

interface AutoTableResult {
  lastAutoTableY?: number;
  finalY?: number;
  pageCount?: number;
}


const Reports: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
//   const [dateRange, setDateRange] = useState<[moment.Moment, moment.Moment] | null>(null);
//   const [dateRange, setDateRange] = useState<[Moment | null, Moment | null] | null>(null);  // Use Moment here
const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [visitType, setVisitType] = useState<string>('');
  const [patientId, setPatientId] = useState<string>('');
  const [patientStatus, setPatientStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('1');
  
  // Get the doctorId from localStorage
  const { username } = useAuth();
  const doctorId = localStorage.getItem('doctorId') || '';
  const { selectedClinicId, setSelectedClinicId, clinics, selectedClinic } = useClinicContext();


  // Load patients based on current filters
  useEffect(() => {
    if (selectedClinicId) {
      fetchPatients();
    }
  }, [selectedClinicId, currentPage, pageSize, dateRange, visitType]);

  // Fetch patients with filters
  const fetchPatients = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params: SearchParams = {
        doctor_id: doctorId,
        page: currentPage,
        limit: pageSize
      };
      
      // Add optional filters
      if (searchTerm) {
        // Check if search term could be a name or a phone number
        if (/^\d+$/.test(searchTerm)) {
          params.patient_phone = searchTerm;
        } else {
          params.patient_name = searchTerm;
        }
      }
      
      if (patientId) {
        params.patient_id = patientId;
      }
      
      if (dateRange && dateRange[0] && dateRange[1]) {
        // Convert to YYYY-MM-DD format
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      
      if (visitType) {
        params.visit_type = visitType;
      }
      
      if (patientStatus) {
        params.status = patientStatus;
      }
      
      // Use the searchPatients endpoint
      const response = await axios.get(`${API.BASE_URL}/api/patients/search`, { params });
      
      setPatients(response.data.patients);
      setTotalCount(response.data.total);
    } catch (error) {
      console.error('Error fetching patients:', error);
      notification.error({
        message: 'Error',
        description: 'Failed to load patient data'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle clinic selection
  const handleClinicSelect = (clinicId: string) => {
    setSelectedClinicId(clinicId);
  };

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page
    fetchPatients();
  };

  // Generate individual patient report
const generatePatientReport = (patient: Patient) => {
  try {
    console.log('Generating report for patient:', {
      name: patient.patient_name,
      visits: patient.visits?.length || 0
    });
    
    // Get all visits for this patient
    const allVisits = patient.visits || [];
    
    // Sort visits by date (newest first)
    const sortedVisits = [...allVisits].sort((a: Visit, b: Visit) => 
      moment(b.date).valueOf() - moment(a.date).valueOf()
    );
    
    // Create visit rows HTML
    let visitsContent = '';
    
    if (sortedVisits.length === 0) {
      visitsContent = `
        <tr>
          <td colspan="4" style="padding: 8px; text-align: center; font-style: italic;">لا توجد زيارات مسجلة</td>
        </tr>
      `;
    } else {
      // Add each visit as a row
      sortedVisits.forEach((visit: Visit) => {
        const visitDate = moment(visit.date).format('YYYY-MM-DD');
        const visitTime = visit.time || '';
        const dateDisplay = visitTime ? `${visitDate} ${visitTime}` : visitDate;
        
        // Process medications
        let medicationsHtml = '';
        
        if (visit.receipts && visit.receipts.length > 0) {
          visit.receipts.forEach((receipt: any) => {
            if (receipt.drugs && receipt.drugs.length > 0) {
              receipt.drugs.forEach((drug: any) => {
                medicationsHtml += `
                  <div style="margin-bottom: 8px;">
                    <strong>${drug.drug || ''}</strong>
                    ${drug.frequency ? `<br><span style="color: #555;">التكرار: ${drug.frequency}</span>` : ''}
                    ${drug.period ? `<br><span style="color: #555;">المدة: ${drug.period}</span>` : ''}
                    ${drug.timing ? `<br><span style="color: #555;">التوقيت: ${drug.timing}</span>` : ''}
                  </div>
                `;
              });
            }
            
            if (receipt.notes) {
              medicationsHtml += `<div style="font-style: italic; margin-top: 5px; padding-top: 4px; border-top: 1px dotted #ddd; font-size: 12px;">ملاحظات: ${receipt.notes}</div>`;
            }
          });
        }
        
        if (!medicationsHtml) {
          medicationsHtml = '<span style="color: #888;">لا توجد أدوية</span>';
        }
        
        visitsContent += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;">${dateDisplay}</td>
            <td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;">${visit.visit_type || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;">
              <div><strong>الشكوى:</strong> ${visit.complaint || 'غير مسجلة'}</div>
              <div style="margin-top: 5px;"><strong>التشخيص:</strong> ${visit.diagnosis || 'غير مسجل'}</div>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;" dir="rtl">${medicationsHtml}</td>
          </tr>
        `;
      });
    }
    
    // Build the complete HTML report
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>تقرير المريض: ${patient.patient_name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
          
          body { 
            font-family: 'Cairo', Arial, sans-serif; 
            direction: rtl;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
          }
          
          th, td { 
            text-align: right; 
          }
          
          .report-title {
            text-align: center;
            font-size: 24px;
            margin-bottom: 20px;
            color: #2c3e50;
          }
          
          .patient-info {
            background-color: #f5f9ff;
            border: 1px solid #d4e5ff;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 20px;
          }
          
          .patient-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #2c3e50;
          }
          
          .patient-detail {
            display: inline-block;
            margin-right: 20px;
            margin-bottom: 5px;
          }
          
          .section-title {
            font-size: 18px;
            margin: 25px 0 10px 0;
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 5px;
          }
          
          .table-header {
            background-color: #3498db;
            color: white;
            padding: 10px;
            text-align: center;
          }
          
          .report-footer {
            text-align: center;
            font-size: 12px;
            margin-top: 30px;
            color: #777;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }
          
          @media print {
            body {
              padding: 0;
              font-size: 12px;
            }
            
            .no-print {
              display: none;
            }
            
            .patient-info {
              break-inside: avoid;
            }
            
            .section-title {
              break-after: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-title">تقرير المريض${selectedClinic?.name ? ` - ${selectedClinic.name}` : ''}</div>
        
        <div class="patient-info">
          <div class="patient-name">${patient.patient_name || ''}</div>
          <div class="patient-detail"><strong>الهاتف:</strong> ${patient.patient_phone || 'غير متاح'}</div>
          <div class="patient-detail"><strong>العمر:</strong> ${patient.age || 'غير متاح'}</div>
          <div class="patient-detail"><strong>العنوان:</strong> ${patient.address || 'غير متاح'}</div>
          <div class="patient-detail"><strong>إجمالي الزيارات:</strong> ${sortedVisits.length}</div>
          
          ${dateRange && dateRange[0] && dateRange[1] ? `
            <div style="margin-top: 10px; font-size: 13px; color: #666;">
              الفترة: ${dateRange[0].format('YYYY-MM-DD')} إلى ${dateRange[1].format('YYYY-MM-DD')}
            </div>
          ` : ''}
        </div>
        
        <div class="section-title">سجل الزيارات</div>
        <table>
          <thead>
            <tr>
              <th class="table-header" style="width: 18%;">تاريخ الزيارة</th>
              <th class="table-header" style="width: 15%;">نوع الزيارة</th>
              <th class="table-header" style="width: 32%;">الشكوى/التشخيص</th>
              <th class="table-header" style="width: 35%;">الأدوية</th>
            </tr>
          </thead>
          <tbody>
            ${visitsContent}
          </tbody>
        </table>
        
        <div class="report-footer">
          تم إنشاء التقرير في ${moment().format('YYYY-MM-DD HH:mm')}
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 8px 16px; background-color: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: 'Cairo', sans-serif;">
            طباعة التقرير
          </button>
        </div>
      </body>
      </html>
    `;
    
    // Create a blob with the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open the HTML in a new window for printing
    const printWindow = window.open(url, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        // Don't automatically print - let the user click the print button
        URL.revokeObjectURL(url);
      };
    } else {
      // If popup is blocked, provide alternative download
      const link = document.createElement('a');
      link.href = url;
      link.download = `Patient_Report_${patient.patient_name}_${moment().format('YYYYMMDD_HHmm')}.html`;
      link.click();
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
      notification.success({
        message: 'نجاح',
        description: 'تم إنشاء التقرير بنجاح. يرجى فتح الملف في متصفحك وطباعته كـ PDF.'
      });
    }
    
    notification.success({
      message: 'نجاح',
      description: 'تم إنشاء التقرير بنجاح'
    });
  } catch (error) {
    console.error('Error generating patient report:', error);
    notification.error({
      message: 'خطأ',
      description: 'فشل في إنشاء التقرير'
    });
  }
};
  // Generate a summary report for all patients in the current filter
const generatePatientHistoryReport = async () => {
  try {
    setLoading(true);
    
    // Build query parameters
    const params: SearchParams = {
      doctor_id: doctorId,
      limit: 1000
    };

    if (searchTerm) {
      if (/^\d+$/.test(searchTerm)) {
        params.patient_phone = searchTerm;
      } else {
        params.patient_name = searchTerm;
      }
    }
    
    // IMPORTANT: Date range issue fix - adding exact date parameters
    let dateRangeText = '';
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.start_date = dateRange[0].format('YYYY-MM-DD');
      params.end_date = dateRange[1].format('YYYY-MM-DD');
      dateRangeText = `${dateRange[0].format('YYYY-MM-DD')} إلى ${dateRange[1].format('YYYY-MM-DD')}`;
      
      // Debug
      console.log('Date range:', {
        start: params.start_date,
        end: params.end_date
      });
    }
    
    if (visitType) {
      params.visit_type = visitType;
    }
    
    // Fetch patients with their visits data
    // The API will filter PATIENTS based on the date range, but we'll show ALL visits for each patient
    const response = await axios.get(`${API.BASE_URL}/api/patients/search`, { params });
    const allPatients = response.data.patients || [];
    
    // SIMPLER APPROACH: Use table-based layout for better rendering
    let tableContent = '';
    
    // Add patients
    allPatients.forEach((patient: Patient) => {
      // Patient info
      tableContent += `
        <tr>
          <td colspan="4" class="patient-name">${patient.patient_name || 'Unknown'}</td>
        </tr>
        <tr>
          <td style="padding: 5px; width: 25%;" class="patient-info"><strong>الهاتف:</strong> ${patient.patient_phone || 'N/A'}</td>
          <td style="padding: 5px; width: 25%;" class="patient-info"><strong>العمر:</strong> ${patient.age || 'N/A'}</td>
          <td style="padding: 5px; width: 25%;" class="patient-info"><strong>العنوان:</strong> ${patient.address || 'N/A'}</td>
          <td style="padding: 5px; width: 25%;" class="patient-info"><strong>إجمالي الزيارات:</strong> ${(patient.visits || []).length}</td>
        </tr>
      `;
      
      // Visit headers
      tableContent += `
        <tr>
          <th style="padding: 8px; background-color: #428bca; color: white; border: 1px solid #ddd;">تاريخ الزيارة</th>
          <th style="padding: 8px; background-color: #428bca; color: white; border: 1px solid #ddd;">نوع الزيارة</th>
          <th style="padding: 8px; background-color: #428bca; color: white; border: 1px solid #ddd;">الشكوى/التشخيص</th>
          <th style="padding: 8px; background-color: #428bca; color: white; border: 1px solid #ddd;">الأدوية</th>
        </tr>
      `;
      
      // Add visits
      const visits = patient.visits || [];
      
      if (visits.length === 0) {
        tableContent += `
          <tr>
            <td colspan="4" style="padding: 8px; text-align: center; font-style: italic;">No visits recorded</td>
          </tr>
        `;
      } else {
        // Use ALL visits for each patient (don't filter visits)
        // This shows complete patient history regardless of date range
        let filteredVisits = visits;
        
        // If there are no visits that match filter criteria
        if (filteredVisits.length === 0) {
          tableContent += `
            <tr>
              <td style="padding: 8px; text-align: center; font-style: italic;">لا توجد زيارات مسجلة</td>
              <td style="padding: 8px; text-align: center;">-</td>
              <td style="padding: 8px; text-align: center;">-</td>
              <td style="padding: 8px; text-align: center;">-</td>
            </tr>
          `;
        } else {
          // Sort visits by date (newest first)
          const sortedVisits = [...filteredVisits].sort((a: Visit, b: Visit) => 
            moment(b.date).valueOf() - moment(a.date).valueOf()
          );
          
          sortedVisits.forEach((visit: Visit) => {
            const visitDate = moment(visit.date).format('YYYY-MM-DD');
            const visitTime = visit.time || '';
            const dateDisplay = visitTime ? `${visitDate} ${visitTime}` : visitDate;
            
            // Process medications - directly iterate through receipts and drugs
            let medicationsHtml = '';
            
            if (visit.receipts && visit.receipts.length > 0) {
              visit.receipts.forEach((receipt: any) => {
                if (receipt.drugs && receipt.drugs.length > 0) {
                  receipt.drugs.forEach((drug: any) => {
                    medicationsHtml += `
                      <div style="margin-bottom: 5px;">
                        <strong>${drug.drug || ''}</strong>
                        ${drug.frequency ? `<br>التكرار: ${drug.frequency}` : ''}
                        ${drug.period ? `<br>المدة: ${drug.period}` : ''}
                        ${drug.timing ? `<br>التوقيت: ${drug.timing}` : ''}
                      </div>
                    `;
                  });
                }
                
                if (receipt.notes) {
                  medicationsHtml += `<div style="font-style: italic; margin-top: 5px; font-size: 12px;">ملاحظات: ${receipt.notes}</div>`;
                }
              });
            }
            
            if (!medicationsHtml) {
              medicationsHtml = 'لا توجد أدوية';
            }
            
            tableContent += `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;">${dateDisplay}</td>
                <td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;">${visit.visit_type || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;">
                  <div><strong>الشكوى:</strong> ${visit.complaint || 'غير مسجلة'}</div>
                  <div><strong>التشخيص:</strong> ${visit.diagnosis || 'غير مسجل'}</div>
                </td>
                <td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;" dir="rtl">${medicationsHtml}</td>
              </tr>
            `;
          });
        }
      }
      
      // Add spacing after each patient
      tableContent += `
        <tr>
          <td colspan="4" style="height: 30px;"></td>
        </tr>
      `;
    });
    
    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Patient History Report</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
          
          body { 
            font-family: 'Cairo', Arial, sans-serif; 
            direction: rtl;
            padding: 20px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
          }
          th, td { 
            text-align: right; 
          }
          .report-title {
            text-align: center;
            font-size: 24px;
            margin-bottom: 10px;
          }
          .report-subtitle {
            text-align: center;
            font-size: 16px;
            margin-bottom: 20px;
          }
          .report-date {
            text-align: center;
            font-size: 12px;
            margin-bottom: 30px;
          }
          .report-footer {
            text-align: center;
            font-size: 10px;
            margin-top: 30px;
            color: #888;
          }
          .patient-name {
            font-size: 16px;
            font-weight: bold;
            background-color: #f0f7ff;
            padding: 8px;
            border-radius: 4px;
          }
          .patient-info {
            margin-bottom: 5px;
          }
        </style>
      </head>
      <body>
        <div class="report-title">تقرير سجل المرضى</div>
        <div class="report-subtitle">${selectedClinic?.name || ''}</div>
        <div class="report-date">
          ${dateRange && dateRange[0] && dateRange[1] ? 
            `الفترة: ${dateRange[0].format('YYYY-MM-DD')} إلى ${dateRange[1].format('YYYY-MM-DD')} (يعرض التقرير السجل الكامل للمرضى في هذه الفترة)` : ''}
          ${visitType ? ` | نوع الزيارة: ${visitType}` : ''}
          ${searchTerm ? ` | البحث: ${searchTerm}` : ''}
        </div>
        
        <table>
          ${tableContent || '<tr><td style="text-align: center;">لا توجد بيانات مطابقة لمعايير البحث.</td></tr>'}
        </table>
        
        <div class="report-footer">
          تم إنشاء التقرير في ${moment().format('YYYY-MM-DD HH:mm')}
        </div>
      </body>
      </html>
    `;
    
    // Create a blob with the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open the HTML in a new window for printing
    const printWindow = window.open(url, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        URL.revokeObjectURL(url);
      };
    } else {
      // If popup is blocked, provide alternative download
      const link = document.createElement('a');
      link.href = url;
      link.download = `Patient_History_Report_${moment().format('YYYYMMDD_HHmm')}.html`;
      link.click();
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
      notification.success({
        message: 'Report Generated',
        description: 'Report saved as HTML. Please open it in your browser and print to PDF.'
      });
    }
    
    setLoading(false);
  } catch (error) {
    console.error('Error generating patient history report:', error);
    notification.error({
      message: 'Error',
      description: 'Failed to generate patient history report'
    });
    setLoading(false);
  }
};
  // Generate enhanced summary report
  const generateEnhancedSummaryReport = async () => {
    try {
      setLoading(true);
      
      // Build query parameters to get all matching patients
      const params: SearchParams = {
        doctor_id: doctorId,
        limit: 1000 // Get more patients for the report
      };
      
      if (searchTerm) {
        if (/^\d+$/.test(searchTerm)) {
          params.patient_phone = searchTerm;
        } else {
          params.patient_name = searchTerm;
        }
      }
      
      if (patientId) {
        params.patient_id = patientId;
      }
      
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      
      if (visitType) {
        params.visit_type = visitType;
      }
      
      if (patientStatus) {
        params.status = patientStatus;
      }
      
      // Fetch all patients matching the criteria
      const response = await axios.get(`${API.BASE_URL}/api/patients/search`, { params });
      const allPatients = response.data.patients || [];
      
      // Initialize PDF document with correct settings
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add report title
      doc.setFontSize(18);
      doc.text(`Patient Summary Report - ${selectedClinic?.name || ''}`, 150, 10, { align: 'center' });
      
      // Add report criteria
      doc.setFontSize(10);
      let reportCriteria = 'Criteria: ';
      if (dateRange && dateRange[0] && dateRange[1]) {
        reportCriteria += `Date Range: ${dateRange[0].format('YYYY-MM-DD')} to ${dateRange[1].format('YYYY-MM-DD')}`;
      }
      if (visitType) {
        reportCriteria += ` | Visit Type: ${visitType}`;
      }
      if (searchTerm) {
        reportCriteria += ` | Search: ${searchTerm}`;
      }
      if (patientStatus) {
        reportCriteria += ` | Status: ${patientStatus}`;
      }
      
      doc.text(reportCriteria, 150, 18, { align: 'center' });
      doc.text(`Total Patients: ${allPatients.length}`, 150, 26, { align: 'center' });
      
      // Create enhanced summary table with more columns
      const summaryRows: Array<Array<string | number>> = allPatients.map((patient: Patient) => {
        // Count total visits in date range
        let visitsInRange = patient.visits || [];
        if (dateRange && dateRange[0] && dateRange[1]) {
          const startDate =  moment().startOf('day');
          const endDate =  moment().endOf('day');
          
          visitsInRange = visitsInRange.filter(visit => {
            const visitDate = moment(visit.date);
            return visitDate.isBetween(startDate, endDate, null, '[]');
          });
        }
        
        // Count total prescriptions
        const totalPrescriptions = visitsInRange.reduce((sum: number, visit: Visit) => 
          sum + (visit.receipts ? visit.receipts.length : 0), 0);
        
        // Get last visit date and time
        let lastVisitDate = 'N/A';
        let lastVisitType = 'N/A';
        let lastVisitStatus = 'N/A';
        
        if (visitsInRange.length > 0) {
          const sortedVisits = [...visitsInRange].sort((a: Visit, b: Visit) => 
            moment(b.date).valueOf() - moment(a.date).valueOf());
          
          const lastVisit = sortedVisits[0];
          lastVisitDate = moment(lastVisit.date).format('YYYY-MM-DD');
          lastVisitType = lastVisit.visit_type || 'N/A';
          // If the visit has a status, use it, otherwise use the patient status
          lastVisitStatus = lastVisit.date || patient.date || 'N/A';
        }
        
        // Registration date
        const registrationDate = patient.date ? 
          moment(patient.date).format('YYYY-MM-DD') : 'N/A';
        
        return [
          patient.patient_name,
          patient.patient_id || 'N/A',
          patient.patient_phone,
          patient.age || 'N/A',
          registrationDate,
          visitsInRange.length,
          totalPrescriptions,
          lastVisitDate,
          lastVisitType,
          lastVisitStatus
        ];
      });
      
      // Use autoTable with improved settings for the enhanced data
      autoTable(doc, {
        startY: 35,
        head: [['Patient Name', 'Patient ID', 'Phone', 'Age', 'Registration Date', 'Total Visits', 'Total Prescriptions', 'Last Visit', 'Last Visit Type', 'Status']],
        body: summaryRows,
        theme: 'grid',
        styles: { 
          halign: 'center', 
          font: 'helvetica', 
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: { 
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold' 
        },
        tableLineWidth: 0.1,
        margin: { top: 35, right: 10, bottom: 10, left: 10 }
      });
      
      // Add report generation info at the bottom
      doc.setFontSize(8);
      doc.text(`Report generated on ${moment().format('YYYY-MM-DD HH:mm')}`, 150, 200, { align: 'center' });
      
      // Save the PDF with a clean name
      doc.save(`Enhanced_Patient_Summary_Report_${moment().format('YYYYMMDD_HHmm')}.pdf`);
      
      notification.success({
        message: 'Success',
        description: 'Enhanced summary report generated successfully'
      });
    } catch (error) {
      console.error('Error generating enhanced summary report:', error);
      notification.error({
        message: 'Error',
        description: 'Failed to generate enhanced summary report'
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate an analytical report with statistics
const generateAnalyticalReport = async () => {
  try {
    setLoading(true);
    
    // Fetch all patients matching the criteria
    const params: SearchParams = {
      doctor_id: doctorId,
      limit: 1000
    };
    
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.start_date = dateRange[0].format('YYYY-MM-DD');
      params.end_date = dateRange[1].format('YYYY-MM-DD');
    }
    
    const response = await axios.get(`${API.BASE_URL}/api/patients/search`, { params });
    const allPatients = response.data.patients || [];
    
    // Calculate statistics
    
    // Age distribution
    const ageGroups = {
      'أقل من 18': 0,
      '18-30': 0,
      '31-45': 0,
      '46-60': 0,
      'أكبر من 60': 0,
      'غير معروف': 0
    };
    
    allPatients.forEach((patient: Patient) => {
      const age = parseInt(patient.age || '');
      if (isNaN(age)) {
        ageGroups['غير معروف']++;
      } else if (age < 18) {
        ageGroups['أقل من 18']++;
      } else if (age <= 30) {
        ageGroups['18-30']++;
      } else if (age <= 45) {
        ageGroups['31-45']++;
      } else if (age <= 60) {
        ageGroups['46-60']++;
      } else {
        ageGroups['أكبر من 60']++;
      }
    });
    
    // Create age distribution table content
    let ageTableContent = '';
    Object.entries(ageGroups).forEach(([range, count]) => {
      const percentage = allPatients.length > 0 ? (count / allPatients.length * 100).toFixed(1) : '0.0';
      ageTableContent += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${range}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${count}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${percentage}%</td>
        </tr>
      `;
    });
    
    // Visit type distribution
    const visitTypes: {[key: string]: number} = {};
    let totalVisits = 0;
    
    allPatients.forEach((patient: Patient) => {
      if (patient.visits && patient.visits.length > 0) {
        patient.visits.forEach((visit: Visit) => {
          const type = visit.visit_type || 'غير معروف';
          visitTypes[type] = (visitTypes[type] || 0) + 1;
          totalVisits++;
        });
      }
    });
    
    // Create visit type table content
    let visitTypeTableContent = '';
    if (totalVisits > 0) {
      Object.entries(visitTypes).forEach(([type, count]) => {
        const percentage = (count / totalVisits * 100).toFixed(1);
        visitTypeTableContent += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${type}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${count}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${percentage}%</td>
          </tr>
        `;
      });
    } else {
      visitTypeTableContent = `
        <tr>
          <td colspan="3" style="padding: 8px; text-align: center; font-style: italic;">لا توجد بيانات للزيارات</td>
        </tr>
      `;
    }
    
    // Monthly visit trends
    let monthlyTableContent = '';
    if (dateRange && dateRange[0] && dateRange[1]) {
      // Get actual date range from the provided dates
      const startMonth = moment().clone().startOf('month');
      const endMonth = moment().clone().endOf('month');
      const monthlyVisits: {[key: string]: number} = {};
      
      // Initialize all months in range
      let currentMonth = moment(startMonth);
      while (currentMonth.isSameOrBefore(endMonth, 'month')) {
        const monthKey = currentMonth.format('YYYY-MM');
        monthlyVisits[monthKey] = 0;
        currentMonth.add(1, 'month');
      }
      
      // Count visits per month
      allPatients.forEach((patient: Patient) => {
        if (patient.visits && patient.visits.length > 0) {
          patient.visits.forEach((visit: Visit) => {
            const visitDate = moment(visit.date);
            if (visitDate.isBetween(startMonth, endMonth, null, '[]')) {
              const monthKey = visitDate.format('YYYY-MM');
              monthlyVisits[monthKey] = (monthlyVisits[monthKey] || 0) + 1;
            }
          });
        }
      });
      
      // Convert month names to Arabic
      const arabicMonths: {[key: string]: string} = {
        'January': 'يناير',
        'February': 'فبراير',
        'March': 'مارس',
        'April': 'أبريل',
        'May': 'مايو',
        'June': 'يونيو',
        'July': 'يوليو',
        'August': 'أغسطس',
        'September': 'سبتمبر',
        'October': 'أكتوبر',
        'November': 'نوفمبر',
        'December': 'ديسمبر'
      };
      
      // Create monthly table content
      Object.entries(monthlyVisits).forEach(([month, count]) => {
        // Get English month name
        const englishMonth = moment(month, 'YYYY-MM').format('MMMM');
        const year = moment(month, 'YYYY-MM').format('YYYY');
        // Convert to Arabic month name
        const arabicMonth = arabicMonths[englishMonth] || englishMonth;
        const displayMonth = `${arabicMonth} ${year}`;
        
        monthlyTableContent += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${displayMonth}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${count}</td>
          </tr>
        `;
      });
    } else {
      monthlyTableContent = `
        <tr>
          <td colspan="2" style="padding: 8px; text-align: center; font-style: italic;">لم يتم تحديد نطاق زمني</td>
        </tr>
      `;
    }
    
    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>تقرير تحليلي للمرضى</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
          
          body { 
            font-family: 'Cairo', Arial, sans-serif; 
            direction: rtl;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          
          h1, h2, h3 {
            color: #2c3e50;
          }
          
          h1 {
            text-align: center;
            font-size: 24px;
            margin-bottom: 10px;
          }
          
          h2 {
            font-size: 18px;
            margin: 30px 0 15px 0;
            border-bottom: 2px solid #3498db;
            padding-bottom: 5px;
          }
          
          .summary-box {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
          }
          
          .criteria {
            color: #666;
            font-size: 14px;
            margin: 10px 0 20px 0;
            text-align: center;
          }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px;
          }
          
          th { 
            background-color: #3498db; 
            color: white; 
            text-align: right; 
            padding: 10px 8px;
            border: 1px solid #2980b9;
          }
          
          td { 
            text-align: right; 
            border: 1px solid #ddd;
            padding: 8px;
          }
          
          tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          
          .footer {
            text-align: center;
            font-size: 12px;
            color: #777;
            margin-top: 30px;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }
          
          @media print {
            body {
              padding: 0;
            }
            
            .no-print {
              display: none;
            }
            
            table {
              page-break-inside: avoid;
            }
            
            h2 {
              page-break-after: avoid;
            }
            
            .summary-box, .criteria {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <h1>تقرير تحليلي للمرضى${selectedClinic?.name ? ` - ${selectedClinic.name}` : ''}</h1>
        
        <div class="criteria">
          ${dateRange && dateRange[0] && dateRange[1] ? 
            `الفترة: ${dateRange[0].format('YYYY-MM-DD')} إلى ${dateRange[1].format('YYYY-MM-DD')}` : ''}
          ${visitType ? ` | نوع الزيارة: ${visitType}` : ''}
        </div>
        
        <div class="summary-box">
          <strong>إجمالي المرضى:</strong> ${allPatients.length} &nbsp;&nbsp;
          <strong>إجمالي الزيارات:</strong> ${totalVisits}
        </div>
        
        <h2>البيانات الديموغرافية للمرضى</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 40%;">الفئة العمرية</th>
              <th style="width: 30%;">العدد</th>
              <th style="width: 30%;">النسبة</th>
            </tr>
          </thead>
          <tbody>
            ${ageTableContent}
          </tbody>
        </table>
        
        <h2>توزيع أنواع الزيارات</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 40%;">نوع الزيارة</th>
              <th style="width: 30%;">العدد</th>
              <th style="width: 30%;">النسبة</th>
            </tr>
          </thead>
          <tbody>
            ${visitTypeTableContent}
          </tbody>
        </table>
        
        <h2>اتجاهات الزيارات الشهرية</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 60%;">الشهر</th>
              <th style="width: 40%;">إجمالي الزيارات</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyTableContent}
          </tbody>
        </table>
        
        <div class="footer">
          تم إنشاء التقرير في ${moment().format('YYYY-MM-DD HH:mm')}
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 8px 16px; background-color: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: 'Cairo', sans-serif;">
            طباعة التقرير
          </button>
        </div>
      </body>
      </html>
    `;
    
    // Create a blob with the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open the HTML in a new window for printing
    const printWindow = window.open(url, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        // Don't automatically print - let the user click the print button
        URL.revokeObjectURL(url);
      };
    } else {
      // If popup is blocked, provide alternative download
      const link = document.createElement('a');
      link.href = url;
      link.download = `Analytics_Report_${moment().format('YYYYMMDD_HHmm')}.html`;
      link.click();
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
      notification.success({
        message: 'نجاح',
        description: 'تم إنشاء التقرير التحليلي بنجاح. يرجى فتح الملف في متصفحك وطباعته كـ PDF.'
      });
    }
    
    notification.success({
      message: 'نجاح',
      description: 'تم إنشاء التقرير التحليلي بنجاح'
    });
    
    setLoading(false);
  } catch (error) {
    console.error('Error generating analytical report:', error);
    notification.error({
      message: 'خطأ',
      description: 'فشل في إنشاء التقرير التحليلي'
    });
    setLoading(false);
  }
};

  return (
    <Layout style={{ minHeight: '100vh' }}>
     <DashboardSidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        />
      <Layout className="site-layout">
      {/* <DashboardHeader 
        onSettingsClick={collapsed} 
        setCollapsed={setCollapsed}
        /> */}
        <Content style={{ margin: '0 16px' }}>
          <div className="site-layout-background" style={{ padding: 24, minHeight: 360 }}>
            <Title level={3}>Reports</Title>
            
          <ClinicSelector 
                // clinics={clinics} 
                // selectedClinicId={selectedClinicId || undefined} 
                onClinicSelect={handleClinicSelect} 
                />
            
            <Card style={{ marginTop: 16 }}>
              <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab="Patient Reports" key="1">
                  <Form layout="vertical">
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item label="Search">
                          <Input 
                            placeholder="Search by name or phone"
                            prefix={<SearchOutlined />}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="Date Range">
          <RangePicker
                style={{ width: '100%' }}
                value={dateRange}  // This will show the Moment date range
                onChange={(dates) => setDateRange(dates)}  // Dates will be handled as Moment objects
                allowClear
/>
                        </Form.Item>
                      </Col>
                      {/* <Col span={8}>
                        <Form.Item label="Visit Type">
                          <Select
                            placeholder="Select visit type"
                            value={visitType}
                            onChange={setVisitType}
                            allowClear
                          >
                            <Option value="new">New</Option>
                            <Option value="followup">Follow-up</Option>
                            <Option value="emergency">Emergency</Option>
                          </Select>
                        </Form.Item>
                      </Col> */}
                    </Row>
                    <Row justify="end">
                      <Space>
                        <Button 
                          type="primary" 
                          icon={<SearchOutlined />} 
                          onClick={handleSearch}
                          loading={loading}
                        >
                          Search
                        </Button>
                        <Button 
                          icon={<FilePdfOutlined />} 
                          onClick={generatePatientHistoryReport}
                          loading={loading}
                        >
                          Generate Summary
                        </Button>
                        <Button 
                          icon={<BarChartOutlined />} 
                          onClick={generateAnalyticalReport}
                          loading={loading}
                        >
                          Analytics Report
                        </Button>
                      </Space>
                    </Row>
                  </Form>
                  
                  <Table
                    style={{ marginTop: 24 }}
                    dataSource={patients}
                    columns={[
                      {
                        title: 'Patient Name',
                        dataIndex: 'patient_name',
                        key: 'patient_name',
                      },
                      {
                        title: 'Phone',
                        dataIndex: 'patient_phone',
                        key: 'patient_phone',
                      },
                      {
                        title: 'Visits',
                        dataIndex: 'visits',
                        key: 'visits',
                        render: (visits) => visits?.length || 0,
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        render: (_, record) => (
                          <Button 
                            type="link" 
                            icon={<FilePdfOutlined />}
                            onClick={() => generatePatientReport(record)}
                          >
                            Generate Report
                          </Button>
                        ),
                      },
                    ]}
                    rowKey="patient_id"
                    loading={loading}
                    pagination={{
                      current: currentPage,
                      pageSize: pageSize,
                      total: totalCount,
                      onChange: (page, pageSize) => {
                        setCurrentPage(page);
                        setPageSize(pageSize || 10);
                      },
                      showSizeChanger: true,
                    }}
                  />
                </TabPane>
              </Tabs>
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Reports;
