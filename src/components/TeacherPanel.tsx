import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, updateDoc, Timestamp, orderBy, where, getDocs, setDoc, getDocFromServer } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, uploadBytes } from 'firebase/storage';
import { Plus, Trash2, BookOpen, Music, HelpCircle, Save, AlertTriangle, Edit3, X, BrainCircuit, Sparkles, Loader2, Image as ImageIcon, ChevronDown, ChevronUp, Settings, Type as TypeIcon, Upload, Key, Users, ClipboardCheck, Info, FileAudio } from 'lucide-react';
import { useA11y } from './A11yProvider';
import { handleKey, getDirectAudioUrl, isYouTubeUrl } from '../lib/utils';
import { GoogleGenAI, Type } from "@google/genai";
import { seedLessons } from '../lib/seedData';
import toast from 'react-hot-toast';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
  const [lessonLanguage, setLessonLanguage] = useState<string>('en');
  const [loading, setLoading] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [appName, setAppName] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [examCodes, setExamCodes] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [studentName, setStudentName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [showExamPanel, setShowExamPanel] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  const testFirebaseConnection = async () => {
    if (!auth.currentUser) {
      toast.error(language === 'en' ? 'Please log in first' : 'ദയവായി ആദ്യം ലോഗിൻ ചെയ്യുക');
      return;
    }

    setTestingConnection(true);
    const testTimeout = setTimeout(() => {
      setTestingConnection(false);
      toast.error(language === 'en' ? 'Connection test timed out. This usually means Firebase is not responding.' : 'കണക്ഷൻ വൈകുന്നു. ഫയർബേസ് പ്രതികരിക്കുന്നില്ല.');
    }, 15000);

    try {
      console.log("Testing Firestore connection...");
      await getDocFromServer(doc(db, 'config', 'connection_test'));
      
      console.log("Testing Storage connection...");
      const storageRef = ref(storage, 'connection_test.txt');
      if (!storageRef.bucket) {
        throw new Error("Storage bucket not configured");
      }

      const blob = new Blob(["test"], { type: 'text/plain' });
      await uploadBytes(storageRef, blob);
      
      clearTimeout(testTimeout);
      toast.success(language === 'en' ? 'Firebase connection is working perfectly!' : 'ഫയർബേസ് കണക്ഷൻ കൃത്യമായി പ്രവർത്തിക്കുന്നു!');
    } catch (error: any) {
      clearTimeout(testTimeout);
      console.error("Firebase Connection Test Error:", error);
      let msg = error.message || 'Unknown error';
      if (msg.includes('storage/unauthorized')) {
        msg = language === 'en' ? 'Storage Access Denied. Check Rules.' : 'സ്റ്റോറേജ് അനുമതി നിഷേധിക്കപ്പെട്ടു. Rules പരിശോധിക്കുക.';
      }
      toast.error(`Error: ${msg}`);
    } finally {
      setTestingConnection(false);
    }
  };
  const { announce, t, language } = useA11y();

  useEffect(() => {
    if (audioUrl.includes('drive.google.com') && !audioUrl.includes('uc?export=download')) {
      const fixed = getDirectAudioUrl(audioUrl);
      if (fixed !== audioUrl) {
        setAudioUrl(fixed);
        toast.success(language === 'en' ? 'Google Drive link optimized!' : 'ഗൂഗിൾ ഡ്രൈവ് ലിങ്ക് ശരിയാക്കി!');
      }
    }
  }, [audioUrl, language]);

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
    const qCodes = query(collection(db, 'exam_codes'), orderBy('createdAt', 'desc'));
    const unsubscribeCodes = onSnapshot(qCodes, (snapshot) => {
      setExamCodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qResults = query(collection(db, 'exam_results'), orderBy('timestamp', 'desc'));
    const unsubscribeResults = onSnapshot(qResults, (snapshot) => {
      setExamResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeCodes();
      unsubscribeResults();
    };
  }, []);

  const handleSaveSettings = async () => {
    if (!appName.trim()) {
      toast.error('App name cannot be empty');
      return;
    }

    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'config', 'app'), {
        name: appName,
        updatedAt: Timestamp.now()
      }, { merge: true });
      toast.success('App settings updated!');
      announce('Application name updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/app');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("Logo upload started for file:", file.name, "size:", file.size);

    if (file.size > 500000) { // 500KB limit for Firestore document
      toast.error('Logo file too large. Please use a smaller image (under 500KB).');
      return;
    }

    setUploadingLogo(true);
    const target = e.target;
    const reader = new FileReader();
    
    reader.onload = async () => {
      console.log("File read successful, starting Firestore upload...");
      const base64String = reader.result as string;
      try {
        await setDoc(doc(db, 'config', 'app'), {
          logo: base64String,
          updatedAt: Timestamp.now()
        }, { merge: true });
        console.log("Logo upload to Firestore successful");
        toast.success(t.logoUpdated);
        announce(t.logoUpdated);
      } catch (error) {
        console.error("Logo upload to Firestore failed:", error);
        handleFirestoreError(error, OperationType.WRITE, 'config/app');
      } finally {
        setUploadingLogo(false);
        // Clear input value to allow re-uploading the same file
        target.value = '';
      }
    };
    
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      toast.error('Failed to read file');
      setUploadingLogo(false);
    };
    
    reader.readAsDataURL(file);
  };

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
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  const handleRestoreDefaults = async () => {
    setLoading(true);
    try {
      const added = await seedLessons();
      if (added) {
        toast.success('Default lessons restored!');
        announce('Default lessons restored');
      } else {
        toast('All default lessons are already present.');
      }
    } catch (error) {
      toast.error('Failed to restore default lessons');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExamCode = async () => {
    if (!studentName.trim()) {
      toast.error(t.enterName);
      return;
    }

    const code = "ACL" + Math.floor(100 + Math.random() * 900);
    setLoading(true);
    try {
      await addDoc(collection(db, 'exam_codes'), {
        code,
        studentName,
        used: false,
        createdAt: Timestamp.now()
      });
      setGeneratedCode(code);
      setStudentName('');
      toast.success(t.codeCreated);
      announce(`${t.generatedCode}: ${code}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'exam_codes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExamCode = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'exam_codes', id));
      toast.success(t.delete);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'exam_codes');
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (e.g., 50MB limit for Firebase Storage)
    if (file.size > 50 * 1024 * 1024) {
      toast.error(language === 'en' ? 'File too large (max 50MB)' : 'ഫയൽ വലുപ്പം കൂടുതലാണ് (പരമാവധി 50MB)');
      return;
    }

    const storageRef = ref(storage, `audio/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setUploadProgress(0);
    console.log("Starting upload for:", file.name, "Size:", file.size);

    const timeout = setTimeout(() => {
      if (uploadProgress === 0) {
        toast.error(language === 'en' 
          ? 'Upload is taking too long. Please check your internet or Firebase Storage rules.' 
          : 'അപ്‌ലോഡ് വൈകുന്നു. ഇന്റർനെറ്റ് കണക്ഷനോ ഫയർബേസ് സെറ്റിങ്‌സോ പരിശോധിക്കുക.');
      }
    }, 15000); // 15 seconds timeout for 0% progress

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload progress:", progress.toFixed(2) + "%");
        setUploadProgress(progress);
        if (progress > 0) clearTimeout(timeout);
      }, 
      (error: any) => {
        clearTimeout(timeout);
        console.error("Upload error details:", {
          code: error.code,
          message: error.message,
          serverResponse: error.serverResponse
        });
        
        let msg = language === 'en' ? 'Upload failed' : 'അപ്‌ലോഡ് പരാജയപ്പെട്ടു';
        if (error.code === 'storage/unauthorized') {
          msg = language === 'en' 
            ? 'Access denied. Please check Firebase Storage rules.' 
            : 'അനുമതി നിഷേധിക്കപ്പെട്ടു. ഫയർബേസ് സ്റ്റോറേജ് നിയമങ്ങൾ പരിശോധിക്കുക.';
        }
        
        toast.error(msg);
        setUploadProgress(null);
      }, 
      async () => {
        clearTimeout(timeout);
        try {
          console.log("Upload complete, getting download URL...");
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setAudioUrl(downloadURL);
          toast.success(language === 'en' ? 'Audio uploaded successfully!' : 'ഓഡിയോ അപ്‌ലോഡ് ചെയ്തു!');
        } catch (err) {
          console.error("Error getting download URL:", err);
          toast.error(language === 'en' ? 'Failed to get audio URL' : 'ഓഡിയോ ലിങ്ക് ലഭിച്ചില്ല');
        } finally {
          setUploadProgress(null);
        }
      }
    );
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
        language: lessonLanguage,
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
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'lessons/quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (lesson: any) => {
    setEditingId(lesson.id);
    setShowAddForm(true);
    setTitle(lesson.title);
    setCategory(lesson.category);
    setLevel(lesson.level || 'Basic');
    setOrder(lesson.order || 0);
    setTextContent(lesson.textContent);
    setAudioUrl(lesson.audioUrl || '');
    setLessonLanguage(lesson.language || 'en');
    
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
    setLessonLanguage('en');
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
    if (!textContent || textContent.trim().length < 20) {
      toast.error(language === 'en' ? 'Please add more lesson content first' : 'പാഠഭാഗം കുറച്ചുകൂടി ചേർക്കുക');
      return;
    }

    setGeneratingQuiz(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key is not configured. Please check your environment variables.');
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a 5-question multiple choice exam in Malayalam based on this text: "${textContent}". 
        The questions should be clear and suitable for visually impaired students learning computers.
        Return ONLY a JSON array where each object has "question" (string in Malayalam), "options" (array of exactly 3 strings in Malayalam), and "correctAnswer" (number index 0-2). 
        Ensure the Malayalam is natural and grammatically correct.
        Ensure the output is a valid JSON array and nothing else.`,
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

      if (!response.text) {
        throw new Error('Empty response from AI');
      }

      const generated = JSON.parse(response.text.trim());
      if (Array.isArray(generated) && generated.length > 0) {
        setQuizQuestions(generated);
        toast.success(language === 'en' ? 'Quiz generated successfully!' : 'ക്വിസ് നിർമ്മിച്ചു!');
      } else {
        throw new Error('Invalid quiz format');
      }
    } catch (error: any) {
      console.error("AI Quiz Generation Error Details:", error);
      const errorMessage = error.message || 'Unknown error occurred';
      toast.error(language === 'en' 
        ? `Failed to generate quiz: ${errorMessage}. Please check your Gemini API key in settings.` 
        : `ക്വിസ് നിർമ്മിക്കാൻ സാധിച്ചില്ല: ${errorMessage}. സെറ്റിങ്‌സിൽ Gemini API key ഉണ്ടെന്ന് ഉറപ്പുവരുത്തുക.`);
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
      handleFirestoreError(error, OperationType.DELETE, `lessons/${id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8 flex items-center gap-4 outline-none focus:ring-4 focus:ring-blue-500 rounded-lg inline-flex">
        <BookOpen size={40} className="text-blue-600" />
        {t.teacherPanel}
      </h1>

      {/* App Settings Section */}
      <section className="bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-200 mb-12 dark:bg-slate-900 dark:border-slate-700">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
          <Settings className="text-blue-600" /> App Settings
        </h2>
        
        <div className="grid md:grid-cols-2 gap-12">
          {/* App Name Settings */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <TypeIcon className="text-blue-600" size={20} /> App Name
            </h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Enter App Name"
                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-lg focus:ring-4 focus:ring-blue-400 outline-none"
              />
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingSettings ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                {savingSettings ? 'Saving...' : 'Save App Name'}
              </button>
            </div>
          </div>

          {/* Logo Settings */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <ImageIcon className="text-blue-600" size={20} /> Logo Settings
            </h3>
            <div className="flex flex-col items-center gap-6 p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
              <div className="w-32 h-32 bg-slate-100 rounded-2xl flex items-center justify-center dark:bg-slate-800 overflow-hidden shadow-inner">
                {logoBase64 ? (
                  <img src={logoBase64} alt="Current Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon size={48} className="text-slate-300" />
                )}
              </div>
              <div className="text-center w-full">
                <p className="text-sm text-slate-500 mb-4">
                  {t.uploadLogo} (PNG/JPG, max 500KB)
                </p>
                <label className="w-full cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50">
                  {uploadingLogo ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
                  {uploadingLogo ? 'Uploading...' : t.uploadLogo}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Exam Management Section */}
      <section className="bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-200 mb-12 dark:bg-slate-900 dark:border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => setShowExamPanel(!showExamPanel)}
            className="text-2xl font-bold flex items-center gap-3 rounded-lg hover:text-blue-600 transition-colors"
          >
            <Users className="text-blue-600" />
            {t.examSystem}
            {showExamPanel ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>

        {showExamPanel && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border-2 border-blue-100 dark:border-blue-800">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Key className="text-blue-600" /> {t.createCode}
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder={t.studentName}
                    className="flex-1 p-4 rounded-xl border-2 border-slate-200 focus:ring-4 focus:ring-blue-400 outline-none dark:bg-slate-800 dark:border-slate-700"
                  />
                  <button
                    onClick={handleCreateExamCode}
                    disabled={loading}
                    className="px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 focus:ring-4 focus:ring-blue-400 outline-none disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : t.createCode}
                  </button>
                </div>
                {generatedCode && (
                  <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-blue-200 dark:border-blue-700 text-center">
                    <p className="text-slate-500 text-sm mb-1">{t.generatedCode}</p>
                    <p className="text-3xl font-black text-blue-600 tracking-widest">{generatedCode}</p>
                  </div>
                )}
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-2xl border-2 border-purple-100 dark:border-purple-800">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <ClipboardCheck className="text-purple-600" /> {t.viewResults}
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {examResults.length === 0 ? (
                    <p className="text-slate-500 italic">{t.noResults}</p>
                  ) : (
                    examResults.map((res) => (
                      <div key={res.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-purple-200 dark:border-purple-700 flex justify-between items-center">
                        <div>
                          <p className="font-bold">{res.studentName}</p>
                          <p className="text-xs text-slate-500">{res.timestamp?.toDate().toLocaleString()}</p>
                        </div>
                        <p className="text-xl font-black text-purple-600">{res.score}/{res.total}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold mb-4">{t.generatedCode}s</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {examCodes.map((code) => (
                  <div key={code.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-mono font-bold text-blue-600">{code.code}</p>
                      <p className="text-sm text-slate-500">{code.studentName}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteExamCode(code.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-200 mb-12 dark:bg-slate-900 dark:border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => {
              console.log("Toggling add form from", showAddForm, "to", !showAddForm);
              setShowAddForm(!showAddForm);
            }}
            className="text-2xl font-bold flex items-center gap-3 rounded-lg hover:text-blue-600 transition-colors"
          >
            {editingId ? <Edit3 className="text-blue-600" /> : <Plus className="text-blue-600" />}
            {editingId ? t.editLesson : t.addLesson}
            {showAddForm ? <ChevronUp /> : <ChevronDown />}
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleRestoreDefaults}
              disabled={loading}
              className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl font-bold hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 flex items-center gap-2"
              title="Restore missing default lessons"
            >
              <Sparkles size={18} /> Restore Defaults
            </button>
            {editingId && (
              <button 
                onClick={cancelEdit}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                aria-label={t.cancel}
              >
                <X size={24} />
              </button>
            )}
          </div>
        </div>
        
        {showAddForm && (
          <form onSubmit={handleSaveLesson} className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-bold mb-2 outline-none focus:ring-2 focus:ring-blue-400 rounded inline-block" htmlFor="title" tabIndex={0}>{t.lessonTitle}</label>
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
              <label className="block text-lg font-bold mb-2 outline-none focus:ring-2 focus:ring-blue-400 rounded inline-block" htmlFor="category" tabIndex={0}>{t.category}</label>
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
              <label className="block text-lg font-bold mb-2 outline-none focus:ring-2 focus:ring-blue-400 rounded inline-block" htmlFor="level" tabIndex={0}>{t.level}</label>
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
              <label className="block text-lg font-bold mb-2 outline-none focus:ring-2 focus:ring-blue-400 rounded inline-block" htmlFor="lang" tabIndex={0}>{t.language}</label>
              <select
                id="lang"
                value={lessonLanguage}
                onChange={(e) => setLessonLanguage(e.target.value)}
                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500"
                required
              >
                <option value="en">English</option>
                <option value="ml">Malayalam</option>
              </select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-bold mb-2 outline-none focus:ring-2 focus:ring-blue-400 rounded inline-block" htmlFor="order" tabIndex={0}>{t.order}</label>
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
              <label className="block text-lg font-bold mb-2 outline-none focus:ring-2 focus:ring-blue-400 rounded inline-block" htmlFor="audioUrl" tabIndex={0}>{t.audioUrl}</label>
              
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30 mb-4">
                <p className="text-blue-800 dark:text-blue-300 font-bold flex items-center gap-2 mb-2">
                  <Info size={20} /> Simple Ways to Add Audio:
                </p>
                <ul className="text-blue-700 dark:text-blue-400 list-disc ml-5 space-y-2 text-sm">
                  <li>
                    <strong>YouTube (Recommended):</strong> Upload your audio as a video (even with a static image) to YouTube. Set it to "Unlisted" and paste the link here. It works 100% of the time.
                  </li>
                  <li>
                    <strong>Dropbox:</strong> Upload your audio to Dropbox, copy the "Share" link, and paste it here.
                  </li>
                  <li>
                    <strong>Catbox.moe:</strong> Go to <a href="https://catbox.moe" target="_blank" rel="noopener noreferrer" className="underline">catbox.moe</a>, upload your audio, and paste the direct link here. It's very simple and fast.
                  </li>
                </ul>
              </div>

              <div className="flex gap-2">
                <input
                  id="audioUrl"
                  type="url"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  className="flex-1 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500"
                  placeholder="Paste YouTube or Dropbox link here"
                />
                {audioUrl && isYouTubeUrl(audioUrl) && (
                  <div className="mt-2 p-3 bg-amber-50 border-2 border-amber-200 rounded-xl dark:bg-amber-900/20 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-300 font-bold flex items-center gap-2">
                      <AlertTriangle size={18} /> 
                      {language === 'en' 
                        ? 'YouTube Settings: Ensure the video is "Public" or "Unlisted" and "Allow Embedding" is enabled.' 
                        : 'YouTube ക്രമീകരണങ്ങൾ: വീഡിയോ "Public" അല്ലെങ്കിൽ "Unlisted" ആണെന്നും "Allow Embedding" ഓൺ ആണെന്നും ഉറപ്പുവരുത്തുക.'}
                    </p>
                  </div>
                )}
                <div className="relative flex gap-2">
                  <div className="relative">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Upload audio file"
                    />
                    <button
                      type="button"
                      className="h-full px-6 bg-slate-100 border-2 border-slate-200 rounded-xl hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 flex items-center gap-2 font-bold transition-colors"
                    >
                      {uploadProgress !== null ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="animate-spin text-blue-600" size={20} />
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                      ) : (
                        <>
                          <FileAudio size={24} className="text-blue-600" />
                          <span className="hidden sm:inline">Upload</span>
                        </>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={testFirebaseConnection}
                    disabled={testingConnection}
                    className="p-4 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-bold transition-colors flex items-center gap-2"
                    title="Test Firebase Connection"
                  >
                    {testingConnection ? <Loader2 className="animate-spin" size={20} /> : <Info size={20} />}
                    <span className="hidden sm:inline">Test</span>
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Info size={14} /> 
                {language === 'en' 
                  ? 'Paste YouTube, Dropbox, or Direct Audio links. Or upload directly (Max 50MB).' 
                  : 'യൂട്യൂബ്, ഡ്രോപ്പ്ബോക്സ് അല്ലെങ്കിൽ നേരിട്ടുള്ള ഓഡിയോ ലിങ്കുകൾ നൽകാം. നേരിട്ട് അപ്‌ലോഡ് ചെയ്യാനും സാധിക്കും (പരമാവധി 50MB).'}
              </p>
            </div>
          </div>
          <div>
            <label className="block text-lg font-bold mb-2 outline-none focus:ring-2 focus:ring-blue-400 rounded inline-block" htmlFor="textContent" tabIndex={0}>{t.textContent}</label>
            <textarea
              id="textContent"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-xl outline-none focus:ring-4 focus:ring-blue-500 min-h-[200px]"
              required
            />
          </div>

          <div className="border-t-2 border-slate-100 dark:border-slate-800 pt-8 mt-4">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 outline-none focus:ring-2 focus:ring-blue-400 rounded inline-block" tabIndex={0}>
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
                  onKeyDown={handleKey}
                  className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-300 rounded-2xl text-xl font-bold text-slate-500 hover:border-blue-500 hover:text-blue-600 dark:border-slate-700"
                >
                  <Plus /> {t.addQuestion}
                </button>
                
                <button
                  type="button"
                  onClick={generateQuizWithAI}
                  onKeyDown={handleKey}
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
            onKeyDown={handleKey}
            className="flex items-center justify-center gap-3 py-5 bg-blue-600 text-white rounded-xl text-2xl font-bold hover:bg-blue-700 focus:ring-4 focus:ring-blue-400 outline-none disabled:opacity-50"
          >
            <Save /> {editingId ? t.updateLesson : t.saveLesson}
          </button>
        </form>
        )}
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-6 outline-none focus:ring-4 focus:ring-blue-500 rounded-lg inline-block">
          {t.existingLessons}
        </h2>
        <div className="grid gap-4">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white p-6 rounded-2xl border-2 border-slate-200 flex flex-col gap-4 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold outline-none focus:ring-2 focus:ring-blue-400 rounded inline-block" tabIndex={0}>{lesson.title}</h3>
                  <div className="flex gap-2 mt-1">
                    <p className="text-slate-500 font-bold outline-none focus:ring-2 focus:ring-blue-400 rounded" tabIndex={0}>{lesson.category}</p>
                    <span className="text-slate-300">•</span>
                    <p className="text-blue-600 font-bold outline-none focus:ring-2 focus:ring-blue-400 rounded" tabIndex={0}>{lesson.level || 'Basic'}</p>
                    <span className="text-slate-300">•</span>
                    <p className="text-purple-600 font-bold outline-none focus:ring-2 focus:ring-blue-400 rounded uppercase" tabIndex={0}>{lesson.language}</p>
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
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                  {lesson.textContent}
                </p>
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
            <h2 className="text-3xl font-bold mb-4 outline-none focus:ring-4 focus:ring-blue-500 rounded-lg inline-block" tabIndex={0}>Are you sure?</h2>
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
