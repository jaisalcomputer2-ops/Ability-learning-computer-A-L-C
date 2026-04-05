import React, { useState, useEffect } from 'react';
import { useA11y } from './A11yProvider';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { CheckCircle, GraduationCap, Keyboard, Headphones, Zap, ShieldCheck, BookOpen, Accessibility, BrainCircuit } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { t } = useA11y();
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeLogo = onSnapshot(doc(db, 'config', 'app'), (doc) => {
      if (doc.exists()) {
        setLogoBase64(doc.data().logo);
      }
    });
    return () => unsubscribeLogo();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-8 bg-white rounded-3xl shadow-2xl border-2 border-slate-200 dark:bg-slate-900 dark:border-slate-800">
      {/* Logo Header */}
      <div className="mb-8 flex justify-center">
        <img 
          src={logoBase64 || "/logo.png"} 
          alt="Ability Foundation Logo" 
          className="h-[100px] w-auto rounded-2xl shadow-lg border-4 border-white/50 object-contain"
          onError={(e) => {
            if (!logoBase64) {
              e.currentTarget.src = "https://api.dicebear.com/7.x/initials/svg?seed=ACL&backgroundColor=2a5bd7&fontSize=50";
            }
          }}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Hero Banner */}
      <div className="mb-12 bg-[#2a5bd7] text-white p-10 rounded-3xl shadow-lg border-4 border-white/10 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-5xl font-black mb-6 outline-none focus:ring-4 focus:ring-orange-400 rounded p-2 inline-block">
            {t.bannerTitle}
          </h2>
          <p className="text-2xl leading-relaxed max-w-2xl outline-none focus:ring-2 focus:ring-orange-400 rounded p-2">
            {t.bannerDescription}
          </p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10 hidden lg:block">
          <Accessibility size={200} />
        </div>
      </div>

      {/* Main Title Section */}
      <div className="text-center mb-16">
        <h1 className="text-6xl font-black mb-6 text-blue-600 outline-none focus:ring-4 focus:ring-blue-400 rounded p-2 inline-block">
          {t.landingTitle}
        </h1>
        <p className="text-3xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed outline-none focus:ring-2 focus:ring-blue-400 rounded p-2">
          {t.landingDescription}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 mb-16">
        {/* What You Can Learn */}
        <section className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl border-2 border-slate-100 dark:border-slate-800">
          <h2 className="text-3xl font-bold mb-8 text-slate-800 dark:text-slate-100 flex items-center gap-3 outline-none focus:ring-2 focus:ring-blue-400 rounded">
            <GraduationCap className="text-blue-600" size={36} /> {t.learnHeading}
          </h2>
          <ul className="grid gap-4">
            {t.learnItems.map((item, i) => (
              <li key={i} className="text-xl flex items-start gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-400">
                <div className="mt-1 text-blue-600"><CheckCircle size={24} /></div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Benefits Section */}
        <section className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-3xl border-2 border-blue-100 dark:border-blue-900/30">
          <h2 className="text-3xl font-bold mb-8 text-blue-800 dark:text-blue-300 flex items-center gap-3 outline-none focus:ring-2 focus:ring-blue-400 rounded">
            <Zap className="text-blue-600" size={36} /> {t.benefitsHeading}
          </h2>
          <ul className="grid gap-4">
            {t.benefitItems.map((item, i) => (
              <li key={i} className="text-xl flex items-start gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-blue-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-400">
                <div className="mt-1 text-blue-600"><Zap size={24} /></div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Features Grid */}
      <section className="mb-16">
        <h2 className="text-4xl font-black mb-10 text-center text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-400 rounded inline-block w-full">
          {t.featuresHeading}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {t.featureItems.map((item, i) => (
            <div key={i} className="p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow outline-none focus:ring-2 focus:ring-blue-400">
              <div className="mb-4 text-blue-600">
                {i === 0 && <Keyboard size={40} />}
                {i === 1 && <Accessibility size={40} />}
                {i === 2 && <Headphones size={40} />}
                {i === 3 && <BrainCircuit size={40} />}
                {i === 4 && <ShieldCheck size={40} />}
              </div>
              <p className="text-xl font-bold leading-tight">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For Students Section */}
      <section className="bg-slate-900 text-white p-12 rounded-3xl text-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-4xl font-black mb-6 outline-none focus:ring-4 focus:ring-blue-400 rounded p-2 inline-block">
            {t.forStudentsHeading}
          </h2>
          <p className="text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed outline-none focus:ring-2 focus:ring-blue-400 rounded p-2">
            {t.forStudentsDescription}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 p-8 opacity-5">
          <BookOpen size={150} />
        </div>
      </section>
    </div>
  );
};
