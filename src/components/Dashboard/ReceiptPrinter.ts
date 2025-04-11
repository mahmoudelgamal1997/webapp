// src/components/Dashboard/ReceiptPrinter.ts
import moment from 'moment';
import { Receipt } from '../type';

interface Clinic {
  name?: string;
  address?: string;
  phone?: string;
  [key: string]: any; // Allow other properties
}

interface DoctorSettings {
  clinicName?: string;
  doctorTitle?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  [key: string]: any; // Allow other properties
}

interface Patient {
  patient_name?: string;
  age?: string;
  [key: string]: any; // Allow other properties
}

class ReceiptPrinter {
  /**
   * Prints a receipt for a patient
   * @param receipt The receipt to print
   * @param patient The patient the receipt is for
   * @param clinic The clinic information
   * @param doctorSettings The doctor's custom settings
   */
  static printReceipt(
    receipt: Receipt,
    patient: Patient,
    clinic?: Clinic,
    doctorSettings?: DoctorSettings
  ): void {
    console.log('Printing receipt:', receipt);
    
    // Format the clinic information for the header
    const clinicInfo: string[] = [];
    
    // First try to use clinic from context if available
    if (clinic) {
      clinicInfo.push(`<h1>${clinic.name || 'عيادة'}</h1>`);
      if (clinic.address) {
        clinicInfo.push(`<p>${clinic.address}</p>`);
      }
      if (clinic.phone) {
        clinicInfo.push(`<p>هاتف: ${clinic.phone}</p>`);
      }
    }
    
    // Then override with doctor settings if available
    if (doctorSettings?.clinicName) clinicInfo.push(`<h1>${doctorSettings.clinicName}</h1>`);
    if (doctorSettings?.doctorTitle) clinicInfo.push(`<h3>${doctorSettings.doctorTitle}</h3>`);
    if (doctorSettings?.clinicAddress) clinicInfo.push(`<p>${doctorSettings.clinicAddress}</p>`);
    if (doctorSettings?.clinicPhone) clinicInfo.push(`<p>هاتف: ${doctorSettings.clinicPhone}</p>`);
    
    // Safely access drugs array with a fallback
    const drugs = receipt.drugs || [];
    
    // Generate drugs HTML
    const drugsHtml = drugs.map((drug, index) => `
      <div class="drug-item">
        <h4>${index + 1}. ${drug.drug}</h4>
        <p>التكرار: ${drug.frequency} | المدة: ${drug.period} | التوقيت: ${drug.timing}</p>
      </div>
    `).join('');
    
    // Generate notes HTML
    const notesHtml = receipt.notes ? `
      <div class="notes">
        <h3>ملاحظات:</h3>
        <p>${receipt.notes}</p>
      </div>
    ` : '';
    
    // Generate footer HTML
    const footerHtml = doctorSettings?.receiptFooter ? `
      <div class="footer">
        ${doctorSettings.receiptFooter}
      </div>
    ` : '';
    
    // Get receipt date with fallback
    const receiptDate = receipt.date ? moment(receipt.date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
    
    // Implement print functionality
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Patient Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; direction: rtl; }
              .receipt { padding: 20px; max-width: 800px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 15px; }
              .clinic-info { margin-bottom: 15px; }
              .patient-info { margin-bottom: 20px; padding: 10px; background-color: #f8f8f8; border-radius: 5px; }
              .drug-item { margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 5px; }
              .notes { margin-top: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }
              .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 15px; text-align: center; font-style: italic; }
              h1, h2, h3 { margin: 5px 0; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <div class="clinic-info">
                  ${clinicInfo.length > 0 ? clinicInfo.join('') : '<h2>روشتة طبية</h2>'}
                </div>
                ${doctorSettings?.receiptHeader ? `<div class="custom-header">${doctorSettings.receiptHeader}</div>` : ''}
              </div>
              
              <div class="patient-info">
                <h3>اسم المريض: ${patient?.patient_name || 'غير محدد'}</h3>
                <p>العمر: ${patient?.age || 'غير محدد'}</p>
                <p>تاريخ: ${receiptDate}</p>
              </div>
              
              <div class="drugs">
                <h3>الأدوية:</h3>
                ${drugsHtml}
              </div>
              
              ${notesHtml}
              ${footerHtml}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }
}

export default ReceiptPrinter;