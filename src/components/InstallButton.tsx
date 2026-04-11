import React, { useState, useEffect } from 'react';
import { Download, Monitor, Smartphone, CheckCircle } from 'lucide-react';
import { useA11y } from './A11yProvider';
import { handleKey } from '../lib/utils';
import toast from 'react-hot-toast';

export const InstallButton: React.FC = () => {
  const { language, t, announce } = useA11y();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      const msg = language === 'en' 
        ? 'To install: Click the three dots (⋮) in your browser menu and select "Install" or "Add to Home Screen".' 
        : 'ഇൻസ്റ്റാൾ ചെയ്യാൻ: ബ്രൗസർ മെനുവിലെ മൂന്ന് കുത്തുകളിൽ (⋮) ക്ലിക്ക് ചെയ്ത് "Install" അല്ലെങ്കിൽ "Add to Home Screen" എന്നത് തിരഞ്ഞെടുക്കുക.';
      announce(msg);
      toast(msg, { icon: 'ℹ️', duration: 6000 });
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
      announce(language === 'en' ? 'Thank you for installing the app!' : 'ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്തതിന് നന്ദി!');
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-3 p-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-100 dark:border-green-800 rounded-[2rem] text-green-700 dark:text-green-400">
        <CheckCircle size={32} />
        <div>
          <p className="text-xl font-black">{language === 'en' ? 'App Installed!' : 'ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്തു!'}</p>
          <p className="font-bold opacity-80">{language === 'en' ? 'You can now open it from your desktop.' : 'ഇനി നിങ്ങൾക്ക് ഡെസ്ക്ടോപ്പിൽ നിന്ന് ഇത് തുറക്കാം.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-4 border-blue-100 dark:border-blue-900/30 shadow-2xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg">
          <Download size={32} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white">
          {language === 'en' ? 'Install ACL App' : 'ACL ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യുക'}
        </h2>
      </div>
      
      <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
        {language === 'en' 
          ? 'Install this app on your computer or phone for a better experience. It works like a real software!' 
          : 'മികച്ച അനുഭവത്തിനായി ഈ ആപ്പ് നിങ്ങളുടെ കമ്പ്യൂട്ടറിലോ ഫോണിലോ ഇൻസ്റ്റാൾ ചെയ്യുക. ഇത് ഒരു യഥാർത്ഥ സോഫ്റ്റ്‌വെയർ പോലെ പ്രവർത്തിക്കും!'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700">
          <Monitor className="text-blue-600" />
          <span className="font-bold">{language === 'en' ? 'Works on PC/Laptop' : 'PC/ലാപ്ടോപ്പിൽ പ്രവർത്തിക്കും'}</span>
        </div>
        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700">
          <Smartphone className="text-blue-600" />
          <span className="font-bold">{language === 'en' ? 'Works on Mobile' : 'മൊബൈലിൽ പ്രവർത്തിക്കും'}</span>
        </div>
      </div>

      <button
        onClick={handleInstallClick}
        onKeyDown={handleKey}
        className="w-full py-5 bg-blue-600 text-white rounded-2xl text-2xl font-black hover:bg-blue-700 transition-all shadow-xl flex items-center justify-center gap-3 group outline-none focus:ring-4 focus:ring-blue-400"
      >
        <Download size={28} className="group-hover:translate-y-1 transition-transform" />
        {language === 'en' ? 'Download & Install' : 'ഡൗൺലോഡ് ചെയ്ത് ഇൻസ്റ്റാൾ ചെയ്യുക'}
      </button>
      
      <p className="text-sm text-slate-400 text-center italic">
        {language === 'en' 
          ? '*Note: Use Google Chrome or Microsoft Edge for best results.' 
          : '*ശ്രദ്ധിക്കുക: മികച്ച ഫലങ്ങൾക്കായി ഗൂഗിൾ ക്രോം അല്ലെങ്കിൽ മൈക്രോസോഫ്റ്റ് എഡ്ജ് ഉപയോഗിക്കുക.'}
      </p>
    </div>
  );
};
