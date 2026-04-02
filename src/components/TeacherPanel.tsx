import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { Plus, Trash2, BookOpen, Music, HelpCircle, Save, AlertTriangle } from 'lucide-react';
import { useA11y } from './A11yProvider';
import toast from 'react-hot-toast';

export const TeacherPanel: React.FC = () => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [textContent, setTextContent] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { announce, t } = useA11y();

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    const q = query(collection(db, 'lessons'));
    const snapshot = await getDocs(q);
    setLessons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category || !textContent) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const lessonData = {
        title,
        category,
        textContent,
        audioUrl,
        teacherId: auth.currentUser?.uid,
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'lessons'), lessonData);
      
      await addDoc(collection(db, 'quizzes'), {
        lessonId: docRef.id,
        questions: [
          {
            question: `What is the main topic of ${title}?`,
            options: [category, 'Something else', 'None of the above'],
            correctAnswer: 0
          }
        ]
      });

      toast.success('Lesson and sample quiz added!');
      announce(t.saveLesson);
      setTitle('');
      setCategory('');
      setTextContent('');
      setAudioUrl('');
      fetchLessons();
    } catch (error) {
      console.error(error);
      toast.error('Failed to add lesson');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'lessons', id));
      toast.success('Lesson deleted');
      setConfirmDelete(null);
      fetchLessons();
    } catch (error) {
      toast.error('Failed to delete lesson');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8 flex items-center gap-4">
        <BookOpen size={40} className="text-blue-600" />
        {t.teacherPanel}
      </h1>

      <section className="bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-200 mb-12 dark:bg-slate-900 dark:border-slate-700">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Plus className="text-blue-600" /> {t.addLesson}
        </h2>
        <form onSubmit={handleAddLesson} className="grid gap-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-bold mb-2" htmlFor="title">{t.lessonTitle}</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-4 rounded-xl border-2 border-slate-200 focus:ring-4 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700"
                placeholder="e.g., Introduction to MS Word"
              />
            </div>
            <div>
              <label className="block text-lg font-bold mb-2" htmlFor="category">{t.category}</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-4 rounded-xl border-2 border-slate-200 focus:ring-4 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="">Select Category</option>
                <option value="Desktop">Desktop</option>
                <option value="MS Word">MS Word</option>
                <option value="Internet">Internet</option>
                <option value="Hardware">Hardware</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-lg font-bold mb-2" htmlFor="content">{t.textContent}</label>
            <textarea
              id="content"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={6}
              className="w-full p-4 rounded-xl border-2 border-slate-200 focus:ring-4 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700"
              placeholder="Enter the lesson notes here..."
            />
          </div>

          <div>
            <label className="block text-lg font-bold mb-2" htmlFor="audio">{t.audioUrl}</label>
            <div className="flex gap-4">
              <input
                id="audio"
                type="url"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                className="flex-1 p-4 rounded-xl border-2 border-slate-200 focus:ring-4 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700"
                placeholder="https://example.com/audio.mp3"
              />
              <Music className="text-slate-400 self-center" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-blue-600 text-white rounded-xl text-2xl font-bold hover:bg-blue-700 focus:ring-4 focus:ring-blue-400 outline-none disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <Save /> {loading ? 'Saving...' : t.saveLesson}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">{t.existingLessons}</h2>
        <div className="grid gap-4">
          {lessons.map(lesson => (
            <div key={lesson.id} className="bg-white p-6 rounded-xl shadow border-2 border-slate-100 flex flex-col gap-4 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">{lesson.title}</h3>
                  <p className="text-slate-500">{lesson.category}</p>
                </div>
                <button
                  onClick={() => setConfirmDelete(lesson.id)}
                  className="p-3 text-red-600 hover:bg-red-50 rounded-lg focus:ring-4 focus:ring-red-400 outline-none"
                  aria-label={`${t.delete} ${lesson.title}`}
                >
                  <Trash2 />
                </button>
              </div>

              {confirmDelete === lesson.id && (
                <div className="bg-red-50 p-4 rounded-lg flex items-center justify-between border-2 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                  <div className="flex items-center gap-3 text-red-800 dark:text-red-200 font-bold">
                    <AlertTriangle /> Are you sure?
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-4 py-2 bg-white border-2 border-slate-200 rounded-lg font-bold hover:bg-slate-50 focus:ring-4 focus:ring-slate-300 outline-none dark:bg-slate-800 dark:border-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(lesson.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 focus:ring-4 focus:ring-red-400 outline-none"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
