import React, { useState, useEffect } from 'react';
import { CourseRequest, User, Language, CourseMode, CramType, GradingSchema, ExamWeight } from '../types';
import { extractTextFromPDF, extractTextFromImage } from '../services/geminiService';
import { GRADING_PRESETS, EXAM_STRUCTURE_PRESETS } from '../services/collegePresets';

interface IngestViewProps {
  user: User | null;
  onStart: (data: CourseRequest) => void;
  onCancel: () => void;
  loadingStatus: string;
  currentTheme: 'light' | 'dark';
  initialMode: 'SINGLE' | 'SEMESTER';
  initialSubMode?: 'VIDEO' | 'CRASH_COURSE';
}

const LANGUAGES: Language[] = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Portuguese', 'Italian', 'Russian', 'Arabic'];

const IngestView: React.FC<IngestViewProps> = ({ user, onStart, onCancel, loadingStatus, initialMode, initialSubMode }) => {
  const [mode, setMode] = useState<'SINGLE' | 'SEMESTER'>(initialMode);
  
  // -- SINGLE COURSE STATE --
  const [syllabus, setSyllabus] = useState('');
  const [language, setLanguage] = useState<Language>('English');
  const [courseMode, setCourseMode] = useState<CourseMode>(initialSubMode || 'VIDEO');
  const [cramHours, setCramHours] = useState(10);

  // -- SEMESTER WIZARD STATE --
  const [step, setStep] = useState(1);
  const [semesterName, setSemesterName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [midtermDate, setMidtermDate] = useState('');
  const [finalDate, setFinalDate] = useState('');
  
  const [examFormat, setExamFormat] = useState<'WRITTEN' | 'MCQ' | 'PROJECT_BASED' | 'ORAL' | 'HYBRID' | 'ONLINE'>('WRITTEN');
  
  const [location, setLocation] = useState('');
  const [calendarText, setCalendarText] = useState('');

  const [targetGoal, setTargetGoal] = useState<string>(''); 
  const [selectedPreset, setSelectedPreset] = useState<string>('US_STD');
  const [university, setUniversity] = useState('');
  const [examStructure, setExamStructure] = useState<ExamWeight[]>(EXAM_STRUCTURE_PRESETS['STANDARD']);
  
  const [attendMinPct, setAttendMinPct] = useState<string>('75');
  const [attendType, setAttendType] = useState<'PER_SUBJECT' | 'AGGREGATE'>('PER_SUBJECT');

  const [subjectInput, setSubjectInput] = useState('');
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  
  const [timetableText, setTimetableText] = useState('');
  
  const [subjectSyllabi, setSubjectSyllabi] = useState<Record<string, string>>({});
  const [subjectPyqs, setSubjectPyqs] = useState<Record<string, string>>({});
  const [syllabusText, setSyllabusText] = useState(''); 
  const [pyqText, setPyqText] = useState(''); 
  
  const [isReadingFile, setIsReadingFile] = useState(false);

  useEffect(() => {
      if (user?.profile?.language) setLanguage(user.profile.language);
      if (user?.profile?.institution) setUniversity(user.profile.institution);
      if (user?.profile?.location) setLocation(user.profile.location);
      
      const month = new Date().getMonth();
      const year = new Date().getFullYear();
      let semName = "";
      if (month >= 7) semName = `Fall ${year}`;
      else if (month >= 0 && month <= 4) semName = `Spring ${year}`;
      else semName = `Summer ${year}`;
      setSemesterName(semName);

  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetSetter: React.Dispatch<React.SetStateAction<string>>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setIsReadingFile(true);
      try {
          let allText = "";
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              if (file.type === 'application/pdf') {
                  const text = await extractTextFromPDF(file);
                  allText += `--- FILE: ${file.name} ---\n${text}\n\n`;
              } else if (file.type.startsWith('image/')) {
                  const text = await extractTextFromImage(file);
                  allText += `--- IMAGE: ${file.name} ---\n${text}\n\n`;
              }
          }
          targetSetter(prev => prev + "\n" + allText);
      } catch (err) { 
          console.error(err);
          alert("Error reading file. Ensure you have an API key if using images."); 
      } finally { 
          setIsReadingFile(false); 
      }
  };

  const handleSingleSubmit = () => {
    if (!syllabus.trim()) return;
    onStart({ 
        syllabus, 
        urls: [], 
        level: 'COLLEGE', 
        language,
        pyqContent: '',
        notifyEmail: false, 
        includePYQ: true, 
        maxReels: courseMode === 'CRASH_COURSE' ? Math.max(3, Math.ceil(cramHours * 2)) : 3,
        isSemesterInit: false,
        mode: courseMode,
        cramConfig: courseMode === 'CRASH_COURSE' ? { hoursLeft: cramHours, type: 'TEACH' } : undefined
    });
  };

  const handleSemesterSubmit = () => {
      let aggregatedSyllabus = "";
      subjectsList.forEach(sub => {
          if (subjectSyllabi[sub]) {
              aggregatedSyllabus += `\n=== SYLLABUS FOR SUBJECT: ${sub} ===\n${subjectSyllabi[sub]}\n`;
          }
      });
      if (syllabusText) aggregatedSyllabus += `\n=== BULK SYLLABUS DUMP ===\n${syllabusText}\n`;

      let aggregatedPyqs = "";
      subjectsList.forEach(sub => {
          if (subjectPyqs[sub]) {
              aggregatedPyqs += `\n=== PYQS FOR SUBJECT: ${sub} ===\n${subjectPyqs[sub]}\n`;
          }
      });
      if (pyqText) aggregatedPyqs += `\n=== BULK PYQ DUMP ===\n${pyqText}\n`;

      const combinedSyllabus = `
        SEMESTER_NAME: ${semesterName}
        
        === ACADEMIC CALENDAR & DATES ===
        Start: ${startDate}
        End: ${endDate}
        Midterms: ${midtermDate}
        Finals: ${finalDate}
        Location: ${location}
        Exam Format: ${examFormat}
        
        Calendar File Content:
        ${calendarText}

        === GOALS & GRADING ===
        Target Goal: ${targetGoal}
        University: ${university}
        Grading System: ${GRADING_PRESETS[selectedPreset].name}
        Exam Structure: ${JSON.stringify(examStructure)}
        Attendance Requirement: ${attendMinPct}% (${attendType})

        === SUBJECTS LIST ===
        ${subjectsList.join(', ')}
        
        === TIMETABLE ===
        ${timetableText}
        
        === SYLLABUS DOCUMENTS ===
        ${aggregatedSyllabus}
        
        === PREVIOUS YEAR QUESTIONS (PYQs) ===
        ${aggregatedPyqs}
      `;

      onStart({
          syllabus: combinedSyllabus,
          urls: [],
          level: 'COLLEGE',
          language,
          notifyEmail: false,
          includePYQ: !!aggregatedPyqs,
          maxReels: 0,
          isSemesterInit: true,
          semesterName: semesterName,
          semesterStartDate: startDate,
          semesterEndDate: endDate,
          semesterMidtermDate: midtermDate,
          semesterFinalDate: finalDate,
          semesterExamFormat: examFormat,
          semesterLocation: location,
          semesterGoal: parseFloat(targetGoal) || 0,
          semesterUniversity: university,
          semesterGradingSchema: GRADING_PRESETS[selectedPreset],
          semesterExamStructure: examStructure,
          semesterAttendancePolicy: {
              minPct: parseFloat(attendMinPct) || 75,
              type: attendType
          },
          mode: 'VIDEO'
      });
  };

  const nextStep = () => {
      setStep(prev => prev + 1);
  };
  const prevStep = () => setStep(prev => prev - 1);

  const handlePerSubjectUpload = async (e: React.ChangeEvent<HTMLInputElement>, subject: string, type: 'SYLLABUS' | 'PYQ') => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setIsReadingFile(true);
      try {
          let text = "";
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              if (file.type === 'application/pdf') {
                  text += await extractTextFromPDF(file);
              } else if (file.type.startsWith('image/')) {
                  text += await extractTextFromImage(file);
              }
          }
          if (type === 'SYLLABUS') {
              setSubjectSyllabi(prev => ({ ...prev, [subject]: (prev[subject] || "") + text }));
          } else {
              setSubjectPyqs(prev => ({ ...prev, [subject]: (prev[subject] || "") + text }));
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsReadingFile(false);
      }
  };

  const handleSubjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = subjectInput.trim().replace(',', '');
          if (val && !subjectsList.includes(val)) {
              setSubjectsList([...subjectsList, val]);
              setSubjectInput('');
          }
      }
  };

  const addSuggestedSubject = (sub: string) => {
      if (!subjectsList.includes(sub)) {
          setSubjectsList([...subjectsList, sub]);
      }
  };

  const removeSubject = (sub: string) => {
      setSubjectsList(prev => prev.filter(s => s !== sub));
  };

  if (loadingStatus) {
    return (
      <div className="h-[100dvh] bg-[#fafaf9] dark:bg-[#0c0a09] flex flex-col items-center justify-center font-sans px-6 text-center">
         <div className="w-12 h-12 border-4 border-stone-200 dark:border-stone-800 border-t-orange-600 rounded-full animate-spin mb-8"></div>
         <h2 className="text-xl font-bold text-stone-900 dark:text-white font-display mb-2">{loadingStatus}</h2>
         <p className="text-sm text-stone-500">Building your academic dashboard...</p>
      </div>
    );
  }

  if ((mode as string) === 'SEMESTER') {
      return (
        <div className="h-[100dvh] w-full bg-[#fafaf9] dark:bg-[#0c0a09] font-sans flex flex-col">
            <div className="p-6 md:p-8 flex justify-between items-center shrink-0 border-b border-stone-100 dark:border-stone-800">
                <button onClick={onCancel} className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors">
                    Back
                </button>
                <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Semester Setup</span>
                     <div className="flex gap-1">
                         {[1,2,3,4,5,6].map(i => (
                             <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= step ? 'bg-orange-600' : 'bg-stone-200 dark:bg-stone-800'}`}></div>
                         ))}
                     </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col items-center p-6 md:p-12">
                <div className="w-full max-w-2xl animate-fade-in">
                    
                    {step === 1 && (
                        <div>
                            <h1 className="text-3xl font-bold text-stone-900 dark:text-white font-display mb-2">Let's set the timeline.</h1>
                            <p className="text-stone-500 mb-8">We'll use this to calculate your attendance goals and finding holidays.</p>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Term / Semester Name</label>
                                    <input 
                                        autoFocus
                                        type="text" 
                                        placeholder="e.g. Fall 2025"
                                        value={semesterName}
                                        onChange={e => setSemesterName(e.target.value)}
                                        className="w-full py-3 bg-transparent border-b border-stone-200 dark:border-stone-800 text-xl outline-none focus:border-orange-600 text-stone-900 dark:text-white font-display"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Start Date</label>
                                        <input 
                                            type="date" 
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="w-full py-3 bg-transparent border-b border-stone-200 dark:border-stone-800 text-lg outline-none focus:border-orange-600 text-stone-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">End Date</label>
                                        <input 
                                            type="date" 
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="w-full py-3 bg-transparent border-b border-stone-200 dark:border-stone-800 text-lg outline-none focus:border-orange-600 text-stone-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Institution Location</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. New York, USA (for Holiday search)"
                                        value={location}
                                        onChange={e => setLocation(e.target.value)}
                                        className="w-full py-3 bg-transparent border-b border-stone-200 dark:border-stone-800 text-lg outline-none focus:border-orange-600 text-stone-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="mt-12 flex justify-end">
                                <button onClick={nextStep} disabled={!semesterName.trim()} className="px-8 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold uppercase tracking-widest text-xs rounded-full disabled:opacity-50">Next</button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h1 className="text-3xl font-bold text-stone-900 dark:text-white font-display mb-2">Define your goal.</h1>
                            <p className="text-stone-500 mb-8">What are you aiming for this term?</p>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">School / Institution Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Stanford, Lincoln High"
                                        value={university}
                                        onChange={e => setUniversity(e.target.value)}
                                        className="w-full py-3 bg-transparent border-b border-stone-200 dark:border-stone-800 text-lg outline-none focus:border-orange-600 text-stone-900 dark:text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Target Score / GPA</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. 4.0 or 95"
                                            value={targetGoal}
                                            onChange={e => setTargetGoal(e.target.value)}
                                            className="w-full py-3 bg-transparent border-b border-stone-200 dark:border-stone-800 text-lg outline-none focus:border-orange-600 text-stone-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Attendance Target %</label>
                                        <input 
                                            type="number" 
                                            placeholder="75"
                                            value={attendMinPct}
                                            onChange={e => setAttendMinPct(e.target.value)}
                                            className="w-full py-3 bg-transparent border-b border-stone-200 dark:border-stone-800 text-lg outline-none focus:border-orange-600 text-stone-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-12 flex justify-between">
                                <button onClick={prevStep} className="px-8 py-3 text-stone-500 font-bold uppercase tracking-widest text-xs">Back</button>
                                <button onClick={nextStep} className="px-8 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full font-bold uppercase tracking-widest text-xs">Next</button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <h1 className="text-3xl font-bold text-stone-900 dark:text-white font-display mb-2">Subjects?</h1>
                            <p className="text-stone-500 mb-8">List the subjects you are taking.</p>
                            <input 
                                type="text"
                                placeholder="Type subject and press Enter..."
                                value={subjectInput}
                                onChange={e => setSubjectInput(e.target.value)}
                                onKeyDown={handleSubjectKeyDown}
                                className="w-full py-3 bg-transparent border-b border-stone-200 dark:border-stone-800 text-lg outline-none focus:border-orange-600 text-stone-900 dark:text-white mb-6"
                            />
                            <div className="flex flex-wrap gap-2">
                                {subjectsList.map(sub => (
                                    <span key={sub} className="px-3 py-1 bg-stone-100 dark:bg-stone-800 rounded-full text-sm font-bold flex items-center gap-2">
                                        {sub}
                                        <button onClick={() => removeSubject(sub)} className="hover:text-red-500"><span className="material-symbols-outlined text-sm">close</span></button>
                                    </span>
                                ))}
                            </div>
                            <div className="mt-12 flex justify-between">
                                <button onClick={prevStep} className="px-8 py-3 text-stone-500 font-bold uppercase tracking-widest text-xs">Back</button>
                                <button onClick={nextStep} className="px-8 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full font-bold uppercase tracking-widest text-xs">Next</button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div>
                            <h1 className="text-3xl font-bold text-stone-900 dark:text-white font-display mb-2">Timetable?</h1>
                            <p className="text-stone-500 mb-8">Paste your class schedule text here if you have it.</p>
                            <textarea 
                                className="w-full h-40 bg-transparent border border-stone-200 dark:border-stone-800 rounded-xl p-4 outline-none focus:border-orange-600 text-stone-900 dark:text-white resize-none"
                                placeholder="e.g. Mon 9am Math, Tue 10am Physics..."
                                value={timetableText}
                                onChange={e => setTimetableText(e.target.value)}
                            />
                            <div className="mt-12 flex justify-between">
                                <button onClick={prevStep} className="px-8 py-3 text-stone-500 font-bold uppercase tracking-widest text-xs">Back</button>
                                <button onClick={nextStep} className="px-8 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full font-bold uppercase tracking-widest text-xs">Next</button>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div>
                            <h1 className="text-3xl font-bold text-stone-900 dark:text-white font-display mb-2">Syllabus Upload.</h1>
                            <p className="text-stone-500 mb-8">Upload PDFs for specific subjects if you have them.</p>
                            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {subjectsList.map(sub => (
                                    <div key={sub} className="flex items-center justify-between p-4 border border-stone-200 dark:border-stone-800 rounded-xl">
                                        <span className="font-bold text-stone-900 dark:text-white">{sub}</span>
                                        <div className="flex gap-2">
                                            <label className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-orange-600 hover:underline">
                                                {subjectSyllabi[sub] ? 'Updated' : '+ Syllabus'}
                                                <input type="file" className="hidden" onChange={(e) => handlePerSubjectUpload(e, sub, 'SYLLABUS')} />
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-12 flex justify-between">
                                <button onClick={prevStep} className="px-8 py-3 text-stone-500 font-bold uppercase tracking-widest text-xs">Back</button>
                                <button onClick={nextStep} className="px-8 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full font-bold uppercase tracking-widest text-xs">Next</button>
                            </div>
                        </div>
                    )}

                    {step === 6 && (
                        <div>
                            <h1 className="text-3xl font-bold text-stone-900 dark:text-white font-display mb-2">Ready to Architect?</h1>
                            <p className="text-stone-500 mb-8">We will build your academic dashboard now.</p>
                            <div className="bg-stone-50 dark:bg-stone-900 p-6 rounded-2xl mb-8">
                                <p className="text-sm font-bold mb-2">Summary:</p>
                                <ul className="text-xs text-stone-500 space-y-1">
                                    <li>Term: {semesterName}</li>
                                    <li>Goal: {targetGoal || 'N/A'}</li>
                                    <li>Subjects: {subjectsList.length}</li>
                                </ul>
                            </div>
                            <div className="mt-12 flex justify-between">
                                <button onClick={prevStep} className="px-8 py-3 text-stone-500 font-bold uppercase tracking-widest text-xs">Back</button>
                                <button onClick={handleSemesterSubmit} className="px-8 py-3 bg-orange-600 text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-orange-700 shadow-lg">Finish & Build</button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#fafaf9] dark:bg-[#0c0a09] font-sans flex flex-col transition-colors duration-500">
      <div className="p-6 md:p-8 flex justify-between items-center shrink-0">
          <button onClick={onCancel} className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors">
              Back
          </button>
          
          <div className="flex bg-stone-200 dark:bg-stone-800 rounded-full p-1 relative">
               <button 
                  onClick={() => setMode('SINGLE')} 
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'SINGLE' ? 'bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500'}`}
               >
                   Quick Course
               </button>
               <button 
                  onClick={() => setMode('SEMESTER')} 
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'SEMESTER' ? 'bg-white dark:bg-stone-600 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500'}`}
               >
                   Term Plan
               </button>
          </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
          <div className="w-full max-w-2xl animate-fade-in pb-10">
              
              <div className="mb-10 md:mb-12">
                  <h1 className="text-3xl md:text-5xl font-bold text-stone-900 dark:text-white font-display mb-4 leading-tight">
                      What are we learning?
                  </h1>
                  <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed max-w-lg">
                      Turn any topic, PDF, or text into a personalized video course.
                  </p>
              </div>

              <div className="space-y-6 md:space-y-8">
                  <div className="relative group">
                      <textarea
                          className="w-full min-h-[150px] md:min-h-[200px] py-4 bg-transparent border-b border-stone-200 dark:border-stone-800 text-lg md:text-xl outline-none focus:border-orange-600 text-stone-900 dark:text-white placeholder-stone-300 transition-colors font-display resize-none leading-relaxed"
                          placeholder="Paste content here..."
                          value={syllabus}
                          onChange={(e) => setSyllabus(e.target.value)}
                      />
                      <label className="absolute top-4 right-0 cursor-pointer text-[10px] md:text-xs font-bold uppercase tracking-widest text-orange-600 hover:text-orange-700 transition-colors bg-[#fafaf9] dark:bg-[#0c0a09] pl-2">
                          {isReadingFile ? 'Reading...' : '+ Upload PDF / Image'}
                          <input type="file" accept="application/pdf, image/*" multiple className="hidden" onChange={(e) => handleFileUpload(e, setSyllabus)} disabled={isReadingFile} />
                      </label>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8 pt-4">
                       <div className="flex flex-col">
                           <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Language</label>
                           <select 
                              value={language} 
                              onChange={e => setLanguage(e.target.value as Language)}
                              className="bg-transparent text-sm font-bold text-stone-900 dark:text-white outline-none cursor-pointer w-full md:w-auto"
                           >
                               {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                           </select>
                       </div>

                       <div className="flex gap-4">
                           <button 
                              onClick={() => setCourseMode('VIDEO')}
                              className={`flex flex-col items-start gap-1 p-2 rounded-lg transition-colors border ${courseMode === 'VIDEO' ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/10' : 'border-transparent hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                           >
                               <span className={`text-[10px] font-bold uppercase tracking-widest ${courseMode === 'VIDEO' ? 'text-orange-700 dark:text-orange-500' : 'text-stone-500'}`}>Smart Video</span>
                           </button>
                           <button 
                              onClick={() => setCourseMode('CRASH_COURSE')}
                              className={`flex flex-col items-start gap-1 p-2 rounded-lg transition-colors border ${courseMode === 'CRASH_COURSE' ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/10' : 'border-transparent hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                           >
                               <span className={`text-[10px] font-bold uppercase tracking-widest ${courseMode === 'CRASH_COURSE' ? 'text-orange-700 dark:text-orange-500' : 'text-stone-500'}`}>Exam Cram</span>
                           </button>
                       </div>
                  </div>

                  <button 
                      onClick={handleSingleSubmit}
                      disabled={!syllabus.trim()}
                      className={`w-full py-4 md:py-5 mt-8 font-bold uppercase tracking-widest text-xs rounded-full transition-all flex items-center justify-center gap-2 ${
                          syllabus.trim() 
                          ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-orange-600 dark:hover:bg-orange-500 hover:text-white dark:hover:text-white hover:shadow-xl' 
                          : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
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