
import React, { useEffect, useState, useMemo } from 'react';
import { Course, User, UserProfile, Semester, DailyInsight, TimeTableDay, Assignment } from '../types';
import { getDailyLog } from '../services/storage';
import { generateDailyInsight } from '../services/geminiService';
import DailyCheckin from './DailyCheckin';
import FlashcardOverlay from './FlashcardOverlay';
import TutorialOverlay, { TutorialStep } from './TutorialOverlay';

interface DashboardProps {
  user: User | null;
  courses: Course[];
  semesters?: Semester[];
  timetable: TimeTableDay[];
  assignments: Assignment[];
  onCreateNew: () => void;
  onStartSemester?: () => void;
  onStartCourse?: () => void;
  onSelectCourse: (courseId: string) => void;
  onSelectSemester?: (semester: Semester) => void;
  onDeleteCourse: (courseId: string) => void; 
  onSignOut: () => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
  onUpdateProfile?: (profile: UserProfile) => void; 
  onOpenTimetable: () => void;
  onOpenAssignments: () => void;
  onUpgrade: () => void;
  onReviewSubject?: (subject: string) => void;
  onOpenTutor?: () => void;
}

type DashboardView = 'FOCUS' | 'COURSES' | 'SEMESTERS' | 'TUTOR';

// --- TUTORIAL CONFIG ---
const TUTORIAL_STEPS: TutorialStep[] = [
    {
        target: '',
        title: 'Welcome to Orbis',
        content: 'Your smart academic autopilot. Orbis turns your syllabus into video courses, plans your semester, and helps you study efficiently. Let\'s take a quick tour.'
    },
    {
        target: 'insight-card',
        title: 'Daily Intelligence',
        content: 'This card is your daily compass. It analyzes your schedule and assignments to tell you exactly what your "vibe" is today—whether to focus hard or recover.'
    },
    {
        target: 'quick-actions',
        title: 'Command Center',
        content: 'Quickly access your timetable, assignments, or create new content from here. This is your operational hub.'
    },
    {
        target: 'create-course-btn',
        title: 'Generate Magic',
        content: 'Have a PDF or a topic? Click here to turn it into a TikTok-style video course instantly. No more boring reading.'
    },
    {
        target: 'semesters-widget',
        title: 'Academic Architect',
        content: 'Plan your entire term here. Track attendance, calculate grades, and manage your subjects in one place.'
    }
];

// --- WIDGET COMPONENTS ---

