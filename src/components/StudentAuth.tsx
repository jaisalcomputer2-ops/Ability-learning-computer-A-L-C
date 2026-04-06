import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, setDoc, doc } from 'firebase/firestore';
import { UserPlus, LogIn, User, Phone, Calendar, Key, Loader2 } from 'lucide-react';
import { useA11y } from './A11yProvider';
import toast from 'react-hot-toast';

interface StudentAuthProps {
  onLogin: (student: any) => void;
}

export const StudentAuth: React.FC<StudentAuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const { t, language, announce } = useA11y();

  const toggleMode = () => {
    const newMode = mode === 'login' ? 'register' : 'login';
    setMode(newMode);
    announce(newMode === 'login' ? t.studentLogin : t.studentRegister, 'assertive');
  };

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [registerId, setRegisterId] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !age) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      console.log("Attempting registration with data:", { name, phone, age });
      const generatedId = "ACL-" + Math.floor(1000 + Math.random() * 9000);
      const requestId = "REQ-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
      
      await setDoc(doc(db, 'registration_requests', requestId), {
        id: requestId,
        name,
        phone,
        age,
        registerId: generatedId,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      
      console.log("Registration successful, request ID:", requestId);
      const successMsg = `${t.registerRequestSent}. Your ID will be ${generatedId}`;
      toast.success(successMsg);
      announce(successMsg, 'assertive');
      setMode('login');
      setName('');
      setPhone('');
      setAge('');
    } catch (error: any) {
      console.error("Registration Error:", error);
      toast.error(`Registration failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !registerId) {
      toast.error('Please enter Name and Register ID');
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('registerId', '==', registerId.trim().toUpperCase())
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const studentData = snapshot.docs[0].data();
        // Case-insensitive name check
        if (studentData.name.trim().toLowerCase() === name.trim().toLowerCase()) {
          onLogin({ id: snapshot.docs[0].id, ...studentData });
          toast.success(t.loginSuccess);
          announce(t.loginSuccess, 'assertive');
        } else {
          toast.error(t.invalidRegisterId);
          announce(t.invalidRegisterId, 'assertive');
        }
      } else {
        toast.error(t.invalidRegisterId);
        announce(t.invalidRegisterId, 'assertive');
      }
    } catch (error) {
      console.error("Login Error:", error);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-blue-100 rounded-2xl text-blue-600 mb-4 dark:bg-blue-900/30">
          {mode === 'login' ? <LogIn size={40} /> : <UserPlus size={40} />}
        </div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">
          {mode === 'login' ? t.studentLogin : t.studentRegister}
        </h2>
      </div>

      <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="grid gap-6">
        <div>
          <label htmlFor="student-name" className="block text-lg font-bold mb-2 flex items-center gap-2">
            <User size={20} className="text-blue-600" /> {t.studentName}
          </label>
          <input
            id="student-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500"
            required
            placeholder={language === 'en' ? "Enter your full name" : "നിങ്ങളുടെ പൂർണ്ണമായ പേര് നൽകുക"}
            aria-required="true"
          />
        </div>

        {mode === 'register' ? (
          <>
            <div>
              <label htmlFor="student-phone" className="block text-lg font-bold mb-2 flex items-center gap-2">
                <Phone size={20} className="text-blue-600" /> {t.phone}
              </label>
              <input
                id="student-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500"
                required
                placeholder={language === 'en' ? "Enter your phone number" : "നിങ്ങളുടെ ഫോൺ നമ്പർ നൽകുക"}
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="student-age" className="block text-lg font-bold mb-2 flex items-center gap-2">
                <Calendar size={20} className="text-blue-600" /> {t.age}
              </label>
              <input
                id="student-age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500"
                required
                placeholder={language === 'en' ? "Enter your age" : "നിങ്ങളുടെ വയസ്സ് നൽകുക"}
                aria-required="true"
              />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="register-id" className="block text-lg font-bold mb-2 flex items-center gap-2">
              <Key size={20} className="text-blue-600" /> {t.registerId}
            </label>
            <input
              id="register-id"
              type="text"
              value={registerId}
              onChange={(e) => setRegisterId(e.target.value)}
              className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500 font-mono uppercase"
              required
              placeholder="ACL-XXXX"
              aria-required="true"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-5 bg-blue-600 text-white rounded-xl text-2xl font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
          aria-label={mode === 'login' ? t.login : t.register}
        >
          {loading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? <LogIn /> : <UserPlus />)}
          {mode === 'login' ? t.login : t.register}
        </button>
      </form>

      <div className="mt-8 text-center">
        <button
          onClick={toggleMode}
          className="text-blue-600 font-bold text-lg hover:underline outline-none focus:ring-2 focus:ring-blue-400 rounded p-2"
          aria-live="polite"
        >
          {mode === 'login' ? t.needRegister : t.alreadyRegistered}
        </button>
      </div>
    </div>
  );
};
