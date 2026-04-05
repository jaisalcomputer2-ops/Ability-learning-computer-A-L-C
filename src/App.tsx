import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';
import { LogIn, LogOut, User, Settings, Accessibility, Sun, Moon, Languages, ShieldCheck, X } from 'lucide-react';
import { A11yProvider, useA11y } from './components/A11yProvider';
import { handleKey } from './lib/utils';
import { seedLessons } from './lib/seedData';
import { StudentDashboard } from './components/StudentDashboard';
import { TeacherPanel } from './components/TeacherPanel';
import toast from 'react-hot-toast';

const AdminLoginModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { t, announce } = useA11y();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onClose();
      toast.success(t.loginSuccess || 'Logged in successfully');
    } catch (error: any) {
      let errorMessage = t.invalidAdmin;
      if (error.code === 'auth/user-not-found') errorMessage = 'User not found';
      else if (error.code === 'auth/wrong-password') errorMessage = 'Incorrect password';
      else if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email address';
      else if (error.message) errorMessage = error.message;
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-800 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold flex items-center gap-3 rounded-lg inline-flex" tabIndex={0}>
            <ShieldCheck className="text-blue-600" /> {t.adminLogin}
          </h2>
          <button 
            onClick={onClose}
            onKeyDown={handleKey}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            aria-label={t.cancel}
          >
            <X size={32} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <div>
            <label className="block text-xl font-bold mb-2 outline-none focus:ring-2 focus:ring-blue-400 rounded inline-block" htmlFor="admin-email" tabIndex={0}>{t.email}</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl focus:ring-4 focus:ring-blue-400 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xl font-bold mb-2 outline-none focus:ring-2 focus:ring-blue-400 rounded inline-block" htmlFor="admin-password" tabIndex={0}>{t.password}</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl focus:ring-4 focus:ring-blue-400 outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            onKeyDown={handleKey}
            className="w-full py-5 bg-blue-600 text-white rounded-xl text-2xl font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '...' : t.login}
          </button>
        </form>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [appName, setAppName] = useState<string>('');
  const { toggleHighContrast, language, setLanguage, t, announce } = useA11y();

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'config', 'app'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
          toast.error("Firebase is offline. Please check your connection.");
        }
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribeConfig = onSnapshot(doc(db, 'config', 'app'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setLogoBase64(data.logo || null);
        setAppName(data.name || '');
      }
    });
    return () => unsubscribeConfig();
  }, []);

  useEffect(() => {
    announce(t.welcome, 'assertive');
    seedLessons().catch(err => console.error("Error seeding lessons:", err));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        const admins = ["jaisalcomputer2@gmail.com", "dqjaisal@gmail.com"];
        const isPrimaryAdmin = firebaseUser.email && admins.includes(firebaseUser.email.toLowerCase());
        const targetRole = isPrimaryAdmin ? 'teacher' : 'student';

        if (userDoc.exists()) {
          const currentRole = userDoc.data().role;
          if (currentRole !== targetRole && isPrimaryAdmin) {
            // Upgrade to teacher if they are in the admin list but marked as student
            await setDoc(userDocRef, { role: targetRole }, { merge: true });
            setRole(targetRole);
          } else {
            setRole(currentRole);
          }
        } else {
          try {
            // If the user logs in but isn't in the DB, create a profile
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              role: targetRole,
              createdAt: Timestamp.now()
            });
            
            setRole(targetRole);
          } catch (error) {
            console.error("Error creating user profile:", error);
            setRole(targetRole);
          }
        }
        announce(`${t.login} ${firebaseUser.displayName || firebaseUser.email}`);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [language]);

  useEffect(() => {
    (window as any).goBack = () => window.history.back();
    return () => { delete (window as any).goBack; };
  }, []);

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
        <header role="banner" className="bg-white border-b-2 border-slate-200 p-4 sticky top-0 z-50 dark:bg-slate-900 dark:border-slate-800">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 rounded-lg p-2 outline-none focus:ring-4 focus:ring-blue-400">
              <img 
                src={logoBase64 || "/logo.png"} 
                alt="Ability Foundation Logo" 
                className="h-[50px] w-auto rounded-lg object-contain"
                onError={(e) => {
                  if (!logoBase64) {
                    e.currentTarget.src = "https://api.dicebear.com/7.x/initials/svg?seed=ACL&backgroundColor=2a5bd7&fontSize=50";
                  }
                }}
                referrerPolicy="no-referrer"
              />
              <span className="text-2xl font-black tracking-tight outline-none focus:ring-2 focus:ring-blue-400 rounded">{appName || t.appName}</span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={toggleLanguage}
                onKeyDown={handleKey}
                className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
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
                onKeyDown={handleKey}
                className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={t.darkMode}
              >
                {darkMode ? <Sun /> : <Moon />}
              </button>

              <button
                onClick={() => {
                  toggleHighContrast();
                  announce(t.highContrast);
                }}
                onKeyDown={handleKey}
                className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={t.highContrast}
              >
                <Accessibility />
              </button>

              {user ? (
                <div className="flex items-center gap-4">
                  <span className="hidden md:block font-bold text-lg outline-none focus:ring-2 focus:ring-blue-400 rounded" tabIndex={0}>{user.displayName || user.email}</span>
                  <button
                    onClick={handleLogout}
                    onKeyDown={handleKey}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                    aria-label={t.logout}
                  >
                    <LogOut size={20} /> <span className="hidden sm:inline">{t.logout}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAdminModalOpen(true)}
                  onKeyDown={handleKey}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                  aria-label={t.adminLogin}
                >
                  <ShieldCheck size={20} /> <span className="hidden sm:inline">{t.adminLogin}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <main role="main" className="py-8">
          {role === 'teacher' ? <TeacherPanel /> : <StudentDashboard />}
        </main>

        <footer role="contentinfo" className="p-8 text-center text-slate-500 border-t-2 border-slate-100 dark:border-slate-800">
          <p className="text-lg outline-none focus:ring-2 focus:ring-blue-400 rounded inline-block">{appName || t.appName} - {t.footer}</p>
        </footer>

        <AdminLoginModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
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
