import React, { useState, useEffect } from 'react';
import { useA11y } from './A11yProvider';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { CheckCircle, GraduationCap, Keyboard, Headphones, Zap, ShieldCheck, BookOpen, Accessibility, BrainCircuit, ArrowRight, LogIn, Sparkles, Phone } from 'lucide-react';
import { StudentAuth } from './StudentAuth';

interface LandingPageProps {
  onStudentLogin: (student: any) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStudentLogin }) => {
  const { t, language } = useA11y();
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeLogo = onSnapshot(doc(db, 'config', 'app'), (doc) => {
      if (doc.exists()) {
        setLogoBase64(doc.data().logo);
      }
    });
    return () => unsubscribeLogo();
  }, []);

  const scrollToLogin = () => {
    const loginSection = document.getElementById('student-login-section');
    if (loginSection) {
      loginSection.scrollIntoView({ behavior: 'smooth' });
      // Move focus to the first input in the login section for better accessibility
      const firstInput = loginSection.querySelector('input');
      if (firstInput) {
        (firstInput as HTMLElement).focus();
      }
    }
  };

  const scrollToMission = () => {
    const missionSection = document.getElementById('mission-section');
    if (missionSection) {
      missionSection.scrollIntoView({ behavior: 'smooth' });
      missionSection.focus();
    }
  };

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section 
        aria-labelledby="hero-heading"
        className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[3rem] p-8 md:p-16 shadow-2xl"
      >
        <div className="absolute top-0 right-0 -mt-20 -mr-20 opacity-10 blur-3xl bg-white w-96 h-96 rounded-full"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 opacity-10 blur-3xl bg-blue-400 w-96 h-96 rounded-full"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left space-y-8">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-sm font-bold tracking-wider uppercase"
              tabIndex={0}
            >
              <Sparkles size={16} className="text-yellow-400" />
              {language === 'en' ? 'Empowering Vision through Technology' : 'സാങ്കേതികവിദ്യയിലൂടെ കാഴ്ചശക്തിയെ ശാക്തീകരിക്കുന്നു'}
            </div>
            
            <h1 id="hero-heading" className="text-5xl md:text-7xl font-black leading-tight tracking-tight outline-none focus:ring-2 focus:ring-white/50 rounded" tabIndex={0}>
              {t.bannerTitle}
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 leading-relaxed max-w-2xl mx-auto lg:mx-0 outline-none focus:ring-2 focus:ring-white/50 rounded" tabIndex={0}>
              {t.bannerDescription}
            </p>
            
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
              <button 
                onClick={scrollToLogin}
                className="px-8 py-4 bg-white text-blue-600 rounded-2xl text-xl font-bold hover:bg-blue-50 transition-all shadow-xl flex items-center gap-2 group outline-none focus:ring-4 focus:ring-white"
                aria-label={t.studentLogin}
              >
                <LogIn size={24} />
                {t.studentLogin}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={scrollToMission}
                className="px-8 py-4 bg-blue-500/20 backdrop-blur-md border-2 border-white/30 text-white rounded-2xl text-xl font-bold hover:bg-white/10 transition-all outline-none focus:ring-4 focus:ring-white"
                aria-label={language === 'en' ? 'Learn More' : 'കൂടുതൽ അറിയാൻ'}
              >
                {language === 'en' ? 'Learn More' : 'കൂടുതൽ അറിയാൻ'}
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-20 rounded-full animate-pulse"></div>
              <img 
                src={logoBase64 || "/logo.png"} 
                alt="ACL Logo" 
                className="relative z-10 w-64 h-64 md:w-80 md:h-80 object-contain drop-shadow-2xl"
                onError={(e) => {
                  if (!logoBase64) {
                    e.currentTarget.src = "https://api.dicebear.com/7.x/initials/svg?seed=ACL&backgroundColor=ffffff&fontSize=50";
                  }
                }}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Info Section */}
      <section className="text-center space-y-6 max-w-4xl mx-auto px-4" aria-labelledby="landing-title">
        <h2 id="landing-title" className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white leading-tight outline-none focus:ring-2 focus:ring-blue-400 rounded" tabIndex={0}>
          {t.landingTitle}
        </h2>
        <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 leading-relaxed outline-none focus:ring-2 focus:ring-blue-400 rounded" tabIndex={0}>
          {t.landingDescription}
        </p>
      </section>

      {/* Features Grid */}
      <section className="grid md:grid-cols-2 gap-8 px-4" aria-label="Features and Benefits">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all group" tabIndex={0}>
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mb-8 group-hover:scale-110 transition-transform">
            <GraduationCap size={40} />
          </div>
          <h3 className="text-3xl font-black mb-6 text-slate-800 dark:text-slate-100">{t.learnHeading}</h3>
          <ul className="space-y-4">
            {t.learnItems.map((item, i) => (
              <li key={i} className="flex items-start gap-4 text-lg text-slate-600 dark:text-slate-400">
                <CheckCircle size={24} className="text-blue-500 mt-1 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-10 rounded-[2.5rem] border-2 border-indigo-100 dark:border-indigo-900/30 shadow-xl hover:shadow-2xl transition-all group" tabIndex={0}>
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 group-hover:scale-110 transition-transform">
            <Zap size={40} />
          </div>
          <h3 className="text-3xl font-black mb-6 text-indigo-900 dark:text-indigo-300">{t.benefitsHeading}</h3>
          <ul className="space-y-4">
            {t.benefitItems.map((item, i) => (
              <li key={i} className="flex items-start gap-4 text-lg text-indigo-700 dark:text-indigo-400">
                <Zap size={24} className="text-indigo-500 mt-1 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white dark:bg-slate-900 py-16 px-4 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 shadow-inner">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-2">
            <p className="text-4xl md:text-5xl font-black text-blue-600">100%</p>
            <p className="text-slate-500 font-bold uppercase tracking-wider text-sm">
              {language === 'en' ? 'Accessible' : 'ലഭ്യമായത്'}
            </p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-4xl md:text-5xl font-black text-blue-600">24/7</p>
            <p className="text-slate-500 font-bold uppercase tracking-wider text-sm">
              {language === 'en' ? 'Support' : 'പിന്തുണ'}
            </p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-4xl md:text-5xl font-black text-blue-600">50+</p>
            <p className="text-slate-500 font-bold uppercase tracking-wider text-sm">
              {language === 'en' ? 'Lessons' : 'പാഠങ്ങൾ'}
            </p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-4xl md:text-5xl font-black text-blue-600">Free</p>
            <p className="text-slate-500 font-bold uppercase tracking-wider text-sm">
              {language === 'en' ? 'Learning' : 'പഠനം'}
            </p>
          </div>
        </div>
      </section>

      {/* Student Login Section */}
      <section id="student-login-section" className="px-4 scroll-mt-24">
        <div className="bg-white dark:bg-slate-900 p-12 md:p-20 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 shadow-2xl">
          <StudentAuth onLogin={onStudentLogin} />
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission-section" className="px-4 outline-none scroll-mt-24" tabIndex={-1} aria-labelledby="mission-title">
        <div className="bg-blue-600 text-white p-12 md:p-20 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <h2 id="mission-title" className="text-4xl md:text-5xl font-black outline-none focus:ring-2 focus:ring-white/50 rounded" tabIndex={0}>
              {language === 'en' ? 'Our Mission' : 'ഞങ്ങളുടെ ലക്ഷ്യം'}
            </h2>
            <p className="text-xl md:text-2xl text-blue-100 leading-relaxed outline-none focus:ring-2 focus:ring-white/50 rounded" tabIndex={0}>
              {language === 'en' 
                ? 'To bridge the digital divide by providing accessible computer education to visually impaired students, enabling them to lead independent and successful lives.' 
                : 'കാഴ്ചപരിമിതിയുള്ള വിദ്യാർത്ഥികൾക്ക് ലഭ്യമായ കമ്പ്യൂട്ടർ വിദ്യാഭ്യാസം നൽകിക്കൊണ്ട് ഡിജിറ്റൽ വിഭജനം നികത്തുക, അവരെ സ്വതന്ത്രവും വിജയകരവുമായ ജീവിതം നയിക്കാൻ പ്രാപ്തരാക്കുക.'}
            </p>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="p-8 bg-white/10 rounded-full border-2 border-white/20">
              <BrainCircuit size={120} className="text-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Icons */}
      <section className="px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white">{t.featuresHeading}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {t.featureItems.map((item, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border-2 border-slate-100 dark:border-slate-800 text-center hover:border-blue-400 transition-colors group">
              <div className="mb-6 text-blue-600 flex justify-center group-hover:scale-110 transition-transform">
                {i === 0 && <Keyboard size={48} />}
                {i === 1 && <Accessibility size={48} />}
                {i === 2 && <Headphones size={48} />}
                {i === 3 && <BrainCircuit size={48} />}
                {i === 4 && <ShieldCheck size={48} />}
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-tight">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="text-center space-y-8 py-12">
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">
          {language === 'en' ? 'Have Questions?' : 'ചോദ്യങ്ങളുണ്ടോ?'}
        </h2>
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {language === 'en' 
            ? 'Our team is here to help you on your learning journey. Reach out to us for any support.' 
            : 'നിങ്ങളുടെ പഠനയാത്രയിൽ സഹായിക്കാൻ ഞങ്ങളുടെ ടീം ഇവിടെയുണ്ട്. ഏത് പിന്തുണയ്ക്കും ഞങ്ങളെ ബന്ധപ്പെടുക.'}
        </p>
        <div className="flex justify-center gap-6">
          <a href="tel:+910000000000" className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-100 dark:border-slate-700 font-bold hover:border-blue-500 transition-all">
            <Phone size={20} className="text-blue-600" />
            <span>+91 0000000000</span>
          </a>
          <a href="mailto:info@acl.com" className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-100 dark:border-slate-700 font-bold hover:border-blue-500 transition-all">
            <ShieldCheck size={20} className="text-blue-600" />
            <span>info@acl.com</span>
          </a>
        </div>
      </section>
    </div>
  );
};
