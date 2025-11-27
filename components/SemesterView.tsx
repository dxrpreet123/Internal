
import React, { useState } from 'react';
import { Semester, SemesterUnit, SemesterTopic } from '../types';
import { breakUnitIntoTopics } from '../services/geminiService';

interface SemesterViewProps {
  semester: Semester;
  onBack: () => void;
  onGenerateUnit: (semesterId: string, subjectId: string, unit: SemesterUnit) => void;
  onGenerateTopic: (semesterId: string, subjectId: string, unitId: string, topic: SemesterTopic) => void;
  onOpenUnit: (courseId: string) => void;
  onUpdateSemester: (semester: Semester) => void;
  onDeleteSemester: (id: string) => void;
}

const SemesterView: React.FC<SemesterViewProps> = ({ semester, onBack, onGenerateTopic, onOpenUnit, onUpdateSemester, onDeleteSemester }) => {
  const [activeSubjectId, setActiveSubjectId] = useState<string>(semester.subjects[0]?.id || '');
  const [planningUnits, setPlanningUnits] = useState<Set<string>>(new Set());
  
  const activeSubject = semester.subjects.find(s => s.id === activeSubjectId);

  const handlePlanTopics = async (unit: SemesterUnit) => {
      setPlanningUnits(prev => new Set(prev).add(unit.id));
      try {
          const planningSem = JSON.parse(JSON.stringify(semester));
          const sub = planningSem.subjects.find((s: any) => s.id === activeSubjectId);
          const u = sub.units.find((u: any) => u.id === unit.id);
          u.status = 'PLANNING_TOPICS';
          onUpdateSemester(planningSem);

          const topics = await breakUnitIntoTopics(unit.title, unit.description);
          
          const finalSem = JSON.parse(JSON.stringify(semester));
          const fSub = finalSem.subjects.find((s: any) => s.id === activeSubjectId);
          const fU = fSub.units.find((u: any) => u.id === unit.id);
          fU.topics = topics;
          fU.status = 'TOPICS_READY';
          onUpdateSemester(finalSem);
      } catch (e) {
          console.error("Failed to plan topics", e);
          alert("Failed to plan curriculum for this unit.");
          setPlanningUnits(prev => {
              const next = new Set(prev);
              next.delete(unit.id);
              return next;
          });
      }
  };

  return (
    <div className="h-[100dvh] w-full bg-stone-50 dark:bg-stone-950 font-sans overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 p-4 md:p-6 flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-3 md:gap-4">
                <button onClick={onBack} className="p-2 -ml-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-stone-500 dark:text-stone-400 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest rounded-sm hidden md:inline-block">Semester</span>
                        <h1 className="text-lg md:text-xl font-bold text-stone-900 dark:text-white font-display truncate max-w-[200px] md:max-w-md">{semester.title}</h1>
                    </div>
                    <p className="text-[10px] md:text-xs text-stone-500 font-mono uppercase tracking-wider">{semester.subjects.length} Subjects • {semester.subjects.reduce((acc, s) => acc + s.units.length, 0)} Units</p>
                </div>
            </div>
            <button 
                onClick={() => onDeleteSemester(semester.id)}
                className="text-stone-400 hover:text-red-600 transition-colors" 
                title="Delete Semester"
            >
                <span className="material-symbols-outlined">delete</span>
            </button>
        </div>

        {/* Content Layout - Flex Column on Mobile, Row on Desktop */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            
            {/* Sidebar: Subjects - Horizontal Scroll on Mobile */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shrink-0">
                <div className="p-4 md:h-full md:overflow-y-auto">
                    <h3 className="hidden md:block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">Subjects</h3>
                    <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible no-scrollbar pb-2 md:pb-0">
                        {semester.subjects.map(subject => (
                            <button
                                key={subject.id}
                                onClick={() => setActiveSubjectId(subject.id)}
                                className={`shrink-0 text-left p-3 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-between whitespace-nowrap md:whitespace-normal ${
                                    activeSubjectId === subject.id 
                                    ? 'bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800' 
                                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 border border-transparent'
                                }`}
                            >
                                <span className="truncate max-w-[150px] md:max-w-none">{subject.title}</span>
                                {activeSubjectId === subject.id && <span className="hidden md:inline-block material-symbols-outlined text-sm">chevron_right</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main: Units & Topics */}
            <div className="flex-1 bg-stone-50 dark:bg-stone-950 overflow-y-auto p-4 md:p-8">
                {activeSubject ? (
                    <div className="max-w-4xl mx-auto pb-20 md:pb-0">
                        <h2 className="text-xl md:text-2xl font-bold text-stone-900 dark:text-white font-display mb-2">{activeSubject.title}</h2>
                        <p className="text-stone-500 dark:text-stone-400 text-xs md:text-sm mb-6 md:mb-8">Plan and generate rigorous deep-dive courses for each topic.</p>

                        <div className="grid gap-4 md:gap-6">
                            {activeSubject.units.map((unit, idx) => (
                                <div 
                                    key={unit.id} 
                                    className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden shadow-sm"
                                >
                                    {/* Unit Header */}
                                    <div className="p-4 md:p-6 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30">
                                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                                            <div className="flex-1">
                                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Unit {idx + 1}</span>
                                                <h3 className="text-base md:text-lg font-bold text-stone-900 dark:text-white mb-2">{unit.title}</h3>
                                                <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-2xl">{unit.description}</p>
                                            </div>
                                            
                                            {(!unit.topics || unit.topics.length === 0) && (
                                                <button
                                                    onClick={() => handlePlanTopics(unit)}
                                                    disabled={unit.status === 'PLANNING_TOPICS'}
                                                    className="w-full md:w-auto shrink-0 px-4 py-3 md:px-6 md:py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-orange-600 dark:hover:bg-orange-500 rounded-lg font-bold uppercase tracking-widest text-[10px] md:text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                                                >
                                                    {unit.status === 'PLANNING_TOPICS' ? (
                                                        <>
                                                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                                            Planning...
                                                        </>
                                                    ) : (
                                                        <>
                                                            Plan Curriculum
                                                            <span className="material-symbols-outlined text-base md:text-lg">architecture</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Topics List */}
                                    {unit.topics && unit.topics.length > 0 && (
                                        <div className="p-3 md:p-4 bg-white dark:bg-stone-900">
                                            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3 ml-2">Deep-Dive Modules</h4>
                                            <div className="grid grid-cols-1 gap-2 md:gap-3">
                                                {unit.topics.map((topic, tIdx) => (
                                                    <div key={topic.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 rounded-lg border border-stone-100 dark:border-stone-800 hover:border-orange-200 dark:hover:border-stone-700 bg-stone-50 dark:bg-stone-950 transition-colors gap-3">
                                                        <div className="flex items-start md:items-center gap-3 md:gap-4">
                                                            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold shrink-0 mt-1 md:mt-0 ${
                                                                topic.status === 'GENERATED' 
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                                                : 'bg-stone-200 dark:bg-stone-800 text-stone-500'
                                                            }`}>
                                                                {topic.status === 'GENERATED' ? <span className="material-symbols-outlined text-sm">check</span> : tIdx + 1}
                                                            </div>
                                                            <div>
                                                                <h5 className="text-sm font-bold text-stone-900 dark:text-white leading-tight mb-1">{topic.title}</h5>
                                                                <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 md:line-clamp-1">{topic.description}</p>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                if (topic.status === 'GENERATED' && topic.courseId) {
                                                                    onOpenUnit(topic.courseId);
                                                                } else {
                                                                    onGenerateTopic(semester.id, activeSubject.id, unit.id, topic);
                                                                }
                                                            }}
                                                            disabled={topic.status === 'GENERATING'}
                                                            className={`w-full md:w-auto px-4 py-2 rounded font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all ${
                                                                topic.status === 'GENERATED'
                                                                ? 'bg-white border border-stone-200 hover:bg-stone-50 text-stone-700'
                                                                : topic.status === 'GENERATING'
                                                                    ? 'text-orange-600 bg-orange-50'
                                                                    : 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm'
                                                            }`}
                                                        >
                                                            {topic.status === 'GENERATED' ? 'Open Class' : topic.status === 'GENERATING' ? 'Building...' : 'Start Class'}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-stone-400">
                        <span className="material-symbols-outlined text-4xl mb-2">topic</span>
                        <p className="text-sm">Select a subject to view units</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default SemesterView;
