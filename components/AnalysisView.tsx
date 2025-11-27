import React, { useState, useEffect } from 'react';
import { SyllabusAnalysis, ConsultationAnswers, EducationLevel } from '../types';

interface AnalysisViewProps {
  analysis: SyllabusAnalysis;
  onConfirm: (level: EducationLevel, pyq: boolean, answers: ConsultationAnswers, selectedTopics: string[]) => void;
  onCancel: () => void;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis, onConfirm, onCancel }) => {
  const [level, setLevel] = useState<EducationLevel>(analysis.detectedLevel);
  const [includePYQ, setIncludePYQ] = useState(false);
  const [answers, setAnswers] = useState<ConsultationAnswers>({});
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  useEffect(() => {
      if (analysis.selectableTopics) setSelectedTopics(analysis.selectableTopics);
      const defaultAnswers: ConsultationAnswers = {};
      analysis.questions.forEach(q => { if (q.options) defaultAnswers[q.id] = q.options[0]; });
      setAnswers(prev => ({ ...defaultAnswers, ...prev }));
  }, [analysis]);

  const toggleTopic = (topic: string) => {
      setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  };

  return (
    <div className="h-[100dvh] w-full bg-[#fafaf9] dark:bg-[#0c0a09] font-sans flex flex-col">
      
      {/* Header */}
      <div className="p-8 flex justify-between items-center shrink-0 border-b border-stone-100 dark:border-stone-800">
           <h2 className="text-lg font-bold text-stone-900 dark:text-white font-display">Blueprint</h2>
           <button onClick={onCancel} className="text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 dark:hover:text-white">Cancel</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-12">
          <div className="max-w-4xl mx-auto space-y-16">
              
              {/* Summary */}
              <div>
                  <h1 className="text-3xl md:text-5xl font-bold text-stone-900 dark:text-white font-display mb-4 leading-tight">
                      {analysis.summary}
                  </h1>
                  <div className="flex gap-2 flex-wrap">
                      {analysis.topics.map((t, i) => (
                          <span key={i} className="text-xs font-bold uppercase tracking-widest text-orange-600 border border-orange-200 dark:border-orange-900 px-3 py-1 rounded-full">{t}</span>
                      ))}
                  </div>
              </div>

              {/* Scope */}
              {analysis.selectableTopics && (
                  <div>
                      <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">1. Scope</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {analysis.selectableTopics.map((t, i) => (
                              <button 
                                key={i} 
                                onClick={() => toggleTopic(t)}
                                className={`text-left p-4 border rounded-lg text-sm font-medium transition-colors ${
                                    selectedTopics.includes(t) 
                                    ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-stone-900 dark:border-white' 
                                    : 'bg-transparent text-stone-500 border-stone-200 dark:border-stone-800 hover:border-orange-500'
                                }`}
                              >
                                  {t}
                              </button>
                          ))}
                      </div>
                  </div>
              )}

              {/* Level */}
              <div>
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">2. Depth</h3>
                  <div className="flex flex-wrap gap-4">
                      {['SCHOOL', 'COLLEGE', 'PROFESSIONAL'].map(l => (
                          <button 
                             key={l}
                             onClick={() => setLevel(l as EducationLevel)}
                             className={`px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
                                 level === l
                                 ? 'bg-orange-600 text-white'
                                 : 'bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700'
                             }`}
                          >
                              {l}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Questions */}
              {analysis.questions.length > 0 && (
                  <div>
                      <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">3. Fine Tuning</h3>
                      <div className="space-y-8">
                          {analysis.questions.map(q => (
                              <div key={q.id}>
                                  <p className="font-bold text-stone-900 dark:text-white mb-3 text-lg">{q.text}</p>
                                  <div className="flex gap-3 overflow-x-auto pb-2">
                                      {q.options?.map(opt => (
                                          <button
                                            key={opt}
                                            onClick={() => setAnswers(p => ({...p, [q.id]: opt}))}
                                            className={`px-4 py-2 rounded border text-sm whitespace-nowrap transition-colors ${
                                                answers[q.id] === opt
                                                ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-stone-900 dark:border-white'
                                                : 'text-stone-500 border-stone-200 dark:border-stone-800'
                                            }`}
                                          >
                                              {opt}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

          </div>
      </div>

      <div className="p-6 md:p-8 border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 flex justify-end">
          <button 
            onClick={() => onConfirm(level, includePYQ, answers, selectedTopics)}
            disabled={selectedTopics.length === 0}
            className={`px-10 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all ${
                selectedTopics.length === 0 
                ? 'bg-stone-100 text-stone-400' 
                : 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg'
            }`}
          >
              Build Course
          </button>
      </div>

    </div>
  );
};

export default AnalysisView;