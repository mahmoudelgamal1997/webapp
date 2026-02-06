export const translations = {
    en: {
        // Dashboard
        dashboard: "Dashboard",
        patients: "Patients",
        waitingList: "Waiting List",
        externalServices: "External Services",
        services: "Services",
        analytics: "Revenue & Analytics",
        inventory: "Inventory",
        settings: "Settings",
        logout: "Logout",

        // Patients List
        patientName: "Patient Name",
        patient: "Patient",
        phone: "Phone",
        visitDate: "Visit Date",
        time: "Time",
        age: "Age",
        visitType: "Visit Type",
        receipts: "Receipts",
        actions: "Actions",
        viewPatient: "View Patient",
        noVisits: "No visits found",
        searchPlaceholder: "Search by patient name or phone",

        // External Services
        externalServicesCount: "Ext. Services",
        requests: "requests",

        // Header
        welcome: "Welcome",
        language: "Language",

        // Common
        loading: "Loading...",
        error: "Error",
        success: "Success",
        cancel: "Cancel",
        save: "Save",
        delete: "Delete",
        edit: "Edit",
        add: "Add",
    },
    ar: {
        // Dashboard
        dashboard: "لوحة التحكم",
        patients: "المرضى",
        waitingList: "قائمة الانتظار",
        externalServices: "الخدمات الخارجية",
        services: "الخدمات",
        analytics: "الإيرادات والتحليلات",
        inventory: "المخزون",
        settings: "الإعدادات",
        logout: "تسجيل الخروج",

        // Patients List
        patientName: "اسم المريض",
        patient: "المريض",
        phone: "رقم الهاتف",
        visitDate: "تاريخ الزيارة",
        time: "الوقت",
        age: "العمر",
        visitType: "نوع الزيارة",
        receipts: "الروشتات",
        actions: "إجراءات",
        viewPatient: "عرض المريض",
        noVisits: "لا توجد زيارات",
        searchPlaceholder: "بحث باسم المريض أو رقم الهاتف",

        // External Services
        externalServicesCount: "خدمات خارجية",
        requests: "طلبات",

        // Header
        welcome: "مرحباً",
        language: "اللغة",

        // Common
        loading: "جاري التحميل...",
        error: "خطأ",
        success: "تم بنجاح",
        cancel: "إلغاء",
        save: "حفظ",
        delete: "حذف",
        edit: "تعديل",
        add: "إضافة",
    }
};

export type Language = 'en' | 'ar';
export type TranslationKey = keyof typeof translations.en;
