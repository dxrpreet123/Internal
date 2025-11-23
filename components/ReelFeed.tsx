
import React, { useState, useRef, useEffect } from 'react';
import { ReelData } from '../types';
import ReelItem from './ReelItem';

interface ReelFeedProps {
  reels: ReelData[];
  onUpdateReel: (id: string, updates: Partial<ReelData>) => void;
  onBack: () => void;
}

const ReelFeed: React.FC<ReelFeedProps> = ({ reels, onUpdateReel, onBack }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showMobileConcept, setShowMobileConcept] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      const height = container.clientHeight;
      const scrollTop = container.scrollTop;
      const index = Math.round(scrollTop / height);
      if (index !== activeIndex) {
        setActiveIndex(index);
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
    if (activeIndex < reels.length - 1) {
      scrollToReel(activeIndex + 1);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [activeIndex]);

  const courseTitle = (reels[0]?.title || "Curriculum Overview").split(':')[0];
  const activeReel = reels[activeIndex];

  return (
    <div className="w-full h-[100dvh] bg-stone-50 dark:bg-[#0c0a09] overflow-hidden flex transition-colors duration-500 relative">
        
        {/* --- LEFT (OR FULL MOBILE) REEL CONTAINER --- */}
        <div className="flex-1 h-full flex flex-col items-center justify-center relative">
            
            {/* Mobile Header */}
            <div className="md:hidden absolute top-0 left-0 w-full p-4 pt-safe-top z-50 flex justify-between items-center pointer-events-none">
                <button 
                    onClick={onBack}
                    className="pointer-events-auto w-10 h-10 bg-black/20 backdrop-blur-md border border-white/10 text-white flex items-center justify-center active:scale-95 transition-transform hover:bg-white/10 rounded-full"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                
                {/* Mobile Concept Toggle */}
                <div className="flex gap-2 pointer-events-auto">
                    {activeReel && activeReel.keyConcept && (
                         <button 
                            onClick={() => setShowMobileConcept(!showMobileConcept)}
                            className={`px-3 py-1.5 backdrop-blur-md border rounded-full flex items-center gap-1 transition-colors ${
                                showMobileConcept 
                                ? 'bg-orange-600 text-white border-orange-600' 
                                : 'bg-black/20 border-white/10 text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">sticky_note_2</span>
                            <span className="text-[10px] font-bold tracking-widest uppercase">Concept</span>
                        </button>
                    )}
                    <div className="px-3 py-1.5 bg-black/20 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white/90 font-mono tracking-widest">
                            {activeIndex + 1} / {reels.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Mobile Concept Drawer */}
            {activeReel && activeReel.keyConcept && (
                <div 
                    className={`md:hidden absolute top-16 left-4 right-4 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200 dark:border-stone-700 rounded-xl p-6 shadow-2xl transition-all duration-300 transform origin-top ${
                        showMobileConcept ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
                    }`}
                >
                     <div className="flex items-start gap-3">
                         <span className="material-symbols-outlined text-orange-600 dark:text-orange-500 mt-1">lightbulb</span>
                         <div>
                             <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Key Takeaway</h4>
                             <p className="font-hand text-2xl text-stone-900 dark:text-white leading-relaxed">
                                 {activeReel.keyConcept}
                             </p>
                         </div>
                     </div>
                </div>
            )}

            {/* Desktop Back Button */}
            <button 
                onClick={onBack}
                className="hidden md:flex absolute top-8 left-8 z-50 items-center gap-2 text-stone-500 hover:text-orange-600 dark:text-stone-400 dark:hover:text-orange-500 transition-colors font-bold uppercase tracking-widest text-xs group"
            >
                <div className="w-8 h-8 rounded-full border border-stone-300 dark:border-stone-700 flex items-center justify-center group-hover:border-orange-600 transition-colors bg-stone-50 dark:bg-stone-900">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                </div>
                <span>Exit Course</span>
            </button>

            {/* The Phone Container */}
            <div className="w-full h-full md:w-[380px] md:h-[80vh] md:max-h-[800px] md:rounded-[32px] md:shadow-2xl md:border-[8px] md:border-stone-900 dark:md:border-stone-800 bg-black overflow-hidden relative transition-all duration-500">
                <div 
                    ref={containerRef}
                    className="h-full w-full overflow-y-scroll snap-y-mandatory no-scrollbar scroll-smooth relative"
                >
                    {reels.map((reel, index) => (
                    <div key={reel.id} className="h-full w-full snap-center relative shrink-0">
                        <ReelItem 
                            reel={reel} 
                            onUpdateReel={onUpdateReel} 
                            isActive={index === activeIndex}
                            onComplete={handleNext}
                        />
                    </div>
                    ))}
                    
                    {/* Completion Slide */}
                    <div className="h-full w-full snap-center flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 text-center px-6 shrink-0">
                        <div className="relative">
                             <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl animate-pulse"></div>
                             <div className="w-20 h-20 border-2 border-orange-600 dark:border-orange-500 rounded-full flex items-center justify-center mb-8 relative z-10 bg-stone-50 dark:bg-stone-950">
                                <span className="material-symbols-outlined text-orange-600 dark:text-orange-500 text-3xl">check</span>
                            </div>
                        </div>
                       
                        <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-2 font-display tracking-tight">Course Complete</h2>
                        <p className="text-stone-500 dark:text-stone-400 mb-8 max-w-[200px] text-xs leading-relaxed">You have successfully assimilated the core architecture of this subject.</p>
                        <button onClick={onBack} className="px-8 py-3 bg-stone-900 dark:bg-stone-100 hover:bg-orange-600 dark:hover:bg-orange-500 text-white dark:text-stone-900 font-bold uppercase tracking-widest text-xs transition-all shadow-lg">
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* --- DESKTOP RIGHT SIDEBAR: FORMULA SHEET & NAV --- */}
        <div className="hidden md:flex w-[400px] lg:w-[480px] h-full bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 flex-col shadow-xl z-20">
            
            {/* TOP PANEL: DYNAMIC CHEAT SHEET */}
            <div className="flex-[0.4] min-h-[300px] p-8 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-black/20 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <span className="material-symbols-outlined text-6xl text-stone-900 dark:text-white">functions</span>
                </div>
                
                <h3 className="text-xs font-bold text-orange-600 dark:text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">sticky_note_2</span>
                    Smart Cheat Sheet
                </h3>

                <div className="flex-1 flex flex-col justify-center">
                    {activeReel && activeReel.keyConcept ? (
                        <div className="animate-fade-in">
                            <h4 className="text-sm font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">
                                Key Takeaway
                            </h4>
                            <div className="font-hand text-3xl md:text-4xl text-stone-900 dark:text-white leading-relaxed tracking-wide drop-shadow-sm">
                                {activeReel.keyConcept}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-stone-400 opacity-50">
                            <span className="material-symbols-outlined text-3xl mb-2">auto_stories</span>
                            <span className="text-xs uppercase tracking-widest">Listen to the story</span>
                        </div>
                    )}
                </div>
            </div>

            {/* BOTTOM PANEL: MODULE LIST */}
            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-stone-900">
                <h3 className="text-xs font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest mb-6 pl-2">
                    Curriculum Path
                </h3>
                
                <div className="space-y-2 relative">
                    <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-stone-100 dark:bg-stone-800 -z-10"></div>
                    
                    {reels.map((reel, index) => {
                        const isActive = index === activeIndex;
                        const isPast = index < activeIndex;

                        return (
                            <div 
                                key={reel.id}
                                onClick={() => scrollToReel(index)}
                                className={`flex items-center gap-4 p-3 rounded-lg transition-all cursor-pointer ${
                                    isActive ? 'bg-orange-50 dark:bg-stone-800/50' : 'hover:bg-stone-50 dark:hover:bg-stone-800/30'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all z-10 ${
                                    isActive 
                                        ? 'bg-orange-600 border-orange-600 text-white shadow-md' 
                                        : isPast 
                                            ? 'bg-stone-900 dark:bg-stone-700 border-stone-900 dark:border-stone-700 text-white' 
                                            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-300'
                                }`}>
                                    {isPast ? (
                                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                                    ) : (
                                        <span className="text-[10px] font-mono font-bold">{index + 1}</span>
                                    )}
                                </div>
                                
                                <div className="flex-1">
                                    <h4 className={`text-sm font-bold leading-tight ${
                                        isActive ? 'text-stone-900 dark:text-white' : 'text-stone-500 dark:text-stone-500'
                                    }`}>
                                        {reel.title}
                                    </h4>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
        </div>
    </div>
  );
};

export default ReelFeed;
