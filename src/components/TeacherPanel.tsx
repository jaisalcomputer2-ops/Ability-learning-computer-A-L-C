import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, updateDoc, Timestamp, orderBy, where, getDocs } from 'firebase/firestore';
import { Plus, Trash2, BookOpen, Music, HelpCircle, Save, AlertTriangle, Edit3, X, BrainCircuit, Sparkles, Loader2 } from 'lucide-react';
import { useA11y } from './A11yProvider';
import { GoogleGenAI, Type } from "@google/genai";
import toast from 'react-hot-toast';

export const TeacherPanel: React.FC = () => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['Desktop', 'MS Word', 'Internet', 'Hardware']);
  const [newCategory, setNewCategory] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('Basic');
  const [order, setOrder] = useState<number>(0);
  const [textContent, setTextContent] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<any[]>([
    { question: '', options: ['', '', ''], correctAnswer: 0 }
  ]);
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { announce, t } = useA11y();

  useEffect(() => {
    const q = query(collection(db, 'lessons'), orderBy('order', 'asc'));
    const unsubscribeLessons = onSnapshot(q, (snapshot) => {
      setLessons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Firestore Error:", error);
      toast.error("Failed to load lessons");
    });

    const categoriesQuery = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      if (snapshot.empty) {
        // If no categories in DB, use defaults but don't overwrite local state if it has more
        return;
      }
      const dbCategories = snapshot.docs.map(doc => doc.data().name);
      setCategories(prev => {
        const combined = Array.from(new Set([...prev, ...dbCategories]));
        return combined.sort();
      });
    });

    return () => {
      unsubscribeLessons();
      unsubscribeCategories();
    };
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    
    const categoryName = newCategory.trim();
    if (categories.includes(categoryName)) {
      toast.error('Category already exists');
      return;
    }

    try {
      await addDoc(collection(db, 'categories'), {
        name: categoryName,
        createdAt: Timestamp.now()
      });
      setNewCategory('');
      toast.success('Category added!');
      announce(`Category ${categoryName} added`);
    } catch (error) {
      toast.error('Failed to add category');
    }
  };

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
        level,
        textContent,
        audioUrl,
        order: Number(order),
        teacherId: auth.currentUser?.uid,
        updatedAt: Timestamp.now()
      };

      let lessonId = editingId;

      if (editingId) {
        await updateDoc(doc(db, 'lessons', editingId), lessonData);
        toast.success('Lesson updated!');
        setEditingId(null);
      } else {
        const docRef = await addDoc(collection(db, 'lessons'), {
          ...lessonData,
          createdAt: Timestamp.now()
        });
        lessonId = docRef.id;
        toast.success('Lesson saved!');
      }

      // Save/Update Quiz
      if (lessonId) {
        const quizQuery = query(collection(db, 'quizzes'), where('lessonId', '==', lessonId));
        const quizSnapshot = await getDocs(quizQuery);
        
        const quizData = {
          lessonId,
          questions: quizQuestions.filter(q => q.question.trim() !== ''),
          updatedAt: Timestamp.now()
        };

        if (!quizSnapshot.empty) {
          await updateDoc(doc(db, 'quizzes', quizSnapshot.docs[0].id), quizData);
        } else {
          await addDoc(collection(db, 'quizzes'), {
            ...quizData,
            createdAt: Timestamp.now()
          });
        }
      }

      setTitle('');
      setCategory('');
      setLevel('Basic');
      setOrder(0);
      setTextContent('');
      setAudioUrl('');
      setQuizQuestions([{ question: '', options: ['', '', ''], correctAnswer: 0 }]);
      announce(t.saveLesson);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save lesson');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (lesson: any) => {
    setEditingId(lesson.id);
    setTitle(lesson.title);
    setCategory(lesson.category);
    setLevel(lesson.level || 'Basic');
    setOrder(lesson.order || 0);
    setTextContent(lesson.textContent);
    setAudioUrl(lesson.audioUrl || '');
    
    // Fetch quiz questions
    const quizQuery = query(collection(db, 'quizzes'), where('lessonId', '==', lesson.id));
    const quizSnapshot = await getDocs(quizQuery);
    if (!quizSnapshot.empty) {
      setQuizQuestions(quizSnapshot.docs[0].data().questions);
    } else {
      setQuizQuestions([{ question: '', options: ['', '', ''], correctAnswer: 0 }]);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    announce(`${t.editLesson}: ${lesson.title}`);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setCategory('');
    setLevel('Basic');
    setOrder(0);
    setTextContent('');
    setAudioUrl('');
    setQuizQuestions([{ question: '', options: ['', '', ''], correctAnswer: 0 }]);
  };

  const addQuizQuestion = () => {
    setQuizQuestions([...quizQuestions, { question: '', options: ['', '', ''], correctAnswer: 0 }]);
  };

  const removeQuizQuestion = (index: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  const updateQuizQuestion = (index: number, field: string, value: any) => {
    const updated = [...quizQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setQuizQuestions(updated);
  };

  const updateQuizOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...quizQuestions];
    const options = [...updated[qIndex].options];
    options[oIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options };
    setQuizQuestions(updated);
  };

  const generateQuizWithAI = async () => {
    if (!textContent || textContent.length < 20) {
      toast.error('Please add more lesson content first');
      return;
    }

    setGeneratingQuiz(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a 3-question multiple choice quiz in Malayalam based on this text: "${textContent}". 
        Return a JSON array where each object has "question" (string), "options" (array of 3 strings), and "correctAnswer" (number index 0-2).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  minItems: 3,
                  maxItems: 3
                },
                correctAnswer: { type: Type.INTEGER }
              },
              required: ["question", "options", "correctAnswer"]
            }
          }
        }
      });

      const generated = JSON.parse(response.text || '[]');
      if (generated.length > 0) {
        setQuizQuestions(generated);
        toast.success('Quiz generated successfully!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate quiz');
    } finally {
      setGeneratingQuiz(false);
    }
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
              <div className="flex gap-2">
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Add New Category"
                  className="flex-1 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-lg outline-none focus:ring-4 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 focus:ring-4 focus:ring-slate-400 outline-none dark:bg-slate-800 dark:text-slate-300"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-bold mb-2" htmlFor="level">{t.level}</label>
              <select
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500"
                required
              >
                <option value="Basic">{t.basic}</option>
                <option value="Advanced">{t.advanced}</option>
              </select>
            </div>
            <div>
              <label className="block text-lg font-bold mb-2" htmlFor="order">{t.order}</label>
              <input
                id="order"
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500"
                placeholder="Lesson Order (1,2,3)"
                required
              />
            </div>
          </div>
          <div className="grid md:grid-cols-1 gap-6">
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

          <div className="border-t-2 border-slate-100 dark:border-slate-800 pt-8 mt-4">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <BrainCircuit className="text-blue-600" /> {t.startQuiz}
            </h3>
            
            <div className="grid gap-8">
              {quizQuestions.map((q, qIndex) => (
                <div key={qIndex} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 relative">
                  <button
                    type="button"
                    onClick={() => removeQuizQuestion(qIndex)}
                    className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20"
                    aria-label={t.removeQuestion}
                  >
                    <Trash2 size={20} />
                  </button>
                  
                  <div className="grid gap-4">
                    <div>
                      <label className="block font-bold mb-1">{t.questionText} {qIndex + 1}</label>
                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => updateQuizQuestion(qIndex, 'question', e.target.value)}
                        className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-lg outline-none focus:ring-4 focus:ring-blue-500"
                        placeholder="e.g. Desktop എന്താണ്?"
                        required
                      />
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      {q.options.map((opt: string, oIndex: number) => (
                        <div key={oIndex}>
                          <label className="block font-bold mb-1">{t.option} {oIndex + 1}</label>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateQuizOption(qIndex, oIndex, e.target.value)}
                            className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-lg outline-none focus:ring-4 focus:ring-blue-500"
                            required
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div>
                      <label className="block font-bold mb-1">{t.correctAnswer}</label>
                      <select
                        value={q.correctAnswer}
                        onChange={(e) => updateQuizQuestion(qIndex, 'correctAnswer', Number(e.target.value))}
                        className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-lg outline-none focus:ring-4 focus:ring-blue-500"
                      >
                        {q.options.map((_: any, i: number) => (
                          <option key={i} value={i}>{t.option} {i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={addQuizQuestion}
                  className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-300 rounded-2xl text-xl font-bold text-slate-500 hover:border-blue-500 hover:text-blue-600 dark:border-slate-700"
                >
                  <Plus /> {t.addQuestion}
                </button>
                
                <button
                  type="button"
                  onClick={generateQuizWithAI}
                  disabled={generatingQuiz}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-purple-50 border-2 border-purple-200 rounded-2xl text-xl font-bold text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-800 disabled:opacity-50"
                >
                  {generatingQuiz ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  {generatingQuiz ? t.generating : t.generateQuiz}
                </button>
              </div>
            </div>
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
                <div className="flex gap-2">
                  <p className="text-slate-500 font-bold">{lesson.category}</p>
                  <span className="text-slate-300">•</span>
                  <p className="text-blue-600 font-bold">{lesson.level || 'Basic'}</p>
                </div>
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
