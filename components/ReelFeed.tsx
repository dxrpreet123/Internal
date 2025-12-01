
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Course, ReelData } from '../types';
import ReelItem from './ReelItem';
import TutorOverlay from './TutorOverlay';
import { explainLikeIm5 } from '../services/geminiService';

interface ReelFeedProps {
  activeCourse: Course; 
  reels: ReelData[];
  onUpdateReel: (id: string, updates: Partial<ReelData>) => void;
  onBack: () => void;
  onGenerateRemedial?: (failedReels: ReelData[]) => void;
  courseTitle?: string;
  onXPUpgrade?: (amount: number) => void;
  onRegenerateImage?: (reelId: string) => void;
}

const ReelFeed: React.FC<ReelFeedProps> = ({ activeCourse, reels, onUpdateReel, onBack, onGenerateRemedial, onXPUpgrade, onRegenerateImage }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showTutor, setShowTutor] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null); // For sidebar
  
  // Resizable state
  const [playerHeight, setPlayerHeight] = useState(80); // percentage (vh equivalent)
  const isResizingRef = useRef(false);

  // ELI5 State
  const [eli5Loading, setEli5Loading] = useState(false);
  const [eli5Content, setEli5Content] = useState<string | null>(null);

  const { score, failedReels } = useMemo(() => {
    let correct = 0;
    let total = 0;
    const failed: ReelData[] = [];
    reels.forEach(r => {
        if (r.quiz && r.userQuizResult !== undefined) {
            total++;
            if (r.userQuizResult) correct++;
            else failed.push(r);
        }
    });
    return { score: total === 0 ? 100 : Math.round((correct / total) * 100), failedReels: failed };
  }, [reels]);

  // Safe access to active reel.
  const activeReel = reels[activeIndex];
  const isMasterySlide = activeIndex >= reels.length;
  
  // Fallback for metadata display if on mastery slide
  const displayReel = activeReel || reels[reels.length - 1]; 
  const isEquation = displayReel?.keyConcept ? /[=<>≈Δ∫∑]/.test(displayReel.keyConcept) : false;
  const conceptLabel = isEquation ? "Core Equation" : "Key Takeaway";

  // Math Rendering Effect for Sidebar
  useEffect(() => {
      if (detailsRef.current && (window as any).renderMathInElement) {
          (window as any).renderMathInElement(detailsRef.current, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
            ],
            throwOnError: false
          });
      }
  }, [activeIndex, activeReel, eli5Content, isMasterySlide]);

  const handleScroll = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      const height = container.clientHeight;
      const scrollTop = container.scrollTop;
      const index = Math.round(scrollTop / height);
      if (index !== activeIndex) {
        setActiveIndex(index);
        setEli5Content(null);
        setEli5Loading(false);
      }
    }
  };

  const scrollToReel = (index: number) => {
    if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        containerRef.current.scrollTo({
            top: index * height,
            behavior: 'smooth'
        });
    }
  };

  const handleNext = () => {
    if (onXPUpgrade) onXPUpgrade(10);
    // Allow scrolling to reels.length (which is the Mastery Slide index)
    if (activeIndex <= reels.length - 1) {
        scrollToReel(activeIndex + 1);
    }
  };

  const handleQuizPass = (correct: boolean) => {
      if (correct) {
          if (onXPUpgrade) onXPUpgrade(50);
      } else {
          // PROACTIVE TUTOR: "Evolving" behavior
          setTimeout(() => setShowTutor(true), 500);
      }
  }

  const handleELI5 = async () => {
      if (eli5Content) {
          setEli5Content(null);
          return;
      }
      const activeReel = reels[activeIndex];
      if (!activeReel) return;

      setEli5Loading(true);
      try {
          const text = await explainLikeIm5(activeReel.keyConcept || activeReel.title, activeReel.script);
          setEli5Content(text);
      } catch (e) {
          setEli5Content("Oops, I couldn't simplify this right now.");
      } finally {
          setEli5Loading(false);
      }
  };

  // Resize Handlers
  const startResize = (e: React.MouseEvent) => {
      isResizingRef.current = true;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', stopResize);
  };
  
  const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRef.current) {
          const newHeight = (e.clientY / window.innerHeight) * 100;
          if (newHeight > 30 && newHeight < 95) {
              setPlayerHeight(newHeight);
          }
      }
  };

  const stopResize = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResize);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [activeIndex]);

  // --- CRASH COURSE RENDERER ---
  if (activeCourse.mode === 'CRASH_COURSE') {
      return (
        <div className="w-full h-[100dvh] bg-stone-50 dark:bg-[#0c0a09] font-sans flex flex-col">
            <div className="px-6 py-4 flex justify-between items-center border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-stone-600 dark:text-stone-300">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-stone-900 dark:text-white font-display">Exam Cram</h1>
                        <p className="text-xs text-stone-500 uppercase tracking-wide">
                            {Math.min(activeIndex + 1, reels.length)} of {reels.length} • {activeCourse.title}
                        </p>
                    </div>
                </div>
            </div>
            <div ref={containerRef} className="flex-1 overflow-y-scroll snap-y-mandatory scroll-smooth relative">
                {reels.map((reel, index) => {
                     const shouldLoad = Math.abs(activeIndex - index) < 2; // Only load adjacent reels
                     return (
                        <div key={reel.id} className="h-full w-full snap-center shrink-0 flex flex-col p-6 md:p-12 max-w-3xl mx-auto">
                            <div className="flex-1 flex flex-col justify-center">
                                <h2 className="text-3xl md:text-5xl font-bold text-stone-900 dark:text-white mb-6 font-display leading-tight">{reel.title}</h2>
                                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 rounded-xl shadow-sm mb-8">
                                    <h3 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">sticky_note_2</span> Smart Notes
                                    </h3>
                                    <ul className="space-y-3">
                                        {reel.bulletPoints?.map((point, i) => (
                                            <li key={i} className="flex gap-3 text-base text-stone-700 dark:text-stone-300 leading-relaxed">
                                                <span className="text-orange-500">•</span>
                                                {point}
                                            </li>
                                        )) || <p className="text-stone-500 italic">No notes available.</p>}
                                    </ul>
                                </div>
                                <div className="p-6 bg-stone-100 dark:bg-stone-800/50 rounded-xl border-l-4 border-stone-400 dark:border-stone-600">
                                    <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Memorize This</span>
                                    <p className="text-xl md:text-2xl font-serif italic text-stone-800 dark:text-stone-200">{reel.keyConcept}</p>
                                </div>
                            </div>
                            <div className="mt-8 mb-20 md:mb-0">
                                <ReelItem 
                                    reel={reel} 
                                    onUpdateReel={onUpdateReel} 
                                    isActive={index === activeIndex} 
                                    onComplete={handleNext}
                                    onQuizResult={handleQuizPass}
                                    audioOnlyMode={true} 
                                    shouldLoad={shouldLoad}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      );
  }

  // --- MODERN VIDEO REEL RENDERER ---
  return (
    <div className="w-full h-[100dvh] bg-[#000] overflow-hidden flex flex-col md:flex-row relative text-white font-sans">
        
        {/* --- LEFT SIDE: THE PLAYER --- */}
        <div className="w-full md:flex-1 h-full flex flex-col justify-center items-center relative bg-black">
            
            {/* Desktop Resizable Wrapper */}
            <div 
                className="w-full h-full md:w-[450px] transition-all duration-75 ease-out relative flex flex-col shadow-2xl overflow-hidden md:rounded-b-2xl"
                style={{ height: window.innerWidth >= 768 ? `${playerHeight}%` : '100%' }}
            >
                 <div 
                    ref={containerRef}
                    className="h-full w-full overflow-y-scroll snap-y-mandatory no-scrollbar scroll-smooth relative bg-stone-900"
                >
                    {reels.map((reel, index) => {
                        // Virtualization: Only render ReelItems close to viewport
                        const shouldLoad = Math.abs(activeIndex - index) < 2;
                        return (
                            <div key={reel.id} className="h-full w-full snap-center relative shrink-0">
                                <ReelItem 
                                    reel={reel} 
                                    onUpdateReel={onUpdateReel} 
                                    isActive={index === activeIndex && !eli5Content}
                                    onComplete={handleNext}
                                    onQuizResult={handleQuizPass}
                                    onRegenerateImage={() => onRegenerateImage && onRegenerateImage(reel.id)}
                                    shouldLoad={shouldLoad}
                                />
                            </div>
                        );
                    })}
                    
                    {/* Mastery Slide */}
                    <div className="h-full w-full snap-center flex flex-col items-center justify-center bg-stone-950 text-center px-6 shrink-0 font-sans">
                        {score === 100 ? (
                             <>
                                <div className="w-20 h-20 border-2 border-green-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                    <span className="material-symbols-outlined text-green-500 text-4xl">military_tech</span>
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2 font-display">Mastery Achieved</h2>
                                <p className="text-stone-400 mb-8 max-w-xs">You've completed all modules with a perfect score.</p>
                                <button onClick={onBack} className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-full hover:bg-stone-200 transition-all">
                                    Finish Course
                                </button>
                             </>
                        ) : (
                            <>
                                <div className="mb-8 text-4xl font-bold text-orange-500">{score}%</div>
                                <h2 className="text-2xl font-bold text-white mb-2 font-display">Keep Going</h2>
                                <p className="text-stone-400 mb-8 max-w-xs">Review the failed modules to achieve 100% mastery.</p>
                                <div className="flex flex-col gap-3 mt-4 w-64">
                                    <button 
                                        onClick={() => onGenerateRemedial && onGenerateRemedial(failedReels)}
                                        className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-widest text-xs rounded-full transition-all"
                                    >
                                        Fix Gaps
                                    </button>
                                    <button onClick={onBack} className="text-stone-500 hover:text-white text-xs font-bold uppercase tracking-widest mt-2">
                                        Return to Dashboard
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ELI5 Overlay */}
                {eli5Content && (
                    <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
                        <div className="max-w-md w-full">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-2xl text-white font-display">Simply Put</h3>
                                <button onClick={() => setEli5Content(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"><span className="material-symbols-outlined">close</span></button>
                            </div>
                            <p className="text-lg md:text-xl font-medium text-stone-200 leading-relaxed font-hand">
                                "{eli5Content}"
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Resize Handle (Desktop Only) */}
            <div 
                className="hidden md:flex w-full md:w-[450px] h-6 cursor-row-resize items-center justify-center hover:bg-white/5 transition-colors group"
                onMouseDown={startResize}
            >
                <div className="w-12 h-1 bg-stone-700 rounded-full group-hover:bg-orange-500 transition-colors"></div>
            </div>

            {/* Floating Navigation Controls */}
            <div className="absolute top-6 left-6 z-50 flex gap-4">
                 <button 
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
                >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                </button>
            </div>
            
            <div className="absolute top-6 right-6 z-50 flex gap-3">
                 {!isMasterySlide && (
                     <>
                        <button 
                            onClick={handleELI5}
                            className={`h-10 px-4 rounded-full backdrop-blur-md border flex items-center gap-2 transition-all ${eli5Content ? 'bg-orange-600 border-orange-600 text-white' : 'bg-black/40 border-white/10 text-white hover:bg-white/10'}`}
                        >
                            {eli5Loading ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span> : <span className="material-symbols-outlined text-lg">child_care</span>}
                            <span className="text-xs font-bold uppercase tracking-wide hidden md:inline">Simple</span>
                        </button>

                        <button 
                            onClick={() => setShowTutor(!showTutor)}
                            className={`h-10 px-4 rounded-full backdrop-blur-md border flex items-center gap-2 transition-all ${showTutor ? 'bg-orange-600 border-orange-600 text-white' : 'bg-black/40 border-white/10 text-white hover:bg-white/10'}`}
                        >
                            <span className="material-symbols-outlined text-lg">smart_toy</span>
                            <span className="text-xs font-bold uppercase tracking-wide hidden md:inline">Tutor</span>
                        </button>
                     </>
                 )}
            </div>

        </div>

        {/* --- RIGHT SIDE: DETAILS PANEL --- */}
        <div className="hidden md:flex w-[350px] lg:w-[400px] bg-[#0c0a09] border-l border-white/5 flex-col shrink-0">
            <div ref={detailsRef} className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                
                {isMasterySlide ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-0 animate-fade-in">
                        <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-3xl text-stone-400">check</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white font-display mb-2">Course Completed</h2>
                        <p className="text-stone-500 text-sm">Great job! Return to the dashboard to take the final exam or explore resources.</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2 block">Now Playing</span>
                            <h2 className="text-2xl font-bold text-white font-display leading-tight">{activeReel.title}</h2>
                        </div>

                        <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-stone-400 text-sm">{isEquation ? 'functions' : 'lightbulb'}</span>
                                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">{conceptLabel}</h3>
                            </div>
                            <p className={`text-stone-200 leading-relaxed font-hand ${isEquation ? 'text-2xl' : 'text-lg'}`}>
                                {activeReel.keyConcept}
                            </p>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Up Next</h3>
                            <div className="space-y-1 relative pl-4 border-l border-white/10">
                                {reels.slice(activeIndex + 1, activeIndex + 6).map((r, i) => (
                                    <div key={r.id} onClick={() => scrollToReel(activeIndex + 1 + i)} className="py-3 group cursor-pointer">
                                        <h4 className="text-sm font-medium text-stone-400 group-hover:text-white transition-colors">{r.title}</h4>
                                    </div>
                                ))}
                                {reels.length > activeIndex + 6 && (
                                    <div className="py-3 text-xs text-stone-600 italic">... and {reels.length - (activeIndex + 6)} more</div>
                                )}
                            </div>
                        </div>
                    </>
                )}

            </div>
            
            {/* Context Footer */}
            <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                <p className="text-[10px] text-stone-600 uppercase tracking-widest font-bold mb-1">Course</p>
                <p className="text-xs text-stone-400 truncate">{activeCourse.title}</p>
            </div>
        </div>

        {showTutor && activeReel && <TutorOverlay activeReel={activeReel} onClose={() => setShowTutor(false)} />}
    </div>
  );
};

export default ReelFeed;
