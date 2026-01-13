// src/components/PatientReportButton.tsx
import React from 'react';
import { Button, notification } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import moment from 'moment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDoctorContext } from './DoctorContext';
import { useClinicContext } from './ClinicContext';

// Define proper types
interface Drug {
  drug: string;
  frequency: string;
  period: string;
  timing: string;
  _id?: string;
}

interface Receipt {
  date: string;
  drugs: Drug[];
  notes: string;
}

interface Visit {
  visit_id: string;
  visit_type: string;
  date: string;
  complaint: string;
  diagnosis: string;
  receipts: Receipt[];
}

interface Patient {
  _id: string;
  patient_name: string;
  patient_phone: string;
  patient_id: string;
  age: string;
  address: string;
  visits: Visit[];
}

interface PatientReportButtonProps {
  patient: Patient;
  buttonText?: string;
  showIcon?: boolean;
}

// Define the return type for autoTable
interface AutoTableOutput {
  lastAutoTableY: number;
  finalY?: number;
  pageNumber?: number;
  pageCount?: number;
}

const PatientReportButton: React.FC<PatientReportButtonProps> = ({ patient, buttonText = "تقرير المريض", showIcon = true }) => {
  const { settings: doctorSettings } = useDoctorContext();
  const { selectedClinic } = useClinicContext();
  
  // Function to generate and download PDF report
  // Fix the generatePDF function in PatientReportButton.tsx

const generatePDF = () => {
  try {
    // Initialize PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Don't use RTL for the whole document
    // doc.setR2L(true);
    
    // Add clinic/doctor info to header
    // Prioritize doctor settings, then fall back to selected clinic
    const displayClinicName = doctorSettings.clinicName || selectedClinic?.name || 'عيادة';
    const displayClinicAddress = doctorSettings.clinicAddress || selectedClinic?.address || '';
    const displayClinicPhone = doctorSettings.clinicPhone || selectedClinic?.phone || '';
    
    // Only show clinic name if it's not "Unnamed Clinic"
    if (displayClinicName && displayClinicName !== 'Unnamed Clinic') {
      doc.setFontSize(18);
      doc.text(displayClinicName, 105, 15, { align: 'center' });
    }
    
    // Add doctor title if available
    if (doctorSettings.doctorTitle) {
      doc.setFontSize(14);
      doc.text(doctorSettings.doctorTitle, 105, 25, { align: 'center' });
    }
    
    // Add address if available
    if (displayClinicAddress) {
      doc.setFontSize(12);
      doc.text(displayClinicAddress, 105, displayClinicAddress ? 32 : 25, { align: 'center' });
    }
    
    // Add phone if available
    if (displayClinicPhone) {
      doc.setFontSize(12);
      const yPos = displayClinicAddress ? 38 : (displayClinicAddress ? 32 : 25);
      doc.text(`هاتف: ${displayClinicPhone}`, 105, yPos, { align: 'center' });
    }
    
    if (doctorSettings.doctorTitle) {
      doc.setFontSize(14);
      doc.text(doctorSettings.doctorTitle, 105, 25, { align: 'center' });
    }
    
    if (doctorSettings.clinicAddress) {
      doc.setFontSize(12);
      doc.text(doctorSettings.clinicAddress, 105, 32, { align: 'center' });
    }
    
    if (doctorSettings.clinicPhone) {
      doc.setFontSize(12);
      doc.text(`هاتف: ${doctorSettings.clinicPhone}`, 105, 38, { align: 'center' });
    }
    
    // Add report title
    doc.setFontSize(16);
    doc.text(`تقرير المريض`, 105, 48, { align: 'center' });
    
    // Add patient info
    doc.setFontSize(12);
    doc.text(`اسم المريض: ${patient.patient_name}`, 200, 60, { align: 'right' });
    doc.text(`رقم الهاتف: ${patient.patient_phone}`, 200, 67, { align: 'right' });
    doc.text(`العمر: ${patient.age || 'غير محدد'}`, 200, 74, { align: 'right' });
    doc.text(`العنوان: ${patient.address || 'غير محدد'}`, 200, 81, { align: 'right' });
    
    // Sort visits by date (newest first)
    const sortedVisits = [...(patient.visits || [])].sort((a, b) => 
      moment(b.date).valueOf() - moment(a.date).valueOf()
    );
    
    // Add visits table
    const visitRows = sortedVisits.map(visit => [
      moment(visit.date).format('YYYY-MM-DD'),
      visit.visit_type || 'كشف',
      visit.complaint || 'غير محدد',
      visit.diagnosis || 'غير محدد',
      visit.receipts ? visit.receipts.length : 0
    ]);
    
    doc.setFontSize(14);
    doc.text('سجل الزيارات', 105, 95, { align: 'center' });
    
    // Cast the result to our AutoTableOutput type
    const visitTable = autoTable(doc, {
      startY: 100,
      head: [['التاريخ', 'نوع الزيارة', 'الشكوى', 'التشخيص', 'عدد الروشتات']],
      body: visitRows,
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
      margin: { top: 100, right: 10, bottom: 10, left: 10 }
    }) as unknown as AutoTableOutput;
    
    // Add prescriptions section
    let yPos = visitTable.lastAutoTableY + 10;
    doc.setFontSize(14);
    doc.text('الروشتات الطبية', 105, yPos, { align: 'center' });
    yPos += 10;
    
    // Loop through visits to show prescriptions
    for (let i = 0; i < Math.min(sortedVisits.length, 5); i++) {
      const visit = sortedVisits[i];
      
      if (visit.receipts && visit.receipts.length > 0) {
        for (const receipt of visit.receipts) {
          // Check if we need a new page
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }
          
          const receiptDate = moment(receipt.date).format('YYYY-MM-DD');
          doc.setFontSize(12);
          doc.text(`تاريخ الزيارة: ${moment(visit.date).format('YYYY-MM-DD')} - تاريخ الروشتة: ${receiptDate}`, 200, yPos, { align: 'right' });
          yPos += 8;
          
          if (receipt.drugs && receipt.drugs.length > 0) {
            const drugRows = receipt.drugs.map((drug, idx) => [
              idx + 1,
              drug.drug,
              drug.frequency,
              drug.period,
              drug.timing
            ]);
            
            // Cast the result to our AutoTableOutput type
            const drugTable = autoTable(doc, {
              startY: yPos,
              head: [['#', 'الدواء', 'التكرار', 'المدة', 'التوقيت']],
              body: drugRows,
              theme: 'grid',
              styles: { 
                halign: 'center', 
                font: 'helvetica', 
                fontSize: 8,
                cellPadding: 2
              },
              headStyles: { 
                fillColor: [92, 184, 92],
                textColor: 255,
                fontStyle: 'bold'
              }
            }) as unknown as AutoTableOutput;
            
            yPos = drugTable.lastAutoTableY + 5;
            
            if (receipt.notes) {
              doc.setFontSize(10);
              doc.text('ملاحظات:', 200, yPos, { align: 'right' });
              doc.text(receipt.notes, 195, yPos + 5, { align: 'right', maxWidth: 180 });
              yPos += 15;
            }
          } else {
            doc.text('لا توجد أدوية مسجلة', 105, yPos, { align: 'center' });
            yPos += 10;
          }
          
          // Add a separator between receipts
          doc.setDrawColor(200, 200, 200);
          doc.line(20, yPos, 190, yPos);
          yPos += 10;
        }
      }
    }
    
    // Add report generation info at the bottom
    doc.setFontSize(8);
    doc.text(`تم إنشاء التقرير بتاريخ ${moment().format('YYYY-MM-DD HH:mm')}`, 105, 285, { align: 'center' });
    
    // Save the PDF with a timestamp
    doc.save(`Patient_Report_${patient.patient_name}_${moment().format('YYYYMMDD_HHmm')}.pdf`);
    
    notification.success({
      message: 'نجاح',
      description: 'تم إنشاء التقرير بنجاح'
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    notification.error({
      message: 'خطأ',
      description: 'فشل في إنشاء التقرير'
    });
  }
};



  return (
    <Button 
      type="primary" 
      onClick={generatePDF}
      icon={showIcon ? <FilePdfOutlined /> : null}
      size="middle"
    >
      {buttonText}
    </Button>
  );
};

export default PatientReportButton;