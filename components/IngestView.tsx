
import React, { useState, useEffect } from 'react';
import { CourseRequest, User, Language, CourseMode, CramType } from '../types';
import { extractTextFromPDF } from '../services/geminiService';

interface IngestViewProps {
  user: User | null;
  onStart: (data: CourseRequest) => void;
  onCancel: () => void;
  loadingStatus: string;
  currentTheme: 'light' | 'dark';
}

const LANGUAGES: Language[] = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Portuguese', 'Italian', 'Russian', 'Arabic'];

const IngestView: React.FC<IngestViewProps> = ({ user, onStart, onCancel, loadingStatus }) => {
  const [syllabus, setSyllabus] = useState('');
  const [language, setLanguage] = useState<Language>('English');
  const [mode, setMode] = useState<'SINGLE' | 'SEMESTER'>('SINGLE');
  const [courseMode, setCourseMode] = useState<CourseMode>('VIDEO');
  const [cramHours, setCramHours] = useState(10);
  const [semesterName, setSemesterName] = useState('');
  const [isReadingPdf, setIsReadingPdf] = useState(false);

  useEffect(() => {
      if (user?.profile?.language) setLanguage(user.profile.language);
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setIsReadingPdf(true);
      try {
          let allText = "";
          for (let i = 0; i < files.length; i++) {
              if (files[i].type === 'application/pdf') {
                  const text = await extractTextFromPDF(files[i]);
                  allText += `--- FILE: ${files[i].name} ---\n${text}\n\n`;
              }
          }
          setSyllabus(prev => prev + "\n" + allText);
      } catch (err) { alert("PDF Read Error"); } finally { setIsReadingPdf(false); }
  };

  const handleSubmit = () => {
    if (!syllabus.trim()) return;
    if (mode === 'SEMESTER' && !semesterName.trim()) { alert("Name your semester."); return; }
    onStart({ 
        syllabus, 
        urls: [], 
        level: 'COLLEGE', 
        language,
        pyqContent: '',
        notifyEmail: false, 
        includePYQ: true, 
        maxReels: courseMode === 'CRASH_COURSE' ? Math.max(3, Math.ceil(cramHours * 2)) : 3,
        isSemesterInit: mode === 'SEMESTER',
        semesterName: semesterName,
        mode: courseMode,
        cramConfig: courseMode === 'CRASH_COURSE' ? { hoursLeft: cramHours, type: 'TEACH' } : undefined
    });
  };

  if (loadingStatus) {
    return (
      <div className="h-[100dvh] bg-[#fafaf9] dark:bg-[#0c0a09] flex flex-col items-center justify-center font-sans px-6 text-center">
         <div className="w-12 h-12 border-4 border-stone-200 dark:border-stone-800 border-t-orange-600 rounded-full animate-spin mb-8"></div>
         <h2 className="text-xl font-bold text-stone-900 dark:text-white font-display mb-2">{loadingStatus}</h2>
         <p className="text-sm text-stone-500">This might take a moment.</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#fafaf9] dark:bg-[#0c0a09] font-sans flex flex-col">
      
      {/* Header */}
      <div className="p-6 md:p-8 flex justify-between items-center shrink-0">
          <button onClick={onCancel} className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors">
              Back
          </button>
          <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-stone-400">
              <button onClick={() => setMode('SINGLE')} className={mode === 'SINGLE' ? 'text-orange-600' : 'hover:text-stone-600'}>Single Course</button>
              <span>/</span>
              <button onClick={() => setMode('SEMESTER')} className={mode === 'SEMESTER' ? 'text-orange-600' : 'hover:text-stone-600'}>Semester Plan</button>
          </div>
      </div>

      {/* Main Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
          <div className="w-full max-w-2xl animate-fade-in pb-10">
              
              <div className="mb-10 md:mb-12">
                  <h1 className="text-3xl md:text-5xl font-bold text-stone-900 dark:text-white font-display mb-4 leading-tight">
                      {mode === 'SEMESTER' ? "Architect your Semester." : "What are we learning?"}
                  </h1>
                  <p className="text-stone-500 dark:text-stone-400 text-sm">
                      Paste your syllabus, topics, or upload documents.
                  </p>
              </div>

              <div className="space-y-6 md:space-y-8">
                  {mode === 'SEMESTER' && (
                      <input 
                          type="text" 
                          placeholder="Semester Name (e.g. Fall 2025)"
                          value={semesterName}
                          onChange={e => setSemesterName(e.target.value)}
                          className="w-full py-4 bg-transparent border-b border-stone-200 dark:border-stone-800 text-xl outline-none focus:border-orange-600 text-stone-900 dark:text-white placeholder-stone-300 transition-colors font-display"
                      />
                  )}

                  <div className="relative group">
                      <textarea
                          className="w-full min-h-[150px] md:min-h-[200px] py-4 bg-transparent border-b border-stone-200 dark:border-stone-800 text-lg md:text-xl outline-none focus:border-orange-600 text-stone-900 dark:text-white placeholder-stone-300 transition-colors font-display resize-none"
                          placeholder="Paste content here..."
                          value={syllabus}
                          onChange={(e) => setSyllabus(e.target.value)}
                      />
                      <label className="absolute top-4 right-0 cursor-pointer text-[10px] md:text-xs font-bold uppercase tracking-widest text-orange-600 hover:text-orange-700 transition-colors bg-[#fafaf9] dark:bg-[#0c0a09] pl-2">
                          {isReadingPdf ? 'Reading...' : '+ Upload PDF'}
                          <input type="file" accept="application/pdf" multiple className="hidden" onChange={handleFileUpload} disabled={isReadingPdf} />
                      </label>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8 pt-4">
                       <select 
                          value={language} 
                          onChange={e => setLanguage(e.target.value as Language)}
                          className="bg-transparent text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 dark:hover:text-white outline-none cursor-pointer w-full md:w-auto"
                       >
                           {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                       </select>

                       {mode === 'SINGLE' && (
                           <div className="flex gap-4">
                               <button 
                                  onClick={() => setCourseMode('VIDEO')}
                                  className={`text-xs font-bold uppercase tracking-widest transition-colors ${courseMode === 'VIDEO' ? 'text-orange-600' : 'text-stone-400 hover:text-stone-600'}`}
                               >
                                   Cinematic
                               </button>
                               <button 
                                  onClick={() => setCourseMode('CRASH_COURSE')}
                                  className={`text-xs font-bold uppercase tracking-widest transition-colors ${courseMode === 'CRASH_COURSE' ? 'text-orange-600' : 'text-stone-400 hover:text-stone-600'}`}
                               >
                                   Exam Cram
                               </button>
                           </div>
                       )}
                  </div>

                  <button 
                      onClick={handleSubmit}
                      disabled={!syllabus.trim()}
                      className={`w-full py-4 md:py-5 mt-8 font-bold uppercase tracking-widest text-xs rounded-full transition-all flex items-center justify-center gap-2 ${
                          syllabus.trim() 
                          ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-orange-600 dark:hover:bg-orange-500 hover:text-white dark:hover:text-white hover:shadow-xl' 
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                      }`}
                  >
                      Start Analysis <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
              </div>

          </div>
      </div>
    </div>
  );
};

export default IngestView;
