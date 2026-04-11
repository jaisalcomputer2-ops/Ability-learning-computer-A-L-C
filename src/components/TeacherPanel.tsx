import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, updateDoc, Timestamp, orderBy, where, getDocs, setDoc, getDocFromServer } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, uploadBytes } from 'firebase/storage';
import { Plus, Trash2, BookOpen, Music, HelpCircle, Save, AlertTriangle, Edit3, X, BrainCircuit, Sparkles, Loader2, Image as ImageIcon, ChevronDown, ChevronUp, Settings, Type as TypeIcon, Upload, Key, Users, ClipboardCheck, Info, FileAudio, GraduationCap, Phone, Copy, Keyboard, RotateCcw, Search, Calendar, User } from 'lucide-react';
import { useA11y } from './A11yProvider';
import { handleKey, getDirectAudioUrl, isYouTubeUrl } from '../lib/utils';
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
  const [studentsProgress, setStudentsProgress] = useState<any[]>([]);
  const [registrationRequests, setRegistrationRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'lessons' | 'exams' | 'students' | 'requests' | 'settings' | 'spelling'>('lessons');
  const [seedingLessons, setSeedingLessons] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [requestSearch, setRequestSearch] = useState('');
  const [aiExamInput, setAiExamInput] = useState('');
  const [generatingAIExam, setGeneratingAIExam] = useState(false);
  const [spellingCategories, setSpellingCategories] = useState<any[]>([]);
  const [newSpellingCategory, setNewSpellingCategory] = useState('');
  const [generatingSpellingWords, setGeneratingSpellingWords] = useState(false);

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

  const [usersMap, setUsersMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const qUsers = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        map[doc.id] = doc.data();
      });
      setUsersMap(map);
    });
    return () => unsubscribeUsers();
  }, []);

  useEffect(() => {
    const qProgress = query(collection(db, 'progress'));
    const unsubscribeProgress = onSnapshot(qProgress, (snapshot) => {
      // Initialize map with ALL students from usersMap first
      const studentMap: Record<string, any> = {};
      
      Object.keys(usersMap).forEach(userId => {
        studentMap[userId] = {
          userId: userId,
          name: usersMap[userId]?.name || 'Student',
          completedLessons: 0,
          scores: [],
          finalExamAssigned: usersMap[userId]?.finalExamAssigned || false,
          lastActive: usersMap[userId]?.createdAt || null
        };
      });

      // Then update with actual progress data
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (studentMap[data.userId]) {
          if (data.completed) {
            studentMap[data.userId].completedLessons++;
          }
          if (data.score !== undefined && data.totalQuestions) {
            studentMap[data.userId].scores.push(data.score / data.totalQuestions);
          }
          // Use the most recent update time
          if (data.updatedAt) {
            const currentLastActive = studentMap[data.userId].lastActive;
            if (!currentLastActive || data.updatedAt.toMillis() > currentLastActive.toMillis()) {
              studentMap[data.userId].lastActive = data.updatedAt;
            }
          }
        }
      });
      
      setStudentsProgress(Object.values(studentMap));
    });

    return () => unsubscribeProgress();
  }, [usersMap]);

  useEffect(() => {
    const q = query(collection(db, 'registration_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistrationRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'spelling_categories'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSpellingCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
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

  const handleAIGenerateExam = async () => {
    if (!aiExamInput.trim()) {
      toast.error(t.pasteQuestions);
      return;
    }

    setGeneratingAIExam(true);
    announce(language === 'en' ? 'Generating exam questions. This may take a moment for large sets.' : 'ചോദ്യങ്ങൾ നിർമ്മിക്കുന്നു. കൂടുതൽ ചോദ്യങ്ങൾ ഉണ്ടെങ്കിൽ അല്പം സമയം എടുത്തേക്കാം.');
    
    try {
      const response = await fetch('/api/ai/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: aiExamInput, language })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate exam questions");
      }
      
      const generatedQuestions = await response.json();
      setQuizQuestions(generatedQuestions);
      toast.success(language === 'en' 
        ? `Generated ${generatedQuestions.length} questions! Review and save them below.` 
        : `${generatedQuestions.length} ചോദ്യങ്ങൾ നിർമ്മിച്ചു! താഴെ പരിശോധിച്ചു സേവ് ചെയ്യുക.`);
      announce(`${generatedQuestions.length} questions generated.`);
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      let errorMsg = language === 'en' 
        ? `Failed to generate exam questions: ${error.message || 'Unknown error'}` 
        : `ചോദ്യങ്ങൾ നിർമ്മിക്കാൻ സാധിച്ചില്ല: ${error.message || 'Unknown error'}`;
      
      if (error.message?.includes('SAFETY')) {
        errorMsg = language === 'en' ? "Content flagged by safety filters. Please check your text." : "സുരക്ഷാ കാരണങ്ങളാൽ ഈ ടെക്സ്റ്റ് പ്രോസസ്സ് ചെയ്യാൻ കഴിയില്ല.";
      }
      
      toast.error(errorMsg);
    } finally {
      setGeneratingAIExam(false);
    }
  };

  const handleSaveToQuestionPool = async () => {
    if (quizQuestions.length === 0 || (quizQuestions.length === 1 && !quizQuestions[0].question)) {
      toast.error(language === 'en' ? 'No questions to save' : 'സേവ് ചെയ്യാൻ ചോദ്യങ്ങളില്ല');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'quizzes'), {
        lessonId: 'general_pool_' + Date.now(),
        questions: quizQuestions,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isGeneralPool: true
      });
      toast.success(t.saveToPool + ' ' + (language === 'en' ? 'Successful!' : 'വിജയകരമായി!'));
      setQuizQuestions([{ question: '', options: ['', '', ''], correctAnswer: 0 }]);
      setAiExamInput('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quizzes');
    } finally {
      setLoading(false);
    }
  };

  const shareViaWhatsApp = (res: any) => {
    const text = `Exam Result for ${res.studentName}\nScore: ${res.score}/${res.total}\nDate: ${res.timestamp?.toDate().toLocaleString()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaEmail = (res: any) => {
    const subject = `Exam Result: ${res.studentName}`;
    const body = `Student Name: ${res.studentName}\nScore: ${res.score}/${res.total}\nDate: ${res.timestamp?.toDate().toLocaleString()}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleAIGenerateSpellingWords = async () => {
    if (!newSpellingCategory.trim()) {
      toast.error(t.categoryName);
      return;
    }

    setGeneratingSpellingWords(true);
    announce(language === 'en' ? 'Generating spelling words...' : 'വാക്കുകൾ നിർമ്മിക്കുന്നു...');
    
    try {
      const response = await fetch('/api/ai/generate-spelling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newSpellingCategory })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate words");
      }

      const words = await response.json();
      
      await addDoc(collection(db, 'spelling_categories'), {
        name: newSpellingCategory,
        words,
        createdAt: Timestamp.now()
      });

      toast.success(language === 'en' ? 'Category added with 10 words!' : '10 വാക്കുകളുമായി വിഭാഗം ചേർത്തു!');
      setNewSpellingCategory('');
      announce(language === 'en' ? 'Words generated successfully' : 'വാക്കുകൾ വിജയകരമായി നിർമ്മിച്ചു');
    } catch (error: any) {
      console.error("AI Spelling Generation Error:", error);
      let errorMsg = language === 'en' ? 'Failed to generate words' : 'വാക്കുകൾ നിർമ്മിക്കാൻ സാധിച്ചില്ല';
      
      if (error.message?.includes('PERMISSION_DENIED')) {
        errorMsg = language === 'en' ? "Permission denied. Please check Firestore rules." : "അനുമതി നിഷേധിക്കപ്പെട്ടു. ഫയർബേസ് സെറ്റിങ്‌സ് പരിശോധിക്കുക.";
      } else if (error.message?.includes('SAFETY')) {
        errorMsg = language === 'en' ? "Content flagged by safety filters." : "സുരക്ഷാ കാരണങ്ങളാൽ ഈ ടെക്സ്റ്റ് പ്രോസസ്സ് ചെയ്യാൻ കഴിയില്ല.";
      } else if (error.message) {
        errorMsg += `: ${error.message}`;
      }
      
      toast.error(errorMsg);
    } finally {
      setGeneratingSpellingWords(false);
    }
  };

  const handleDeleteSpellingCategory = async (id: string) => {
    if (!window.confirm(t.confirm)) return;
    try {
      await deleteDoc(doc(db, 'spelling_categories', id));
      toast.success(t.delete);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `spelling_categories/${id}`);
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
    announce(language === 'en' ? 'Generating quiz questions...' : 'ക്വിസ് ചോദ്യങ്ങൾ നിർമ്മിക്കുന്നു...');
    
    try {
      const response = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textContent, language })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate quiz");
      }

      const generated = await response.json();
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
        ? `Failed to generate quiz: ${errorMessage}` 
        : `ക്വിസ് നിർമ്മിക്കാൻ സാധിച്ചില്ല: ${errorMessage}`);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleAssignFinalExam = async (userId: string) => {
    setLoading(true);
    try {
      // 1. Get all quizzes
      const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
      let allQuestions: any[] = [];
      quizzesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const questionsWithIds = (data.questions || []).map((q: any, i: number) => ({
          ...q,
          id: q.id || `${doc.id}_${i}`
        }));
        allQuestions = [...allQuestions, ...questionsWithIds];
      });

      if (allQuestions.length === 0) {
        toast.error('No quiz questions found to create an exam.');
        return;
      }

      // 2. Pick 20 random questions (or all if less than 20)
      const shuffled = allQuestions.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 20);

      // 3. Create assigned exam
      await setDoc(doc(db, 'assigned_exams', userId), {
        userId,
        questions: selected,
        assignedAt: Timestamp.now(),
        completed: false
      });

      // 4. Set flag in progress (using a dummy lessonId 'final_exam' to store the flag)
      await setDoc(doc(db, 'progress', `${userId}_final_exam`), {
        userId,
        lessonId: 'final_exam',
        finalExamAssigned: true,
        updatedAt: Timestamp.now()
      }, { merge: true });

      toast.success('Final Exam assigned successfully!');
      announce('Final Exam assigned to student');
    } catch (error) {
      console.error("Assign Final Exam Error:", error);
      toast.error('Failed to assign final exam');
    } finally {
      setLoading(false);
    }
  };
  const handleApproveRequest = async (request: any) => {
    setLoading(true);
    try {
      const registerId = request.registerId || ("ACL-" + Math.floor(1000 + Math.random() * 9000));
      
      // Create user document
      await setDoc(doc(db, 'users', registerId), {
        registerId,
        name: request.name,
        phone: request.phone,
        age: request.age,
        role: 'student',
        createdAt: Timestamp.now(),
        status: 'approved'
      });

      // Update request
      await updateDoc(doc(db, 'registration_requests', request.id), {
        status: 'approved',
        registerId,
        updatedAt: Timestamp.now()
      });

      toast.success(`Approved! Register ID: ${registerId}`);
      announce(`Approved student ${request.name}. Register ID is ${registerId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `registration_requests/${request.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (id: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'registration_requests', id));
      toast.success('Request rejected');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `registration_requests/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedAILessons = async () => {
    setSeedingLessons(true);
    try {
      const response = await fetch('/api/ai/seed-lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to seed AI lessons");
      }

      const generatedLessons = await response.json();
      for (const lesson of generatedLessons) {
        const docRef = await addDoc(collection(db, 'lessons'), {
          title: lesson.title,
          category: lesson.category,
          textContent: lesson.textContent,
          language: language,
          level: 'Basic',
          order: lessons.length + 1,
          createdAt: Timestamp.now()
        });

        await addDoc(collection(db, 'quizzes'), {
          lessonId: docRef.id,
          questions: lesson.quiz,
          createdAt: Timestamp.now()
        });
      }

      toast.success('AI Lessons generated successfully!');
    } catch (error) {
      console.error("AI Seeding Error:", error);
      toast.error('Failed to seed AI lessons');
    } finally {
      setSeedingLessons(false);
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

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-8 bg-slate-100 p-2 rounded-2xl dark:bg-slate-800/50">
        <button
          onClick={() => setActiveTab('lessons')}
          className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'lessons' ? 'bg-white text-blue-600 shadow-md dark:bg-slate-900' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800'}`}
        >
          <BookOpen size={20} /> {t.existingLessons}
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'students' ? 'bg-white text-blue-600 shadow-md dark:bg-slate-900' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800'}`}
        >
          <Users size={20} /> {t.students}
        </button>
        <button
          onClick={() => setActiveTab('exams')}
          className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'exams' ? 'bg-white text-blue-600 shadow-md dark:bg-slate-900' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800'}`}
        >
          <GraduationCap size={20} /> {t.examSystem}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'requests' ? 'bg-white text-blue-600 shadow-md dark:bg-slate-900' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800'}`}
        >
          <ClipboardCheck size={20} /> {t.registrationRequests}
        </button>
        <button
          onClick={() => setActiveTab('spelling')}
          className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'spelling' ? 'bg-white text-blue-600 shadow-md dark:bg-slate-900' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800'}`}
        >
          <Keyboard size={20} /> {t.spellingManagement}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-md dark:bg-slate-900' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800'}`}
        >
          <Settings size={20} /> {t.logoSettings}
        </button>
      </div>

      {activeTab === 'spelling' && (
        <section className="bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-200 mb-12 dark:bg-slate-900 dark:border-slate-700">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <Keyboard className="text-blue-600" /> {t.spellingManagement}
          </h2>

          <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 mb-8">
            <h3 className="text-xl font-bold mb-4">{t.addSpellingCategory}</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={newSpellingCategory}
                onChange={(e) => setNewSpellingCategory(e.target.value)}
                placeholder={t.categoryName}
                className="flex-1 p-4 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none dark:bg-slate-900 dark:border-slate-700"
              />
              <button
                onClick={handleAIGenerateSpellingWords}
                disabled={generatingSpellingWords}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generatingSpellingWords ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Sparkles size={20} />
                )}
                {t.generate10Words}
              </button>
            </div>
          </div>

          <div className="grid gap-6">
            {spellingCategories.length === 0 ? (
              <div className="text-center py-12 text-slate-400 italic">
                No custom categories added
              </div>
            ) : (
              spellingCategories.map((cat) => (
                <div key={cat.id} className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{cat.name}</h3>
                    <p className="text-slate-500 mt-1">
                      {cat.words?.length || 0} {t.words}: {cat.words?.join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteSpellingCategory(cat.id)}
                    className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                    title={t.deleteCategory}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {activeTab === 'requests' && (
        <section className="bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-200 mb-12 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <ClipboardCheck className="text-blue-600" /> {t.registrationRequests}
            </h2>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder={language === 'en' ? "Search requests..." : "അപേക്ഷകൾ തിരയുക..."}
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-slate-100 focus:border-blue-400 outline-none dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>
          <div className="grid gap-6">
            {registrationRequests
              .filter(r => r.status === 'pending')
              .filter(r => 
                r.name.toLowerCase().includes(requestSearch.toLowerCase()) || 
                (r.registerId && r.registerId.toLowerCase().includes(requestSearch.toLowerCase())) ||
                r.phone.includes(requestSearch)
              ).length === 0 ? (
              <div className="text-center py-12 text-slate-400 italic">
                {language === 'en' ? 'No pending requests found' : 'അപേക്ഷകളൊന്നുമില്ല'}
              </div>
            ) : (
              registrationRequests
                .filter(r => r.status === 'pending')
                .filter(r => 
                  r.name.toLowerCase().includes(requestSearch.toLowerCase()) || 
                  (r.registerId && r.registerId.toLowerCase().includes(requestSearch.toLowerCase())) ||
                  r.phone.includes(requestSearch)
                )
                .map((request) => (
                <div key={request.id} className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-xl font-bold">{request.name}</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-slate-500 font-bold">
                      <p className="flex items-center gap-1"><Info size={16} /> {t.age}: {request.age}</p>
                      <p className="flex items-center gap-1"><Phone size={16} /> {t.phone}: {request.phone}</p>
                      {request.registerId && (
                        <div className="flex items-center gap-2">
                          <p className="flex items-center gap-1 text-blue-600"><Key size={16} /> ID: {request.registerId}</p>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(request.registerId);
                              toast.success('Copied!');
                            }}
                            className="p-1 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"
                            title="Copy ID"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Requested: {request.createdAt?.toDate().toLocaleString()}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproveRequest(request)}
                      disabled={loading}
                      className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <ClipboardCheck size={20} /> {t.approve}
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      disabled={loading}
                      className="px-6 py-3 bg-red-50 text-red-600 border-2 border-red-100 rounded-xl font-bold hover:bg-red-100 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 size={20} /> {t.delete}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {activeTab === 'settings' && (
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
      )}

      {activeTab === 'students' && (
        <section className="bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-200 mb-12 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Users className="text-blue-600" /> {t.students}
            </h2>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder={language === 'en' ? "Search by Name or ID..." : "പേര് അല്ലെങ്കിൽ ID ഉപയോഗിച്ച് തിരയുക..."}
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-slate-100 focus:border-blue-400 outline-none dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                  <th className="py-4 px-4 font-bold text-slate-500 uppercase tracking-wider">{t.studentName}</th>
                  <th className="py-4 px-4 font-bold text-slate-500 uppercase tracking-wider">{t.studentId}</th>
                  <th className="py-4 px-4 font-bold text-slate-500 uppercase tracking-wider">{t.phone} / {t.age}</th>
                  <th className="py-4 px-4 font-bold text-slate-500 uppercase tracking-wider">{t.progress}</th>
                  <th className="py-4 px-4 font-bold text-slate-500 uppercase tracking-wider">{t.avgScore}</th>
                  <th className="py-4 px-4 font-bold text-slate-500 uppercase tracking-wider">{t.finalExam}</th>
                </tr>
              </thead>
              <tbody>
                {studentsProgress
                  .filter(s => 
                    s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                    s.userId.toLowerCase().includes(studentSearch.toLowerCase())
                  )
                  .map((student) => (
                  <tr key={student.userId} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-bold text-lg">{student.name}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-bold text-blue-600">{student.userId}</p>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(student.userId);
                              toast.success('ID Copied!');
                            }}
                            className="p-1 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"
                            title="Copy ID"
                          >
                            <Copy size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              const loginInfo = `Name: ${student.name}\nID: ${student.userId}`;
                              navigator.clipboard.writeText(loginInfo);
                              toast.success('Login Info Copied!');
                            }}
                            className="p-1 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"
                            title="Copy Name & ID"
                          >
                            <User size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">{t.lastActive}: {student.lastActive?.toDate().toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <p className="font-medium">{usersMap[student.userId]?.phone || 'N/A'}</p>
                        <p className="text-slate-500">{usersMap[student.userId]?.age ? `${usersMap[student.userId].age} ${t.age}` : ''}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                          <div 
                            className="h-full bg-blue-600 transition-all duration-500" 
                            style={{ width: `${(student.completedLessons / lessons.length) * 100}%` }}
                          />
                        </div>
                        <span className="font-bold">{student.completedLessons}/{lessons.length}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`font-bold text-lg ${student.scores.length > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                        {student.scores.length > 0 
                          ? Math.round((student.scores.reduce((a: number, b: number) => a + b, 0) / student.scores.length) * 100) + '%'
                          : 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {student.finalExamAssigned ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold dark:bg-green-900/30 dark:text-green-400">
                          {t.assigned}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAssignFinalExam(student.userId)}
                          disabled={loading}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-all text-sm disabled:opacity-50"
                        >
                          {t.assignExam}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {studentsProgress.length === 0 && (
              <div className="text-center py-12 text-slate-400 italic">
                {language === 'en' 
                  ? 'No approved students found. Please check "Registration Requests" to approve new students.' 
                  : 'അംഗീകരിച്ച വിദ്യാർത്ഥികളെ കണ്ടെത്തിയില്ല. പുതിയ വിദ്യാർത്ഥികളെ അംഗീകരിക്കുന്നതിന് "രജിസ്ട്രേഷൻ അപേക്ഷകൾ" പരിശോധിക്കുക.'}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'exams' && (
        <section className="bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-200 mb-12 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <GraduationCap className="text-blue-600" /> {t.examSystem}
            </h2>
          </div>
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
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {examResults.length === 0 ? (
                    <p className="text-slate-500 italic">{t.noResults}</p>
                  ) : (
                    examResults.map((res) => (
                      <div key={res.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-purple-200 dark:border-purple-700">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold text-lg">{res.studentName}</p>
                            {res.userId && <p className="text-xs font-mono text-blue-600 font-bold">ID: {res.userId}</p>}
                            <p className="text-xs text-slate-500">{res.timestamp?.toDate().toLocaleString()}</p>
                          </div>
                          <p className="text-2xl font-black text-purple-600">{res.score}/{res.total}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => shareViaWhatsApp(res)}
                            className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
                          >
                            <Phone size={16} /> {t.sendViaWhatsApp}
                          </button>
                          <button
                            onClick={() => shareViaEmail(res)}
                            className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
                          >
                            <BookOpen size={16} /> {t.sendViaEmail}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-2xl border-2 border-indigo-100 dark:border-indigo-800">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <BrainCircuit className="text-indigo-600" /> {t.aiGenerateExam}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {language === 'en' 
                  ? 'Paste your questions and answers below, and AI will automatically format them into exam questions. For very large exams (50+ questions), you can paste them in parts for better results.' 
                  : 'ചോദ്യങ്ങളും ഉത്തരങ്ങളും താഴെ പേസ്റ്റ് ചെയ്യുക, AI അവയെ പരീക്ഷാ ചോദ്യങ്ങളായി മാറ്റും. 50-ൽ കൂടുതൽ ചോദ്യങ്ങൾ ഉണ്ടെങ്കിൽ കുറച്ചു ചോദ്യങ്ങൾ വീതം പരീക്ഷിക്കുന്നത് നന്നായിരിക്കും.'}
              </p>
              <div className="relative">
                <textarea
                  value={aiExamInput}
                  onChange={(e) => setAiExamInput(e.target.value)}
                  placeholder={t.pasteQuestions}
                  className="w-full h-64 p-6 rounded-2xl border-2 border-slate-200 focus:ring-4 focus:ring-indigo-400 outline-none dark:bg-slate-800 dark:border-slate-700 mb-6 text-lg"
                />
                {aiExamInput && (
                  <button
                    onClick={() => setAiExamInput('')}
                    className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 text-slate-500"
                    title="Clear"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
              <button
                onClick={handleAIGenerateExam}
                disabled={generatingAIExam}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-xl font-black hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {generatingAIExam ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {t.aiGenerateExam}
              </button>

              {quizQuestions.length > 0 && quizQuestions[0].question && activeTab === 'exams' && (
                <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xl font-bold flex items-center gap-2">
                      <ClipboardCheck className="text-indigo-600" />
                      {t.generatedQuestionsPreview}
                    </h4>
                    <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-sm font-bold">
                      {quizQuestions.length} {t.questions}
                    </span>
                  </div>
                  
                  <div className="space-y-4 max-h-[400px] overflow-y-auto p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/30">
                    {quizQuestions.map((q, i) => (
                      <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="font-bold text-lg mb-3">{i + 1}. {q.question}</p>
                        <div className="grid gap-2">
                          {q.options.map((opt: string, oi: number) => (
                            <div 
                              key={oi} 
                              className={`p-2 rounded-lg border ${oi === q.correctAnswer ? 'bg-green-50 border-green-200 text-green-700 font-bold dark:bg-green-900/20 dark:border-green-800' : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}
                            >
                              {String.fromCharCode(65 + oi)}) {opt}
                              {oi === q.correctAnswer && <span className="ml-2 text-xs uppercase tracking-widest">({t.correct})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setQuizQuestions([{ question: '', options: ['', '', ''], correctAnswer: 0 }])}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all dark:bg-slate-800 dark:text-slate-400"
                    >
                      {t.cancel}
                    </button>
                    <button
                      onClick={handleSaveToQuestionPool}
                      disabled={loading}
                      className="flex-[2] py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                      {t.saveToPool}
                    </button>
                  </div>
                </div>
              )}
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
        </section>
      )}

      {activeTab === 'lessons' && (
        <>
          <div className="mb-8 flex flex-wrap gap-4">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              <Plus size={24} /> {t.addLesson}
            </button>
            <button
              onClick={handleSeedAILessons}
              disabled={seedingLessons}
              className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
            >
              {seedingLessons ? <Loader2 className="animate-spin" /> : <BrainCircuit size={24} />}
              {language === 'en' ? 'Generate AI Lessons' : 'AI പാഠങ്ങൾ നിർമ്മിക്കുക'}
            </button>
          </div>

          <section className="bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-200 mb-12 dark:bg-slate-900 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
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
          {lessons.length === 0 && !loading && (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
              <BrainCircuit size={64} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-2xl font-bold text-slate-600 dark:text-slate-400 mb-2">No Lessons Yet</h3>
              <p className="text-slate-500 mb-6">Start by adding a lesson manually or use AI to generate initial content.</p>
              <button
                onClick={handleSeedAILessons}
                disabled={seedingLessons}
                className="px-8 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center gap-2 mx-auto disabled:opacity-50 shadow-lg"
              >
                {seedingLessons ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                {language === 'en' ? 'Initialize with AI Lessons' : 'AI പാഠങ്ങൾ ഉപയോഗിച്ച് തുടങ്ങുക'}
              </button>
            </div>
          )}
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
    </>
  )}

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
