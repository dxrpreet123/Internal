
import React, { useState, useEffect, useRef } from 'react';
import { Assignment } from '../types';
import { saveAssignment, getAllAssignments, deleteAssignment } from '../services/storage';
import { generateAssignmentHelp, extractTextFromImage, extractTextFromPDF, parseAssignment, analyzeAssignmentStrategy } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface AssignmentViewProps {
  onBack: () => void;
}

const AssignmentView: React.FC<AssignmentViewProps> = ({ onBack }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  // Strategy Analysis
  const [strategicInsights, setStrategicInsights] = useState<Record<string, string>>({});
  const [analyzingSubject, setAnalyzingSubject] = useState<string | null>(null);

  // AI Help / Teach Mode
  const [activeHelpId, setActiveHelpId] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  // Grading Modal State
  const [gradingAssignmentId, setGradingAssignmentId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState({ score: '', maxScore: '100' });

  const [newAssign, setNewAssign] = useState<Partial<Assignment>>({
      title: '',
      subject: '',
      dueDate: new Date().toISOString().split('T')[0],
      time: '09:00',
      type: 'PROBLEM_SET',
      status: 'PENDING'
  });

  const helpContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
      // Render Math in help content
      if (aiResponse && helpContentRef.current && (window as any).renderMathInElement) {
           setTimeout(() => {
               if (helpContentRef.current) {
                   (window as any).renderMathInElement(helpContentRef.current, {
                        delimiters: [
                            {left: '$$', right: '$$', display: true},
                            {left: '$', right: '$', display: false},
                            {left: '\\(', right: '\\)', display: false},
                            {left: '\\[', right: '\\]', display: true}
                        ],
                        throwOnError: false
                   });
               }
           }, 50);
      }
  }, [aiResponse]);

  const loadAssignments = async () => {
    const data = await getAllAssignments();
    setAssignments(data.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setIsParsing(true);
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
              setNewAssign(prev => ({ ...prev, ...parsed }));
          }
      } catch (err) {
          console.error(err);
          alert("Failed to read file.");
      } finally {
          setIsParsing(false);
      }
  };

  const handleSave = async () => {
      if (!newAssign.title || !newAssign.subject) return;
      const assignment: Assignment = {
          id: `assign-${Date.now()}`,
          title: newAssign.title!,
          subject: newAssign.subject!,
          dueDate: newAssign.dueDate!,
          time: newAssign.time,
          type: (newAssign.type as any) || 'PROBLEM_SET',
          status: 'PENDING',
          description: newAssign.description
      };
      await saveAssignment(assignment);
      setAssignments(prev => [...prev, assignment].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
      setIsAdding(false);
      setNewAssign({ title: '', subject: '', dueDate: new Date().toISOString().split('T')[0], time: '09:00', type: 'PROBLEM_SET', status: 'PENDING' });
  };

  const initGrading = (id: string) => {
      setGradingAssignmentId(id);
      setGradeInput({ score: '', maxScore: '100' });
  };

  const submitGrade = async () => {
      if (!gradingAssignmentId) return;
      const assign = assignments.find(a => a.id === gradingAssignmentId);
      if (assign) {
          assign.status = 'COMPLETED';
          assign.score = parseFloat(gradeInput.score) || 0;
          assign.maxScore = parseFloat(gradeInput.maxScore) || 100;
          await saveAssignment(assign);
          setAssignments([...assignments]);
      }
      setGradingAssignmentId(null);
  };

  const handleStatusToggle = async (id: string) => {
      const assign = assignments.find(a => a.id === id);
      if (assign) {
          if (assign.status === 'COMPLETED') {
              assign.status = 'PENDING';
              assign.score = undefined;
              await saveAssignment(assign);
              setAssignments([...assignments]);
          } else {
              initGrading(id);
          }
      }
  };

  const handleDelete = async (id: string) => {
      await deleteAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const handleGetHelp = async (assignment: Assignment) => {
      setActiveHelpId(assignment.id);
      setAiResponse(null);
      setIsAiThinking(true);
      try {
          const help = await generateAssignmentHelp(assignment);
          setAiResponse(help);
      } catch (e) {
          setAiResponse("Sorry, I couldn't generate help right now.");
      } finally {
          setIsAiThinking(false);
      }
  };

  // New Feature: Analyze Strategy per Subject
  const handleAnalyzeStrategy = async (subject: string) => {
      setAnalyzingSubject(subject);
      const subjectAssignments = assignments.filter(a => a.subject === subject);
      if (subjectAssignments.length === 0) return;

      try {
          const insight = await analyzeAssignmentStrategy(subjectAssignments);
          setStrategicInsights(prev => ({ ...prev, [subject]: insight }));
      } catch (e) {
          console.error(e);
      } finally {
          setAnalyzingSubject(null);
      }
  };

  // Group assignments by subject
  const subjects: string[] = Array.from(new Set(assignments.map(a => a.subject)));

  return (
    <div className="fixed inset-0 bg-[#fafaf9] dark:bg-[#0c0a09] z-50 flex flex-col font-sans transition-colors duration-500">
        
        <div className="px-6 py-4 flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shrink-0">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500">
                    <span className="material-symbols-rounded">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-stone-900 dark:text-white font-display">Assignment Center</h1>
            </div>
            <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
                <span className="material-symbols-rounded text-sm">add</span>
                <span className="hidden md:inline">New Task</span>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-12">
                
                {/* Assignments Grouped by Subject */}
                {subjects.length === 0 ? (
                     <div className="text-center py-20">
                        <span className="material-symbols-rounded text-6xl text-stone-200 dark:text-stone-800 mb-4">assignment_add</span>
                        <h2 className="text-xl font-bold text-stone-900 dark:text-white">No Assignments Yet</h2>
                        <p className="text-stone-500 dark:text-stone-400">Add tasks or scan assignment sheets to get started.</p>
                     </div>
                ) : (
                    subjects.map(subject => {
                        const subjectAssignments = assignments.filter(a => a.subject === subject);
                        const hasPending = subjectAssignments.some(a => a.status === 'PENDING');
                        
                        return (
                            <div key={subject} className="bg-white dark:bg-stone-900 rounded-3xl p-6 md:p-8 border border-stone-200 dark:border-stone-800 shadow-sm">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold font-display text-stone-900 dark:text-white mb-1">{subject}</h2>
                                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                                            {subjectAssignments.length} Tasks
                                        </p>
                                    </div>
                                    
                                    {/* Strategy Button */}
                                    {subjectAssignments.length >= 2 && (
                                        <button 
                                            onClick={() => handleAnalyzeStrategy(subject)}
                                            disabled={analyzingSubject === subject}
                                            className="px-4 py-2 bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-orange-100 transition-colors flex items-center gap-2"
                                        >
                                            {analyzingSubject === subject ? <span className="animate-spin material-symbols-rounded text-sm">refresh</span> : <span className="material-symbols-rounded text-sm">query_stats</span>}
                                            {analyzingSubject === subject ? 'Thinking...' : 'Analyze Pattern'}
                                        </button>
                                    )}
                                </div>

                                {/* Insight Box */}
                                {strategicInsights[subject] && (
                                    <div className="mb-8 p-6 bg-stone-50 dark:bg-stone-800 rounded-2xl border-l-4 border-orange-500 animate-fade-in">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-rounded text-orange-500">lightbulb</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Orbis Strategic Insight</span>
                                        </div>
                                        <p className="text-sm font-medium text-stone-900 dark:text-white leading-relaxed italic">
                                            "{strategicInsights[subject]}"
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {subjectAssignments.map(a => (
                                        <div key={a.id} className={`group p-4 rounded-xl border transition-all ${a.status === 'COMPLETED' ? 'bg-stone-50 dark:bg-stone-950 border-stone-100 dark:border-stone-800 opacity-70' : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 hover:border-orange-300'}`}>
                                            <div className="flex flex-col md:flex-row gap-4 justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className={`font-bold text-lg ${a.status === 'COMPLETED' ? 'text-stone-500 line-through' : 'text-stone-900 dark:text-white'}`}>{a.title}</h3>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                                                            a.type === 'ESSAY' ? 'bg-blue-50 text-blue-600' :
                                                            a.type === 'PROBLEM_SET' ? 'bg-purple-50 text-purple-600' :
                                                            a.type === 'EXAM' ? 'bg-red-50 text-red-600' :
                                                            'bg-green-50 text-green-600'
                                                        }`}>{a.type.replace('_', ' ')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-stone-400 font-medium">
                                                        <span className="flex items-center gap-1">
                                                            <span className="material-symbols-rounded text-sm">calendar_today</span>
                                                            {new Date(a.dueDate).toLocaleDateString()} {a.time && ` @ ${a.time}`}
                                                        </span>
                                                        {a.score !== undefined && <span className="text-green-600">Score: {a.score}/{a.maxScore}</span>}
                                                    </div>
                                                    {a.status === 'PENDING' && (
                                                        <div className="mt-4 flex gap-2">
                                                            <button 
                                                                onClick={() => handleGetHelp(a)}
                                                                className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-rounded text-sm">school</span>
                                                                Teach Me
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 self-start md:self-center">
                                                    <button onClick={() => handleDelete(a.id)} className="p-2 text-stone-300 hover:text-red-500 transition-colors"><span className="material-symbols-rounded">delete</span></button>
                                                    <button 
                                                        onClick={() => handleStatusToggle(a.id)}
                                                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${a.status === 'COMPLETED' ? 'bg-green-500 border-green-500 text-white' : 'border-stone-300 text-transparent hover:border-orange-500'}`}
                                                    >
                                                        <span className="material-symbols-rounded text-sm">check</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}

            </div>
        </div>

        {isAdding && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end md:items-center justify-center p-4">
                <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl p-6 md:p-8 shadow-2xl animate-[slideUp_0.3s_ease-out]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-stone-900 dark:text-white font-display">New Assignment</h2>
                        
                        <div className="relative">
                             <input 
                                type="file" 
                                id="modal-upload"
                                accept="image/*, application/pdf"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={isParsing}
                             />
                             <label 
                                htmlFor="modal-upload"
                                className={`flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/10 text-orange-600 rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-orange-100 transition-colors ${isParsing ? 'opacity-50' : ''}`}
                             >
                                 {isParsing ? 'Parsing...' : 'Scan File'}
                                 <span className="material-symbols-rounded text-sm">upload_file</span>
                             </label>
                        </div>
                    </div>

                    <div className="space-y-5">
                         <div>
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">Title</label>
                            <input 
                                autoFocus
                                className="w-full p-4 bg-stone-50 dark:bg-stone-950 border-none rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 dark:text-white placeholder-stone-300"
                                placeholder="e.g. Calculus Midterm Prep"
                                value={newAssign.title}
                                onChange={e => setNewAssign({...newAssign, title: e.target.value})}
                            />
                         </div>
                         <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">Subject</label>
                                <input 
                                    className="w-full p-4 bg-stone-50 dark:bg-stone-950 border-none rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 dark:text-white"
                                    placeholder="e.g. Math"
                                    value={newAssign.subject}
                                    onChange={e => setNewAssign({...newAssign, subject: e.target.value})}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">Type</label>
                                <select 
                                    className="w-full p-4 bg-stone-50 dark:bg-stone-950 border-none rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 dark:text-white"
                                    value={newAssign.type}
                                    onChange={e => setNewAssign({...newAssign, type: e.target.value as any})}
                                >
                                    {['PROBLEM_SET', 'ESSAY', 'PROJECT', 'READING', 'EXAM', 'QUIZ'].map(t => (
                                        <option key={t} value={t}>{t.replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>
                         </div>
                         <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">Due Date</label>
                                <input 
                                    type="date"
                                    className="w-full p-4 bg-stone-50 dark:bg-stone-950 border-none rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 dark:text-white"
                                    value={newAssign.dueDate}
                                    onChange={e => setNewAssign({...newAssign, dueDate: e.target.value})}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">Time</label>
                                <input 
                                    type="time"
                                    className="w-full p-4 bg-stone-50 dark:bg-stone-950 border-none rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 dark:text-white"
                                    value={newAssign.time}
                                    onChange={e => setNewAssign({...newAssign, time: e.target.value})}
                                />
                            </div>
                         </div>
                         <div>
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5">Details (Optional)</label>
                            <textarea 
                                className="w-full p-4 bg-stone-50 dark:bg-stone-950 border-none rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 dark:text-white min-h-[100px]"
                                placeholder="Paste question text or details here..."
                                value={newAssign.description}
                                onChange={e => setNewAssign({...newAssign, description: e.target.value})}
                            />
                         </div>
                         <div className="flex gap-3 pt-4">
                            <button onClick={() => setIsAdding(false)} className="flex-1 py-4 text-stone-500 font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800">Cancel</button>
                            <button onClick={handleSave} disabled={!newAssign.title} className="flex-1 py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold uppercase tracking-widest text-xs rounded-xl hover:opacity-90 disabled:opacity-50">Save Task</button>
                         </div>
                    </div>
                </div>
            </div>
        )}

        {gradingAssignmentId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
                <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl p-8 shadow-2xl animate-fade-in text-center">
                    <span className="material-symbols-rounded text-4xl text-green-500 mb-4">military_tech</span>
                    <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2">Assignment Complete!</h2>
                    <p className="text-stone-500 text-sm mb-6">Enter your score to track your grades.</p>
                    
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <div className="w-24">
                            <input 
                                type="number" 
                                autoFocus
                                className="w-full text-center text-3xl font-bold bg-stone-50 dark:bg-stone-950 border-b-2 border-orange-500 rounded-t-lg p-2 outline-none text-stone-900 dark:text-white"
                                placeholder="85"
                                value={gradeInput.score}
                                onChange={e => setGradeInput({...gradeInput, score: e.target.value})}
                            />
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mt-1">Score</span>
                        </div>
                        <span className="text-2xl text-stone-300">/</span>
                        <div className="w-24">
                            <input 
                                type="number" 
                                className="w-full text-center text-3xl font-bold bg-transparent border-b-2 border-stone-200 dark:border-stone-800 p-2 outline-none text-stone-400"
                                value={gradeInput.maxScore}
                                onChange={e => setGradeInput({...gradeInput, maxScore: e.target.value})}
                            />
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mt-1">Total</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button onClick={submitGrade} className="w-full py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold uppercase tracking-widest text-xs rounded-xl hover:opacity-90">
                            Save Grade
                        </button>
                        <button onClick={() => { submitGrade(); setGradingAssignmentId(null); }} className="text-stone-400 text-xs font-bold uppercase tracking-widest hover:text-stone-900 dark:hover:text-white transition-colors">
                            Skip
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeHelpId && (
            <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="w-full max-w-2xl h-[80vh] bg-white dark:bg-stone-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.2s_ease-out]">
                    <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-800/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full flex items-center justify-center">
                                <span className="material-symbols-rounded">smart_toy</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-stone-900 dark:text-white">Orbis Teaching Assistant</h2>
                                <p className="text-xs text-stone-500">I can explain this assignment and give you hints.</p>
                            </div>
                        </div>
                        <button onClick={() => setActiveHelpId(null)} className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"><span className="material-symbols-rounded">close</span></button>
                    </div>
                    
                    <div ref={helpContentRef} className="flex-1 overflow-y-auto p-6 md:p-8 bg-white dark:bg-stone-900">
                        {isAiThinking ? (
                            <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-4">
                                <div className="w-12 h-12 border-4 border-stone-200 dark:border-stone-800 border-t-orange-600 rounded-full animate-spin"></div>
                                <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Analyzing...</p>
                            </div>
                        ) : aiResponse ? (
                            <div className="prose dark:prose-invert max-w-none text-sm">
                                <ReactMarkdown 
                                    components={{
                                        strong: ({node, ...props}) => <span className="font-bold text-stone-900 dark:text-white" {...props} />,
                                        code: ({node, ...props}) => <code className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded text-orange-600 dark:text-orange-400 font-mono text-xs" {...props} />
                                    }}
                                >
                                    {aiResponse}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-stone-400">
                                <span className="material-symbols-rounded text-6xl mb-4 opacity-20">psychology</span>
                                <p className="text-sm">Ready to help.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

export default AssignmentView;
