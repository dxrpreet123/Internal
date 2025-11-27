
import React, { useState } from 'react';
import { Quiz } from '../types';

interface QuizOverlayProps {
  quiz: Quiz;
  onClose: () => void;
  onResult?: (correct: boolean) => void;
}

const QuizOverlay: React.FC<QuizOverlayProps> = ({ quiz, onClose, onResult }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleOptionClick = (index: number) => {
    if (selected !== null) return; // Prevent multi-click
    setSelected(index);
    const correct = index === quiz.correctIndex;
    setIsCorrect(correct);
    if (onResult) onResult(correct);
  };

  return (
    <div className="absolute inset-0 z-40 bg-[#202124]/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in font-sans">
      <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-[#DADCE0] relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-2">
                <div className="bg-[#E8F0FE] text-[#1A73E8] p-2 rounded-full">
                    <span className="material-symbols-outlined text-xl">psychology_alt</span>
                </div>
                <h3 className="text-base md:text-lg font-bold text-[#202124]">Check understanding</h3>
             </div>
             <button onClick={onClose} className="text-[#5F6368] hover:text-[#202124] p-1 rounded-full hover:bg-[#F1F3F4]">
                <span className="material-symbols-outlined">close</span>
             </button>
        </div>
       
        <p className="text-lg md:text-xl text-[#202124] font-medium mb-6 leading-relaxed tracking-tight">{quiz.question}</p>

        <div className="space-y-3">
          {quiz.options.map((option, idx) => {
            let btnClass = "w-full p-4 rounded-xl text-left transition-all font-medium border text-sm md:text-base ";
            
            if (selected === null) {
                btnClass += "bg-white border-[#DADCE0] hover:border-[#1A73E8] hover:bg-[#F8F9FA] text-[#5F6368] active:bg-[#F1F3F4]";
            } else if (idx === quiz.correctIndex) {
                btnClass += "bg-[#E6F4EA] border-[#34A853] text-[#137333]"; // Success Green
            } else if (selected === idx && idx !== quiz.correctIndex) {
                btnClass += "bg-[#FCE8E6] border-[#EA4335] text-[#C5221F]"; // Error Red
            } else {
                btnClass += "bg-[#F1F3F4] border-transparent text-[#9AA0A6] opacity-50";
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(idx)}
                className={btnClass}
                disabled={selected !== null}
              >
                <div className="flex justify-between items-center">
                    <span>{option}</span>
                    {selected === idx && idx === quiz.correctIndex && <span className="material-symbols-outlined">check_circle</span>}
                    {selected === idx && idx !== quiz.correctIndex && <span className="material-symbols-outlined">cancel</span>}
                </div>
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <div className="mt-6 p-4 rounded-lg bg-[#F8F9FA] border border-[#DADCE0]">
            <h4 className={`text-sm font-bold mb-1 ${isCorrect ? 'text-[#137333]' : 'text-[#C5221F]'}`}>
                {isCorrect ? "Correct!" : "Not quite."}
            </h4>
            {quiz.explanation && (
                <p className="text-sm text-[#5F6368]">{quiz.explanation}</p>
            )}
             {!isCorrect && !quiz.explanation && (
                <p className="text-sm text-[#5F6368]">Review the video again to find the answer.</p>
            )}
            <button onClick={onClose} className="mt-4 w-full py-3 bg-[#1A73E8] text-white rounded-lg font-medium hover:bg-[#1557B0] active:scale-95 transition-transform">
                Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizOverlay;