const CourseCard: React.FC<{ course: Course; onSelectCourse: (id: string) => void }> = ({ course, onSelectCourse }) => (
    <div 
        onClick={() => onSelectCourse(course.id)}
        className="group relative aspect-[4/5] md:aspect-[4/5] w-full rounded-[2rem] overflow-hidden cursor-pointer border border-stone-200 dark:border-stone-800 hover:border-orange-500/50 dark:hover:border-orange-500/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 bg-white dark:bg-stone-900"
    >
        <div className="absolute inset-0 bg-stone-200 dark:bg-stone-800 overflow-hidden">
            {course.thumbnailUri ? (
                <img 
                    src={course.thumbnailUri} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" 
                    alt={course.title} 
                    loading="lazy"
                    decoding="async"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-100 dark:bg-stone-800">
                    <span className="material-symbols-rounded text-6xl text-stone-300 dark:text-stone-700 group-hover:scale-110 transition-transform">image</span>
                </div>
            )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/95 via-stone-900/50 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute inset-0 p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-white group-hover:bg-white/20 transition-colors">
                    {course.level}
                </span>
                {course.completedReels === course.totalReels && (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg animate-fade-in">
                        <span className="material-symbols-rounded text-sm">check</span>
                    </div>
                )}
            </div>
            <div className="transform transition-transform duration-500 group-hover:translate-x-1">
                <h3 className="text-xl font-bold text-white font-display leading-tight mb-3 drop-shadow-lg line-clamp-2">
                    {course.title}
                </h3>
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                        <div className="h-full bg-orange-500 transition-all duration-1000 ease-out" style={{ width: `${(course.completedReels / (course.totalReels || 1)) * 100}%` }}></div>
                    </div>
                    <span className="text-[10px] text-stone-300 font-bold uppercase tracking-widest tabular-nums">
                        {Math.round((course.completedReels / (course.totalReels || 1)) * 100)}%
                    </span>
                </div>
            </div>
        </div>
    </div>
);

const CreateCourseCard: React.FC<{ onStartCourse?: () => void }> = ({ onStartCourse }) => (
    <div 
        onClick={onStartCourse}
        data-tour="create-course-btn"
        className="aspect-[4/5] md:aspect-[4/5] w-full rounded-[2rem] border-2 border-dashed border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center text-stone-400 hover:text-stone-900 dark:hover:text-white hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all duration-300 cursor-pointer group bg-transparent"
    >
        <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-white dark:group-hover:bg-stone-700 transition-all shadow-sm">
            <span className="material-symbols-rounded text-3xl group-hover:text-orange-500 transition-colors">add</span>
        </div>
        <span className="text-xs font-bold uppercase tracking-widest group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">New Course</span>
    </div>
);

const SemestersWidget: React.FC<{ 
    semesters: Semester[], 
    onStartSemester?: () => void, 
    onSelectSemester?: (sem: Semester) => void 
}> = ({ semesters, onStartSemester, onSelectSemester }) => {
    return (
        <div data-tour="semesters-widget" className="bg-white dark:bg-stone-900 rounded-[2.5rem] p-6 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col h-full relative overflow-hidden justify-between">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-stone-900 dark:text-white font-display">Semesters</h3>
                <button onClick={onStartSemester} className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 hover:text-orange-600 transition-colors">
                    <span className="material-symbols-rounded text-lg">add</span>
                </button>
            </div>

            <div className="flex-1 flex flex-col gap-3">
                {semesters.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                        <span className="material-symbols-rounded text-4xl text-stone-300 dark:text-stone-700 mb-3">architecture</span>
                        <p className="text-xs text-stone-400 mb-4">No active semester.</p>
                        <button onClick={onStartSemester} className="px-6 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full text-[10px] font-bold uppercase tracking-widest">
                            Start Plan
                        </button>
                    </div>
                ) : (
                    semesters.slice(0, 3).map(sem => (
                        <button 
                            key={sem.id}
                            onClick={() => onSelectSemester && onSelectSemester(sem)}
                            className="flex items-center justify-between p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors group text-left"
                        >
                            <div>
                                <h4 className="font-bold text-sm text-stone-900 dark:text-white line-clamp-1">{sem.title}</h4>
                                <p className="text-[10px] text-stone-500">{sem.subjects.length} Subjects</p>
                            </div>
                            <span className="material-symbols-rounded text-stone-300 group-hover:text-orange-500 transition-colors text-lg">chevron_right</span>
                        </button>
                    ))
                )}
            </div>
        </div>
    )
}

