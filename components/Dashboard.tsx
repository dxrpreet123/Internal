
import React, { useEffect, useState } from 'react';
import { Course, User } from '../types';
import { CloudService } from '../services/cloud';

interface DashboardProps {
  user: User | null;
  courses: Course[];
  onCreateNew: () => void;
  onSelectCourse: (courseId: string) => void;
  onDeleteCourse: (courseId: string) => void;
  onSignOut: () => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
}

const Dashboard: React.FC<DashboardProps> = ({ user, courses, onCreateNew, onSelectCourse, onDeleteCourse, onSignOut, onToggleTheme, currentTheme }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [courseToShare, setCourseToShare] = useState<Course | null>(null);
  const [shareLink, setShareLink] = useState('');
  const [shareStep, setShareStep] = useState<'GENERATING' | 'READY' | 'SENT'>('GENERATING');
  const [inviteEmail, setInviteEmail] = useState('');

  const [waitlistStep, setWaitlistStep] = useState<'INFO' | 'FORM' | 'SUCCESS'>('INFO');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [, setTick] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // Pre-fill email when modal opens
  useEffect(() => {
    if (pricingOpen && user?.email) {
        setWaitlistEmail(user.email);
    }
    if (!pricingOpen) {
        setWaitlistStep('INFO');
    }
  }, [pricingOpen, user]);

  const handleJoinWaitlist = (e: React.FormEvent) => {
      e.preventDefault();
      // Simulate API call to add to waitlist
      setTimeout(() => {
          setWaitlistStep('SUCCESS');
          setTimeout(() => setPricingOpen(false), 2500);
      }, 800);
  };

  const openShareModal = async (course: Course) => {
      setCourseToShare(course);
      setShareModalOpen(true);
      setShareStep('GENERATING');
      
      // Ensure course is in public library so link works
      if (course.syllabusHash) {
          await CloudService.publishCourseToLibrary(course);
          const link = `${window.location.origin}?share=${course.syllabusHash}`;
          setShareLink(link);
          setShareStep('READY');
      } else {
          // Fallback if hash missing
          setShareStep('READY');
          setShareLink("Course ID missing hash.");
      }
  };

  const copyShareLink = () => {
      navigator.clipboard.writeText(shareLink);
      const btn = document.getElementById('copy-btn');
      if (btn) btn.innerText = 'Copied!';
      setTimeout(() => { if (btn) btn.innerText = 'Copy Link'; }, 2000);
  };

  const sendInvite = (e: React.FormEvent) => {
      e.preventDefault();
      setShareStep('SENT');
      // Logic for sending email would go here via CloudService
      setTimeout(() => {
          setShareModalOpen(false);
          setInviteEmail('');
      }, 2000);
  };

  const getEtaText = (course: Course) => {
      // Phase 1 (Text/Audio/Images) check
      if (course.status !== 'READY') return "Initializing...";

      // Phase 2 (Video) Check
      const videosDone = course.completedVideos || 0;
      const total = course.totalReels;
      
      const isPro = user?.tier === 'PRO';

      if (!isPro) return "Complete";
      if (videosDone >= total) return "Complete";

      // If here, Phase 1 done, but Phase 2 (Video) pending
      const remainingVideos = total - videosDone;
      const dynamicMins = Math.max(1, Math.ceil(remainingVideos * 0.2)); // Approx 10-12s per video
      return `~${dynamicMins}m video sync`;
  };

  // Helper to determine status label
  const getStatusLabel = (course: Course) => {
      if (course.status === 'GENERATING') return "Architecting...";
      
      const videosDone = course.completedVideos || 0;
      const total = course.totalReels;
      const isPro = user?.tier === 'PRO';

      if (isPro && videosDone < total) {
          return `Preview Ready • ${Math.round((videosDone/total)*100)}% Motion`;
      }

      return `Accessed ${new Date(course.lastAccessedAt).toLocaleDateString()}`;
  };

  // Helper to find active generating course for banner
  const activeGenCourse = courses.find(c => c.status === 'GENERATING' || (c.processingStatus && c.processingStatus.includes('Phase 2')));
  const isPro = user?.tier === 'PRO';
  const isFree = user?.tier === 'FREE';
  const isGuest = user?.id === 'guest';
  
  // Logic: Guest Max 1, Free Max 3, Pro Unlimited
  const limitReached = isGuest ? courses.length >= 1 : (isFree ? courses.length >= 3 : false);
  const limitMessage = isGuest ? "Guest Limit (1 Course). Sign In for more." : "Free Tier Limit (3 Courses).";

  return (
    <div className="h-[100dvh] w-full bg-stone-50 dark:bg-stone-950 overflow-y-auto font-sans scroll-smooth transition-colors duration-300 relative">
      
      {/* Share Modal */}
      {shareModalOpen && courseToShare && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-2xl p-6 border border-stone-200 dark:border-stone-800 shadow-2xl relative overflow-hidden animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-stone-900 dark:text-white font-display">Share Course</h2>
                      <button onClick={() => setShareModalOpen(false)} className="text-stone-400 hover:text-stone-900 dark:hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  
                  {shareStep === 'GENERATING' ? (
                      <div className="flex flex-col items-center py-8">
                          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                          <p className="text-sm text-stone-500">Generating unique link...</p>
                      </div>
                  ) : shareStep === 'SENT' ? (
                      <div className="text-center py-8">
                           <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                               <span className="material-symbols-outlined text-2xl">send</span>
                           </div>
                           <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-1">Invite Sent</h3>
                           <p className="text-sm text-stone-500">Recipient will be notified shortly.</p>
                      </div>
                  ) : (
                      <div className="space-y-6">
                          <div>
                              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Public Link</label>
                              <div className="flex gap-2">
                                  <input 
                                    readOnly 
                                    value={shareLink} 
                                    className="flex-1 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 text-xs p-3 rounded outline-none font-mono truncate"
                                  />
                                  <button 
                                    id="copy-btn"
                                    onClick={copyShareLink}
                                    className="px-4 bg-stone-900 dark:bg-stone-100 hover:bg-orange-600 dark:hover:bg-orange-500 text-white dark:text-stone-900 font-bold uppercase tracking-widest text-[10px] rounded transition-colors"
                                  >
                                      Copy Link
                                  </button>
                              </div>
                          </div>
                          
                          <div className="relative flex items-center py-2">
                              <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                              <span className="flex-shrink-0 mx-4 text-stone-400 text-[10px] uppercase font-bold tracking-widest">Or Send via Email</span>
                              <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                          </div>

                          <form onSubmit={sendInvite} className="space-y-3">
                              <input 
                                type="email" 
                                required
                                placeholder="recipient@email.com"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded outline-none focus:border-orange-500 transition-colors text-stone-900 dark:text-white text-sm"
                              />
                              <button 
                                type="submit"
                                className="w-full py-3 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-bold uppercase tracking-widest text-xs hover:bg-orange-200 dark:hover:bg-orange-900/40 transition-colors rounded"
                              >
                                  Send Invite
                              </button>
                          </form>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Pricing / Waitlist Modal */}
      {pricingOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-2xl p-8 border border-stone-200 dark:border-stone-800 shadow-2xl relative overflow-hidden transition-all">
                   <button onClick={() => setPricingOpen(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 dark:hover:text-white z-10">
                        <span className="material-symbols-outlined">close</span>
                   </button>
                   
                   {waitlistStep === 'SUCCESS' ? (
                       <div className="text-center py-10 animate-fade-in">
                           <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                               <span className="material-symbols-outlined text-3xl">check</span>
                           </div>
                           <h2 className="text-2xl font-bold text-stone-900 dark:text-white font-display mb-2">You're on the list!</h2>
                           <p className="text-stone-500 dark:text-stone-400 text-sm">We'll notify you as soon as Pro slots open up.</p>
                       </div>
                   ) : waitlistStep === 'FORM' ? (
                       <div className="animate-fade-in">
                            <h2 className="text-2xl font-bold text-stone-900 dark:text-white font-display mb-2">Join Pro Waitlist</h2>
                            <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">Enter your email to get early access when we expand.</p>
                            
                            <form onSubmit={handleJoinWaitlist} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={waitlistEmail}
                                        onChange={e => setWaitlistEmail(e.target.value)}
                                        className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded outline-none focus:border-orange-500 transition-colors text-stone-900 dark:text-white"
                                        placeholder="you@example.com"
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-widest text-xs transition-colors shadow-lg mt-2"
                                >
                                    Join Waitlist
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setWaitlistStep('INFO')}
                                    className="w-full py-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-xs font-bold uppercase tracking-widest"
                                >
                                    Back
                                </button>
                            </form>
                       </div>
                   ) : (
                       <div className="animate-fade-in">
                           <div className="text-center mb-8">
                               <h2 className="text-2xl font-bold text-stone-900 dark:text-white font-display mb-2">Upgrade to Pro</h2>
                               <p className="text-stone-500 dark:text-stone-400 text-sm">Unlock the full power of the Orbis Learning Engine.</p>
                           </div>

                           <div className="space-y-4 mb-8">
                               <div className="flex items-center gap-3">
                                   <span className="material-symbols-outlined text-orange-600">check_circle</span>
                                   <span className="text-sm font-bold text-stone-700 dark:text-stone-300">Unlimited Courses</span>
                               </div>
                               <div className="flex items-center gap-3">
                                   <span className="material-symbols-outlined text-orange-600">videocam</span>
                                   <span className="text-sm font-bold text-stone-700 dark:text-stone-300">AI Video Generation (Veo)</span>
                               </div>
                               <div className="flex items-center gap-3">
                                   <span className="material-symbols-outlined text-orange-600">library_add</span>
                                   <span className="text-sm font-bold text-stone-700 dark:text-stone-300">8+ Modules per Course</span>
                               </div>
                                <div className="flex items-center gap-3">
                                   <span className="material-symbols-outlined text-orange-600">school</span>
                                   <span className="text-sm font-bold text-stone-700 dark:text-stone-300">Public Library Access</span>
                               </div>
                           </div>

                           <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg mb-8 text-center border border-orange-100 dark:border-orange-800">
                               <span className="text-3xl font-bold text-orange-600 dark:text-orange-500">$9</span>
                               <span className="text-stone-500 dark:text-stone-400 text-xs uppercase font-bold tracking-widest ml-2">/ month</span>
                           </div>

                           {/* Only show button if NOT guest */}
                           {!isGuest && (
                               <button 
                                    onClick={() => setWaitlistStep('FORM')}
                                    className="w-full py-4 bg-stone-900 dark:bg-stone-100 hover:bg-orange-600 dark:hover:bg-orange-500 text-white dark:text-stone-900 font-bold uppercase tracking-widest text-xs transition-colors shadow-lg"
                                >
                                Waitlist for Pro
                               </button>
                           )}
                           {isGuest && (
                               <div className="text-center text-xs text-stone-400">
                                   Sign in to upgrade to Pro.
                               </div>
                           )}
                       </div>
                   )}
              </div>
          </div>
      )}

      <div className="p-4 md:p-12 min-h-full">
        <div className="max-w-5xl mx-auto pb-32">
          
          {/* Header - Optimized for Mobile */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-6">
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                <div className="flex items-center gap-3">
                    {/* NEW LOGO SVG */}
                    <div className="w-8 h-8 text-orange-600 dark:text-orange-500">
                        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                            <circle cx="50" cy="50" r="22" className="fill-current" />
                            <g className="opacity-60" stroke="currentColor" strokeWidth="0.5">
                                <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(0 50 50)" />
                                <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(45 50 50)" />
                                <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(90 50 50)" />
                                <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(135 50 50)" />
                            </g>
                        </svg>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white tracking-tighter font-display">Orbis</h1>
                    {user && (
                        <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${isPro ? 'bg-orange-600 text-white border-orange-600' : 'bg-stone-200 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700'}`}>
                            {user.tier}
                        </span>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1">
                
                {/* Theme Toggle */}
                <button 
                    onClick={onToggleTheme}
                    className="w-10 h-10 shrink-0 rounded-none bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400 hover:border-orange-600 dark:hover:border-orange-500 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">
                        {currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
                    </span>
                </button>

                {/* Settings */}
                <div className="relative">
                  <button 
                      onClick={() => setSettingsOpen(!settingsOpen)}
                      className="w-10 h-10 shrink-0 rounded-none bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400 hover:border-orange-600 dark:hover:border-orange-500 transition-colors"
                  >
                      <span className="material-symbols-outlined text-lg">settings</span>
                  </button>
                  {settingsOpen && (
                    <div className="absolute right-0 top-12 w-48 bg-white dark:bg-stone-900 shadow-xl border border-stone-200 dark:border-stone-800 py-2 z-20 rounded-md">
                       <div className="px-4 py-2 border-b border-stone-100 dark:border-stone-800">
                           <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Data</p>
                       </div>
                       <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 font-medium">
                           Clear Local Data
                       </button>
                    </div>
                  )}
                </div>

                {/* Profile / Sign In */}
                {user ? (
                    <div className="flex items-center gap-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 pl-2 pr-4 py-1.5 h-10 shrink-0 rounded-sm">
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full grayscale opacity-80" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-[10px] font-bold text-stone-500">{user.name[0]}</div>
                        )}
                        <div className="hidden md:flex flex-col items-start ml-1">
                             <span className="text-xs font-bold text-stone-900 dark:text-white truncate max-w-[80px]">{user.name}</span>
                        </div>
                        <button onClick={onSignOut} className="ml-2 text-stone-400 hover:text-orange-600 dark:hover:text-orange-400 text-[10px] uppercase font-bold tracking-wider whitespace-nowrap">Sign Out</button>
                    </div>
                ) : (
                     <button onClick={onSignOut} className="text-stone-500 hover:text-orange-600 text-sm font-bold px-2 whitespace-nowrap">Sign In</button>
                )}
                
                {/* Upgrade Button (If Free AND Not Guest) */}
                {isFree && !isGuest && (
                    <button 
                        onClick={() => setPricingOpen(true)}
                        className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-4 py-2 h-10 font-bold uppercase tracking-widest text-[10px] hover:bg-orange-200 transition-colors whitespace-nowrap shrink-0 rounded-sm"
                    >
                        Get Pro
                    </button>
                )}

                {/* New Course Button */}
                <div className="relative group shrink-0">
                    <button 
                    onClick={limitReached ? undefined : onCreateNew}
                    disabled={limitReached}
                    className={`px-4 md:px-6 py-2 h-10 font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap text-sm tracking-wide rounded-sm ${
                        limitReached 
                        ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                        : 'bg-stone-900 dark:bg-stone-100 hover:bg-orange-600 dark:hover:bg-orange-500 text-white dark:text-stone-900 active:scale-95'
                    }`}
                    >
                    <span className="material-symbols-outlined text-lg">add</span>
                    <span className="hidden md:inline">New Course</span>
                    <span className="md:hidden">New</span>
                    </button>
                    {limitReached && (
                        <div className="absolute right-0 top-12 w-48 bg-stone-800 text-white text-xs p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                            {limitMessage}
                            {/* Visual indicator of usage */}
                            <div className="mt-2 w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 w-full"></div>
                            </div>
                            <div className="mt-1 text-[9px] text-right text-stone-400">
                                {isGuest ? '1/1 Used' : '3/3 Used'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* Banner for processing */}
          {activeGenCourse && (
            <div className="mb-8 bg-white dark:bg-stone-900 border-l-4 border-orange-500 shadow-sm p-4 flex items-start gap-4 animate-fade-in rounded-r-md">
                 <span className="material-symbols-outlined text-orange-500 animate-spin">sync</span>
                 <div>
                     <p className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        {activeGenCourse.title}
                     </p>
                     <p className="text-stone-500 dark:text-stone-400 text-xs mt-1 font-mono">
                        {activeGenCourse.processingStatus || "Orbis is architecting your course curriculum..."}
                     </p>
                 </div>
            </div>
          )}

          {/* Empty State */}
          {courses.length === 0 ? (
            <div className="text-center py-16 md:py-24 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-6 shadow-sm rounded-lg">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full mb-6 text-stone-400 dark:text-stone-500">
                    <span className="material-symbols-outlined text-3xl">library_books</span>
                </div>
                <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2">Library Empty</h3>
                <p className="text-stone-500 dark:text-stone-400 mb-8 max-w-sm mx-auto text-sm">Begin by inputting a syllabus or topic list.</p>
                <button onClick={onCreateNew} className="text-orange-600 dark:text-orange-400 font-bold text-sm uppercase tracking-widest hover:underline">Initialize First Course</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => {
                  const isGenerating = course.status === 'GENERATING';
                  const isPhase1Ready = course.status === 'READY';
                  const progressPercent = (course.completedReels / Math.max(course.totalReels, 1)) * 100;
                  // Allow opening if Phase 1 is done OR partially generated
                  const canOpen = isPhase1Ready || course.completedReels >= 1;
                  const isPublic = course.isPublic;

                  return (
                    <div 
                        key={course.id}
                        onClick={() => canOpen && onSelectCourse(course.id)}
                        className={`orbis-card group flex flex-col h-[260px] relative bg-white dark:bg-stone-900 overflow-hidden rounded-lg ${canOpen ? 'cursor-pointer' : 'cursor-wait opacity-80'}`}
                    >
                        {/* Header / Thumbnail Area */}
                        <div className={`h-32 w-full relative p-5 transition-colors overflow-hidden flex flex-col justify-between ${isGenerating ? 'bg-stone-100 dark:bg-stone-800' : 'bg-stone-200 dark:bg-stone-800'}`}>
                            
                            {/* Status / Tags */}
                            <div className="flex justify-between items-start z-10">
                                <span className="bg-white/80 dark:bg-stone-950/80 backdrop-blur text-stone-600 dark:text-stone-300 text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded-sm">
                                    {course.level}
                                </span>
                                {isPublic && (
                                    <span className="text-stone-500 dark:text-stone-400">
                                        <span className="material-symbols-outlined text-base">public</span>
                                    </span>
                                )}
                            </div>

                            {isGenerating || (isPro && (course.completedVideos || 0) < course.totalReels) ? (
                                <div className="flex flex-col gap-1 text-orange-600 dark:text-orange-400 z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest">{getEtaText(course)}</span>
                                    </div>
                                    <span className="text-[9px] text-stone-500 dark:text-stone-400 truncate opacity-90 font-mono">
                                        {course.processingStatus || "Initializing..."}
                                    </span>
                                </div>
                            ) : (
                                <div className="absolute bottom-0 right-0 p-4 opacity-10 transform translate-y-2 translate-x-2 group-hover:translate-y-0 group-hover:translate-x-0 transition-transform">
                                    <span className="material-symbols-outlined text-6xl text-stone-900 dark:text-white">auto_stories</span>
                                </div>
                            )}

                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <div className="flex gap-2">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); openShareModal(course); }}
                                        className="w-8 h-8 bg-white dark:bg-stone-700 flex items-center justify-center hover:bg-orange-50 dark:hover:bg-orange-900/30 text-stone-400 hover:text-orange-600 transition-colors rounded-full shadow-sm"
                                        title="Share Course"
                                    >
                                        <span className="material-symbols-outlined text-sm">share</span>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDeleteCourse(course.id); }}
                                        className="w-8 h-8 bg-white dark:bg-stone-700 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/30 text-stone-400 hover:text-red-600 transition-colors rounded-full shadow-sm"
                                        title="Delete Course"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-5 flex-grow flex flex-col justify-between bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800">
                            <div>
                                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-lg leading-tight line-clamp-2 mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors font-display">
                                    {course.title}
                                </h3>
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-stone-400">
                                    {getStatusLabel(course)}
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 mt-3">
                                <div className="flex items-center justify-between text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                                    <span>
                                        {isGenerating 
                                          ? `Module ${course.completedReels + 1}/${course.totalReels}` 
                                          : `${course.totalReels} Modules`}
                                    </span>
                                    {/* Video Status Icon */}
                                    {isFree ? (
                                        <span className="flex items-center gap-1 text-stone-400" title="Video Upgrade Locked (Free Tier)">
                                            <span className="material-symbols-outlined text-xs">lock</span>
                                            <span>Motion</span>
                                        </span>
                                    ) : (
                                        course.completedVideos === course.totalReels && (
                                            <span className="flex items-center gap-1 text-orange-600" title="Video Enhanced">
                                                <span className="material-symbols-outlined text-xs">videocam</span>
                                            </span>
                                        )
                                    )}
                                </div>
                                <div className={`w-full h-1 bg-stone-100 dark:bg-stone-800 overflow-hidden rounded-full`}>
                                    <div 
                                        className={`h-full transition-all duration-500 rounded-full ${isGenerating ? 'bg-orange-500 shimmer' : 'bg-orange-600 dark:bg-orange-500'}`}
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                  );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
