import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { UserPlus, LogIn, User, Mail, Calendar, Key, Loader2 } from 'lucide-react';
import { useA11y } from './A11yProvider';
import toast from 'react-hot-toast';

interface StudentAuthProps {
  onLogin: (student: any) => void;
}

export const StudentAuth: React.FC<StudentAuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const { t, language } = useA11y();

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
      await addDoc(collection(db, 'registration_requests'), {
        name,
        phone,
        age,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      toast.success(t.registerRequestSent);
      setMode('login');
      setName('');
      setPhone('');
      setAge('');
    } catch (error) {
      console.error("Registration Error:", error);
      toast.error('Registration failed');
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
        where('name', '==', name),
        where('registerId', '==', registerId.trim().toUpperCase())
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const studentData = snapshot.docs[0].data();
        onLogin({ id: snapshot.docs[0].id, ...studentData });
        toast.success(t.loginSuccess);
      } else {
        toast.error(t.invalidRegisterId);
      }
    } catch (error) {
      console.error("Login Error:", error);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-3xl shadow-2xl border-2 border-slate-200 dark:bg-slate-900 dark:border-slate-800">
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
          <label className="block text-lg font-bold mb-2 flex items-center gap-2">
            <User size={20} className="text-blue-600" /> {t.studentName}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500"
            required
            placeholder="Enter your full name"
          />
        </div>

        {mode === 'register' ? (
          <>
            <div>
              <label className="block text-lg font-bold mb-2 flex items-center gap-2">
                <Mail size={20} className="text-blue-600" /> {t.email}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500"
                required
                placeholder="Enter your phone number"
              />
            </div>
            <div>
              <label className="block text-lg font-bold mb-2 flex items-center gap-2">
                <Calendar size={20} className="text-blue-600" /> {t.age}
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500"
                required
                placeholder="Enter your age"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-lg font-bold mb-2 flex items-center gap-2">
              <Key size={20} className="text-blue-600" /> {t.registerId}
            </label>
            <input
              type="text"
              value={registerId}
              onChange={(e) => setRegisterId(e.target.value)}
              className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500 font-mono uppercase"
              required
              placeholder="ACL-XXXX"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-5 bg-blue-600 text-white rounded-xl text-2xl font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? <LogIn /> : <UserPlus />)}
          {mode === 'login' ? t.login : t.register}
        </button>
      </form>

      <div className="mt-8 text-center">
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="text-blue-600 font-bold text-lg hover:underline outline-none focus:ring-2 focus:ring-blue-400 rounded p-2"
        >
          {mode === 'login' ? t.needRegister : t.alreadyRegistered}
        </button>
      </div>
    </div>
  );
};
