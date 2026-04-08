import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '../translations';

interface A11yContextType {
  highContrast: boolean;
  toggleHighContrast: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  speak: (text: string, rate?: number) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  setSelectedVoiceURI: (uri: string) => void;
}

const A11yContext = createContext<A11yContextType | undefined>(undefined);

export const A11yProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [highContrast, setHighContrast] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [announcement1, setAnnouncement1] = useState('');
  const [announcement2, setAnnouncement2] = useState('');
  const [activeRegion, setActiveRegion] = useState(1);
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(localStorage.getItem('selectedVoiceURI') || '');

  useEffect(() => {
    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (!selectedVoiceURI && availableVoices.length > 0) {
        const defaultVoice = availableVoices.find(v => v.default) || availableVoices[0];
        setSelectedVoiceURI(defaultVoice.voiceURI);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoiceURI]);

  useEffect(() => {
    if (selectedVoiceURI) {
      localStorage.setItem('selectedVoiceURI', selectedVoiceURI);
    }
  }, [selectedVoiceURI]);

  const toggleHighContrast = () => setHighContrast(prev => !prev);

  const announce = (message: string, p: 'polite' | 'assertive' = 'polite') => {
    setPriority(p);
    if (activeRegion === 1) {
      setAnnouncement2('');
      setAnnouncement1(message);
      setActiveRegion(2);
    } else {
      setAnnouncement1('');
      setAnnouncement2(message);
      setActiveRegion(1);
    }
  };

  const speak = (text: string, rate: number = 0.9) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  const t = translations[language];

  return (
    <A11yContext.Provider value={{ 
      highContrast, 
      toggleHighContrast, 
      language, 
      setLanguage, 
      t, 
      announce,
      speak,
      voices,
      selectedVoiceURI,
      setSelectedVoiceURI
    }}>
      <div className={highContrast ? 'high-contrast' : ''}>
        <div 
          aria-live={priority} 
          className="sr-only" 
          role="status"
        >
          {announcement1}
        </div>
        <div 
          aria-live={priority} 
          className="sr-only" 
          role="status"
        >
          {announcement2}
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
