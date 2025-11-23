
import React, { useState, useEffect } from 'react';
import { SyllabusAnalysis, ConsultationAnswers, EducationLevel } from '../types';

interface AnalysisViewProps {
  analysis: SyllabusAnalysis;
  onConfirm: (level: EducationLevel, pyq: boolean, answers: ConsultationAnswers) => void;
  onCancel: () => void;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis, onConfirm, onCancel }) => {
  const [level, setLevel] = useState<EducationLevel>(analysis.detectedLevel);
  const [includePYQ, setIncludePYQ] = useState(false);
  const [answers, setAnswers] = useState<ConsultationAnswers>({});

  // Auto-fill answers with first option if user skips (optional, or just for defaults)
  useEffect(() => {
      const defaultAnswers: ConsultationAnswers = {};
      analysis.questions.forEach(q => {
          if (q.options && q.options.length > 0) {
              defaultAnswers[q.id] = q.options[0];
          }
      });
      // Don't override if user already selected
      setAnswers(prev => ({ ...defaultAnswers, ...prev }));
  }, [analysis]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleStart = () => {
    onConfirm(level, includePYQ, answers);
  };

  return (
    // Relative Root to contain absolute footer
    <div className="h-[100dvh] w-full bg-stone-50 dark:bg-stone-950 font-sans relative overflow-hidden flex flex-col">
      
      {/* Scrollable Content Area - Independent of footer */}
      <div className="flex-1 w-full overflow-y-auto scroll-smooth">
          <div className="w-full max-w-4xl mx-auto p-4 md:p-8 pb-48 animate-fade-in"> 
            
            {/* Header */}
            <div className="mb-8 md:mb-12">
                <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 bg-orange-600 dark:bg-orange-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-500">Analysis Complete</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-stone-900 dark:text-white font-display mb-3 leading-tight">
                    Blueprint Strategy
                </h1>
                <p className="text-stone-500 dark:text-stone-400 max-w-xl text-sm md:text-base leading-relaxed">
                    Orbis has constructed a curriculum architecture based on your inputs. Refine the parameters below to match your learning style.
                </p>
            </div>

            {/* AI Insight Card */}
            <div className="bg-white dark:bg-stone-900 border-l-4 border-stone-200 dark:border-stone-800 p-6 md:p-8 rounded-r-xl shadow-sm mb-10">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span> Core Topic
                </h3>
                <p className="text-xl md:text-2xl font-medium text-stone-800 dark:text-stone-200 leading-relaxed font-display">
                    "{analysis.summary}"
                </p>
                <div className="flex flex-wrap gap-2 mt-6">
                    {analysis.topics.map((topic, i) => (
                        <span key={i} className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-bold uppercase tracking-wide rounded-md">
                            {topic}
                        </span>
                    ))}
                </div>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 gap-8">
                
                {/* 1. Level Selection */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-[10px]">1</span>
                        Target Depth
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {['SCHOOL', 'HIGH_SCHOOL', 'COLLEGE', 'PROFESSIONAL', 'HOBBY'].map((l) => (
                            <button
                                key={l}
                                onClick={() => setLevel(l as EducationLevel)}
                                className={`px-2 py-4 text-xs font-bold uppercase tracking-wider border rounded-lg transition-all flex flex-col items-center justify-center gap-2 ${
                                    level === l 
                                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-900 dark:border-stone-100 shadow-lg scale-105'
                                    : 'bg-white dark:bg-stone-900 text-stone-500 border-stone-200 dark:border-stone-800 hover:border-orange-500 hover:text-orange-600'
                                }`}
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {l === 'SCHOOL' ? 'backpack' : 
                                     l === 'HIGH_SCHOOL' ? 'school' : 
                                     l === 'COLLEGE' ? 'account_balance' : 
                                     l === 'PROFESSIONAL' ? 'work' : 'palette'}
                                </span>
                                {l.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. PYQ Toggle */}
                <div className="space-y-4">
                     <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-[10px]">2</span>
                        Exam Focus
                    </h3>
                    <label className={`flex items-center gap-5 p-5 rounded-xl border transition-all cursor-pointer group ${
                        includePYQ 
                        ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-600 dark:border-orange-500' 
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-orange-300'
                    }`}>
                        <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                            includePYQ 
                            ? 'bg-orange-600 border-orange-600 text-white' 
                            : 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600'
                        }`}>
                            {includePYQ && <span className="material-symbols-outlined text-sm">check</span>}
                        </div>
                        <input 
                            type="checkbox" 
                            checked={includePYQ}
                            onChange={e => setIncludePYQ(e.target.checked)}
                            className="hidden"
                        />
                        <div className="flex-1">
                            <h3 className={`text-base font-bold ${includePYQ ? 'text-orange-900 dark:text-orange-100' : 'text-stone-900 dark:text-white'}`}>
                                Previous Year Questions (PYQ)
                            </h3>
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                                Instructs the AI to prioritize exam-style questions from past papers in quizzes.
                            </p>
                        </div>
                    </label>
                </div>

                {/* 3. AI Customization Questions */}
                {analysis.questions.length > 0 && (
                    <div className="space-y-6">
                        <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                             <span className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-[10px]">3</span>
                             Refinement
                        </h3>
                        
                        <div className="grid gap-6">
                            {analysis.questions.map((q) => (
                                <div key={q.id} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 rounded-xl">
                                    <label className="block text-base font-bold text-stone-800 dark:text-stone-200 mb-4 leading-relaxed">
                                        {q.text}
                                    </label>
                                    
                                    {q.options && q.options.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {q.options.map((opt) => (
                                                <button
                                                    key={opt}
                                                    onClick={() => handleAnswerChange(q.id, opt)}
                                                    className={`px-4 py-3 text-sm font-medium text-left border rounded-lg transition-all flex items-center justify-between group ${
                                                        answers[q.id] === opt
                                                        ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                                                        : 'bg-stone-50 dark:bg-stone-950 border-stone-100 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                                                    }`}
                                                >
                                                    <span>{opt}</span>
                                                    {answers[q.id] === opt && <span className="material-symbols-outlined text-sm">check_circle</span>}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        // Fallback input if AI fails to give options (rare with new prompt)
                                        <input
                                            type="text"
                                            placeholder="Type your preference..."
                                            className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 p-4 rounded-lg text-sm outline-none focus:border-orange-500 transition-colors"
                                            value={answers[q.id] || ''}
                                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          </div>
      </div>

      {/* Sticky Footer */}
      <div className="absolute bottom-0 left-0 w-full bg-white/90 dark:bg-stone-950/90 backdrop-blur-xl border-t border-stone-200 dark:border-stone-800 p-4 md:px-8 md:py-6 flex justify-between items-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
             <button onClick={onCancel} className="px-6 py-3 text-stone-500 font-bold uppercase text-xs tracking-widest hover:text-stone-900 dark:hover:text-stone-300 transition-colors">
                Cancel
             </button>
             <button 
                onClick={handleStart}
                className="px-8 py-4 bg-stone-900 dark:bg-stone-100 hover:bg-orange-600 dark:hover:bg-orange-500 text-white dark:text-stone-900 font-bold uppercase tracking-widest text-xs transition-all shadow-lg hover:shadow-orange-500/20 rounded-lg flex items-center gap-3 transform hover:-translate-y-1"
            >
                Start Generation
                <span className="material-symbols-outlined text-sm">rocket_launch</span>
             </button>
      </div>

    </div>
  );
};

export default AnalysisView;
