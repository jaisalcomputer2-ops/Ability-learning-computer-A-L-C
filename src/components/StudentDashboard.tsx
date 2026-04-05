import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, onSnapshot, where, doc, getDoc, setDoc, Timestamp, orderBy } from 'firebase/firestore';
import { BookOpen, PlayCircle, CheckCircle, ChevronRight, ArrowLeft, Headphones, FileText, BrainCircuit, Accessibility, GraduationCap, Award } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { Quiz } from './Quiz';
import { LandingPage } from './LandingPage';
import { ExamSystem } from './ExamSystem';
import { useA11y } from './A11yProvider';
import { handleKey, getDirectAudioUrl } from '../lib/utils';
import toast from 'react-hot-toast';

interface StudentDashboardProps {
  studentUser: any;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ studentUser }) => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [allProgress, setAllProgress] = useState<Record<string, any>>({});
  const [view, setView] = useState<'list' | 'lesson' | 'quiz' | 'exam'>('list');
  const [finalExamAssigned, setFinalExamAssigned] = useState(false);
  const { announce, t, language } = useA11y();
  
  // Sync view state with browser history
  useEffect(() => {
    // Push initial state if not present
    if (!window.history.state?.view) {
      window.history.replaceState({ view: 'list' }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.view) {
        setView(e.state.view);
        if (e.state.lesson) setSelectedLesson(e.state.lesson);
      } else {
        setView('list');
        setSelectedLesson(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const goBack = () => {
    window.history.back();
  };

  const navigateTo = (newView: 'list' | 'lesson' | 'quiz' | 'exam', lesson?: any) => {
    setView(newView);
    if (lesson) setSelectedLesson(lesson);
    window.history.pushState({ view: newView, lesson }, '');
  };

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        if (view === 'lesson') {
          setView('list');
          announce(t.backToLessons);
        } else if (view === 'quiz') {
          setView('lesson');
          announce(t.backToLessons);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [view, t]);

  useEffect(() => {
    if (view === 'lesson' && selectedLesson) {
      // Small delay to ensure the view has rendered and the title announcement is finished
      setTimeout(() => {
        announce(t.lessonOpenedInstructions);
      }, 500);
    } else if (view === 'exam') {
      setTimeout(() => {
        announce(t.examInstructions);
      }, 500);
    }
  }, [view, selectedLesson?.id]);

  useEffect(() => {
    const q = query(
      collection(db, 'lessons'), 
      where('language', '==', language),
      orderBy('order', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLessons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Firestore Error:", error);
      toast.error("Failed to load lessons");
    });

    if (studentUser) {
      const pq = query(collection(db, 'progress'), where('userId', '==', studentUser.registerId));
      const unsubscribeProgress = onSnapshot(pq, (snapshot) => {
        const progMap: Record<string, any> = {};
        let assigned = false;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          progMap[data.lessonId] = data;
          if (data.finalExamAssigned) assigned = true;
        });
        setAllProgress(progMap);
        setFinalExamAssigned(assigned);
      });
      return () => {
        unsubscribe();
        unsubscribeProgress();
      };
    } else {
      // Load anonymous progress from localStorage
      const progMap: Record<string, any> = {};
      lessons.forEach(lesson => {
        const localData = localStorage.getItem(`progress_${lesson.id}`);
        if (localData) {
          progMap[lesson.id] = JSON.parse(localData);
        }
      });
      setAllProgress(progMap);
    }

    return () => unsubscribe();
  }, [lessons.length, studentUser?.registerId, language]);

  const handleSelectLesson = async (lesson: any) => {
    navigateTo('lesson', lesson);
    announce(`${lesson.title}. ${lesson.category}`);
    
    const progressId = `progress_${lesson.id}`;
    if (studentUser) {
      const fbProgressId = `${studentUser.registerId}_${lesson.id}`;
      const progressDoc = await getDoc(doc(db, 'progress', fbProgressId));
      if (progressDoc.exists()) {
        setProgress(progressDoc.data());
      } else {
        setProgress(null);
      }
    } else {
      // Use localStorage for anonymous users
      const localData = localStorage.getItem(progressId);
      setProgress(localData ? JSON.parse(localData) : null);
    }

    const quizQuery = query(collection(db, 'quizzes'), where('lessonId', '==', lesson.id));
    const unsubscribeQuiz = onSnapshot(quizQuery, (snapshot) => {
      if (!snapshot.empty) {
        setQuiz({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setQuiz(null);
      }
    });

    return () => unsubscribeQuiz();
  };

  const updateProgress = async (data: any) => {
    const newProgress = { ...progress, ...data, updatedAt: Timestamp.now() };
    setProgress(newProgress);

    // Debounce Firestore/LocalStorage writes
    const timeoutId = (window as any)._progressTimeout;
    if (timeoutId) clearTimeout(timeoutId);

    (window as any)._progressTimeout = setTimeout(async () => {
      if (studentUser) {
        const fbProgressId = `${studentUser.registerId}_${selectedLesson.id}`;
        await setDoc(doc(db, 'progress', fbProgressId), {
          userId: studentUser.registerId,
          lessonId: selectedLesson.id,
          ...newProgress
        });
        
        setAllProgress(prev => ({
          ...prev,
          [selectedLesson.id]: {
            userId: studentUser.registerId,
            lessonId: selectedLesson.id,
            lessonTitle: selectedLesson.title,
            ...newProgress
          }
        }));
      } else {
        const progressId = `progress_${selectedLesson.id}`;
        localStorage.setItem(progressId, JSON.stringify(newProgress));
        
        setAllProgress(prev => ({
          ...prev,
          [selectedLesson.id]: {
            ...newProgress,
            lessonTitle: selectedLesson.title
          }
        }));
      }
    }, 2000); // Update every 2 seconds
  };

  const processContent = (content: string) => {
    if (!content) return "";
    let processed = content.replace(/\n/g, '<br/>');
    // Fix Google Drive links in embedded HTML src attributes
    processed = processed.replace(/src=['"](https:\/\/drive\.google\.com\/[^'"]+)['"]/g, (match, url) => {
      return `src="${getDirectAudioUrl(url)}"`;
    });
    return processed;
  };

  if (view === 'lesson' && selectedLesson) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={goBack}
          onKeyDown={handleKey}
          tabIndex={0}
          className="flex items-center gap-2 text-xl font-bold mb-8 text-blue-600 hover:underline"
          aria-label={t.backToLessons}
        >
          <ArrowLeft /> {t.backToLessons}
        </button>

        <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-200 dark:bg-slate-900 dark:border-slate-700">
          {/* Visible Accessibility Instructions */}
          <div 
            className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl dark:bg-blue-900/20 dark:border-blue-800"
            tabIndex={0}
            aria-label="Navigation Instructions"
          >
            <p className="text-xl font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Accessibility size={24} /> {t.lessonOpenedInstructions}
            </p>
          </div>

          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-500 uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-400 rounded">{selectedLesson.category}</span>
                <span className="text-slate-300">•</span>
                <span className="text-lg font-bold text-blue-600 uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-400 rounded">{selectedLesson.level || 'Basic'}</span>
              </div>
              <h1 className="text-4xl font-bold mt-2 outline-none focus:ring-2 focus:ring-blue-400 rounded">{selectedLesson.title}</h1>
            </div>
            {progress?.completed && (
              <div className="flex items-center gap-2 text-green-600 font-bold text-xl">
                <CheckCircle size={32} /> {t.correct}
              </div>
            )}
          </div>

          <div className="grid gap-12">
            {selectedLesson.audioUrl && (
              <section aria-labelledby="audio-heading">
                <h2 id="audio-heading" className="text-2xl font-bold mb-4 flex items-center gap-3 outline-none focus:ring-2 focus:ring-blue-400 rounded">
                  <Headphones className="text-blue-600" /> {t.audioLesson}
                </h2>
                <AudioPlayer 
                  url={selectedLesson.audioUrl} 
                  initialPosition={progress?.lastPlaybackPosition || 0}
                  onPositionUpdate={(pos) => updateProgress({ lastPlaybackPosition: pos })}
                  onComplete={() => updateProgress({ completed: true })}
                />
              </section>
            )}

            <section aria-labelledby="notes-heading">
              <h2 id="notes-heading" className="text-2xl font-bold mb-4 flex items-center gap-3 outline-none focus:ring-2 focus:ring-blue-400 rounded">
                <FileText className="text-blue-600" /> {t.lessonNotes}
              </h2>
              <div className="prose prose-xl max-w-none bg-slate-50 p-8 rounded-xl border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:prose-invert">
                <div 
                  className="text-2xl leading-relaxed outline-none focus:ring-2 focus:ring-blue-400 rounded"
                  dangerouslySetInnerHTML={{ __html: processContent(selectedLesson.textContent) }}
                />
              </div>
            </section>

            {quiz && (
              <div className="mt-8">
                {progress?.completed ? (
                  <button
                    onClick={() => navigateTo('quiz')}
                    onKeyDown={handleKey}
                    className="w-full py-6 bg-green-600 text-white rounded-xl text-2xl font-bold hover:bg-green-700 flex items-center justify-center gap-4 shadow-lg transform transition-all hover:scale-[1.02] active:scale-95"
                    aria-label={t.startQuiz}
                  >
                    <BrainCircuit size={32} /> {language === 'en' ? 'Start Exam' : 'പരീക്ഷ ആരംഭിക്കുക'}
                  </button>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-xl dark:bg-amber-900/20 dark:border-amber-800 text-center">
                      <p className="text-xl font-bold text-amber-800 dark:text-amber-300">
                        {language === 'en' 
                          ? 'Please finish listening to the audio or reading the notes to unlock the exam.' 
                          : 'പരീക്ഷ എഴുതുന്നതിനായി പാഠഭാഗം പൂർണ്ണമായും കേൾക്കുകയോ വായിക്കുകയോ ചെയ്യുക.'}
                      </p>
                    </div>
                    <button
                      onClick={() => updateProgress({ completed: true })}
                      onKeyDown={handleKey}
                      className="w-full py-4 bg-blue-100 text-blue-700 rounded-xl text-xl font-bold hover:bg-blue-200 flex items-center justify-center gap-3 border-2 border-blue-200"
                    >
                      <CheckCircle size={24} /> {language === 'en' ? 'I have finished reading/listening' : 'ഞാൻ പാഠഭാഗം പൂർത്തിയാക്കി'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'quiz' && quiz) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={goBack}
          onKeyDown={handleKey}
          tabIndex={0}
          className="flex items-center gap-2 text-xl font-bold mb-8 text-blue-600 hover:underline"
          aria-label={t.backToLessons}
        >
          <ArrowLeft /> {t.backToLessons}
        </button>
        <Quiz 
          questions={quiz.questions} 
          onComplete={(score) => {
            updateProgress({ 
              completed: true, 
              score, 
              totalQuestions: quiz.questions.length,
              lessonTitle: selectedLesson.title
            });
            goBack();
          }}
        />
      </div>
    );
  }

  if (view === 'exam') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={goBack}
            onKeyDown={handleKey}
            tabIndex={0}
            className="mb-8 flex items-center gap-3 text-xl font-bold text-slate-600 hover:text-blue-600 focus:ring-4 focus:ring-blue-400 rounded-lg p-2 outline-none"
            aria-label={t.backToLessons}
          >
            <ArrowLeft /> {t.backToLessons}
          </button>
          <ExamSystem studentUser={studentUser} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-12">
        <LandingPage />
      </div>

      <h1 className="text-4xl font-bold mb-4 rounded-lg inline-block">{t.studentDashboard}</h1>
      <p className="text-2xl text-slate-600 mb-8 dark:text-slate-400 outline-none focus:ring-2 focus:ring-blue-400 rounded">{t.description.split('.')[0]}.</p>

      {/* Progress Summary Section */}
      <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-100 dark:bg-slate-900 dark:border-slate-800 flex flex-col items-center text-center">
          <div className="p-4 bg-blue-100 rounded-2xl text-blue-600 mb-4 dark:bg-blue-900/30">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-500 uppercase tracking-wider mb-1">{t.lessonsCompleted}</h3>
          <p className="text-5xl font-black text-blue-600">
            {Object.values(allProgress).filter((p: any) => p.completed).length}
            <span className="text-2xl text-slate-300 ml-1">/ {lessons.length}</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-100 dark:bg-slate-900 dark:border-slate-800 flex flex-col items-center text-center">
          <div className="p-4 bg-green-100 rounded-2xl text-green-600 mb-4 dark:bg-green-900/30">
            <Award size={32} className="lucide lucide-award" />
          </div>
          <h3 className="text-xl font-bold text-slate-500 uppercase tracking-wider mb-1">{t.averageScore}</h3>
          <p className="text-5xl font-black text-green-600">
            {(() => {
              const scores = Object.values(allProgress).filter((p: any) => p.score !== undefined) as any[];
              if (scores.length === 0) return '0%';
              const avg = (() => {
                let sum = 0;
                for (const curr of scores) {
                  const s = Number(curr.score) || 0;
                  const t = Number(curr.totalQuestions) || 1;
                  sum += (s / t);
                }
                return sum / scores.length;
              })();
              return Math.round(avg * 100) + '%';
            })()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-100 dark:bg-slate-900 dark:border-slate-800 flex flex-col items-center text-center">
          <div className="p-4 bg-purple-100 rounded-2xl text-purple-600 mb-4 dark:bg-purple-900/30">
            <GraduationCap size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-500 uppercase tracking-wider mb-1">{t.finalExam}</h3>
          {finalExamAssigned ? (
            <button
              onClick={() => navigateTo('exam')}
              className="mt-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md active:scale-95"
            >
              {t.enterCode}
            </button>
          ) : (
            <p className="text-lg text-slate-400 italic mt-2">
              {t.waitingForAssignment}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-8">
        {Array.from(new Set(lessons.map(l => l.category))).sort().map(cat => {
          const catLessons = lessons.filter(l => l.category === cat);
          if (catLessons.length === 0) return null;

          return (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <h2 id={`cat-${cat}`} className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-200 border-b-4 border-blue-600 inline-block pb-1 outline-none focus:ring-2 focus:ring-blue-400 rounded">
                {cat}
              </h2>
              <div className="grid gap-4 mt-4">
                {catLessons.map(lesson => (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelectLesson(lesson)}
                    onKeyDown={handleKey}
                    className="w-full text-left bg-white p-6 rounded-2xl shadow-lg border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all flex justify-between items-center dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800"
                    aria-label={`${t.openLesson}: ${lesson.title}. ${t.category}: ${lesson.category}`}
                  >
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-blue-100 rounded-xl text-blue-600 dark:bg-blue-900/30">
                        <BookOpen size={32} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{lesson.title}</h3>
                        <div className="flex items-center gap-2">
                          {allProgress[lesson.id]?.completed ? (
                            <div className="flex items-center gap-2 text-green-600 font-bold">
                              <CheckCircle size={20} />
                              <span>{t.score}: {allProgress[lesson.id].score} / {allProgress[lesson.id].totalQuestions || '?'}</span>
                            </div>
                          ) : (
                            <>
                              <p className="text-lg text-slate-500">{t.getStarted}</p>
                              <span className="text-slate-300">•</span>
                              <p className="text-lg font-bold text-blue-600">{lesson.level || 'Basic'}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={32} className="text-slate-300" />
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
