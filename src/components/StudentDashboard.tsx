import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, where, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { BookOpen, PlayCircle, CheckCircle, ChevronRight, ArrowLeft, Headphones, FileText, BrainCircuit } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { Quiz } from './Quiz';
import { useA11y } from './A11yProvider';
import toast from 'react-hot-toast';

export const StudentDashboard: React.FC = () => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [view, setView] = useState<'list' | 'lesson' | 'quiz'>('list');
  const { announce, t } = useA11y();

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    const q = query(collection(db, 'lessons'));
    const snapshot = await getDocs(q);
    setLessons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleSelectLesson = async (lesson: any) => {
    setSelectedLesson(lesson);
    setView('lesson');
    announce(`${lesson.title}. ${lesson.category}`);
    
    const progressId = `${auth.currentUser?.uid}_${lesson.id}`;
    const progressDoc = await getDoc(doc(db, 'progress', progressId));
    if (progressDoc.exists()) {
      setProgress(progressDoc.data());
    } else {
      setProgress(null);
    }

    const quizQuery = query(collection(db, 'quizzes'), where('lessonId', '==', lesson.id));
    const quizSnapshot = await getDocs(quizQuery);
    if (!quizSnapshot.empty) {
      setQuiz({ id: quizSnapshot.docs[0].id, ...quizSnapshot.docs[0].data() });
    } else {
      setQuiz(null);
    }
  };

  const updateProgress = async (data: any) => {
    const progressId = `${auth.currentUser?.uid}_${selectedLesson.id}`;
    await setDoc(doc(db, 'progress', progressId), {
      userId: auth.currentUser?.uid,
      lessonId: selectedLesson.id,
      updatedAt: Timestamp.now(),
      ...progress,
      ...data
    });
    setProgress({ ...progress, ...data });
  };

  if (view === 'lesson' && selectedLesson) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => setView('list')}
          className="flex items-center gap-2 text-xl font-bold mb-8 text-blue-600 hover:underline focus:ring-4 focus:ring-blue-400 outline-none"
          aria-label={t.backToLessons}
        >
          <ArrowLeft /> {t.backToLessons}
        </button>

        <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-200 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex justify-between items-start mb-8">
            <div>
              <span className="text-lg font-bold text-slate-500 uppercase tracking-widest">{selectedLesson.category}</span>
              <h1 className="text-4xl font-bold mt-2">{selectedLesson.title}</h1>
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
                <h2 id="audio-heading" className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <Headphones className="text-blue-600" /> {t.audioLesson}
                </h2>
                <AudioPlayer 
                  url={selectedLesson.audioUrl} 
                  initialPosition={progress?.lastPlaybackPosition || 0}
                  onPositionUpdate={(pos) => updateProgress({ lastPlaybackPosition: pos })}
                />
              </section>
            )}

            <section aria-labelledby="notes-heading">
              <h2 id="notes-heading" className="text-2xl font-bold mb-4 flex items-center gap-3">
                <FileText className="text-blue-600" /> {t.lessonNotes}
              </h2>
              <div className="prose prose-xl max-w-none bg-slate-50 p-8 rounded-xl border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:prose-invert">
                {selectedLesson.textContent.split('\n').map((para: string, i: number) => (
                  <p key={i} className="mb-4 text-2xl leading-relaxed">{para}</p>
                ))}
              </div>
            </section>

            {quiz && (
              <button
                onClick={() => setView('quiz')}
                className="w-full py-6 bg-blue-600 text-white rounded-xl text-2xl font-bold hover:bg-blue-700 focus:ring-4 focus:ring-blue-400 outline-none flex items-center justify-center gap-4"
                aria-label={t.startQuiz}
              >
                <BrainCircuit size={32} /> {t.startQuiz}
              </button>
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
          onClick={() => setView('lesson')}
          className="flex items-center gap-2 text-xl font-bold mb-8 text-blue-600 hover:underline focus:ring-4 focus:ring-blue-400 outline-none"
          aria-label={t.backToLessons}
        >
          <ArrowLeft /> {t.backToLessons}
        </button>
        <Quiz 
          questions={quiz.questions} 
          onComplete={(score) => updateProgress({ completed: true, score })}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-4">{t.studentDashboard}</h1>
      <p className="text-2xl text-slate-600 mb-12 dark:text-slate-400">{t.description.split('.')[0]}.</p>

      <div className="grid gap-8">
        {['Desktop', 'MS Word', 'Internet', 'Hardware'].map(cat => {
          const catLessons = lessons.filter(l => l.category === cat);
          if (catLessons.length === 0) return null;

          return (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <h2 id={`cat-${cat}`} className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-200 border-b-4 border-blue-600 inline-block pb-1">
                {cat}
              </h2>
              <div className="grid gap-4 mt-4">
                {catLessons.map(lesson => (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelectLesson(lesson)}
                    className="w-full text-left bg-white p-6 rounded-2xl shadow-lg border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all flex justify-between items-center focus:ring-4 focus:ring-blue-500 outline-none dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800"
                    aria-label={`${lesson.title}. ${lesson.category}`}
                  >
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-blue-100 rounded-xl text-blue-600 dark:bg-blue-900/30">
                        <BookOpen size={32} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{lesson.title}</h3>
                        <p className="text-lg text-slate-500">{t.getStarted}</p>
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