const Dashboard: React.FC<DashboardProps> = ({ user, courses, semesters = [], timetable, assignments, onCreateNew, onStartSemester, onStartCourse, onSelectCourse, onSelectSemester, onDeleteCourse, onSignOut, onToggleTheme, currentTheme, onUpdateProfile, onOpenTimetable, onOpenAssignments, onUpgrade, onReviewSubject, onOpenTutor }) => {
  const [activeView, setActiveView] = useState<DashboardView>('FOCUS');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [flashcardCourse, setFlashcardCourse] = useState<Course | null>(null);
  
  const [dailyInsight, setDailyInsight] = useState<DailyInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  
  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);

  const { activeCourses } = useMemo(() => {
      const active: Course[] = [];
      courses.forEach(course => {
          if (course.deletedAt) return;
          active.push(course);
      });
      active.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
      return { activeCourses: active };
  }, [courses]);

  const isPro = user?.tier === 'PRO';
  const xp = user?.profile?.xp || 0;
  const firstName = user?.name?.split(' ')[0]?.toUpperCase() || 'GUEST';

  useEffect(() => {
      refreshWidgetData();
      fetchDailyInsight();
      
      // Tutorial Check Logic
      const isGuest = user?.id === 'guest';
      if (isGuest) {
          const done = localStorage.getItem('orbis_guest_tutorial_completed');
          if (!done) setShowTutorial(true);
      } else {
          if (user && user.profile && !user.profile.tutorialCompleted) {
              setShowTutorial(true);
          }
      }
  }, [user]);

  const handleTutorialComplete = () => {
      setShowTutorial(false);
      if (user?.id === 'guest') {
          localStorage.setItem('orbis_guest_tutorial_completed', 'true');
      } else if (onUpdateProfile && user?.profile) {
          onUpdateProfile({ ...user.profile, tutorialCompleted: true });
      }
  };

  const refreshWidgetData = async () => {
      const dateStr = new Date().toISOString().split('T')[0];
      const log = await getDailyLog(dateStr);
      // Only show checkin if tutorial is done, to avoid clutter on first login
      if (!log && user?.profile?.tutorialCompleted && !localStorage.getItem('orbis_checkin_skipped_' + dateStr) && semesters.length > 0) {
          setShowCheckin(true);
      }
  };

  const fetchDailyInsight = async (forceRefresh = false) => {
      if (!user?.profile) return;
      const today = new Date().toISOString().split('T')[0];
      const cachedKey = `orbis_daily_insight_${user.id}_${today}`;
      if (!forceRefresh) {
          const cached = localStorage.getItem(cachedKey);
          if (cached) { setDailyInsight(JSON.parse(cached)); return; }
      }
      setInsightLoading(true);
      try {
          const upcoming = assignments.filter(a => a.status !== 'COMPLETED');
          const toughSubjects: string[] = [];
          semesters?.forEach(s => s.subjects.forEach(sub => { if ((sub.difficulty && sub.difficulty > 7)) toughSubjects.push(sub.title); }));
          if (user.profile.strategy?.toughSubjects) toughSubjects.push(...user.profile.strategy.toughSubjects);
          const insight = await generateDailyInsight(user.profile, upcoming, Array.from(new Set(toughSubjects)));
          setDailyInsight(insight);
          localStorage.setItem(cachedKey, JSON.stringify(insight));
      } catch (e) { console.error("Insight failed", e); } finally { setInsightLoading(false); }
  };

  const handleCloseCheckin = () => { setShowCheckin(false); localStorage.setItem('orbis_checkin_skipped_' + new Date().toISOString().split('T')[0], 'true'); };

  // Responsive Insight Card - Uses aspect-ratio on mobile for fix ratio scaling
  const InsightCard = () => (
    <div data-tour="insight-card" className="relative w-full aspect-[4/5] md:aspect-auto md:h-full bg-[#ea580c] rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-orange-900/20 overflow-hidden transition-all hover:scale-[1.005] flex flex-col justify-between group border border-white/10">
        <div className="absolute -right-10 -top-10 opacity-20 text-black mix-blend-overlay pointer-events-none">
             <span className="material-symbols-rounded text-[15rem] rotate-12">lightbulb</span>
        </div>
        
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
                <div className="flex items-center gap-4 mb-8">
                    <span className="bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/90 border border-white/10">
                        Focus Vibe
                    </span>
                    <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric' }).toUpperCase()}
                    </span>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 leading-[0.9] tracking-tight drop-shadow-sm">
                    {insightLoading ? "Scanning..." : dailyInsight ? dailyInsight.title : "Ready to Learn?"}
                </h2>
                
                <p className="text-white/90 text-lg font-medium leading-relaxed max-w-sm drop-shadow-sm line-clamp-4">
                    {insightLoading ? "Analyzing your schedule." : dailyInsight ? dailyInsight.prediction : "Check in to get your daily academic forecast."}
                </p>
            </div>

            <div className="mt-8">
                 <button 
                    onClick={() => fetchDailyInsight(true)}
                    className="w-full md:w-auto px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white font-bold uppercase tracking-widest text-xs hover:bg-white/20 transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                    <span className={`material-symbols-rounded text-lg ${insightLoading ? 'animate-spin' : ''}`}>refresh</span>
                    {insightLoading ? 'Updating...' : 'Update Vibe'}
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-[#fafaf9] dark:bg-[#000000] font-sans text-stone-900 dark:text-white transition-colors duration-500 flex flex-col relative overflow-hidden pb-safe">
      
      {showTutorial && (
          <TutorialOverlay 
              steps={TUTORIAL_STEPS} 
              onComplete={handleTutorialComplete} 
              onSkip={handleTutorialComplete} 
          />
      )}

      {showCheckin && !showTutorial && <DailyCheckin onClose={handleCloseCheckin} userProfileName={user?.name} onComplete={() => refreshWidgetData()} />}

      {/* --- DESKTOP HEADER (Hidden on Mobile) --- */}
      <header className="hidden md:flex px-8 py-6 justify-between items-center z-40 shrink-0 bg-[#fafaf9] dark:bg-[#000000]">
        <div>
             <h1 className="font-display font-bold text-4xl text-stone-900 dark:text-white tracking-tight">
                 Good evening, <span className="text-stone-400 dark:text-stone-500 transition-colors">{firstName}.</span>
             </h1>
             <div className="flex items-center gap-3 mt-2">
                 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-bold text-green-600 uppercase tracking-widest">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                     ONLINE
                 </div>
                 <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-2 border-l border-stone-200 dark:border-stone-800">{xp} XP</span>
             </div>
        </div>
        
        <div className="flex items-center gap-4">
            <button onClick={() => setSettingsOpen(!settingsOpen)} className="w-11 h-11 bg-stone-200 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 font-bold text-sm hover:ring-2 hover:ring-orange-500 transition-all border-2 border-white dark:border-stone-900 shadow-sm">
                {user?.name?.[0] || 'G'}
            </button>
            {settingsOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)}></div>
                    <div className="absolute right-8 top-20 w-60 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-2xl rounded-2xl p-2 z-50 animate-fade-in origin-top-right">
                            <div className="px-4 py-3 mb-2 border-b border-stone-100 dark:border-stone-800">
                                <p className="text-sm font-bold text-stone-900 dark:text-white truncate">{user?.name}</p>
                                <p className="text-xs text-stone-500 truncate">{user?.email}</p>
                            </div>
                            <button onClick={() => { setSettingsOpen(false); if(onUpdateProfile && user?.profile) onUpdateProfile(user.profile); }} className="w-full py-3 px-4 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-xl text-left text-xs font-bold uppercase tracking-widest text-stone-600 dark:text-stone-300 transition-colors flex items-center gap-3">
                            <span className="material-symbols-rounded text-base">person</span> Profile
                            </button>
                            <button onClick={() => { setSettingsOpen(false); onToggleTheme(); }} className="w-full py-3 px-4 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-xl text-left text-xs font-bold uppercase tracking-widest text-stone-600 dark:text-stone-300 transition-colors flex items-center gap-3">
                            <span className="material-symbols-rounded text-base">{currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}</span> Theme
                            </button>
                            {!isPro && <button onClick={() => { setSettingsOpen(false); onUpgrade(); }} className="w-full py-3 px-4 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-xl text-left text-xs font-bold uppercase tracking-widest text-orange-600 transition-colors flex items-center gap-3">
                            <span className="material-symbols-rounded text-base">upgrade</span> Upgrade
                            </button>}
                            <div className="h-px bg-stone-100 dark:bg-stone-800 my-1"></div>
                            <button onClick={onSignOut} className="w-full py-3 px-4 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-left text-xs font-bold uppercase tracking-widest text-red-500 transition-colors flex items-center gap-3">
                            <span className="material-symbols-rounded text-base">logout</span> Sign Out
                            </button>
                    </div>
                </>
            )}
        </div>
      </header>

      {/* --- MOBILE HEADER & NAV --- */}
      <header className="md:hidden px-6 pt-10 pb-4 bg-[#fafaf9] dark:bg-[#000000] z-30 relative">
          <div className="flex justify-between items-start mb-6">
              <div>
                   <h1 className="font-display font-bold text-3xl text-stone-900 dark:text-white leading-none tracking-tight">
                       Good evening,<br/> <span className="text-stone-400 dark:text-stone-500 transition-colors">{firstName}.</span>
                   </h1>
                   <div className="flex items-center gap-3 mt-4">
                       <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-900/10 dark:bg-green-900/30 border border-green-500/20 rounded-full text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-widest">
                           <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-500 animate-pulse"></span>
                           ONLINE
                       </div>
                       <div className="h-4 w-px bg-stone-200 dark:bg-stone-800"></div>
                       <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">{xp} XP</span>
                   </div>
              </div>
              <button onClick={() => setSettingsOpen(!settingsOpen)} className="w-12 h-12 bg-stone-200 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 font-bold text-sm border border-white dark:border-stone-700 shadow-sm relative">
                  {user?.name?.[0] || 'G'}
                  {settingsOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)}></div>
                            <div className="absolute right-0 top-14 w-56 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-2xl rounded-2xl p-2 z-50 animate-fade-in origin-top-right">
                                <button onClick={() => { setSettingsOpen(false); onToggleTheme(); }} className="w-full py-3 px-4 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-xl text-left text-xs font-bold uppercase tracking-widest text-stone-600 dark:text-stone-300 transition-colors flex items-center gap-3">
                                    <span className="material-symbols-rounded text-base">{currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}</span> Theme
                                </button>
                                <button onClick={onSignOut} className="w-full py-3 px-4 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-left text-xs font-bold uppercase tracking-widest text-red-500 transition-colors flex items-center gap-3">
                                    <span className="material-symbols-rounded text-base">logout</span> Sign Out
                                </button>
                            </div>
                        </>
                  )}
              </button>
          </div>

          {/* Navigation Pill */}
          <div className="bg-stone-200 dark:bg-[#1c1917] p-1.5 rounded-2xl flex justify-between items-center relative overflow-hidden shadow-inner">
              <button onClick={() => setActiveView('FOCUS')} className={`flex-1 py-3 rounded-xl flex items-center justify-center transition-all duration-300 ${activeView === 'FOCUS' ? 'bg-white dark:bg-stone-800 text-orange-600 shadow-sm' : 'text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400'}`}>
                  <span className="material-symbols-rounded text-xl">auto_awesome</span>
              </button>
              <button onClick={() => setActiveView('COURSES')} className={`flex-1 py-3 rounded-xl flex items-center justify-center transition-all duration-300 ${activeView === 'COURSES' ? 'bg-white dark:bg-stone-800 text-orange-600 shadow-sm' : 'text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400'}`}>
                  <span className="material-symbols-rounded text-xl">library_books</span>
              </button>
              <button onClick={() => setActiveView('SEMESTERS')} className={`flex-1 py-3 rounded-xl flex items-center justify-center transition-all duration-300 ${activeView === 'SEMESTERS' ? 'bg-white dark:bg-stone-800 text-orange-600 shadow-sm' : 'text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400'}`}>
                  <span className="material-symbols-rounded text-xl">calendar_month</span>
              </button>
              <button onClick={() => { if(onOpenTutor) onOpenTutor(); }} className={`flex-1 py-3 rounded-xl flex items-center justify-center transition-all duration-300 text-stone-400 dark:text-stone-600 hover:text-orange-600 hover:bg-white/50 dark:hover:bg-stone-800/50`}>
                  <span className="material-symbols-rounded text-xl">school</span>
              </button>
          </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full">
              
              {/* DESKTOP VIEW: BENTO GRID */}
              <div className="hidden md:grid grid-cols-12 gap-6 animate-fade-in pb-12 h-full">
                  
                  {/* Row 1 - Cards use viewport relative height to fit nicely on laptops */}
                  <div className="col-span-12 md:col-span-8 h-[45vh] lg:h-[50vh]">
                      <InsightCard />
                  </div>
                  <div className="col-span-12 md:col-span-4 h-[45vh] lg:h-[50vh]">
                        <div className="h-full bg-white dark:bg-stone-900 rounded-[2.5rem] p-8 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
                            <div data-tour="quick-actions">
                                <h3 className="text-xl font-bold text-stone-900 dark:text-white font-display mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={onOpenTimetable} className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl flex flex-col items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors">
                                        <span className="material-symbols-rounded text-2xl text-stone-500 dark:text-stone-400">calendar_month</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Schedule</span>
                                    </button>
                                    <button onClick={onOpenAssignments} className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl flex flex-col items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors">
                                        <span className="material-symbols-rounded text-2xl text-stone-500 dark:text-stone-400">task</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Tasks</span>
                                    </button>
                                    <button onClick={onStartCourse} className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl flex flex-col items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors">
                                        <span className="material-symbols-rounded text-2xl text-stone-500 dark:text-stone-400">add_circle</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Course</span>
                                    </button>
                                    <button onClick={onStartSemester} className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl flex flex-col items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors">
                                        <span className="material-symbols-rounded text-2xl text-stone-500 dark:text-stone-400">architecture</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Plan</span>
                                    </button>
                                </div>
                            </div>
                            <div className="mt-6">
                                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-3">Active Semesters</h3>
                                {semesters.length > 0 ? (
                                    <button onClick={() => onSelectSemester && onSelectSemester(semesters[0])} className="w-full p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl flex items-center justify-between group hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                                        <span className="text-sm font-bold text-stone-900 dark:text-white">{semesters[0].title}</span>
                                        <span className="material-symbols-rounded text-stone-400 group-hover:text-orange-500">arrow_forward</span>
                                    </button>
                                ) : (
                                    <p className="text-xs text-stone-500 italic">No active semester.</p>
                                )}
                            </div>
                        </div>
                  </div>

                  {/* Row 2 - Courses */}
                  <div className="col-span-12">
                      <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold font-display text-stone-900 dark:text-white">Active Courses</h2>
                          <button onClick={onStartCourse} className="text-xs font-bold uppercase tracking-widest text-orange-600 hover:text-orange-700 transition-colors">
                              View All
                          </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          <CreateCourseCard onStartCourse={onStartCourse} />
                          {activeCourses.slice(0, 5).map(course => (
                              <CourseCard key={course.id} course={course} onSelectCourse={onSelectCourse} />
                          ))}
                      </div>
                  </div>
              </div>

              {/* MOBILE VIEW: FIXED RATIO CARDS & TABS */}
              <div className="md:hidden pb-12">
                  {activeView === 'FOCUS' && (
                      <div className="animate-fade-in space-y-4">
                          <InsightCard />
                          
                          {/* Quick Actions Row */}
                          <div data-tour="quick-actions" className="grid grid-cols-2 gap-3">
                              <button onClick={onOpenAssignments} className="p-5 bg-stone-100 dark:bg-stone-900 rounded-[1.5rem] flex items-center justify-between group border border-transparent dark:border-stone-800">
                                  <div className="flex flex-col items-start">
                                      <span className="material-symbols-rounded text-2xl text-stone-600 dark:text-stone-400 mb-1">task_alt</span>
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-500">Tasks</span>
                                  </div>
                                  <span className="text-xl font-bold text-stone-900 dark:text-white">{assignments.filter(a => a.status === 'PENDING').length}</span>
                              </button>
                              <button onClick={onOpenTimetable} className="p-5 bg-stone-100 dark:bg-stone-900 rounded-[1.5rem] flex items-center justify-between group border border-transparent dark:border-stone-800">
                                  <div className="flex flex-col items-start">
                                      <span className="material-symbols-rounded text-2xl text-stone-600 dark:text-stone-400 mb-1">schedule</span>
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-500">Classes</span>
                                  </div>
                                  <span className="text-xl font-bold text-stone-900 dark:text-white">{timetable.find(d => d.day === ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()])?.classes.length || 0}</span>
                              </button>
                          </div>
                      </div>
                  )}

                  {activeView === 'COURSES' && (
                      <div className="animate-fade-in space-y-4 h-full flex flex-col">
                          <div className="flex justify-between items-center px-2 mb-2">
                              <h2 className="text-2xl font-bold font-display text-stone-900 dark:text-white">Library</h2>
                              <button data-tour="create-course-btn" onClick={onStartCourse} className="w-10 h-10 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full flex items-center justify-center shadow-lg">
                                  <span className="material-symbols-rounded text-xl">add</span>
                              </button>
                          </div>
                          <div className="grid grid-cols-1 gap-4 pb-20">
                              {activeCourses.map(course => (
                                  <CourseCard key={course.id} course={course} onSelectCourse={onSelectCourse} />
                              ))}
                              {activeCourses.length === 0 && (
                                  <div className="p-10 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-[2rem] text-center text-stone-400">
                                      <p className="text-sm font-bold">Your library is empty.</p>
                                      <p className="text-xs mt-1">Create a course to get started.</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

                  {activeView === 'SEMESTERS' && (
                      <div className="animate-fade-in space-y-4">
                          <SemestersWidget 
                              semesters={semesters}
                              onStartSemester={onStartSemester}
                              onSelectSemester={onSelectSemester}
                          />
                      </div>
                  )}
              </div>

          </div>
      </main>
      
      {flashcardCourse && <FlashcardOverlay course={flashcardCourse} onClose={() => setFlashcardCourse(null)} />}
    </div>
  );
};

export default Dashboard;
