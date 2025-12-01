
import React, { useState, useEffect } from 'react';
import { TimeTableDay, ClassSession, DailyLog, Assignment } from '../types';
import { getTimetable, saveDailyLog, saveAssignment } from '../services/storage';
import { generateDailyRecap, extractTextFromImage, extractTextFromPDF, parseAssignment } from '../services/geminiService';

interface DailyCheckinProps {
  onClose: () => void;
  onComplete?: (attendedSubjects: string[]) => void;
  userProfileName?: string;
}

const DailyCheckin: React.FC<DailyCheckinProps> = ({ onClose, onComplete, userProfileName }) => {
  const [step, setStep] = useState(1);
  const [todayClasses, setTodayClasses] = useState<ClassSession[]>([]);
  const [attendedIds, setAttendedIds] = useState<Set<string>>(new Set());
  const [topics, setTopics] = useState<Record<string, string>>({});
  const [newAssignments, setNewAssignments] = useState<Partial<Assignment>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);

  useEffect(() => {
    loadTodaySchedule();
  }, []);

  const loadTodaySchedule = async () => {
    const timetable = await getTimetable();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];
    const todaySchedule = timetable.find(d => d.day === todayName);
    
    if (todaySchedule) {
        setTodayClasses(todaySchedule.classes);
        setAttendedIds(new Set(todaySchedule.classes.map(c => c.id)));
    }
  };

  const toggleAttendance = (id: string) => {
      const next = new Set(attendedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setAttendedIds(next);
  };

  const updateTopic = (id: string, text: string) => {
      setTopics(prev => ({...prev, [id]: text}));
  };

  const handleAddAssignment = () => {
      setNewAssignments([...newAssignments, { title: '', subject: '', dueDate: new Date().toISOString().split('T')[0] }]);
  };

  const updateAssignment = (index: number, field: string, value: string) => {
      const updated = [...newAssignments];
      updated[index] = { ...updated[index], [field]: value };
      setNewAssignments(updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      setIsParsingFile(true);
      try {
          const file = files[0];
          let text = "";
          if (file.type === 'application/pdf') {
              text = await extractTextFromPDF(file);
          } else if (file.type.startsWith('image/')) {
              text = await extractTextFromImage(file);
          }
          
          if (text) {
              const parsed = await parseAssignment(text);
              if (parsed.title) {
                  setNewAssignments(prev => [...prev, parsed]);
              }
          }
      } catch (err) {
          console.error(err);
          alert("Could not read file. Please enter details manually.");
      } finally {
          setIsParsingFile(false);
      }
  };

  const handleFinish = async () => {
    setIsProcessing(true);
    const dateStr = new Date().toISOString().split('T')[0];
    
    for (const assign of newAssignments) {
        if (assign.title && assign.subject) {
            await saveAssignment({
                id: `assign-${Date.now()}-${Math.random()}`,
                title: assign.title,
                subject: assign.subject,
                dueDate: assign.dueDate || dateStr,
                type: (assign.type as any) || 'PROBLEM_SET',
                status: 'PENDING',
                description: assign.description
            });
        }
    }

    const topicValues = Object.values(topics) as string[];
    const validTopics = topicValues.filter(t => t.trim().length > 0);
    if (validTopics.length > 0) {
        try { await generateDailyRecap(validTopics); } catch (e) {}
    }

    const log: DailyLog = {
        date: dateStr,
        attendedClassIds: Array.from(attendedIds),
        topicsCovered: Object.entries(topics).map(([cid, t]) => ({ classId: cid, topic: t as string })),
        recapGenerated: validTopics.length > 0
    };
    await saveDailyLog(log);

    if (onComplete) {
        const attendedSubjectNames = todayClasses
            .filter(c => attendedIds.has(c.id))
            .map(c => c.subjectName);
        onComplete(attendedSubjectNames);
    }

    setIsProcessing(false);
    onClose();
  };

  if (todayClasses.length === 0 && step === 1) {
       return (
           <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
               <div className="bg-white dark:bg-stone-900 p-8 rounded-2xl max-w-sm w-full text-center shadow-xl">
                   <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2">No Classes Today?</h2>
                   <p className="text-stone-500 mb-6 text-sm">Your timetable is empty for today. Set it up to track your learning journey.</p>
                   <button onClick={onClose} className="w-full py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-lg font-bold uppercase tracking-widest text-xs">Skip Check-in</button>
               </div>
           </div>
       )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#fafaf9] dark:bg-[#0c0a09] flex flex-col font-sans transition-colors duration-500 animate-[fadeIn_0.3s_ease-out]">
        
        <div className="h-1 bg-stone-200 dark:bg-stone-800 w-full">
            <div className="h-full bg-orange-600 transition-all duration-500" style={{ width: `${(step/3)*100}%` }}></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-lg">
                
                {step === 1 && (
                    <div className="animate-[slideUp_0.4s_ease-out]">
                        <h1 className="text-3xl font-bold text-stone-900 dark:text-white font-display mb-2">Welcome back, {userProfileName || 'Scholar'}.</h1>
                        <p className="text-stone-500 mb-8">Which classes did you attend today?</p>
                        
                        <div className="space-y-3 mb-8">
                            {todayClasses.map(cls => (
                                <button
                                    key={cls.id}
                                    onClick={() => toggleAttendance(cls.id)}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                                        attendedIds.has(cls.id) 
                                        ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/10' 
                                        : 'border-stone-200 dark:border-stone-800 opacity-60'
                                    }`}
                                >
                                    <div className="text-left">
                                        <div className="font-bold text-stone-900 dark:text-white">{cls.subjectName}</div>
                                        <div className="text-xs text-stone-500">{cls.startTime} - {cls.endTime}</div>
                                    </div>
                                    {attendedIds.has(cls.id) && <span className="material-symbols-outlined text-orange-600">check_circle</span>}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setStep(2)} className="w-full py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full font-bold uppercase tracking-widest text-xs hover:scale-[1.02] transition-transform">Next</button>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-[slideUp_0.4s_ease-out]">
                        <h1 className="text-2xl font-bold text-stone-900 dark:text-white font-display mb-2">What did you learn?</h1>
                        <p className="text-stone-500 mb-8 text-sm">Briefly log topics to generate a recap.</p>
                        
                        <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
                            {todayClasses.filter(c => attendedIds.has(c.id)).map(cls => (
                                <div key={cls.id}>
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">{cls.subjectName}</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Thermodynamics Laws"
                                        className="w-full p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                                        value={topics[cls.id] || ''}
                                        onChange={e => updateTopic(cls.id, e.target.value)}
                                    />
                                </div>
                            ))}
                            {todayClasses.filter(c => attendedIds.has(c.id)).length === 0 && (
                                <p className="text-stone-400 italic">No classes selected. Skip this step.</p>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setStep(1)} className="flex-1 py-4 text-stone-500 font-bold uppercase tracking-widest text-xs">Back</button>
                            <button onClick={() => setStep(3)} className="flex-[2] py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full font-bold uppercase tracking-widest text-xs">Next</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-[slideUp_0.4s_ease-out]">
                        <h1 className="text-2xl font-bold text-stone-900 dark:text-white font-display mb-2">Any Homework?</h1>
                        <p className="text-stone-500 mb-8 text-sm">Scan assignment sheets or add tasks manually.</p>

                        <div className="space-y-4 mb-8">
                             {/* Scan Button */}
                             <div className="relative">
                                 <input 
                                    type="file" 
                                    id="hw-upload" 
                                    accept="image/*, application/pdf"
                                    className="hidden" 
                                    onChange={handleFileUpload}
                                    disabled={isParsingFile}
                                 />
                                 <label 
                                    htmlFor="hw-upload"
                                    className={`w-full py-4 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl flex flex-col items-center justify-center text-stone-500 hover:text-orange-600 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 cursor-pointer transition-all ${isParsingFile ? 'opacity-50' : ''}`}
                                 >
                                     {isParsingFile ? (
                                         <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest animate-pulse">
                                             <span className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></span>
                                             Analyzing Assignment...
                                         </span>
                                     ) : (
                                         <>
                                            <span className="material-symbols-outlined text-2xl mb-1">document_scanner</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Scan / Upload Sheet</span>
                                         </>
                                     )}
                                 </label>
                             </div>

                             {newAssignments.map((assign, idx) => (
                                 <div key={idx} className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl space-y-3 relative">
                                     <button onClick={() => setNewAssignments(p => p.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-stone-300 hover:text-red-500"><span className="material-symbols-outlined text-sm">close</span></button>
                                     <input 
                                        placeholder="Assignment Title"
                                        className="w-full bg-transparent font-bold text-stone-900 dark:text-white outline-none border-b border-transparent focus:border-orange-500 placeholder-stone-400"
                                        value={assign.title}
                                        onChange={e => updateAssignment(idx, 'title', e.target.value)}
                                     />
                                     <div className="flex gap-2">
                                         <input 
                                            placeholder="Subject"
                                            className="flex-1 bg-stone-50 dark:bg-stone-800 rounded p-2 text-xs outline-none text-stone-900 dark:text-white"
                                            value={assign.subject}
                                            onChange={e => updateAssignment(idx, 'subject', e.target.value)}
                                         />
                                         <input 
                                            type="date"
                                            className="flex-1 bg-stone-50 dark:bg-stone-800 rounded p-2 text-xs outline-none text-stone-900 dark:text-white"
                                            value={assign.dueDate}
                                            onChange={e => updateAssignment(idx, 'dueDate', e.target.value)}
                                         />
                                     </div>
                                 </div>
                             ))}
                             
                             <button onClick={handleAddAssignment} className="w-full py-3 border border-stone-200 dark:border-stone-800 text-stone-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                                 + Manual Entry
                             </button>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setStep(2)} className="flex-1 py-4 text-stone-500 font-bold uppercase tracking-widest text-xs">Back</button>
                            <button 
                                onClick={handleFinish}
                                disabled={isProcessing || isParsingFile}
                                className="flex-[2] py-4 bg-orange-600 text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-orange-700 disabled:opacity-50 flex justify-center gap-2"
                            >
                                {isProcessing ? 'Saving...' : 'Complete Check-in'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default DailyCheckin;
