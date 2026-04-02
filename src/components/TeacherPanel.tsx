import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, updateDoc, Timestamp, orderBy } from 'firebase/firestore';
import { Plus, Trash2, BookOpen, Music, HelpCircle, Save, AlertTriangle, Edit3, X } from 'lucide-react';
import { useA11y } from './A11yProvider';
import toast from 'react-hot-toast';

export const TeacherPanel: React.FC = () => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [textContent, setTextContent] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { announce, t } = useA11y();

  useEffect(() => {
    const q = query(collection(db, 'lessons'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLessons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Firestore Error:", error);
      toast.error("Failed to load lessons");
    });

    return () => unsubscribe();
  }, []);

  const handleSaveLesson = async (e: React.FormEvent) => {
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
        updatedAt: Timestamp.now()
      };

      if (editingId) {
        await updateDoc(doc(db, 'lessons', editingId), lessonData);
        toast.success('Lesson updated!');
        setEditingId(null);
      } else {
        const docRef = await addDoc(collection(db, 'lessons'), {
          ...lessonData,
          createdAt: Timestamp.now()
        });
        
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
      }

      setTitle('');
      setCategory('');
      setTextContent('');
      setAudioUrl('');
      announce(t.saveLesson);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save lesson');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lesson: any) => {
    setEditingId(lesson.id);
    setTitle(lesson.title);
    setCategory(lesson.category);
    setTextContent(lesson.textContent);
    setAudioUrl(lesson.audioUrl || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    announce(`${t.editLesson}: ${lesson.title}`);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setCategory('');
    setTextContent('');
    setAudioUrl('');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'lessons', id));
      toast.success('Lesson deleted');
      setConfirmDelete(null);
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            {editingId ? <Edit3 className="text-blue-600" /> : <Plus className="text-blue-600" />}
            {editingId ? t.editLesson : t.addLesson}
          </h2>
          {editingId && (
            <button 
              onClick={cancelEdit}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg outline-none focus:ring-4 focus:ring-blue-500"
              aria-label={t.cancel}
            >
              <X size={24} />
            </button>
          )}
        </div>
        <form onSubmit={handleSaveLesson} className="grid gap-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-bold mb-2" htmlFor="title">{t.lessonTitle}</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-lg font-bold mb-2" htmlFor="category">{t.category}</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500"
                required
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
            <label className="block text-lg font-bold mb-2" htmlFor="textContent">{t.textContent}</label>
            <textarea
              id="textContent"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500 min-h-[200px]"
              required
            />
          </div>
          <div>
            <label className="block text-lg font-bold mb-2" htmlFor="audioUrl">{t.audioUrl}</label>
            <input
              id="audioUrl"
              type="url"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500"
              placeholder="https://example.com/audio.mp3"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-3 py-5 bg-blue-600 text-white rounded-xl text-2xl font-bold hover:bg-blue-700 focus:ring-4 focus:ring-blue-400 outline-none disabled:opacity-50"
          >
            <Save /> {editingId ? t.updateLesson : t.saveLesson}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-6">{t.existingLessons}</h2>
        <div className="grid gap-4">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white p-6 rounded-2xl border-2 border-slate-200 flex justify-between items-center dark:bg-slate-900 dark:border-slate-800">
              <div>
                <h3 className="text-2xl font-bold">{lesson.title}</h3>
                <p className="text-slate-500 font-bold">{lesson.category}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(lesson)}
                  className="p-4 text-blue-600 hover:bg-blue-50 rounded-xl focus:ring-4 focus:ring-blue-500 outline-none dark:hover:bg-blue-900/20"
                  aria-label={`${t.edit} ${lesson.title}`}
                >
                  <Edit3 size={28} />
                </button>
                <button
                  onClick={() => setConfirmDelete(lesson.id)}
                  className="p-4 text-red-600 hover:bg-red-50 rounded-xl focus:ring-4 focus:ring-red-500 outline-none dark:hover:bg-red-900/20"
                  aria-label={`${t.delete} ${lesson.title}`}
                >
                  <Trash2 size={28} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-800 p-8 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={48} className="text-red-600" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Are you sure?</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
              This action cannot be undone. The lesson and its progress will be lost.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="py-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-xl font-bold outline-none focus:ring-4 focus:ring-slate-500"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="py-4 bg-red-600 text-white rounded-xl text-xl font-bold outline-none focus:ring-4 focus:ring-red-500"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
