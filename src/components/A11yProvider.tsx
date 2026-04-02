import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '../translations';

interface A11yContextType {
  highContrast: boolean;
  toggleHighContrast: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const A11yContext = createContext<A11yContextType | undefined>(undefined);

export const A11yProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [highContrast, setHighContrast] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [announcement, setAnnouncement] = useState<{ message: string; priority: 'polite' | 'assertive' }>({ message: '', priority: 'polite' });

  const toggleHighContrast = () => setHighContrast(prev => !prev);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement({ message, priority });
    // Clear after a short delay to allow re-announcing same message
    setTimeout(() => setAnnouncement({ message: '', priority: 'polite' }), 1000);
  };

  const t = translations[language];

  return (
    <A11yContext.Provider value={{ highContrast, toggleHighContrast, language, setLanguage, t, announce }}>
      <div className={highContrast ? 'high-contrast' : ''}>
        <div 
          aria-live={announcement.priority} 
          className="sr-only" 
          role="status"
        >
          {announcement.message}
        </div>
        {children}
      </div>
    </A11yContext.Provider>
  );
};

export const useA11y = () => {
  const context = useContext(A11yContext);
  if (!context) throw new Error('useA11y must be used within A11yProvider');
  return context;
};
