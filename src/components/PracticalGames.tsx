import React, { useState, useEffect, useRef } from 'react';
import { useA11y } from './A11yProvider';
import { Keyboard, Zap, Target, ArrowLeft, RotateCcw, Volume2, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { handleKey } from '../lib/utils';
import toast from 'react-hot-toast';

export const PracticalGames: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t, language, announce } = useA11y();
  const [currentGame, setCurrentGame] = useState<'key-finder' | 'typing-speed' | null>(null);
  const [targetKey, setTargetKey] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isActive, setIsActive] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [targetWord, setTargetWord] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const WORDS = ["apple", "banana", "cherry", "date", "elderberry", "fig", "grape", "honeydew", "kiwi", "lemon"];
  const KEYS = "abcdefghijklmnopqrstuvwxyz0123456789".split("");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      announce(`${t.quizCompleted}. ${t.score}: ${score}`);
      toast.success(`${t.quizCompleted} Score: ${score}`);
    }
    return () => clearInterval(timer);
  }, [isActive, timeLeft, score, t.quizCompleted, t.score, announce]);

  const startKeyFinder = () => {
    setCurrentGame('key-finder');
    setScore(0);
    setTimeLeft(30);
    setIsActive(true);
    const firstKey = KEYS[Math.floor(Math.random() * KEYS.length)];
    setTargetKey(firstKey);
    speakKey(firstKey);
  };

  const startTypingSpeed = () => {
    setCurrentGame('typing-speed');
    setScore(0);
    setTimeLeft(30);
    setIsActive(true);
    const firstWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setTargetWord(firstWord);
    speakWord(firstWord);
  };

  const speakKey = (key: string) => {
    const utterance = new SpeechSynthesisUtterance(`Find key: ${key}`);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
    announce(`Find key: ${key}`);
  };

  const speakWord = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    announce(`Type word: ${word}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!isActive || currentGame !== 'key-finder') return;

    if (e.key.toLowerCase() === targetKey.toLowerCase()) {
      setScore(prev => prev + 1);
      const nextKey = KEYS[Math.floor(Math.random() * KEYS.length)];
      setTargetKey(nextKey);
      speakKey(nextKey);
    } else {
      const utterance = new SpeechSynthesisUtterance("Wrong key");
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isActive || currentGame !== 'typing-speed') return;

    if (inputValue.trim().toLowerCase() === targetWord.toLowerCase()) {
      setScore(prev => prev + 1);
      setInputValue('');
      const nextWord = WORDS[Math.floor(Math.random() * WORDS.length)];
      setTargetWord(nextWord);
      speakWord(nextWord);
    } else {
      const utterance = new SpeechSynthesisUtterance("Wrong spelling");
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
      setInputValue('');
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

      <div className="bg-white dark:bg-slate-900 p-12 md:p-20 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 shadow-2xl text-center space-y-12">
        {currentGame === 'key-finder' ? (
          <>
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-slate-500 uppercase tracking-widest">{t.keyboardOrientation}</h2>
              <div className="text-9xl font-black text-blue-600 animate-bounce">
                {targetKey.toUpperCase()}
              </div>
              <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                {language === 'en' ? 'Press this key on your keyboard' : 'ഈ കീ നിങ്ങളുടെ കീബോർഡിൽ അമർത്തുക'}
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
                autoFocus
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
