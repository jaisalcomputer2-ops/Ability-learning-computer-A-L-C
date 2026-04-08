import React, { useState, useEffect, useRef } from 'react';
import { useA11y } from './A11yProvider';
import { Keyboard, Zap, Target, ArrowLeft, RotateCcw, Volume2, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Howl } from 'howler';

export const PracticalGames: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t, language, announce, speak } = useA11y();
  const [currentGame, setCurrentGame] = useState<'key-finder' | 'typing-speed' | 'letter-quest' | 'animal-quest' | null>(null);
  const [targetKey, setTargetKey] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isActive, setIsActive] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [targetWord, setTargetWord] = useState('');
  const [gameLevel, setGameLevel] = useState(1);
  const [showGameOver, setShowGameOver] = useState(false);
  const [currentAnimal, setCurrentAnimal] = useState<any>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [practiceCount, setPracticeCount] = useState(0);
  const [isErrorMode, setIsErrorMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const WORDS = ["apple", "banana", "cherry", "date", "elderberry", "fig", "grape", "honeydew", "kiwi", "lemon"];
  const KEYS = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
  
  const ANIMALS = [
    { name: "Lion", emoji: "🦁", sound: "https://www.google.com/logos/fnbx/animal_sounds/lion.mp3" },
    { name: "Cat", emoji: "🐱", sound: "https://www.google.com/logos/fnbx/animal_sounds/cat.mp3" },
    { name: "Dog", emoji: "🐶", sound: "https://www.google.com/logos/fnbx/animal_sounds/dog.mp3" },
    { name: "Cow", emoji: "🐮", sound: "https://www.google.com/logos/fnbx/animal_sounds/cow.mp3" },
    { name: "Sheep", emoji: "🐑", sound: "https://www.google.com/logos/fnbx/animal_sounds/sheep.mp3" },
    { name: "Elephant", emoji: "🐘", sound: "https://www.google.com/logos/fnbx/animal_sounds/elephant.mp3" },
    { name: "Monkey", emoji: "🐒", sound: "https://www.google.com/logos/fnbx/animal_sounds/monkey.mp3" },
    { name: "Tiger", emoji: "🐯", sound: "https://www.google.com/logos/fnbx/animal_sounds/tiger.mp3" },
    { name: "Duck", emoji: "🦆", sound: "https://www.google.com/logos/fnbx/animal_sounds/duck.mp3" },
    { name: "Horse", emoji: "🐴", sound: "https://www.google.com/logos/fnbx/animal_sounds/horse.mp3" },
    { name: "Pig", emoji: "🐷", sound: "https://www.google.com/logos/fnbx/animal_sounds/pig.mp3" },
    { name: "Rooster", emoji: "🐓", sound: "https://www.google.com/logos/fnbx/animal_sounds/rooster.mp3" }
  ];

  const LEVEL_KEYS = [
    "asdfjkl;".split(""), // Home Row
    "qwertyuiop".split(""), // Top Row
    "zxcvbnm".split(""), // Bottom Row
    "1234567890".split(""), // Numbers
    "abcdefghijklmnopqrstuvwxyz0123456789".split("") // All
  ];

  useEffect(() => {
    if (currentGame && !showGameOver) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [currentGame, showGameOver]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setShowGameOver(true);
      const finalMsg = `${t.quizCompleted}. ${t.score}: ${score}`;
      announce(finalMsg, 'assertive');
      speak(finalMsg, 1);
      toast.success(finalMsg);
    }
    return () => clearInterval(timer);
  }, [isActive, timeLeft, score, t.quizCompleted, t.score, announce, speak]);

  const startKeyFinder = () => {
    setCurrentGame('key-finder');
    setScore(0);
    setTimeLeft(60);
    setIsActive(true);
    setShowGameOver(false);
    const firstKey = KEYS[Math.floor(Math.random() * KEYS.length)];
    setTargetKey(firstKey);
    speakKey(firstKey);
  };

  const startTypingSpeed = () => {
    setCurrentGame('typing-speed');
    setScore(0);
    setTimeLeft(120);
    setIsActive(true);
    setShowGameOver(false);
    const firstWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setTargetWord(firstWord);
    speakWord(firstWord);
  };

  const startLetterQuest = (level: number = 1) => {
    setCurrentGame('letter-quest');
    setGameLevel(level);
    setScore(0);
    setTimeLeft(120);
    setIsActive(true);
    setShowGameOver(false);
    const keys = LEVEL_KEYS[level - 1];
    const firstKey = keys[Math.floor(Math.random() * keys.length)];
    setTargetKey(firstKey);
    speakQuestKey(firstKey);
  };

  const startAnimalQuest = () => {
    setCurrentGame('animal-quest');
    setScore(0);
    setTimeLeft(180);
    setIsActive(true);
    setShowGameOver(false);
    setIsCorrect(false);
    setIsErrorMode(false);
    setPracticeCount(0);
    const firstAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    setCurrentAnimal(firstAnimal);
    
    const instructions = language === 'en' 
      ? "Animal Quest started. Spell the animal you see. If you make a mistake, you must practice it 3 times. Press Space to hear the name, and R to hear the spelling."
      : "ആനിമൽ ക്വസ്റ്റ് തുടങ്ങി. കാണുന്ന മൃഗത്തിന്റെ പേര് ടൈപ്പ് ചെയ്യുക. തെറ്റിയാൽ 3 തവണ പരിശീലിക്കണം. പേര് വീണ്ടും കേൾക്കാൻ സ്പേസ് അമർത്തുക, സ്പെല്ലിംഗ് കേൾക്കാൻ ആർ അമർത്തുക.";
    
    announce(instructions, 'assertive');
    speak(instructions, 1);
    
    setTimeout(() => {
      speakAnimal(firstAnimal.name);
    }, 6000);
  };

  const getKeyName = (key: string) => {
    const names: Record<string, { en: string; ml: string }> = {
      ';': { en: 'Semicolon', ml: 'സെമി കോളൻ' },
      ',': { en: 'Comma', ml: 'കോമ' },
      '.': { en: 'Full stop', ml: 'ഫുൾ സ്റ്റോപ്പ്' },
      '/': { en: 'Slash', ml: 'സ്ലാഷ്' },
      ' ': { en: 'Space', ml: 'സ്പേസ്' },
      '[': { en: 'Left bracket', ml: 'ലെഫ്റ്റ് ബ്രാക്കറ്റ്' },
      ']': { en: 'Right bracket', ml: 'റൈറ്റ് ബ്രാക്കറ്റ്' },
      '\\': { en: 'Backslash', ml: 'ബാക്ക് സ്ലാഷ്' },
      '\'': { en: 'Apostrophe', ml: 'അപ്പോസ്ട്രോഫി' },
    };
    return names[key]?.[language] || key.toUpperCase();
  };

  const speakKey = (key: string) => {
    const keyName = getKeyName(key);
    const msg = `${language === 'en' ? 'Find key' : 'കീ കണ്ടെത്തുക'}: ${keyName}`;
    speak(msg, 1);
    announce(msg, 'assertive');
  };

  const speakQuestKey = (key: string) => {
    const keyName = getKeyName(key);
    const msg = `${t.findTheLetter} ${keyName}. ${language === 'en' ? 'Press Space to repeat' : 'വാക്ക് വീണ്ടും കേൾക്കാൻ സ്പേസ് അമർത്തുക'}`;
    speak(msg, 1.1);
    announce(msg, 'assertive');
  };

  const speakWord = (word: string) => {
    const msg = `${language === 'en' ? 'Type word' : 'വാക്ക് ടൈപ്പ് ചെയ്യുക'}: ${word}. ${language === 'en' ? 'Press Space to repeat' : 'വാക്ക് വീണ്ടും കേൾക്കാൻ സ്പേസ് അമർത്തുക'}`;
    speak(word, 0.9);
    announce(msg, 'assertive');
  };

  const speakAnimal = (name: string) => {
    const msg = `${t.spellTheAnimal}: ${name}. ${language === 'en' ? 'Press Space to repeat' : 'വാക്ക് വീണ്ടും കേൾക്കാൻ സ്പേസ് അമർത്തുക'}`;
    speak(msg, 1);
    announce(msg, 'assertive');
  };

  const speakSpelling = (word: string) => {
    const spelling = word.split('').join(', ');
    const msg = language === 'en' ? `Spelling is: ${spelling}` : `സ്പെല്ലിംഗ്: ${spelling}`;
    speak(spelling, 0.6); // Very slow for kids
    announce(msg, 'assertive');
  };

  const animalSounds = useRef<Record<string, Howl>>({});

  useEffect(() => {
    ANIMALS.forEach(animal => {
      animalSounds.current[animal.name] = new Howl({
        src: [animal.sound],
        html5: true,
        preload: true
      });
    });
  }, []);

  const playAnimalSound = (name: string) => {
    const animal = ANIMALS.find(a => a.name === name);
    if (animal) {
      const audio = new Audio(animal.sound);
      audio.play().catch(err => {
        console.error("Audio playback failed:", err);
        // Fallback: announce the sound if audio fails
        announce(language === 'en' ? `[${name} sound plays]` : `[${name} ശബ്ദം കേൾക്കുന്നു]`);
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!isActive) return;
    
    if (e.code === 'Space') {
      e.preventDefault();
      if (currentGame === 'key-finder') speakKey(targetKey);
      if (currentGame === 'letter-quest') speakQuestKey(targetKey);
      return;
    }

    if (currentGame === 'key-finder' || currentGame === 'letter-quest') {
      if (e.key.toLowerCase() === targetKey.toLowerCase()) {
        setScore(prev => prev + 1);
        
        if (currentGame === 'letter-quest') {
          const successMsg = `${t.wellDoneLetter} ${targetKey.toUpperCase()}`;
          speak(successMsg, 1.2);
          announce(successMsg);
          
          setTimeout(() => {
            const keys = LEVEL_KEYS[gameLevel - 1];
            const nextKey = keys[Math.floor(Math.random() * keys.length)];
            setTargetKey(nextKey);
            speakQuestKey(nextKey);
          }, 1000);
        } else {
          const nextKey = KEYS[Math.floor(Math.random() * KEYS.length)];
          setTargetKey(nextKey);
          speakKey(nextKey);
        }
      } else {
        speak(language === 'en' ? "Try again" : "വീണ്ടും ശ്രമിക്കുക", 1);
      }
    }
  };

  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isActive) return;

    const typed = inputValue.trim().toLowerCase();

    if (currentGame === 'typing-speed') {
      if (typed === targetWord.toLowerCase()) {
        setScore(prev => prev + 1);
        setInputValue('');
        const nextWord = WORDS[Math.floor(Math.random() * WORDS.length)];
        setTargetWord(nextWord);
        announce(t.correct, 'assertive');
        speakWord(nextWord);
      } else {
        speak("Wrong spelling", 1);
        setInputValue('');
      }
    } else if (currentGame === 'animal-quest' && currentAnimal) {
      const target = currentAnimal.name.toLowerCase();
      if (typed === target) {
        if (isErrorMode) {
          const remaining = practiceCount - 1;
          if (remaining > 0) {
            setPracticeCount(remaining);
            setInputValue('');
            const msg = `${t.correct}. ${t.practiceRemaining} ${remaining}`;
            announce(msg, 'assertive');
            speak(msg, 1);
            speakAnimal(currentAnimal.name);
          } else {
            setIsErrorMode(false);
            setPracticeCount(0);
            setInputValue('');
            handleCorrectAnimal();
          }
        } else {
          handleCorrectAnimal();
        }
      } else {
        if (!isErrorMode) {
          setIsErrorMode(true);
          setPracticeCount(3);
          const errorMsg = language === 'en' 
            ? "Wrong spelling. Listen carefully and type it 3 times to learn." 
            : "തെറ്റായ സ്പെല്ലിംഗ്. ശ്രദ്ധിച്ചു കേട്ട് 3 തവണ ടൈപ്പ് ചെയ്ത് പഠിക്കുക.";
          announce(errorMsg, 'assertive');
          speak(errorMsg, 1);
          setTimeout(() => speakSpelling(currentAnimal.name), 2000);
          setInputValue('');
        } else {
          const msg = `${t.incorrect}. ${t.practiceRemaining} ${practiceCount}`;
          announce(msg, 'assertive');
          speak(msg, 1);
          speakSpelling(currentAnimal.name);
          setInputValue('');
        }
      }
    }
  };

  const handleCorrectAnimal = () => {
    if (!currentAnimal) return;
    setScore(prev => prev + 1);
    setIsCorrect(true);
    
    // Play sound immediately on user interaction to bypass autoplay blocks
    playAnimalSound(currentAnimal.name);
    
    const successMsg = `${t.correct}! ${t.listenToTheSound} ${currentAnimal.name}`;
    announce(successMsg, 'assertive');
    speak(successMsg, 1);
    
    setTimeout(() => {
      setIsCorrect(false);
      setInputValue('');
      const nextAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      setCurrentAnimal(nextAnimal);
      
      // Automatically announce the next animal
      const nextMsg = `${language === 'en' ? 'Next animal' : 'അടുത്ത മൃഗം'}: ${nextAnimal.name}`;
      announce(nextMsg, 'assertive');
      speakAnimal(nextAnimal.name);

      // Re-focus the input after a short delay to ensure NVDA switches to focus mode
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Trigger a small click or focus event to help screen readers
          inputRef.current.click();
        }
      }, 500);
    }, 5000);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    // Only trigger shortcuts if input is empty to avoid conflict with typing
    if (!inputValue) {
      if (e.code === 'Space') {
        e.preventDefault();
        if (currentGame === 'typing-speed') speakWord(targetWord);
        if (currentGame === 'animal-quest' && currentAnimal) speakAnimal(currentAnimal.name);
      }
      if (e.code === 'KeyR' && currentGame === 'animal-quest' && currentAnimal) {
        e.preventDefault();
        speakSpelling(currentAnimal.name);
      }
    }
  };

  if (!currentGame) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xl font-bold mb-8 text-blue-600 hover:underline"
        >
          <ArrowLeft /> {t.backToLessons}
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex p-4 bg-indigo-100 rounded-2xl text-indigo-600 mb-6 dark:bg-indigo-900/30">
            <Target size={48} />
          </div>
          <h1 className="text-4xl font-black mb-4">{t.practicalGames}</h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            {language === 'en' ? 'Improve your keyboard skills with these games' : 'ഈ ഗെയിമുകളിലൂടെ നിങ്ങളുടെ കീബോർഡ് കഴിവുകൾ മെച്ചപ്പെടുത്തുക'}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-8">
          <button
            onClick={() => startLetterQuest(1)}
            className="p-10 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-[2.5rem] border-2 border-yellow-100 dark:border-yellow-800 shadow-xl hover:scale-105 transition-all text-left group"
          >
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg group-hover:rotate-12 transition-transform">
              <Sparkles size={40} />
            </div>
            <h2 className="text-3xl font-black mb-4 text-orange-700 dark:text-orange-400">{t.letterQuest}</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.letterQuestDesc}
            </p>
          </button>

          <button
            onClick={startAnimalQuest}
            className="p-10 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-[2.5rem] border-2 border-green-100 dark:border-green-800 shadow-xl hover:scale-105 transition-all text-left group"
          >
            <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg group-hover:rotate-12 transition-transform">
              <Volume2 size={40} />
            </div>
            <h2 className="text-3xl font-black mb-4 text-emerald-700 dark:text-emerald-400">{t.animalQuest}</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.animalQuestDesc}
            </p>
          </button>

          <button
            onClick={startKeyFinder}
            className="p-10 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl hover:border-blue-500 transition-all text-left group"
          >
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mb-8 group-hover:scale-110 transition-transform">
              <Keyboard size={40} />
            </div>
            <h2 className="text-3xl font-black mb-4 group-hover:text-blue-600">{t.keyboardOrientation}</h2>
            <p className="text-lg text-slate-500 leading-relaxed">
              {language === 'en' ? 'Find and press the keys as fast as you can to improve muscle memory.' : 'കീബോർഡിലെ കീകൾ വേഗത്തിൽ കണ്ടെത്തി അമർത്തുക.'}
            </p>
          </button>

          <button
            onClick={startTypingSpeed}
            className="p-10 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl hover:border-indigo-500 transition-all text-left group"
          >
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 group-hover:scale-110 transition-transform">
              <Zap size={40} />
            </div>
            <h2 className="text-3xl font-black mb-4 group-hover:text-indigo-600">
              {language === 'en' ? 'Typing Speed' : 'ടൈപ്പിംഗ് സ്പീഡ്'}
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed">
              {language === 'en' ? 'Type the words you hear to increase your typing accuracy and speed.' : 'നിങ്ങൾ കേൾക്കുന്ന വാക്കുകൾ വേഗത്തിൽ ടൈപ്പ് ചെയ്യുക.'}
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={() => {
            setCurrentGame(null);
            setIsActive(false);
          }}
          className="flex items-center gap-2 text-xl font-bold text-blue-600 hover:underline"
        >
          <ArrowLeft /> {language === 'en' ? 'Exit Game' : 'ഗെയിമിൽ നിന്ന് പുറത്തുകടക്കുക'}
        </button>
        <div className="flex items-center gap-6">
          {(currentGame === 'letter-quest' || currentGame === 'animal-quest') && (
            <div className={`flex items-center gap-2 px-6 py-3 rounded-2xl border-2 shadow-sm ${currentGame === 'letter-quest' ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-green-100 border-green-200 text-green-700'}`}>
              <span className="font-bold">{currentGame === 'letter-quest' ? `${t.gameLevel} ${gameLevel}` : t.animalQuest}</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-lg">
            <Trophy className="text-yellow-500" />
            <span className="text-2xl font-black">{score}</span>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-lg">
            <ShieldCheck className="text-blue-500" />
            <span className="text-2xl font-black">{timeLeft}s</span>
          </div>
        </div>
      </div>

      <div 
        role={currentGame ? "application" : "region"} 
        tabIndex={currentGame ? 0 : -1}
        aria-label={currentGame ? t[currentGame as keyof typeof t] : "Games Selection"}
        className={`p-6 md:p-10 rounded-[3rem] border-4 shadow-2xl text-center space-y-6 transition-all ${currentGame === 'letter-quest' ? 'bg-gradient-to-b from-yellow-50 to-white border-yellow-200 dark:from-slate-900 dark:to-slate-800 dark:border-yellow-900/30' : currentGame === 'animal-quest' ? 'bg-gradient-to-b from-green-50 to-white border-green-200 dark:from-slate-900 dark:to-slate-800 dark:border-green-900/30' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}
      >
        {showGameOver ? (
          <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="inline-flex p-8 bg-yellow-100 rounded-full text-yellow-600 dark:bg-yellow-900/30">
              <Trophy size={80} className="animate-bounce" />
            </div>
            <h2 className="text-5xl font-black text-slate-800 dark:text-white">{t.quizCompleted}</h2>
            <p className="text-3xl font-bold text-blue-600">{t.score}: {score}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <button
                onClick={() => {
                  if (currentGame === 'letter-quest') startLetterQuest(gameLevel);
                  else if (currentGame === 'animal-quest') startAnimalQuest();
                  else if (currentGame === 'key-finder') startKeyFinder();
                  else startTypingSpeed();
                }}
                className="px-10 py-5 bg-blue-600 text-white rounded-2xl text-2xl font-black hover:bg-blue-700 transition-all shadow-xl flex items-center justify-center gap-3"
              >
                <RotateCcw /> {language === 'en' ? 'Play Again' : 'വീണ്ടും കളിക്കുക'}
              </button>
              <button
                onClick={() => {
                  setCurrentGame(null);
                  setShowGameOver(false);
                }}
                className="px-10 py-5 bg-slate-100 text-slate-600 rounded-2xl text-2xl font-black hover:bg-slate-200 transition-all border-2 border-slate-200"
              >
                {t.backToLessons}
              </button>
            </div>
          </div>
        ) : currentGame === 'key-finder' || currentGame === 'letter-quest' ? (
          <>
            <div className="space-y-6">
              <h2 className={`text-3xl font-bold uppercase tracking-widest ${currentGame === 'letter-quest' ? 'text-orange-500' : 'text-slate-500'}`}>
                {currentGame === 'letter-quest' ? t.letterQuest : t.keyboardOrientation}
              </h2>
              <div className={`text-[12rem] font-black animate-bounce drop-shadow-2xl ${currentGame === 'letter-quest' ? 'text-orange-600' : 'text-blue-600'}`}>
                {targetKey.toUpperCase()}
              </div>
              <p className="text-3xl font-bold text-slate-600 dark:text-slate-400">
                {language === 'en' ? 'Press this key!' : 'ഈ കീ അമർത്തുക!'}
              </p>
            </div>
            <input
              type="text"
              autoFocus
              onKeyDown={handleKeyPress}
              className="opacity-0 absolute"
              aria-label="Key input field"
            />
          </>
        ) : currentGame === 'animal-quest' ? (
          <div className="space-y-2 relative overflow-hidden flex flex-col items-center justify-center min-h-[350px]">
            {/* Decorative elements for kids */}
            <div className="absolute top-0 left-0 w-20 h-20 bg-yellow-200/50 rounded-full -translate-x-10 -translate-y-10 blur-2xl" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-green-200/50 rounded-full translate-x-10 translate-y-10 blur-2xl" />
            
            <div className="space-y-1 relative z-10 text-center">
              <h2 className="text-xl font-black text-green-600 uppercase tracking-[0.2em] drop-shadow-sm">{t.animalQuest}</h2>
              <div className={`text-[8rem] md:text-[10rem] leading-none transition-all duration-700 filter drop-shadow-2xl ${isCorrect ? 'scale-110 rotate-12' : 'scale-100 hover:scale-105'}`}>
                {currentAnimal?.emoji}
              </div>
              {isCorrect && (
                <div className="text-3xl font-black text-green-600 animate-bounce tracking-tighter">
                  {currentAnimal?.name.toUpperCase()}! 🌟
                </div>
              )}
              {isErrorMode && (
                <div className="bg-amber-100 text-amber-800 px-6 py-2 rounded-full font-bold animate-pulse border-2 border-amber-200">
                  {t.practiceRemaining}: {practiceCount}
                </div>
              )}
            </div>
            <form onSubmit={handleTypingSubmit} className="w-full max-w-md space-y-4 relative z-10">
              <div className="relative group">
                <input
                  ref={inputRef}
                  type="text"
                  role="textbox"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  autoFocus
                  disabled={isCorrect}
                  aria-label={`${t.spellTheAnimal}: ${currentAnimal?.name}. ${language === 'en' ? 'Press Space to repeat name, Press R to hear spelling' : 'പേര് വീണ്ടും കേൾക്കാൻ സ്പേസ് അമർത്തുക, സ്പെല്ലിംഗ് കേൾക്കാൻ ആർ അമർത്തുക'}`}
                  className={`w-full p-4 text-3xl font-black text-center border-8 rounded-[2rem] outline-none dark:bg-slate-800 uppercase tracking-[0.2em] transition-all duration-300 ${isCorrect ? 'bg-green-50 border-green-500 text-green-600 shadow-[0_0_40px_rgba(34,197,94,0.3)]' : isErrorMode ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-slate-100 focus:border-green-400 dark:border-slate-700 shadow-xl'}`}
                  placeholder="???"
                  autoComplete="off"
                />
                {!isCorrect && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200 whitespace-nowrap">
                    {language === 'en' ? 'Space: Repeat | R: Spelling' : 'സ്പേസ്: വീണ്ടും കേൾക്കാം | ആർ: സ്പെല്ലിംഗ്'}
                  </div>
                )}
              </div>
              {!isCorrect && (
                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-[1.5rem] text-2xl font-black hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-4"
                >
                  <Sparkles /> {t.submitAnswer}
                </button>
              )}
            </form>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-slate-500 uppercase tracking-widest">Typing Speed</h2>
              <div className="text-6xl font-black text-indigo-600">
                {targetWord.toUpperCase()}
              </div>
            </div>
            <form onSubmit={handleTypingSubmit} className="max-w-md mx-auto space-y-6">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                autoFocus
                aria-label={`${language === 'en' ? 'Type word' : 'വാക്ക് ടൈപ്പ് ചെയ്യുക'}: ${targetWord}. ${language === 'en' ? 'Press Space to repeat' : 'വാക്ക് വീണ്ടും കേൾക്കാൻ സ്പേസ് അമർത്തുക'}`}
                className="w-full p-6 text-4xl font-black text-center border-4 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none dark:bg-slate-800 dark:border-slate-700 uppercase tracking-widest"
                placeholder="TYPE HERE"
                autoComplete="off"
              />
              <button
                type="submit"
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-2xl font-black hover:bg-indigo-700 transition-all shadow-xl"
              >
                {t.submitAnswer}
              </button>
            </form>
          </>
        )}

        <div className="pt-8 flex flex-wrap justify-center gap-8 text-slate-400 font-bold">
          <div className="flex items-center gap-2">
            <Volume2 size={24} className="text-blue-500" />
            {language === 'en' ? 'Tip: Listen carefully to the audio' : 'സൂചന: ഓഡിയോ ശ്രദ്ധാപൂർവ്വം കേൾക്കുക'}
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={24} className="text-yellow-400" />
            {language === 'en' ? 'Tip: Use your muscle memory' : 'സൂചന: നിങ്ങളുടെ മസിൽ മെമ്മറി ഉപയോഗിക്കുക'}
          </div>
        </div>
      </div>
    </div>
  );
};
