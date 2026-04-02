import React, { useState, useEffect } from 'react';
import { Howl } from 'howler';
import { CheckCircle, XCircle, RotateCcw, Trophy } from 'lucide-react';
import { useA11y } from './A11yProvider';
import { handleKey, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizProps {
  questions: Question[];
  onComplete?: (score: number) => void;
}

export const Quiz: React.FC<QuizProps> = ({ questions, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const { announce, t } = useA11y();
  const [isFocused, setIsFocused] = useState(false);

  const [focusedOptionIndex, setFocusedOptionIndex] = useState<number>(-1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showResult || feedback) return;
      
      const key = e.key;
      const optionsCount = questions[currentQuestion].options.length;

      if (key === "ArrowDown") {
        e.preventDefault();
        setFocusedOptionIndex(prev => (prev + 1) % optionsCount);
      } else if (key === "ArrowUp") {
        e.preventDefault();
        setFocusedOptionIndex(prev => (prev - 1 + optionsCount) % optionsCount);
      } else {
        const index = parseInt(key) - 1;
        if (index >= 0 && index < optionsCount) {
          handleAnswer(index);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, feedback, showResult, questions]);

  useEffect(() => {
    if (focusedOptionIndex !== -1) {
      const buttons = document.querySelectorAll('.quiz-option');
      (buttons[focusedOptionIndex] as HTMLElement)?.focus();
    }
  }, [focusedOptionIndex]);

  useEffect(() => {
    setFocusedOptionIndex(-1);
  }, [currentQuestion]);

  const correctSound = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'] });
  const wrongSound = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'] });

  const handleAnswer = (index: number) => {
    if (feedback) return;

    const isCorrect = index === questions[currentQuestion].correctAnswer;
    if (isCorrect) {
      setScore(prev => prev + 1);
      setFeedback('correct');
      correctSound.play();
      announce(t.correct);
    } else {
      setFeedback('wrong');
      wrongSound.play();
      announce(`${t.incorrect}. ${t.question} ${currentQuestion + 1}: ${questions[currentQuestion].options[questions[currentQuestion].correctAnswer]}`);
    }

    setTimeout(() => {
      setFeedback(null);
      if (currentQuestion + 1 < questions.length) {
        setCurrentQuestion(prev => prev + 1);
      } else {
        setShowResult(true);
        onComplete?.(score + (isCorrect ? 1 : 0));
        announce(`${t.quizCompleted} ${t.score}: ${score + (isCorrect ? 1 : 0)} / ${questions.length}`);
      }
    }, 2000);
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setFeedback(null);
    announce(t.retry);
  };

  if (showResult) {
    return (
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl border-4 border-blue-600 dark:bg-slate-900">
        <Trophy size={80} className="mx-auto text-yellow-500 mb-6" />
        <h2 className="text-4xl font-bold mb-4 outline-none focus:ring-4 focus:ring-blue-500 rounded-lg inline-block" tabIndex={0}>{t.quizCompleted}</h2>
        <p className="text-2xl mb-4">{t.score}: <span className="font-mono font-bold text-blue-600">{score} / {questions.length}</span></p>
        <p className={cn(
          "text-xl font-bold mb-8 p-4 rounded-xl",
          score < 3 ? "bg-red-50 text-red-700 dark:bg-red-900/20" : "bg-green-50 text-green-700 dark:bg-green-900/20"
        )}>
          {score < 3 ? t.practiceNeeded : t.goodJob}
        </p>
        <button
          onClick={resetQuiz}
          onKeyDown={handleKey}
          className="flex items-center gap-3 mx-auto px-8 py-4 bg-blue-600 text-white rounded-xl text-xl font-bold hover:bg-blue-700"
          aria-label={t.retry}
        >
          <RotateCcw /> {t.retry}
        </button>
      </div>
    );
  }

  const q = questions[currentQuestion];

  return (
    <div 
      className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-xl border-2 border-slate-200 dark:bg-slate-900 dark:border-slate-700"
      tabIndex={0}
    >
      <div className="mb-8">
        <span className="text-lg font-bold text-slate-500 uppercase tracking-widest">{t.question} {currentQuestion + 1} / {questions.length}</span>
        <p id="question" className="text-3xl font-bold mt-2 leading-tight rounded-lg inline-block" tabIndex={0}>{q.question}</p>
      </div>

      <div className="grid gap-4">
        {q.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            onKeyDown={handleKey}
            onFocus={() => setFocusedOptionIndex(index)}
            disabled={!!feedback}
            className={cn(
              "quiz-option w-full p-6 text-left text-xl font-medium rounded-xl border-2 transition-all",
              feedback === null && "border-slate-200 hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800",
              feedback === 'correct' && index === q.correctAnswer && "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30",
              feedback === 'wrong' && index === q.correctAnswer && "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30",
              feedback === 'wrong' && index !== q.correctAnswer && "bg-red-50 border-red-200 text-red-400 opacity-50"
            )}
            aria-label={`${t.question} ${index + 1}: ${option}`}
          >
            <div className="flex justify-between items-center">
              <span>{index + 1}. {option}</span>
              {feedback === 'correct' && index === q.correctAnswer && <CheckCircle className="text-green-600" />}
              {feedback === 'wrong' && index === q.correctAnswer && <CheckCircle className="text-green-600" />}
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "mt-8 p-4 rounded-xl text-center text-2xl font-bold flex items-center justify-center gap-3",
              feedback === 'correct' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            )}
          >
            {feedback === 'correct' ? <CheckCircle /> : <XCircle />}
            {feedback === 'correct' ? t.correct : t.incorrect}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
