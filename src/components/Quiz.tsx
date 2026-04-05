import React, { useState, useEffect } from 'react';
import { Howl } from 'howler';
import { CheckCircle, XCircle, RotateCcw, Trophy, ArrowLeft } from 'lucide-react';
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
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
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
      } else if (key === "Enter" && focusedOptionIndex !== -1) {
        e.preventDefault();
        setSelectedOptionIndex(focusedOptionIndex);
      } else {
        const index = parseInt(key) - 1;
        if (index >= 0 && index < optionsCount) {
          setSelectedOptionIndex(index);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, feedback, showResult, questions, focusedOptionIndex]);

  useEffect(() => {
    if (focusedOptionIndex !== -1) {
      const inputs = document.querySelectorAll('.quiz-option input');
      (inputs[focusedOptionIndex] as HTMLElement)?.focus();
    }
  }, [focusedOptionIndex]);

  useEffect(() => {
    setFocusedOptionIndex(-1);
    setSelectedOptionIndex(null);
  }, [currentQuestion]);

  const correctSound = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'] });
  const wrongSound = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'] });

  useEffect(() => {
    const instructionEl = document.getElementById('quizInstruction');
    if (instructionEl) {
      instructionEl.textContent = `${t.quizStartedInstructions} ${t.question} 1: ${questions[0].question}`;
    }
  }, []);

  const handleAnswer = () => {
    if (feedback || selectedOptionIndex === null) return;

    const isCorrect = selectedOptionIndex === questions[currentQuestion].correctAnswer;
    const instructionEl = document.getElementById('quizInstruction');

    if (isCorrect) {
      setScore(prev => prev + 1);
      setFeedback('correct');
      correctSound.play();
      if (instructionEl) instructionEl.textContent = t.correct;
      announce(t.correct);
    } else {
      setFeedback('wrong');
      wrongSound.play();
      const wrongMsg = `${t.incorrect}. ${t.question} ${currentQuestion + 1}: ${questions[currentQuestion].options[questions[currentQuestion].correctAnswer]}`;
      if (instructionEl) instructionEl.textContent = wrongMsg;
      announce(wrongMsg);
    }

    setTimeout(() => {
      setFeedback(null);
      setSelectedOptionIndex(null);
      if (currentQuestion + 1 < questions.length) {
        setCurrentQuestion(prev => prev + 1);
        if (instructionEl) {
          instructionEl.textContent = `${t.question} ${currentQuestion + 2}: ${questions[currentQuestion + 1].question}`;
        }
      } else {
        setShowResult(true);
        const finalScore = score + (isCorrect ? 1 : 0);
        const resultMsg = `${t.quizCompleted} ${t.score}: ${finalScore} / ${questions.length}`;
        if (instructionEl) instructionEl.textContent = resultMsg;
        onComplete?.(finalScore);
        announce(resultMsg);
      }
    }, 2000);
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setFeedback(null);
    setSelectedOptionIndex(null);
    const instructionEl = document.getElementById('quizInstruction');
    if (instructionEl) {
      instructionEl.textContent = `${t.quizStartedInstructions} ${t.question} 1: ${questions[0].question}`;
    }
    announce(t.retry);
  };

  if (showResult) {
    return (
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl border-4 border-blue-600 dark:bg-slate-900">
        <Trophy size={80} className="mx-auto text-yellow-500 mb-6" />
        <h2 className="text-4xl font-bold mb-4 rounded-lg inline-block">{t.quizCompleted}</h2>
        <p className="text-2xl mb-4 outline-none focus:ring-2 focus:ring-blue-400 rounded inline-block">{t.score}: <span className="font-mono font-bold text-blue-600">{score} / {questions.length}</span></p>
        <p className={cn(
          "text-xl font-bold mb-8 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-400",
          score < 3 ? "bg-red-50 text-red-700 dark:bg-red-900/20" : "bg-green-50 text-green-700 dark:bg-green-900/20"
        )}>
          {score < 3 ? t.practiceNeeded : t.goodJob}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={resetQuiz}
            onKeyDown={handleKey}
            className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-xl text-xl font-bold hover:bg-blue-700"
            aria-label={t.retry}
          >
            <RotateCcw /> {t.retry}
          </button>
          <button
            onClick={() => onComplete?.(score)}
            onKeyDown={handleKey}
            tabIndex={0}
            className="flex items-center gap-3 px-8 py-4 bg-slate-100 text-slate-700 rounded-xl text-xl font-bold hover:bg-slate-200 border-2 border-slate-200"
            aria-label={t.backToLessons}
          >
            <ArrowLeft /> {t.backToLessons}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentQuestion];

  return (
    <div 
      className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-xl border-2 border-slate-200 dark:bg-slate-900 dark:border-slate-700"
      tabIndex={0}
    >
      <div id="quizInstruction" aria-live="assertive" style={{ position: 'absolute', left: '-9999px' }}>
      </div>
      <div className="mb-8">
        <h2 id="questionText" className="text-3xl font-bold mt-2 leading-tight rounded-lg inline-block outline-none focus:ring-2 focus:ring-blue-400">
          {t.question} {currentQuestion + 1}: {q.question}
        </h2>
        <div className="text-lg font-bold text-slate-500 uppercase tracking-widest mt-2">
          {currentQuestion + 1} / {questions.length}
        </div>
        <p aria-live="polite" className="mt-4 text-slate-600 dark:text-slate-400 font-medium">
          {t.chooseOneAnswer}
        </p>
      </div>

      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); handleAnswer(); }}>
        <fieldset className="border-2 border-slate-200 rounded-2xl p-6 dark:border-slate-700">
          <legend className="text-xl font-bold px-4 text-slate-600 dark:text-slate-400">Select the correct answer</legend>
          <div className="grid gap-4 mt-4">
            {q.options.map((option, index) => (
              <label
                key={index}
                className={cn(
                  "quiz-option flex items-center gap-4 p-4 cursor-pointer rounded-xl border-2 transition-all outline-none focus-within:ring-4 focus-within:ring-blue-400",
                  feedback === null && selectedOptionIndex === index && "border-blue-500 bg-blue-50 dark:bg-slate-800",
                  feedback === null && selectedOptionIndex !== index && "border-slate-100 hover:border-blue-500 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-700",
                  feedback === 'correct' && index === q.correctAnswer && "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30",
                  feedback === 'wrong' && index === q.correctAnswer && "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30",
                  feedback === 'wrong' && index !== q.correctAnswer && "bg-red-50 border-red-200 text-red-400 opacity-50"
                )}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion}`}
                  value={index}
                  checked={selectedOptionIndex === index}
                  onChange={() => setSelectedOptionIndex(index)}
                  disabled={!!feedback}
                  className="w-6 h-6 text-blue-600 focus:ring-blue-500 border-slate-300"
                  onFocus={() => setFocusedOptionIndex(index)}
                />
                <span className="text-xl font-medium">
                  {option}
                </span>
                <div className="ml-auto">
                  {feedback === 'correct' && index === q.correctAnswer && <CheckCircle className="text-green-600" />}
                  {feedback === 'wrong' && index === q.correctAnswer && <CheckCircle className="text-green-600" />}
                </div>
              </label>
            ))}
          </div>
        </fieldset>
        
        <button
          type="submit"
          disabled={selectedOptionIndex === null || !!feedback}
          className={cn(
            "mt-4 w-full py-4 rounded-xl text-xl font-bold transition-all",
            selectedOptionIndex === null || !!feedback
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl active:scale-[0.98]"
          )}
        >
          {t.submitAnswer}
        </button>
      </form>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "mt-8 p-4 rounded-xl text-center text-2xl font-bold flex items-center justify-center gap-3 outline-none focus:ring-2 focus:ring-blue-400",
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
