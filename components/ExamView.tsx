

import React, { useState, useEffect } from 'react';
import { Course, ReelData } from '../types';

interface ExamViewProps {
  course: Course;
  onClose: () => void;
  onComplete: (score: number) => void;
}

const ExamView: React.FC<ExamViewProps> = ({ course, onClose, onComplete }) => {
  const [questions, setQuestions] = useState<ReelData[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // qIndex -> optionIndex
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    // Filter reels that have quizzes
    const validReels = course.reels.filter(r => r.quiz && r.quiz.options && r.quiz.options.length > 0);
    setQuestions(validReels);
    setTimeLeft(validReels.length * 60); // 1 minute per question default
  }, [course]);

  useEffect(() => {
    if (isSubmitted || questions.length === 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted, questions]);

  const handleSelectOption = (optionIndex: number) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [currentQIndex]: optionIndex }));
  };

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.quiz?.correctIndex) {
        correctCount++;
      }
    });
    onComplete(correctCount);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-6 text-center font-sans">
        <div>
           <span className="material-symbols-outlined text-4xl text-stone-400 mb-4">quiz</span>
           <h2 className="text-xl font-bold text-stone-900 dark:text-white">No Questions Available</h2>
           <p className="text-stone-500 mb-6">This course doesn't have enough generated questions yet.</p>
           <button onClick={onClose} className="px-6 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold uppercase tracking-widest text-xs rounded-full">Return</button>
        </div>
      </div>
    );
  }

  // RESULT SCREEN
  if (isSubmitted) {
    let correctCount = 0;
    questions.forEach((q, idx) => { if (answers[idx] === q.quiz?.correctIndex) correctCount++; });
    const percentage = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="fixed inset-0 bg-[#f8fafc] dark:bg-[#0f172a] font-sans overflow-y-auto animate-fade-in flex flex-col items-center py-12">
          <div className="w-full max-w-2xl px-6">
              <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 md:p-12 shadow-2xl text-center mb-8 border border-stone-200 dark:border-stone-800">
                  <h1 className="text-3xl font-bold font-display text-stone-900 dark:text-white mb-2">Exam Results</h1>
                  <p className="text-stone-500 mb-8 text-sm">You have completed the assessment.</p>
                  
                  <div className="relative w-40 h-40 mx-auto mb-8 flex items-center justify-center">
                       <svg className="w-full h-full -rotate-90">
                           <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="none" className="text-stone-100 dark:text-stone-800" />
                           <circle cx="80" cy="80" r="70" stroke={percentage >= 70 ? "#22c55e" : "#ea580c"} strokeWidth="10" fill="none" strokeDasharray="440" strokeDashoffset={440 - (440 * percentage / 100)} strokeLinecap="round" />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                           <span className="text-4xl font-bold text-stone-900 dark:text-white">{percentage}%</span>
                           <span className="text-xs uppercase font-bold text-stone-400 tracking-widest">Score</span>
                       </div>
                  </div>

                  <div className="flex justify-center gap-4 text-center">
                      <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-xl flex-1">
                          <span className="block text-2xl font-bold text-stone-900 dark:text-white">{correctCount}</span>
                          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Correct</span>
                      </div>
                      <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-xl flex-1">
                          <span className="block text-2xl font-bold text-stone-900 dark:text-white">{questions.length - correctCount}</span>
                          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Incorrect</span>
                      </div>
                  </div>
              </div>

              <div className="space-y-4 pb-12">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest pl-2">Detailed Analysis</h3>
                  {questions.map((q, idx) => {
                      const isCorrect = answers[idx] === q.quiz?.correctIndex;
                      return (
                          <div key={idx} className={`p-6 bg-white dark:bg-stone-900 rounded-xl border-l-4 shadow-sm ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Question {idx + 1}</span>
                                  {isCorrect ? <span className="text-green-600 font-bold text-xs uppercase">Correct</span> : <span className="text-red-600 font-bold text-xs uppercase">Wrong</span>}
                              </div>
                              <p className="font-bold text-stone-900 dark:text-white mb-3 text-sm md:text-base">{q.quiz?.question}</p>
                              
                              <div className="text-sm text-stone-600 dark:text-stone-400 mb-2">
                                  <span className="font-bold">Your Answer:</span> {q.quiz?.options[answers[idx]] || "Skipped"}
                              </div>
                              {!isCorrect && (
                                  <div className="text-sm text-green-600 dark:text-green-400 mb-2">
                                      <span className="font-bold">Correct Answer:</span> {q.quiz?.options[q.quiz?.correctIndex!]}
                                  </div>
                              )}
                              
                              <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                                  <p className="text-xs text-stone-500 italic"><span className="font-bold">Explanation:</span> {q.quiz?.explanation}</p>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
          
          <div className="fixed bottom-0 left-0 w-full p-6 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex justify-center">
              <button onClick={onClose} className="px-10 py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold uppercase tracking-widest text-xs rounded-full hover:bg-orange-600 transition-colors shadow-lg">
                  Return to Classroom
              </button>
          </div>
      </div>
    );
  }

  // EXAM INTERFACE
  const currentQ = questions[currentQIndex];
  return (
    <div className="fixed inset-0 w-full h-full bg-stone-100 dark:bg-[#0c0a09] z-50 flex flex-col font-sans">
      
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-6 py-4 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white">
                   <span className="material-symbols-outlined text-lg">edit_document</span>
               </div>
               <div>
                   <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">Final Exam</h2>
                   <p className="text-[10px] text-stone-500 font-mono">Orbis Secure Browser</p>
               </div>
          </div>
          <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-stone-900 text-white rounded font-mono font-bold text-xl tracking-widest">
                  {formatTime(timeLeft)}
              </div>
              <button onClick={handleSubmit} className="text-xs font-bold text-stone-500 hover:text-red-500 uppercase tracking-widest">
                  Submit
              </button>
          </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
           
           {/* Question Nav Sidebar */}
           <div className="w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 hidden md:block overflow-y-auto p-6">
               <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Questions</h3>
               <div className="grid grid-cols-4 gap-2">
                   {questions.map((_, idx) => (
                       <button
                         key={idx}
                         onClick={() => setCurrentQIndex(idx)}
                         className={`aspect-square rounded flex items-center justify-center text-xs font-bold transition-all ${
                             idx === currentQIndex 
                             ? 'bg-orange-600 text-white shadow-md scale-105' 
                             : answers[idx] !== undefined 
                                ? 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300' 
                                : 'border border-stone-200 dark:border-stone-800 text-stone-400 hover:border-orange-400'
                         }`}
                       >
                           {idx + 1}
                       </button>
                   ))}
               </div>
           </div>

           {/* Question Content */}
           <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center">
               <div className="w-full max-w-3xl">
                   
                   <div className="flex justify-between items-center mb-6">
                       <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Question {currentQIndex + 1} of {questions.length}</span>
                       <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Single Choice</span>
                   </div>

                   <h1 className="text-xl md:text-2xl font-bold text-stone-900 dark:text-white mb-8 leading-relaxed">
                       {currentQ.quiz?.question}
                   </h1>

                   <div className="space-y-4">
                       {currentQ.quiz?.options.map((opt, oIdx) => (
                           <button
                             key={oIdx}
                             onClick={() => handleSelectOption(oIdx)}
                             className={`w-full p-6 rounded-xl text-left border-2 transition-all group flex items-start gap-4 ${
                                 answers[currentQIndex] === oIdx
                                 ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/10'
                                 : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-orange-300 dark:hover:border-stone-600'
                             }`}
                           >
                               <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                   answers[currentQIndex] === oIdx
                                   ? 'border-orange-600'
                                   : 'border-stone-300 group-hover:border-orange-400'
                               }`}>
                                   {answers[currentQIndex] === oIdx && <div className="w-3 h-3 bg-orange-600 rounded-full"></div>}
                               </div>
                               <span className={`text-base font-medium ${answers[currentQIndex] === oIdx ? 'text-stone-900 dark:text-white' : 'text-stone-600 dark:text-stone-400'}`}>
                                   {opt}
                               </span>
                           </button>
                       ))}
                   </div>

               </div>
           </div>
      </div>

      {/* Footer Nav */}
      <div className="bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 p-4 flex justify-between items-center">
          <button 
             onClick={handlePrev}
             disabled={currentQIndex === 0}
             className="px-6 py-3 border border-stone-200 dark:border-stone-700 rounded-full font-bold uppercase tracking-widest text-xs disabled:opacity-50 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-stone-600 dark:text-stone-300"
          >
              Previous
          </button>
          
          <div className="flex gap-1 md:hidden">
              <span className="font-bold text-stone-900 dark:text-white">{currentQIndex + 1}</span>
              <span className="text-stone-400">/</span>
              <span className="text-stone-400">{questions.length}</span>
          </div>

          <button 
             onClick={currentQIndex === questions.length - 1 ? handleSubmit : handleNext}
             className="px-8 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-orange-600 dark:hover:bg-orange-500 transition-colors shadow-lg"
          >
              {currentQIndex === questions.length - 1 ? 'Finish Exam' : 'Next Question'}
          </button>
      </div>

    </div>
  );
};

export default ExamView;