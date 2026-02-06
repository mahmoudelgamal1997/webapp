import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { translations, Language, TranslationKey } from '../translations';
import { ConfigProvider } from 'antd';
import arEG from 'antd/locale/ar_EG';
import enUS from 'antd/locale/en_US';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
    isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Default to Arabic ('ar') as requested
    const [language, setLanguageState] = useState<Language>('ar');

    useEffect(() => {
        // Load saved language preference if exists
        const savedLang = localStorage.getItem('language') as Language;
        if (savedLang) {
            setLanguageState(savedLang);
        }
        // Update document direction based on language
        document.dir = savedLang === 'en' ? 'ltr' : 'rtl';
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
        document.dir = lang === 'en' ? 'ltr' : 'rtl';
    };

    const t = (key: TranslationKey): string => {
        return translations[language][key] || key;
    };

    const isRTL = language === 'ar';

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
            <ConfigProvider direction={isRTL ? 'rtl' : 'ltr'} locale={isRTL ? arEG : enUS}>
                {children}
            </ConfigProvider>
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
