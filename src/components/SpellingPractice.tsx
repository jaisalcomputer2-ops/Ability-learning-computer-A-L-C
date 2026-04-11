import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { useA11y } from './A11yProvider';
import { Headphones, Keyboard, CheckCircle, XCircle, ArrowLeft, RotateCcw, Volume2, Sparkles, Loader2 } from 'lucide-react';
import { handleKey } from '../lib/utils';
import toast from 'react-hot-toast';

interface WordItem {
  word: string;
  category: string;
}

const DEFAULT_WORDS: WordItem[] = [
  { word: "January", category: "Months" },
  { word: "February", category: "Months" },
  { word: "March", category: "Months" },
  { word: "April", category: "Months" },
  { word: "May", category: "Months" },
  { word: "June", category: "Months" },
  { word: "July", category: "Months" },
  { word: "August", category: "Months" },
  { word: "September", category: "Months" },
  { word: "October", category: "Months" },
  { word: "November", category: "Months" },
  { word: "December", category: "Months" },
  { word: "Computer", category: "Common" },
  { word: "Keyboard", category: "Common" },
  { word: "Monitor", category: "Common" },
  { word: "Mouse", category: "Common" },
  { word: "Internet", category: "Common" },
  { word: "Software", category: "Common" },
  { word: "Hardware", category: "Common" },
  { word: "Screen", category: "Common" },
  { word: "Ability", category: "Common" },
  { word: "Learning", category: "Common" },
  { word: "Cat", category: "Basic" },
  { word: "Dog", category: "Basic" },
  { word: "Bat", category: "Basic" },
  { word: "Ball", category: "Basic" },
  { word: "Pen", category: "Basic" },
  { word: "Cup", category: "Basic" },
  { word: "Sun", category: "Basic" },
  { word: "Moon", category: "Basic" },
  { word: "Apple", category: "Basic" },
  { word: "Book", category: "Basic" },
  { word: "Table", category: "Daily Objects" },
  { word: "Chair", category: "Daily Objects" },
  { word: "Bottle", category: "Daily Objects" },
  { word: "Plate", category: "Daily Objects" },
  { word: "Spoon", category: "Daily Objects" },
  { word: "Clock", category: "Daily Objects" },
  { word: "Mirror", category: "Daily Objects" },
  { word: "Window", category: "Daily Objects" },
  { word: "Door", category: "Daily Objects" },
  { word: "Bed", category: "Daily Objects" },
  { word: "Mango", category: "Fruits" },
  { word: "Orange", category: "Fruits" },
  { word: "Grapes", category: "Fruits" },
  { word: "Papaya", category: "Fruits" },
  { word: "Guava", category: "Fruits" },
  { word: "Cherry", category: "Fruits" },
  { word: "Peach", category: "Fruits" },
  { word: "Melon", category: "Fruits" },
  { word: "Berry", category: "Fruits" },
  { word: "Plum", category: "Fruits" },
  { word: "Tomato", category: "Vegetables" },
  { word: "Potato", category: "Vegetables" },
  { word: "Onion", category: "Vegetables" },
  { word: "Carrot", category: "Vegetables" },
  { word: "Beans", category: "Vegetables" },
  { word: "Garlic", category: "Vegetables" },
  { word: "Ginger", category: "Vegetables" },
  { word: "Radish", category: "Vegetables" },
  { word: "Chilli", category: "Vegetables" },
  { word: "Spinach", category: "Vegetables" },
  { word: "Lion", category: "Animals" },
  { word: "Tiger", category: "Animals" },
  { word: "Elephant", category: "Animals" },
  { word: "Zebra", category: "Animals" },
  { word: "Monkey", category: "Animals" },
  { word: "Giraffe", category: "Animals" },
  { word: "Rabbit", category: "Animals" },
  { word: "Horse", category: "Animals" },
  { word: "Camel", category: "Animals" },
  { word: "Deer", category: "Animals" },
  { word: "Car", category: "Vehicles" },
  { word: "Bus", category: "Vehicles" },
  { word: "Bike", category: "Vehicles" },
  { word: "Train", category: "Vehicles" },
  { word: "Plane", category: "Vehicles" },
  { word: "Boat", category: "Vehicles" },
  { word: "Truck", category: "Vehicles" },
  { word: "Cycle", category: "Vehicles" },
  { word: "Ship", category: "Vehicles" },
  { word: "Van", category: "Vehicles" },
  { word: "Head", category: "Body Parts" },
  { word: "Face", category: "Body Parts" },
  { word: "Eyes", category: "Body Parts" },
  { word: "Nose", category: "Body Parts" },
  { word: "Ears", category: "Body Parts" },
  { word: "Hand", category: "Body Parts" },
  { word: "Legs", category: "Body Parts" },
  { word: "Feet", category: "Body Parts" },
  { word: "Arms", category: "Body Parts" },
  { word: "Neck", category: "Body Parts" },
  { word: "Red", category: "Colors" },
  { word: "Blue", category: "Colors" },
  { word: "Green", category: "Colors" },
  { word: "Yellow", category: "Colors" },
  { word: "Black", category: "Colors" },
  { word: "White", category: "Colors" },
  { word: "Pink", category: "Colors" },
  { word: "Orange", category: "Colors" },
  { word: "Purple", category: "Colors" },
  { word: "Brown", category: "Colors" },
  { word: "Circle", category: "Shapes" },
  { word: "Square", category: "Shapes" },
  { word: "Oval", category: "Shapes" },
  { word: "Star", category: "Shapes" },
  { word: "Heart", category: "Shapes" },
  { word: "Line", category: "Shapes" },
  { word: "Point", category: "Shapes" },
  { word: "Cube", category: "Shapes" },
  { word: "Cone", category: "Shapes" },
  { word: "Ring", category: "Shapes" },
  { word: "Eat", category: "Action Words" },
  { word: "Drink", category: "Action Words" },
  { word: "Walk", category: "Action Words" },
  { word: "Run", category: "Action Words" },
  { word: "Jump", category: "Action Words" },
  { word: "Read", category: "Action Words" },
  { word: "Write", category: "Action Words" },
  { word: "Sing", category: "Action Words" },
  { word: "Dance", category: "Action Words" },
  { word: "Sleep", category: "Action Words" }
];

