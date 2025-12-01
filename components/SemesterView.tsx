import React, { useState, useEffect, useMemo } from 'react';
import { Semester, SemesterUnit, SemesterTopic, Assignment, TimeTableDay } from '../types';
import { breakUnitIntoTopics } from '../services/geminiService';

interface SemesterViewProps {
  semester: Semester;
  assignments: Assignment[]; // Passed from parent
  timetable: TimeTableDay[]; // Passed from parent
  onBack: () => void;
  onGenerateUnit: (semesterId: string, subjectId: string, unit: SemesterUnit) => void;
  onGenerateTopic: (semesterId: string, subjectId: string, unitId: string, topic: SemesterTopic) => void;
  onOpenUnit: (courseId: string) => void;
  onUpdateSemester: (semester: Semester) => void;
  onDeleteSemester: (id: string) => void;
  onAddAssignment?: (assignment: Assignment) => void; // New prop
}

type Tab = 'DASHBOARD' | 'SCHEDULE' | 'ACADEMICS' | 'PERFORMANCE';

const SemesterView: React.FC<SemesterViewProps> = ({ semester, assignments, timetable, onBack, onGenerateTopic, onOpenUnit, onUpdateSemester, onDeleteSemester, onAddAssignment }) => {
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
  const [activeSubjectId, setActiveSubjectId] = useState<string>(semester.subjects[0]?.id || '');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusTime, setFocusTime] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Schedule View State
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<Assignment>>({
      type: 'PROBLEM_SET',
      subject: semester.subjects[0]?.title || '',
      dueDate: new Date().toISOString().split('T')[0],
      time: '09:00'
  });

  const activeSubject = semester.subjects.find(s => s.id === activeSubjectId);

  // Stats Calculation
  const totalClasses = semester.subjects.reduce((acc, s) => acc + s.attendance.total, 0);
  const totalAttended = semester.subjects.reduce((acc, s) => acc + s.attendance.attended, 0);
  const overallAttendance = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 100;

  const minAttendance = semester.attendancePolicy?.minPct || 75;
  const attendanceStatus = overallAttendance >= minAttendance ? 'SAFE' : 'DANGER';

  const pendingAssignments = assignments.filter(a => a.status === 'PENDING').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Focus Timer Logic
  useEffect(() => {
      let interval: any;
      if (isTimerRunning && focusTime > 0) {
          interval = setInterval(() => setFocusTime(prev => prev - 1), 1000);
      } else if (focusTime === 0) {
          setIsTimerRunning(false);
          // Play sound or notify
      }
      return () => clearInterval(interval);
  }, [isTimerRunning, focusTime]);

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePlanTopics = async (unit: SemesterUnit) => {
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
      }
  };

  const updateAttendance = (subjectId: string, type: 'PRESENT' | 'ABSENT') => {
      const updatedSem = JSON.parse(JSON.stringify(semester));
      const sub = updatedSem.subjects.find((s: any) => s.id === subjectId);
      if (sub) {
          if (type === 'PRESENT') {
              sub.attendance.attended += 1;
              sub.attendance.total += 1;
          } else if (type === 'ABSENT') {
              sub.attendance.total += 1;
          }
          onUpdateSemester(updatedSem);
      }
  };

  // Grade Calculation for Dashboard
  const overallAvg = semester.subjects.reduce((acc, sub) => {
      // Calculate subject average
      const subjectAssignments = assignments.filter(a => a.subject.toLowerCase() === sub.title.toLowerCase() && a.status === 'COMPLETED' && a.score !== undefined);
      const totalWeight = subjectAssignments.reduce((acc, a) => acc + (a.weight || 1), 0);
      const weightedSum = subjectAssignments.reduce((acc, a) => acc + (a.score || 0) * (a.weight || 1), 0);
      const avg = totalWeight > 0 ? weightedSum / totalWeight : 0;
      return acc + avg;
  }, 0) / (semester.subjects.length || 1);

  // Find Next Actionable Study Item
  const studyRecommendation = useMemo(() => {
      // 1. Find pending topic in High Yield units first
      for (const sub of semester.subjects) {
          const highYield = sub.units.find(u => u.isHighYield && u.topics?.some(t => t.status === 'PENDING' || t.status === 'GENERATED'));
          if (highYield) {
              const topic = highYield.topics?.find(t => t.status === 'GENERATED'); // Ready to learn
              if (topic) return { type: 'TOPIC_READY', title: topic.title, subId: sub.id, unitId: highYield.id, topic, unitTitle: highYield.title };
              const pendingTopic = highYield.topics?.find(t => t.status === 'PENDING'); // Ready to generate
              if (pendingTopic) return { type: 'TOPIC_PENDING', title: pendingTopic.title, subId: sub.id, unitId: highYield.id, topic: pendingTopic, unitTitle: highYield.title };
          }
      }
      // 2. Find any pending unit that needs planning
      for (const sub of semester.subjects) {
          const unit = sub.units.find(u => u.status === 'PENDING');
          if (unit) return { type: 'UNIT_PLAN', title: unit.title, subId: sub.id, unit, subjectName: sub.title };
      }
      return null;
  }, [semester]);

  // Exam Date Helper (Enhanced)
  const getDaysUntil = (dateStr?: string) => {
      if (!dateStr) return null;
      const today = new Date();
      today.setHours(0,0,0,0);
      const target = new Date(dateStr);
      target.setHours(0,0,0,0);
      const diff = target.getTime() - today.getTime();
      return Math.ceil(diff / (1000 * 3600 * 24));
  };

  // Improved Next Exam Logic: Merge manually created EXAM assignments with generic semester dates
  const nextExamInfo = useMemo(() => {
      const manualExams = assignments
          .filter(a => a.type === 'EXAM' && a.status === 'PENDING')
          .map(a => ({ title: a.title, date: a.dueDate }));
      
      const genericExams = [];
      if (semester.midtermStartDate) genericExams.push({ title: 'Midterm', date: semester.midtermStartDate });
      if (semester.finalStartDate) genericExams.push({ title: 'Finals', date: semester.finalStartDate });

      const allExams = [...manualExams, ...genericExams]
          .filter(e => getDaysUntil(e.date)! >= 0) // Only future exams
          .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return allExams[0] || null;
  }, [assignments, semester]);

  const daysToNextExam = nextExamInfo ? getDaysUntil(nextExamInfo.date) : null;

  // -- SCHEDULE HELPERS --
  const weekDates = useMemo(() => {
      const dates = [];
      const current = new Date(scheduleDate);
      // Start 2 days before
      current.setDate(current.getDate() - 2);
      for(let i=0; i<7; i++) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
      }
      return dates;
  }, [scheduleDate]);

  const handleSaveEvent = () => {
      if (!newEvent.title || !newEvent.subject) return;
      if (onAddAssignment) {
          const assign: Assignment = {
              id: `assign-${Date.now()}`,
              title: newEvent.title,
              subject: newEvent.subject,
              dueDate: newEvent.dueDate || new Date().toISOString().split('T')[0],
              time: newEvent.time,
              type: newEvent.type as any,
              status: 'PENDING',
              description: newEvent.description
          };
          onAddAssignment(assign);
      }
      setIsAddingEvent(false);
      setNewEvent({ type: 'PROBLEM_SET', subject: semester.subjects[0]?.title || '', dueDate: new Date().toISOString().split('T')[0], time: '09:00' });
  };

  const getDayName = (date: Date) => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()];

  return (
    <div className="h-[100dvh] w-full bg-[#fafaf9] dark:bg-[#0c0a09] font-sans flex flex-col animate-fade-in transition-colors duration-500">
        
        {/* Modern Minimal Header */}
        <header className="px-6 md:px-12 py-8 flex flex-col md:flex-row md:items-end justify-between shrink-0 bg-[#fafaf9] dark:bg-[#0c0a09] z-20">
            <div>
                <button onClick={onBack} className="flex items-center gap-2 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors mb-4 group">
                    <span className="material-symbols-rounded text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Dashboard</span>
                </button>
                <h1 className="text-4xl md:text-5xl font-display font-bold text-stone-900 dark:text-white leading-tight">
                    {semester.title}
                </h1>
                {semester.university && <p className="text-stone-500 text-sm mt-1 font-medium">{semester.university}</p>}
            </div>

            <div className="flex flex-col items-start md:items-end mt-6 md:mt-0 gap-4">
                 <div className="flex gap-2">
                     <button 
                        onClick={() => setIsFocusMode(true)}
                        className="px-6 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-lg flex items-center gap-2"
                     >
                         <span className="material-symbols-rounded text-base">timer</span>
                         Focus
                     </button>
                     <button 
                        onClick={() => onDeleteSemester(semester.id)}
                        className="w-10 h-10 rounded-full border border-stone-200 dark:border-stone-800 text-stone-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-colors" 
                        title="Delete Semester"
                     >
                        <span className="material-symbols-rounded">delete</span>
                    </button>
                 </div>
                 <div className="flex gap-6 text-xs font-bold uppercase tracking-widest text-stone-400">
                     <span className="hover:text-stone-900 dark:hover:text-white cursor-pointer transition-colors" onClick={() => setActiveTab('DASHBOARD')} style={{ opacity: activeTab === 'DASHBOARD' ? 1 : 0.5, textDecoration: activeTab === 'DASHBOARD' ? 'underline' : 'none', textUnderlineOffset: '4px' }}>Overview</span>
                     <span className="hover:text-stone-900 dark:hover:text-white cursor-pointer transition-colors" onClick={() => setActiveTab('SCHEDULE')} style={{ opacity: activeTab === 'SCHEDULE' ? 1 : 0.5, textDecoration: activeTab === 'SCHEDULE' ? 'underline' : 'none', textUnderlineOffset: '4px' }}>Schedule</span>
                     <span className="hover:text-stone-900 dark:hover:text-white cursor-pointer transition-colors" onClick={() => setActiveTab('ACADEMICS')} style={{ opacity: activeTab === 'ACADEMICS' ? 1 : 0.5, textDecoration: activeTab === 'ACADEMICS' ? 'underline' : 'none', textUnderlineOffset: '4px' }}>Academics</span>
                     <span className="hover:text-stone-900 dark:hover:text-white cursor-pointer transition-colors" onClick={() => setActiveTab('PERFORMANCE')} style={{ opacity: activeTab === 'PERFORMANCE' ? 1 : 0.5, textDecoration: activeTab === 'PERFORMANCE' ? 'underline' : 'none', textUnderlineOffset: '4px' }}>Grades</span>
                 </div>
            </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-20 custom-scrollbar">
            <div className="max-w-7xl mx-auto py-6">
                
                {activeTab === 'DASHBOARD' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-min animate-fade-in">
                        
                        {/* 1. HERO CARD: NEXT ACTION */}
                        <div className="md:col-span-8 bg-white dark:bg-stone-900 rounded-[2rem] p-8 md:p-12 shadow-sm border border-stone-100 dark:border-stone-800 relative overflow-hidden group min-h-[300px] flex flex-col justify-between">
                             <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Current Priority</span>
                                </div>
                                
                                {studyRecommendation ? (
                                    <>
                                        <h2 className="text-4xl md:text-6xl font-display font-bold text-stone-900 dark:text-white leading-tight mb-4">
                                            {studyRecommendation.type === 'TOPIC_READY' ? 'Continue Learning' : 'Prepare Material'}
                                        </h2>
                                        <p className="text-lg text-stone-500 dark:text-stone-400 font-medium max-w-lg mb-8">
                                            {studyRecommendation.title}
                                            <span className="block text-sm opacity-60 mt-1">{studyRecommendation.unitTitle || studyRecommendation.subjectName}</span>
                                        </p>
                                        
                                        <button 
                                            onClick={() => {
                                                if (studyRecommendation.type === 'TOPIC_READY' || studyRecommendation.type === 'TOPIC_PENDING') {
                                                    if (studyRecommendation.topic?.courseId) onOpenUnit(studyRecommendation.topic.courseId);
                                                    else onGenerateTopic(semester.id, studyRecommendation.subId, studyRecommendation.unitId!, studyRecommendation.topic!);
                                                } else if (studyRecommendation.type === 'UNIT_PLAN') {
                                                    setActiveSubjectId(studyRecommendation.subId);
                                                    setActiveTab('ACADEMICS');
                                                }
                                            }}
                                            className="px-8 py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full flex items-center gap-4 hover:scale-105 transition-transform w-fit"
                                        >
                                            <span className="text-xs font-bold uppercase tracking-widest">
                                                {studyRecommendation.type === 'TOPIC_READY' ? 'Start Session' : 'Generate'}
                                            </span>
                                            <span className="material-symbols-rounded">arrow_forward</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-4xl md:text-5xl font-display font-bold text-stone-900 dark:text-white leading-tight mb-4">You're caught up.</h2>
                                        <p className="text-lg text-stone-500 dark:text-stone-400">Everything looks good. Take a break or review old material.</p>
                                    </>
                                )}
                             </div>
                             
                             {/* Abstract decoration */}
                             <div className="absolute right-[-10%] top-[-10%] w-[40%] h-[120%] bg-gradient-to-l from-stone-50 to-transparent dark:from-stone-800/50 pointer-events-none rounded-l-[100px]"></div>
                        </div>

                        {/* 2. EXAM COUNTDOWN (NEW FEATURE) */}
                        <div className="md:col-span-4 grid grid-rows-2 gap-6">
                             {/* Attendance Widget */}
                             <div className="bg-white dark:bg-stone-900 rounded-[2rem] p-8 shadow-sm border border-stone-100 dark:border-stone-800 flex flex-col justify-between relative overflow-hidden">
                                <div className="flex justify-between items-start z-10">
                                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Attendance</span>
                                    <div className={`w-2 h-2 rounded-full ${attendanceStatus === 'SAFE' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                </div>
                                <div className="text-right z-10">
                                    <span className="text-5xl font-display font-bold text-stone-900 dark:text-white tracking-tighter block">{overallAttendance}%</span>
                                    <span className="text-xs text-stone-400">Aggregate</span>
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-stone-100 dark:bg-stone-800">
                                    <div className={`h-full ${attendanceStatus === 'SAFE' ? 'bg-stone-900 dark:bg-white' : 'bg-red-500'}`} style={{ width: `${Math.min(100, overallAttendance)}%` }}></div>
                                </div>
                             </div>

                             {/* Exam Countdown Widget */}
                             <div className="bg-stone-900 dark:bg-white rounded-[2rem] p-8 shadow-sm flex flex-col justify-between text-white dark:text-stone-900 relative overflow-hidden">
                                 {nextExamInfo ? (
                                     <>
                                        <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Up Next: {nextExamInfo.title}</span>
                                        <div>
                                            <span className="text-5xl font-display font-bold tracking-tighter">{daysToNextExam}</span>
                                            <span className="text-sm opacity-60 ml-2">{daysToNextExam === 1 ? 'day' : 'days'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs opacity-50 uppercase tracking-widest">{new Date(nextExamInfo.date).toLocaleDateString()}</div>
                                            {daysToNextExam !== null && daysToNextExam <= 7 && (
                                                <button className="bg-white/20 hover:bg-white/30 text-white dark:bg-stone-900/10 dark:text-stone-900 p-2 rounded-full transition-colors" title="Prepare Now">
                                                    <span className="material-symbols-rounded text-sm">school</span>
                                                </button>
                                            )}
                                        </div>
                                     </>
                                 ) : (
                                     <div className="flex items-center justify-center h-full opacity-50 text-sm font-bold uppercase tracking-widest">No Exams Scheduled</div>
                                 )}
                             </div>
                        </div>

                        {/* 3. SUBJECTS (BENTO GRID) */}
                        <div className="md:col-span-12">
                            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6 ml-1">Subjects & Progress</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {semester.subjects.map(subject => {
                                    const totalUnits = subject.units.length || 1;
                                    const startedUnits = subject.units.filter(u => u.status === 'TOPICS_READY' || u.topics?.some(t => t.status === 'GENERATED')).length;
                                    const progress = Math.round((startedUnits / totalUnits) * 100);

                                    return (
                                        <button 
                                            key={subject.id} 
                                            onClick={() => { setActiveSubjectId(subject.id); setActiveTab('ACADEMICS'); }} 
                                            className="bg-white dark:bg-stone-900 rounded-[1.5rem] p-6 text-left border border-stone-100 dark:border-stone-800 hover:border-orange-200 dark:hover:border-stone-600 hover:shadow-lg transition-all group flex flex-col h-40 justify-between"
                                        >
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-display font-bold text-stone-900 dark:text-white text-xl line-clamp-1">{subject.title}</h3>
                                                <span className="material-symbols-rounded text-stone-300 group-hover:text-orange-500 transition-colors">arrow_outward</span>
                                            </div>
                                            
                                            <div>
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">
                                                    <span>{startedUnits} / {totalUnits} Units</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <div className="w-full h-0.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-stone-900 dark:bg-white group-hover:bg-orange-600 transition-colors" style={{ width: `${progress}%` }}></div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                                {/* Add Subject Button Placeholder */}
                                <button className="rounded-[1.5rem] border-2 border-dashed border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-300 hover:text-stone-500 hover:border-stone-400 transition-colors h-40">
                                    <span className="material-symbols-rounded text-3xl">add</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'SCHEDULE' && (
                    <div className="max-w-3xl mx-auto animate-fade-in">
                        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-6 mb-8">
                             <div>
                                <h2 className="text-3xl font-display font-bold text-stone-900 dark:text-white">Planner</h2>
                                <p className="text-stone-500 text-sm mt-1">Manage your academic timeline.</p>
                             </div>
                             <button 
                                onClick={() => setIsAddingEvent(true)}
                                className="px-5 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-opacity"
                             >
                                 <span className="material-symbols-rounded text-base">add</span>
                                 Add Event
                             </button>
                        </div>

                        {/* Calendar Strip */}
                        <div className="flex gap-2 overflow-x-auto pb-6 mb-6 no-scrollbar snap-x">
                            {weekDates.map((d, i) => {
                                const isSelected = d.toDateString() === scheduleDate.toDateString();
                                const isToday = d.toDateString() === new Date().toDateString();
                                return (
                                    <button 
                                        key={i}
                                        onClick={() => setScheduleDate(d)}
                                        className={`snap-center shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-center transition-all ${
                                            isSelected 
                                            ? 'bg-orange-600 text-white shadow-lg scale-105' 
                                            : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-500 hover:border-orange-400'
                                        }`}
                                    >
                                        <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}</span>
                                        <span className="text-xl font-display font-bold">{d.getDate()}</span>
                                        {isToday && <span className="w-1 h-1 rounded-full bg-current mt-1"></span>}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="space-y-8">
                            {/* Classes Section */}
                            <div>
                                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-rounded text-sm">schedule</span>
                                    Classes
                                </h3>
                                <div className="space-y-4">
                                    {timetable.find(d => d.day === getDayName(scheduleDate) as any)?.classes.map(cls => (
                                        <div key={cls.id} className="flex gap-4 group">
                                            <div className="w-16 pt-3 text-right">
                                                <span className="block font-bold text-stone-900 dark:text-white text-sm">{cls.startTime}</span>
                                                <span className="text-xs text-stone-500">{cls.endTime}</span>
                                            </div>
                                            <div className="flex-1 bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-100 dark:border-stone-800 shadow-sm flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-stone-900 dark:text-white">{cls.subjectName}</h4>
                                                    <p className="text-xs text-stone-500">{cls.room || 'No Room'}</p>
                                                </div>
                                                <div className="w-1 h-8 rounded-full" style={{ backgroundColor: cls.color }}></div>
                                            </div>
                                        </div>
                                    )) || <p className="text-sm text-stone-400 italic pl-20">No classes scheduled.</p>}
                                </div>
                            </div>

                            {/* Assignments & Exams Section */}
                            <div>
                                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-rounded text-sm">event_note</span>
                                    Deadlines & Exams
                                </h3>
                                <div className="space-y-4">
                                    {assignments.filter(a => new Date(a.dueDate).toDateString() === scheduleDate.toDateString()).map(a => (
                                        <div key={a.id} className="flex gap-4">
                                            <div className="w-16 pt-3 text-right">
                                                {a.time ? (
                                                    <span className="block font-bold text-stone-900 dark:text-white text-sm">{a.time}</span>
                                                ) : (
                                                    <span className="block font-bold text-stone-900 dark:text-white text-sm">Due</span>
                                                )}
                                            </div>
                                            <div className={`flex-1 p-4 rounded-xl border shadow-sm flex justify-between items-center ${
                                                a.type === 'EXAM' 
                                                ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' 
                                                : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800'
                                            }`}>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className={`font-bold ${a.type === 'EXAM' ? 'text-red-700 dark:text-red-400' : 'text-stone-900 dark:text-white'}`}>{a.title}</h4>
                                                        {a.type === 'EXAM' && <span className="bg-red-100 text-red-700 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest">Exam</span>}
                                                    </div>
                                                    <p className="text-xs text-stone-500">{a.subject} • {a.type.replace('_', ' ')}</p>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${a.status === 'COMPLETED' ? 'bg-green-500 border-green-500 text-white' : 'border-stone-300'}`}>
                                                    {a.status === 'COMPLETED' && <span className="material-symbols-rounded text-sm">check</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {assignments.filter(a => new Date(a.dueDate).toDateString() === scheduleDate.toDateString()).length === 0 && (
                                        <p className="text-sm text-stone-400 italic pl-20">No deadlines for this day.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'PERFORMANCE' && (
                     <div className="animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Overall Summary Card */}
                            {semester.targetGoal && (
                                <div className="bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-[2rem] p-8 flex flex-col justify-between min-h-[250px]">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Target GPA / %</span>
                                        <div className="text-6xl font-display font-bold mt-4 tracking-tighter">{semester.targetGoal}</div>
                                    </div>
                                    <div className="mt-8">
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                                            <span className="opacity-60">Current Avg</span>
                                            <span>{Math.round(overallAvg)}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/20 dark:bg-black/10 rounded-full">
                                            <div 
                                                className="h-full bg-white dark:bg-black rounded-full transition-all duration-1000" 
                                                style={{ width: `${Math.min(100, (overallAvg / semester.targetGoal) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {semester.subjects.map(subject => {
                                const subjectAssignments = assignments.filter(a => a.subject.toLowerCase() === subject.title.toLowerCase() && a.status === 'COMPLETED' && a.score !== undefined);
                                const totalWeight = subjectAssignments.reduce((acc, a) => acc + (a.weight || 1), 0);
                                const weightedSum = subjectAssignments.reduce((acc, a) => acc + (a.score || 0) * (a.weight || 1), 0);
                                const average = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
                                const hasGrades = subjectAssignments.length > 0;

                                return (
                                    <div key={subject.id} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2rem] p-8 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="font-bold text-stone-900 dark:text-white text-xl font-display">{subject.title}</h3>
                                            </div>
                                            <div className="text-5xl font-display font-bold text-stone-900 dark:text-white tracking-tighter">{hasGrades ? average : '--'}%</div>
                                        </div>
                                        
                                        <div className="mt-8 space-y-3">
                                            {subjectAssignments.slice(0, 3).map(a => (
                                                <div key={a.id} className="flex justify-between text-xs border-b border-stone-100 dark:border-stone-800 pb-2">
                                                    <span className="text-stone-500 truncate max-w-[150px]">{a.title}</span>
                                                    <span className="font-bold text-stone-900 dark:text-white">{a.score}</span>
                                                </div>
                                            ))}
                                            {!hasGrades && <span className="text-xs text-stone-400 italic">No grades recorded</span>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                     </div>
                )}

                {activeTab === 'ACADEMICS' && (
                    <div className="flex flex-col md:flex-row gap-12 animate-fade-in min-h-[60vh]">
                        {/* Clean Sidebar List */}
                        <div className="w-full md:w-64 shrink-0">
                            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Course Material</h3>
                            <div className="flex overflow-x-auto md:flex-col gap-2 pb-4 md:pb-0">
                                {semester.subjects.map(subject => (
                                    <button
                                        key={subject.id}
                                        onClick={() => setActiveSubjectId(subject.id)}
                                        className={`shrink-0 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all flex items-center justify-between group ${
                                            activeSubjectId === subject.id 
                                            ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900' 
                                            : 'text-stone-500 hover:bg-white dark:hover:bg-stone-900'
                                        }`}
                                    >
                                        {subject.title}
                                        {activeSubjectId === subject.id && <span className="material-symbols-rounded text-base">chevron_right</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Detail View */}
                        <div className="flex-1">
                            {activeSubject ? (
                                <div className="space-y-12">
                                    <div className="flex justify-between items-end border-b border-stone-200 dark:border-stone-800 pb-6">
                                        <div>
                                            <h2 className="text-4xl font-display font-bold text-stone-900 dark:text-white mb-2">{activeSubject.title}</h2>
                                            <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-stone-500">
                                                <span>{activeSubject.units.length} Units</span>
                                                <span>{activeSubject.attendance.attended}/{activeSubject.attendance.total} Attended</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => updateAttendance(activeSubject.id, 'PRESENT')}
                                                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-green-100 hover:text-green-700 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
                                            >
                                                Mark Present
                                            </button>
                                            <button 
                                                onClick={() => updateAttendance(activeSubject.id, 'ABSENT')}
                                                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-red-100 hover:text-red-700 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
                                            >
                                                Mark Absent
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-12">
                                        {activeSubject.units.map((unit, idx) => (
                                            <div key={unit.id} className="relative pl-6 border-l border-stone-200 dark:border-stone-800">
                                                <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-stone-300 dark:bg-stone-700"></div>
                                                
                                                <div className="flex items-baseline gap-4 mb-4">
                                                    <span className="text-xs font-bold text-stone-300 uppercase tracking-widest">Unit 0{idx + 1}</span>
                                                    <h3 className="text-xl font-bold text-stone-900 dark:text-white">{unit.title}</h3>
                                                    {unit.isHighYield && <span className="bg-orange-100 text-orange-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">High Yield</span>}
                                                </div>
                                                
                                                <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed mb-6 max-w-3xl">
                                                    {unit.description}
                                                </p>

                                                {/* Topics Grid */}
                                                {unit.topics && unit.topics.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {unit.topics.map((topic) => (
                                                            <button
                                                                key={topic.id}
                                                                onClick={() => {
                                                                    if (topic.status === 'GENERATED' && topic.courseId) {
                                                                        onOpenUnit(topic.courseId);
                                                                    } else {
                                                                        onGenerateTopic(semester.id, activeSubject.id, unit.id, topic);
                                                                    }
                                                                }}
                                                                disabled={topic.status === 'GENERATING'}
                                                                className={`group p-4 rounded-xl text-left border transition-all ${
                                                                    topic.status === 'GENERATED' 
                                                                    ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-green-400' 
                                                                    : 'bg-transparent border-dashed border-stone-300 dark:border-stone-700 hover:border-orange-400 hover:bg-white dark:hover:bg-stone-900'
                                                                }`}
                                                            >
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${topic.status === 'GENERATED' ? 'text-green-600' : 'text-stone-400'}`}>
                                                                        {topic.status === 'GENERATED' ? 'Complete' : topic.status === 'GENERATING' ? 'Generating...' : 'Not Started'}
                                                                    </span>
                                                                    <span className="material-symbols-rounded text-lg text-stone-300 group-hover:text-stone-900 dark:group-hover:text-white transition-colors">
                                                                        {topic.status === 'GENERATED' ? 'play_circle' : 'add_circle'}
                                                                    </span>
                                                                </div>
                                                                <span className="text-sm font-bold text-stone-900 dark:text-white line-clamp-1 group-hover:underline decoration-stone-300 underline-offset-4">{topic.title}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => handlePlanTopics(unit)}
                                                        disabled={unit.status === 'PLANNING_TOPICS'}
                                                        className="px-6 py-3 border border-stone-200 dark:border-stone-800 rounded-full text-xs font-bold text-stone-500 uppercase tracking-widest hover:bg-stone-900 hover:text-white dark:hover:bg-white dark:hover:text-stone-900 transition-all"
                                                    >
                                                        {unit.status === 'PLANNING_TOPICS' ? 'Architecting...' : 'Generate Curriculum'}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-stone-400">
                                    <p>Select a subject to view details.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Add Event Modal */}
        {isAddingEvent && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
                <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-2xl animate-[slideUp_0.3s_ease-out]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-stone-900 dark:text-white font-display">Schedule Event</h2>
                        <button onClick={() => setIsAddingEvent(false)} className="text-stone-400 hover:text-stone-900 dark:hover:text-white"><span className="material-symbols-rounded">close</span></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Title</label>
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="e.g. Calculus Midterm" 
                                className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                                value={newEvent.title || ''}
                                onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Subject</label>
                                <select 
                                    className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                                    value={newEvent.subject}
                                    onChange={e => setNewEvent({...newEvent, subject: e.target.value})}
                                >
                                    {semester.subjects.map(s => <option key={s.id} value={s.title}>{s.title}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Type</label>
                                <select 
                                    className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                                    value={newEvent.type}
                                    onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
                                >
                                    <option value="EXAM">Exam 🔴</option>
                                    <option value="PROBLEM_SET">Assignment</option>
                                    <option value="PROJECT">Project</option>
                                    <option value="ESSAY">Essay</option>
                                    <option value="QUIZ">Quiz</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Date</label>
                                <input 
                                    type="date" 
                                    className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                                    value={newEvent.dueDate}
                                    onChange={e => setNewEvent({...newEvent, dueDate: e.target.value})}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Time</label>
                                <input 
                                    type="time" 
                                    className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                                    value={newEvent.time}
                                    onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button 
                                onClick={handleSaveEvent}
                                disabled={!newEvent.title}
                                className="w-full py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-orange-600 dark:hover:bg-orange-500 transition-colors disabled:opacity-50"
                            >
                                Schedule {newEvent.type === 'EXAM' ? 'Exam' : 'Task'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Focus Timer Overlay */}
        {isFocusMode && (
            <div className="fixed inset-0 z-50 bg-[#fafaf9] dark:bg-[#0c0a09] flex flex-col items-center justify-center p-6 animate-fade-in">
                <div className="text-center mb-12">
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-6 block">Deep Work Session</span>
                    <div className="text-9xl font-display font-bold text-stone-900 dark:text-white tracking-tighter mb-8 tabular-nums">
                        {formatTime(focusTime)}
                    </div>
                    <div className="flex gap-6 justify-center">
                        <button 
                            onClick={() => setIsTimerRunning(!isTimerRunning)}
                            className="px-8 py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                        >
                            {isTimerRunning ? 'Pause' : 'Start'}
                        </button>
                        <button 
                            onClick={() => { setFocusTime(25*60); setIsTimerRunning(false); }}
                            className="px-8 py-4 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                </div>
                <button onClick={() => setIsFocusMode(false)} className="absolute top-8 right-8 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors">
                    <span className="material-symbols-rounded text-4xl">close</span>
                </button>
            </div>
        )}

    </div>
  );
};

export default SemesterView;