import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  getDoc,
  orderBy, 
  limit,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { db } from '../firebaseConfig';

/**
 * Send a notification from doctor to assistant
 * @param {Object} notificationData - Notification information
 * @param {string} notificationData.doctor_id - Doctor ID
 * @param {string} notificationData.clinic_id - Clinic ID
 * @param {string} notificationData.assistant_id - Assistant ID
 * @param {string} notificationData.message - Notification message
 * @param {string} notificationData.type - Notification type (optional)
 * @returns {Promise<Object>} Created notification document
 */
export const sendNotificationToAssistant = async (notificationData) => {
  try {
    const notificationDoc = {
      doctor_id: notificationData.doctor_id,
      clinic_id: notificationData.clinic_id,
      assistant_id: notificationData.assistant_id,
      message: notificationData.message,
      type: notificationData.type || 'custom',
      read: false,
      createdAt: serverTimestamp(),
      doctor_name: notificationData.doctor_name || '',
      clinic_name: notificationData.clinic_name || '',
      patient_name: notificationData.patient_name || ''
    };

    const notificationsRef = collection(db, 'doctor_assistant_notifications');
    const docRef = await addDoc(notificationsRef, notificationDoc);

    console.log('Notification document created:', docRef.id);
    console.log('✅ Firebase trigger function will automatically send push notification');
    console.log('📝 If notification not received, check Firebase Functions logs');
    
    // Note: The Firestore trigger function (onDoctorAssistantNotificationCreated) 
    // will automatically send the push notification when this document is created.
    // No need to call HTTP function - the trigger handles it.
    
    return { id: docRef.id, ...notificationDoc };
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Get notifications for an assistant
 * @param {string} assistantId - Assistant ID
 * @param {number} limitCount - Maximum number of notifications to fetch
 * @returns {Promise<Array>} Array of notification documents
 */
export const getNotificationsForAssistant = async (assistantId, limitCount = 50) => {
  try {
    const notificationsRef = collection(db, 'doctor_assistant_notifications');
    const q = query(
      notificationsRef,
      where('assistant_id', '==', assistantId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification document ID
 * @returns {Promise<void>}
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'doctor_assistant_notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Get unread notifications count for an assistant
 * @param {string} assistantId - Assistant ID
 * @returns {Promise<number>} Count of unread notifications
 */
export const getUnreadNotificationsCount = async (assistantId) => {
  try {
    const notificationsRef = collection(db, 'doctor_assistant_notifications');
    const q = query(
      notificationsRef,
      where('assistant_id', '==', assistantId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    throw error;
  }
};

/**
 * Setup real-time listener for notifications
 * @param {string} assistantId - Assistant ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export const listenToNotifications = (assistantId, callback) => {
  try {
    const notificationsRef = collection(db, 'doctor_assistant_notifications');
    const q = query(
      notificationsRef,
      where('assistant_id', '==', assistantId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      callback(notifications);
    }, (error) => {
      console.error('Error in notifications listener:', error);
    });
  } catch (error) {
    console.error('Error setting up notifications listener:', error);
    throw error;
  }
};

/**
 * Get assistants for a doctor and clinic
 * @param {string} doctorId - Doctor ID
 * @param {string} clinicId - Clinic ID
 * @returns {Promise<Array>} Array of assistant documents
 */
export const getAssistantsForDoctorClinic = async (doctorId, clinicId) => {
  try {
    console.log('Fetching assistants for doctor:', doctorId, 'clinic:', clinicId);
    
    const relationshipsRef = collection(db, 'doctor_clinic_assistant');
    const q = query(
      relationshipsRef,
      where('doctor_id', '==', doctorId),
      where('clinic_id', '==', clinicId)
    );
    const snapshot = await getDocs(q);
    const relationships = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log('Found relationships:', relationships.length, relationships);
    
    if (relationships.length === 0) {
      console.warn('No relationships found for doctor:', doctorId, 'clinic:', clinicId);
      console.log('Make sure relationships are created in admin portal');
      return [];
    }
    
    // Get assistant details
    const assistants = [];
    for (const rel of relationships) {
      const assistantId = rel.assistant_id;
      console.log('Fetching assistant document:', assistantId);
      
      const assistantDoc = doc(db, 'assistants', assistantId);
      const assistantSnap = await getDoc(assistantDoc);
      
      if (assistantSnap.exists()) {
        const assistantData = assistantSnap.data();
        console.log('Found assistant:', assistantId, assistantData);
        assistants.push({ id: assistantId, ...assistantData });
      } else {
        console.warn('Assistant document not found:', assistantId);
      }
    }
    
    console.log('Returning assistants:', assistants);
    return assistants;
  } catch (error) {
    console.error('Error fetching assistants:', error);
    console.error('Error details:', error.message, error.stack);
    throw error;
  }
};

/**
 * Save notification template for a doctor
 * @param {string} doctorId - Doctor ID
 * @param {string} templateText - Template text
 * @returns {Promise<Object>} Created template document
 */
export const saveNotificationTemplate = async (doctorId, templateText) => {
  try {
    const templatesRef = collection(db, 'notification_templates');
    const templateDoc = {
      doctor_id: doctorId,
      template_text: templateText,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(templatesRef, templateDoc);
    return { id: docRef.id, ...templateDoc };
  } catch (error) {
    console.error('Error saving template:', error);
    throw error;
  }
};

/**
 * Get notification templates for a doctor
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<Array>} Array of template documents
 */
export const getNotificationTemplates = async (doctorId) => {
  try {
    const templatesRef = collection(db, 'notification_templates');
    // Try with orderBy first
    try {
      const q = query(
        templatesRef,
        where('doctor_id', '==', doctorId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (orderByError) {
      // If orderBy fails (no index), try without it
      if (orderByError.message && orderByError.message.includes('index')) {
        console.warn('Index not found, loading templates without orderBy');
        const q = query(
          templatesRef,
          where('doctor_id', '==', doctorId),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort manually by createdAt if available
        return templates.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return b.createdAt.toMillis() - a.createdAt.toMillis();
          }
          return 0;
        });
      }
      throw orderByError;
    }
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
};

/**
 * Delete notification template
 * @param {string} templateId - Template document ID
 * @returns {Promise<void>}
 */
export const deleteNotificationTemplate = async (templateId) => {
  try {
    const templateRef = doc(db, 'notification_templates', templateId);
    await updateDoc(templateRef, { deleted: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
};

/**
 * Send billing notification to assistant - HIGH PRIORITY with sound/vibration
 * This is critical for money tracking - assistant must be notified immediately
 * @param {Object} billingData - Billing notification data
 * @param {string} billingData.doctor_id - Doctor ID
 * @param {string} billingData.clinic_id - Clinic ID
 * @param {string} billingData.assistant_id - Assistant ID (optional, will notify all if not provided)
 * @param {string} billingData.patient_name - Patient name
 * @param {number} billingData.totalAmount - Total bill amount
 * @param {number} billingData.consultationFee - Consultation fee
 * @param {Array} billingData.services - List of services
 * @param {string} billingData.billing_id - Billing record ID
 * @param {string} billingData.clinic_name - Clinic name
 * @returns {Promise<Object>} Created notification document
 */
export const sendBillingNotificationToAssistant = async (billingData) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  // Build services summary
  const servicesSummary = billingData.services && billingData.services.length > 0
    ? billingData.services.map(s => `${s.service_name}: ${s.subtotal} EGP`).join(', ')
    : 'No additional services';

  // Build the notification message with billing details
  const message = `💰 فاتورة جديدة - ${billingData.patient_name}\n` +
    `المبلغ الإجمالي: ${billingData.totalAmount} جنيه\n` +
    `رسوم الكشف: ${billingData.consultationFee} جنيه\n` +
    (billingData.services?.length > 0 ? `الخدمات: ${servicesSummary}` : '');

  const notificationDoc = {
    doctor_id: billingData.doctor_id,
    clinic_id: billingData.clinic_id,
    assistant_id: billingData.assistant_id,
    message: message,
    type: 'billing', // Special type for billing notifications
    priority: 'high', // High priority for sound/vibration
    read: false,
    createdAt: serverTimestamp(),
    doctor_name: billingData.doctor_name || '',
    clinic_name: billingData.clinic_name || '',
    patient_name: billingData.patient_name || '',
    // Additional billing data for assistant to verify
    billing_data: {
      billing_id: billingData.billing_id,
      totalAmount: billingData.totalAmount,
      consultationFee: billingData.consultationFee,
      servicesCount: billingData.services?.length || 0,
      services: billingData.services || []
    }
  };

  // Retry logic for offline/network issues
  const attemptSend = async (attempt) => {
    try {
      const notificationsRef = collection(db, 'doctor_assistant_notifications');
      const docRef = await addDoc(notificationsRef, notificationDoc);

      console.log('✅ Billing notification created:', docRef.id);
      console.log('💰 Amount:', billingData.totalAmount, 'EGP for patient:', billingData.patient_name);
      
      return { 
        success: true, 
        id: docRef.id, 
        ...notificationDoc 
      };
    } catch (error) {
      console.error(`❌ Billing notification attempt ${attempt} failed:`, error);
      
      if (attempt < MAX_RETRIES) {
        console.log(`🔄 Retrying in ${RETRY_DELAY}ms... (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return attemptSend(attempt + 1);
      }
      
      throw error;
    }
  };

  return attemptSend(1);
};

/**
 * Get all assistants for a doctor and clinic, then send billing notification to all
 * @param {Object} billingData - Billing notification data
 * @returns {Promise<Array>} Results of all notification attempts
 */
export const sendBillingNotificationToAllAssistants = async (billingData) => {
  try {
    // Get all assistants for this doctor-clinic combination
    const assistants = await getAssistantsForDoctorClinic(billingData.doctor_id, billingData.clinic_id);
    
    if (assistants.length === 0) {
      console.warn('⚠️ No assistants found for billing notification');
      return { success: false, error: 'No assistants found', notified: 0 };
    }

    console.log(`📢 Sending billing notification to ${assistants.length} assistant(s)`);

    // Send notification to each assistant
    const results = await Promise.allSettled(
      assistants.map(assistant => 
        sendBillingNotificationToAssistant({
          ...billingData,
          assistant_id: assistant.id
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Billing notifications sent: ${successful} succeeded, ${failed} failed`);

    return {
      success: successful > 0,
      notified: successful,
      failed: failed,
      total: assistants.length
    };
  } catch (error) {
    console.error('❌ Error sending billing notifications:', error);
    throw error;
  }
};

/**
 * Send receipt notification to patient
 * @param {Object} receiptData - Receipt notification data
 * @param {string} receiptData.patientPhone - Patient phone number
 * @param {string} receiptData.patientName - Patient name
 * @param {string} receiptData.patientId - Patient ID
 * @param {string} receiptData.clinicId - Clinic ID
 * @param {string} receiptData.doctorId - Doctor ID
 * @param {string} receiptData.doctorName - Doctor name
 * @param {string} receiptData.receiptId - Receipt ID (optional)
 * @returns {Promise<Object>} Notification result
 */
export const sendReceiptNotificationToPatient = async (receiptData) => {
  try {
    // Use HTTP endpoint instead of Callable to avoid CORS issues
    const functions = getFunctions();
    const functionUrl = `https://us-central1-drwaiting-30f56.cloudfunctions.net/sendReceiptNotificationToPatient`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientPhone: receiptData.patientPhone,
        patientName: receiptData.patientName || '',
        patientId: receiptData.patientId || '',
        clinicId: receiptData.clinicId || '',
        doctorId: receiptData.doctorId || '',
        doctorName: receiptData.doctorName || '',
        receiptId: receiptData.receiptId || ''
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Receipt notification sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending receipt notification:', error);
    throw error;
  }
};