export const SpellingPractice: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t, language, announce, speak } = useA11y();
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [practiceCount, setPracticeCount] = useState(0);
  const [isErrorMode, setIsErrorMode] = useState(false);
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'spelling_categories'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setCustomCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Spelling categories error:", error);
        toast.error("Failed to load categories");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const allWords: WordItem[] = [
    ...DEFAULT_WORDS,
    ...customCategories.flatMap(cat => 
      (cat.words || []).map((word: string) => ({ word, category: cat.name }))
    )
  ];

  const categories = Array.from(new Set(allWords.map(w => w.category)));
  const filteredWords = currentCategory ? allWords.filter(w => w.category === currentCategory) : [];
  const currentWord = filteredWords[currentIndex];

  useEffect(() => {
    if (currentWord) {
      speakWord(currentWord.word);
    }
  }, [currentWord, currentIndex]);

  const speakWord = (word: string) => {
    speak(word, 0.8);
    const msg = `${t.typeTheWord}: ${word}. ${language === 'en' ? 'Press Space to repeat' : 'വാക്ക് വീണ്ടും കേൾക്കാൻ സ്പേസ് അമർത്തുക'}`;
    announce(msg, 'assertive');
  };

  const speakSpelling = (word: string) => {
    const spelling = word.split('').join(', ');
    speak(spelling, 0.7);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const typed = inputValue.trim().toLowerCase();
    const target = currentWord.word.toLowerCase();

    if (typed === target) {
      if (isErrorMode) {
        const remaining = practiceCount - 1;
        if (remaining > 0) {
          setPracticeCount(remaining);
          setInputValue('');
          
          let msg = `${t.correct}. ${t.practiceRemaining} ${remaining}`;
          if (remaining === 2) {
            msg = t.practiceSuccessFirst;
          } else if (remaining === 1) {
            msg = t.practiceSuccessSecond;
          }
          
          const fullMsg = `${msg}. ${t.typeTheWord}: ${currentWord.word}`;
          announce(fullMsg, 'assertive');
          speak(fullMsg, 0.9);
          setInputValue('');
        } else {
          setIsErrorMode(false);
          setPracticeCount(0);
          setInputValue('');
          handleNext();
        }
      } else {
        handleNext();
      }
    } else {
      if (!isErrorMode) {
        setIsErrorMode(true);
        setPracticeCount(3);
        const spelling = currentWord.word.split('').join(', ');
        const fullMsg = `${t.wrongSpellingPractice} ${spelling}`;
        announce(fullMsg, 'assertive');
        speak(fullMsg, 0.8);
        setInputValue('');
      } else {
        const spelling = currentWord.word.split('').join(', ');
        const msg = `${t.incorrect}. ${t.practiceRemaining} ${practiceCount}. ${spelling}`;
        announce(msg, 'assertive');
        speak(msg, 0.8);
        setInputValue('');
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setInputValue('');
      announce(t.wellDone, 'assertive');
      speak(t.wellDone, 1);
    } else {
      announce(t.quizCompleted, 'assertive');
      speak(t.quizCompleted, 1);
      toast.success(t.quizCompleted);
      setCurrentCategory(null);
      setCurrentIndex(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.code === 'Space' && !inputValue) {
      e.preventDefault();
      speakWord(currentWord.word);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!currentCategory) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xl font-bold mb-8 text-blue-600 hover:underline"
        >
          <ArrowLeft /> {t.backToLessons}
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex p-4 bg-blue-100 rounded-2xl text-blue-600 mb-6 dark:bg-blue-900/30">
            <Keyboard size={48} />
          </div>
          <h1 className="text-4xl font-black mb-4">{t.spellingPractice}</h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            {language === 'en' ? 'Select a category to start practicing' : 'പരിശീലനം തുടങ്ങാൻ ഒരു വിഭാഗം തിരഞ്ഞെടുക്കുക'}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setCurrentCategory(cat);
                setCurrentIndex(0);
                announce(`${cat} ${t.spellingPractice} ${t.loading}`);
              }}
              onKeyDown={handleKey}
              className="p-8 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-lg hover:border-blue-500 transition-all text-left group outline-none focus:ring-4 focus:ring-blue-400"
            >
              <h2 className="text-2xl font-black mb-2 group-hover:text-blue-600">
                {cat === 'Months' ? t.monthsAndYears : 
                 cat === 'Common' ? t.commonWords : 
                 cat === 'Basic' ? t.basicWords : 
                 cat === 'Daily Objects' ? t.dailyObjects :
                 cat === 'Fruits' ? t.fruits :
                 cat === 'Vegetables' ? t.vegetables :
                 cat === 'Animals' ? t.animals :
                 cat === 'Vehicles' ? t.vehicles :
                 cat === 'Body Parts' ? t.bodyParts :
                 cat === 'Colors' ? t.colors :
                 cat === 'Shapes' ? t.shapes :
                 cat === 'Action Words' ? t.actionWords :
                 cat}
              </h2>
              <p className="text-slate-500">
                {allWords.filter(w => w.category === cat).length} {language === 'en' ? 'Words' : 'വാക്കുകൾ'}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button
        onClick={() => setCurrentCategory(null)}
        onKeyDown={handleKey}
        className="flex items-center gap-2 text-xl font-bold mb-8 text-blue-600 hover:underline outline-none focus:ring-2 focus:ring-blue-400 rounded"
      >
        <ArrowLeft /> {language === 'en' ? 'Change Category' : 'വിഭാഗം മാറ്റുക'}
      </button>

      <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <span className="px-4 py-1 bg-blue-100 text-blue-600 rounded-full font-bold uppercase tracking-wider text-sm">
            {currentCategory === 'Months' ? t.monthsAndYears : 
             currentCategory === 'Common' ? t.commonWords : 
             currentCategory === 'Basic' ? t.basicWords : 
             currentCategory === 'Daily Objects' ? t.dailyObjects :
             currentCategory === 'Fruits' ? t.fruits :
             currentCategory === 'Vegetables' ? t.vegetables :
             currentCategory === 'Animals' ? t.animals :
             currentCategory === 'Vehicles' ? t.vehicles :
             currentCategory === 'Body Parts' ? t.bodyParts :
             currentCategory === 'Colors' ? t.colors :
             currentCategory === 'Shapes' ? t.shapes :
             currentCategory === 'Action Words' ? t.actionWords :
             currentCategory}
          </span>
          <span className="text-slate-400 font-bold">
            {currentIndex + 1} / {filteredWords.length}
          </span>
        </div>

        <div className="text-center space-y-8">
          <div className="flex justify-center gap-4">
            <button
              onClick={() => speakWord(currentWord.word)}
              onKeyDown={handleKey}
              className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all outline-none focus:ring-4 focus:ring-blue-400"
              aria-label={t.repeatWord}
            >
              <Volume2 size={32} />
            </button>
            <button
              onClick={() => speakSpelling(currentWord.word)}
              onKeyDown={handleKey}
              className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all outline-none focus:ring-4 focus:ring-indigo-400"
              aria-label="Hear Spelling"
            >
              <RotateCcw size={32} />
            </button>
          </div>

          {isErrorMode && (
            <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-2xl dark:bg-amber-900/20 dark:border-amber-800">
              <p className="text-xl font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
                <XCircle /> {t.wrongSpellingPractice}
              </p>
              <p className="text-lg mt-2 text-amber-700 dark:text-amber-400">
                {t.practiceRemaining} <span className="text-2xl font-black">{practiceCount}</span>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                aria-label={`${t.typeTheWord}: ${currentWord?.word}. ${language === 'en' ? 'Press Space to repeat' : 'വാക്ക് വീണ്ടും കേൾക്കാൻ സ്പേസ് അമർത്തുക'}`}
                className="w-full p-6 text-4xl font-black text-center border-4 border-slate-100 rounded-2xl focus:border-blue-500 outline-none dark:bg-slate-800 dark:border-slate-700 uppercase tracking-widest"
                placeholder="TYPE HERE"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>

            <button
              type="submit"
              onKeyDown={handleKey}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl text-2xl font-black hover:bg-blue-700 transition-all shadow-xl flex items-center justify-center gap-3 outline-none focus:ring-4 focus:ring-blue-400"
            >
              <CheckCircle /> {t.submitAnswer}
            </button>
          </form>

          <div className="pt-4 text-slate-400 font-bold flex items-center justify-center gap-2">
            <Sparkles size={20} className="text-yellow-400" />
            {language === 'en' ? 'Tip: Press Space to hear the word again' : 'സൂചന: വാക്ക് വീണ്ടും കേൾക്കാൻ സ്പേസ് അമർത്തുക'}
          </div>
        </div>
      </div>
    </div>
  );
};
