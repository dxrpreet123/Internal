import React, { useEffect, useState, useMemo } from 'react';
import { Course, User, UserProfile, CourseSuggestion, Language, VoiceName, Semester } from '../types';
import { CloudService } from '../services/cloud';
import { generateCourseSuggestions } from '../services/geminiService';
import OnboardingView from './OnboardingView';
import { restoreCourse, permanentlyDeleteCourse } from '../services/storage';
import FlashcardOverlay from './FlashcardOverlay';

interface DashboardProps {
  user: User | null;
  courses: Course[];
  semesters?: Semester[];
  onCreateNew: () => void;
  onSelectCourse: (courseId: string) => void;
  onSelectSemester?: (semester: Semester) => void;
  onDeleteCourse: (courseId: string) => void; 
  onSignOut: () => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
}

const LANGUAGES: Language[] = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Portuguese', 'Italian', 'Russian', 'Arabic'];
const VOICES: { name: VoiceName, label: string }[] = [
    { name: 'Kore', label: 'Kore' },
    { name: 'Puck', label: 'Puck' },
    { name: 'Charon', label: 'Charon' },
    { name: 'Fenrir', label: 'Fenrir' },
    { name: 'Zephyr', label: 'Zephyr' },
];

const Dashboard: React.FC<DashboardProps> = ({ user, courses, semesters = [], onCreateNew, onSelectCourse, onSelectSemester, onDeleteCourse, onSignOut, onToggleTheme, currentTheme }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [suggestions, setSuggestions] = useState<CourseSuggestion[]>([]);
  const [prefLanguage, setPrefLanguage] = useState<Language>('English');
  const [prefVoice, setPrefVoice] = useState<VoiceName>('Kore');
  const [flashcardCourse, setFlashcardCourse] = useState<Course | null>(null);

  const { activeCourses, completedCourses, trashedCourses } = useMemo(() => {
      const active: Course[] = [];
      const completed: Course[] = [];
      const trash: Course[] = [];
      courses.forEach(course => {
          if (course.deletedAt) { trash.push(course); return; }
          const isMastered = course.status === 'READY' && course.masteryScore === 100;
          if (isMastered) completed.push(course); else active.push(course);
      });
      return { activeCourses: active, completedCourses: completed, trashedCourses: trash };
  }, [courses]);

  const isPro = user?.tier === 'PRO';
  const xp = user?.profile?.xp || 0;

  useEffect(() => {
      if (user?.profile) {
          if (user.profile.language) setPrefLanguage(user.profile.language);
          if (user.profile.voice) setPrefVoice(user.profile.voice);
      }
  }, [user, settingsOpen]);

  useEffect(() => {
    if (user && user.id !== 'guest' && !user.profile && !onboardingComplete) return; 
    if (user && suggestions.length === 0) {
        generateCourseSuggestions(user, courses.filter(c => !c.deletedAt)).then(s => setSuggestions(s));
    }
  }, [courses.length, user]);

  const handleSaveSettings = async () => {
      if (user && user.id !== 'guest') {
          const updatedProfile = { ...user.profile, language: prefLanguage, voice: prefVoice } as UserProfile;
          await CloudService.updateUserProfile(user.id, updatedProfile);
          window.location.reload(); 
      }
  };

  const needsOnboarding = user && user.id !== 'guest' && !user.profile && !onboardingComplete;
  if (needsOnboarding) return <OnboardingView onComplete={(p) => { 
       if(user) CloudService.updateUserProfile(user.id, p).then(() => { setOnboardingComplete(true); window.location.reload(); });
  }} />;

  return (
    <div className="w-full h-[100dvh] bg-[#fafaf9] dark:bg-[#0c0a09] font-sans overflow-hidden flex flex-col transition-colors duration-500">
      
      {/* Header */}
      <header className="px-5 md:px-12 py-6 md:py-8 flex justify-between items-center z-40 shrink-0">
        <div className="flex items-center gap-3">
             <div className="relative w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-orange-600">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
                     <circle cx="50" cy="50" r="14" />
                     <g className="opacity-90 stroke-current" fill="none" strokeWidth="3">
                         <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(0 50 50)" />
                         <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(60 50 50)" />
                         <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(120 50 50)" />
                     </g>
                </svg>
            </div>
            <span className="text-lg md:text-xl font-bold text-stone-900 dark:text-white tracking-tight font-display">Orbis</span>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
            {user && user.id !== 'guest' && (
                 <div className="hidden md:flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-stone-500">
                     <span>{xp} XP</span>
                 </div>
            )}
            
            <button onClick={onToggleTheme} className="text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined text-xl">{currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>

            <div className="relative">
                <button onClick={() => setSettingsOpen(!settingsOpen)} className="w-8 h-8 md:w-10 md:h-10 bg-stone-200 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 font-bold text-xs hover:bg-orange-600 hover:text-white transition-colors">
                    {user?.name?.[0] || 'G'}
                </button>
                {settingsOpen && (
                    <div className="absolute right-0 mt-4 w-64 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-xl rounded-none p-4 z-50 animate-fade-in">
                        <p className="text-sm font-bold text-stone-900 dark:text-white mb-4 truncate">{user?.name}</p>
                        
                        <div className="space-y-4 mb-6">
                             <div>
                                 <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Language</label>
                                 <select value={prefLanguage} onChange={(e) => setPrefLanguage(e.target.value as Language)} className="w-full bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 text-xs py-2 outline-none">
                                     {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Voice</label>
                                 <select value={prefVoice} onChange={(e) => setPrefVoice(e.target.value as VoiceName)} className="w-full bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 text-xs py-2 outline-none">
                                     {VOICES.map(v => <option key={v.name} value={v.name}>{v.label}</option>)}
                                 </select>
                             </div>
                        </div>

                        <button onClick={handleSaveSettings} className="w-full py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-[10px] font-bold uppercase tracking-widest mb-2">Save</button>
                        <button onClick={onSignOut} className="w-full py-3 border border-stone-200 dark:border-stone-800 text-stone-500 text-[10px] font-bold uppercase tracking-widest hover:text-red-600">Sign Out</button>
                    </div>
                )}
            </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-5 md:px-12 pb-20">
          <div className="max-w-7xl mx-auto">
              
              <div className="mb-8 md:mb-12 pt-4 md:pt-8">
                  <h1 className="text-3xl md:text-5xl font-bold text-stone-900 dark:text-white font-display mb-2">
                      Dashboard
                  </h1>
                  <p className="text-stone-500 dark:text-stone-400 text-sm">
                      Overview of your active learning modules.
                  </p>
              </div>

              {/* Action Bar */}
              <div className="flex gap-4 mb-8 md:mb-12">
                  <button 
                      onClick={onCreateNew}
                      className="px-6 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-bold uppercase tracking-widest rounded-full hover:bg-orange-600 dark:hover:bg-orange-500 hover:text-white dark:hover:text-white transition-all shadow-md"
                  >
                      + New Course
                  </button>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                  
                  {/* Semesters Card */}
                  {semesters.map(semester => (
                      <div 
                         key={semester.id} 
                         onClick={() => onSelectSemester && onSelectSemester(semester)}
                         className="group min-h-[180px] md:h-[240px] bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 p-6 md:p-8 flex flex-col justify-between cursor-pointer hover:border-orange-500 transition-colors shadow-sm"
                      >
                         <div>
                             <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2 block">Semester Plan</span>
                             <h3 className="text-xl md:text-2xl font-bold text-stone-900 dark:text-white font-display group-hover:text-orange-600 transition-colors line-clamp-2">{semester.title}</h3>
                         </div>
                         <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-4">
                             <span className="text-xs text-stone-500">{semester.subjects.length} Subjects</span>
                             <span className="material-symbols-outlined text-stone-300 group-hover:text-orange-600 transition-colors">arrow_forward</span>
                         </div>
                      </div>
                  ))}

                  {/* Active Courses */}
                  {activeCourses.map(course => (
                      <div 
                        key={course.id}
                        onClick={() => onSelectCourse(course.id)}
                        className="group min-h-[180px] md:h-[240px] bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 p-0 flex flex-col cursor-pointer hover:border-orange-500 transition-colors relative overflow-hidden shadow-sm"
                      >
                         {course.thumbnailUri && (
                             <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity">
                                 <img src={course.thumbnailUri} loading="lazy" className="w-full h-full object-cover grayscale" />
                             </div>
                         )}
                         <div className="p-6 md:p-8 flex-1 flex flex-col justify-between z-10">
                             <div>
                                 <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 block">
                                     {course.level === 'COLLEGE' ? 'University' : course.level}
                                 </span>
                                 <h3 className="text-xl md:text-2xl font-bold text-stone-900 dark:text-white font-display leading-tight line-clamp-3">{course.title}</h3>
                                 {course.status === 'GENERATING' && (
                                     <span className="inline-block mt-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 text-[10px] font-bold uppercase tracking-widest rounded animate-pulse">
                                         Building...
                                     </span>
                                 )}
                             </div>
                             <div className="flex justify-between items-end">
                                 <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                                     {course.status === 'GENERATING' ? 'Architecting...' : `${course.completedReels}/${course.totalReels} Modules`}
                                 </span>
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteCourse(course.id); }}
                                    className="text-stone-300 hover:text-red-500 transition-colors p-2 -mr-2"
                                 >
                                     <span className="material-symbols-outlined text-lg">delete</span>
                                 </button>
                             </div>
                         </div>
                         {course.status === 'GENERATING' && (
                             <div className="h-1 bg-stone-100 w-full absolute bottom-0 left-0">
                                 <div className="h-full bg-orange-600 animate-[loading_1s_ease-in-out_infinite] w-1/2"></div>
                             </div>
                         )}
                      </div>
                  ))}

                  {activeCourses.length === 0 && semesters.length === 0 && (
                      <div onClick={onCreateNew} className="min-h-[180px] md:h-[240px] border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-colors group">
                          <span className="material-symbols-outlined text-4xl text-stone-300 group-hover:text-orange-600 mb-2">add_circle</span>
                          <span className="text-sm font-bold text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300 uppercase tracking-widest">Create First Course</span>
                      </div>
                  )}

              </div>

              {completedCourses.length > 0 && (
                  <div className="mt-12 md:mt-20 border-t border-stone-200 dark:border-stone-800 pt-8 md:pt-12">
                      <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6 md:mb-8">Mastered Archives</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                           {completedCourses.map(course => (
                               <div key={course.id} className="p-6 border border-stone-200 dark:border-stone-800 opacity-60 hover:opacity-100 transition-opacity cursor-pointer bg-white dark:bg-stone-900" onClick={() => onSelectCourse(course.id)}>
                                   <h4 className="font-bold text-stone-900 dark:text-white line-clamp-1">{course.title}</h4>
                                   <p className="text-xs text-stone-500 mt-2">Completed</p>
                               </div>
                           ))}
                      </div>
                  </div>
              )}
          </div>
      </main>
      
      {flashcardCourse && <FlashcardOverlay course={flashcardCourse} onClose={() => setFlashcardCourse(null)} />}

    </div>
  );
};

export default Dashboard;