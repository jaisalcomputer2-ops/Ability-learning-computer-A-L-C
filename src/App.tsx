import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';
import { LogIn, LogOut, User, Settings, Accessibility, Sun, Moon, Languages } from 'lucide-react';
import { A11yProvider, useA11y } from './components/A11yProvider';
import { StudentDashboard } from './components/StudentDashboard';
import { TeacherPanel } from './components/TeacherPanel';
import toast from 'react-hot-toast';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const { toggleHighContrast, language, setLanguage, t, announce } = useA11y();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        } else {
          const defaultRole = firebaseUser.email === "jaisalcomputer2@gmail.com" ? 'teacher' : 'student';
          const userData = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            role: defaultRole,
            createdAt: Timestamp.now()
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), userData);
          setRole(defaultRole);
        }
        announce(`${t.login} ${firebaseUser.displayName}`);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [language]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      toast.error('Login failed');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    announce(t.logout);
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'ml' : 'en';
    setLanguage(nextLang);
    announce(`Language changed to ${nextLang === 'en' ? 'English' : 'Malayalam'}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-3xl font-bold animate-pulse text-blue-600">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        <header className="bg-white border-b-2 border-slate-200 p-4 sticky top-0 z-50 dark:bg-slate-900 dark:border-slate-800">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 focus:ring-4 focus:ring-blue-500 outline-none rounded-lg p-2">
              <div className="bg-blue-600 text-white p-2 rounded-lg font-black text-2xl">{t.shortName}</div>
              <span className="text-2xl font-black tracking-tight hidden sm:block">{t.appName}</span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={toggleLanguage}
                className="p-3 rounded-xl hover:bg-slate-100 focus:ring-4 focus:ring-blue-500 outline-none dark:hover:bg-slate-800 flex items-center gap-2"
                aria-label={t.language}
              >
                <Languages />
                <span className="font-bold hidden md:block">{language === 'en' ? 'മലയാളം' : 'English'}</span>
              </button>

              <button
                onClick={() => {
                  setDarkMode(!darkMode);
                  announce(`${t.darkMode} ${!darkMode ? 'dark' : 'light'}`);
                }}
                className="p-3 rounded-xl hover:bg-slate-100 focus:ring-4 focus:ring-blue-500 outline-none dark:hover:bg-slate-800"
                aria-label={t.darkMode}
              >
                {darkMode ? <Sun /> : <Moon />}
              </button>

              <button
                onClick={() => {
                  toggleHighContrast();
                  announce(t.highContrast);
                }}
                className="p-3 rounded-xl hover:bg-slate-100 focus:ring-4 focus:ring-blue-500 outline-none dark:hover:bg-slate-800"
                aria-label={t.highContrast}
              >
                <Accessibility />
              </button>

              {user ? (
                <div className="flex items-center gap-4">
                  <span className="hidden md:block font-bold text-lg">{user.displayName}</span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 focus:ring-4 focus:ring-red-400 outline-none dark:bg-red-900/20 dark:text-red-400"
                    aria-label={t.logout}
                  >
                    <LogOut size={20} /> <span className="hidden sm:inline">{t.logout}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 focus:ring-4 focus:ring-blue-400 outline-none"
                  aria-label={t.login}
                >
                  <LogIn size={20} /> {t.login}
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="py-8">
          {!user ? (
            <div className="max-w-2xl mx-auto text-center px-6 py-20">
              <h1 className="text-6xl font-black mb-8 leading-tight">{t.tagline}</h1>
              <p className="text-2xl text-slate-600 mb-12 dark:text-slate-400">
                {t.description}
              </p>
              <button
                onClick={handleLogin}
                className="px-12 py-6 bg-blue-600 text-white rounded-2xl text-3xl font-black hover:bg-blue-700 focus:ring-4 focus:ring-blue-400 outline-none shadow-2xl shadow-blue-500/20"
              >
                {t.getStarted}
              </button>
            </div>
          ) : (
            <>
              {role === 'teacher' ? <TeacherPanel /> : <StudentDashboard />}
            </>
          )}
        </main>

        <footer className="p-8 text-center text-slate-500 border-t-2 border-slate-100 dark:border-slate-800">
          <p className="text-lg">{t.footer}</p>
        </footer>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <A11yProvider>
      <Router>
        <AppContent />
        <Toaster position="bottom-right" />
      </Router>
    </A11yProvider>
  );
}
