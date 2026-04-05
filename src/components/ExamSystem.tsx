import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { useA11y } from './A11yProvider';
import toast from 'react-hot-toast';
import { LogIn, Send, Award, Loader2 } from 'lucide-react';

export const ExamSystem: React.FC = () => {
  const [code, setCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [currentStep, setCurrentStep] = useState<'login' | 'exam' | 'result'>('login');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const { t, announce } = useA11y();

  const questions = [
    {
      id: 'q1',
      text: "What is Desktop?",
      options: ["Desktop is first screen", "Mouse"],
      correct: "Desktop is first screen"
    },
    {
      id: 'q2',
      text: "Taskbar is located at?",
      options: ["Top", "Bottom"],
      correct: "Bottom"
    },
    {
      id: 'q3',
      text: "Which key is used to stop screen reader speech immediately?",
      options: ["Shift", "Control (Ctrl)", "Alt"],
      correct: "Control (Ctrl)"
    },
    {
      id: 'q4',
      text: "What does NVDA stand for?",
      options: ["New Visual Desktop Access", "NonVisual Desktop Access", "Next Visual Digital Access"],
      correct: "NonVisual Desktop Access"
    }
  ];

  const handleLogin = async () => {
    if (!code.trim()) {
      toast.error(t.enterCode);
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, 'exam_codes'), where('code', '==', code.trim().toUpperCase()));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const codeData = snapshot.docs[0].data();
        if (codeData.used) {
          toast.error("This code has already been used.");
        } else {
          setStudentName(codeData.studentName);
          setCurrentStep('exam');
          announce(t.examInstructions);
        }
      } else {
        toast.error(t.invalidCode);
      }
    } catch (error) {
      console.error("Login Error:", error);
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error(t.answerAll);
      return;
    }

    let finalScore = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct) {
        finalScore++;
      }
    });

    setScore(finalScore);
    setLoading(true);

    try {
      // Save result
      await addDoc(collection(db, 'exam_results'), {
        studentName,
        score: finalScore,
        total: questions.length,
        timestamp: Timestamp.now()
      });

      // Mark code as used
      const q = query(collection(db, 'exam_codes'), where('code', '==', code.trim().toUpperCase()));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(doc(db, 'exam_codes', snapshot.docs[0].id), { used: true });
      }

      setCurrentStep('result');
      announce(`${t.examCompleted}. ${t.score}: ${finalScore}/${questions.length}`);
    } catch (error) {
      console.error("Submit Error:", error);
      toast.error("Failed to submit exam");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-blue-600 p-8 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">{t.examHeader}</h1>
          <p className="opacity-90">{t.landingDescription}</p>
        </div>

        <div className="p-8">
          {currentStep === 'login' && (
            <div className="space-y-6">
              <div className="text-center">
                <LogIn size={48} className="mx-auto text-blue-600 mb-4" />
                <h2 className="text-2xl font-bold">{t.studentLogin}</h2>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t.enterCode}
                  className="w-full p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-2xl text-center font-mono tracking-widest focus:ring-4 focus:ring-blue-400 outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl text-2xl font-bold hover:bg-blue-700 focus:ring-4 focus:ring-blue-400 outline-none disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
                  {t.login}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'exam' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-xl font-bold">{t.exam}</h2>
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full font-bold">
                  {studentName}
                </div>
              </div>

              <div className="space-y-10">
                {questions.map((q, idx) => (
                  <fieldset key={q.id} className="space-y-4">
                    <legend className="text-2xl font-bold mb-4 outline-none focus:ring-2 focus:ring-blue-400 rounded" tabIndex={0}>
                      {idx + 1}. {q.text}
                    </legend>
                    <div className="grid gap-3">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            answers[q.id] === opt
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-slate-100 dark:border-slate-800 hover:border-blue-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                            className="w-6 h-6 text-blue-600"
                          />
                          <span className="text-xl font-medium">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-5 bg-green-600 text-white rounded-2xl text-2xl font-bold hover:bg-green-700 focus:ring-4 focus:ring-green-400 outline-none disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Send />}
                {t.submit}
              </button>
            </div>
          )}

          {currentStep === 'result' && (
            <div className="text-center space-y-8 py-8">
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <Award size={64} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-4xl font-black mb-2">{t.examCompleted}</h2>
                <p className="text-2xl text-slate-500">{studentName}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl border-2 border-slate-100 dark:border-slate-700">
                <p className="text-xl text-slate-500 mb-2">{t.score}</p>
                <p className="text-7xl font-black text-blue-600">
                  {score}<span className="text-3xl text-slate-300">/{questions.length}</span>
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold hover:bg-slate-200 outline-none focus:ring-4 focus:ring-slate-400"
              >
                {t.backToLessons}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
