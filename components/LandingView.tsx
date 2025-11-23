
import React, { useEffect, useState } from 'react';

interface LandingViewProps {
  onEnter: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onEnter }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  return (
    <div className="h-[100dvh] w-full bg-[#fafaf9] dark:bg-[#0c0a09] flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-700 font-sans selection:bg-orange-200 dark:selection:bg-orange-900">
      
      {/* CSS for organic movement */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
      `}</style>

      {/* Organic Playful Background */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        {/* Orb 1 */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 md:w-96 md:h-96 bg-orange-300/30 dark:bg-orange-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob"></div>
        {/* Orb 2 */}
        <div className="absolute top-1/3 right-1/4 w-72 h-72 md:w-96 md:h-96 bg-stone-300/40 dark:bg-stone-700/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
        {/* Orb 3 */}
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 md:w-96 md:h-96 bg-orange-200/30 dark:bg-orange-800/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Main Content */}
      <div className={`z-10 flex flex-col items-center text-center transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Logo Mark - Orbis Wireframe */}
        <div className="mb-8 w-24 h-24 group cursor-default relative">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full animate-spin-slow">
                {/* Core */}
                <circle cx="50" cy="50" r="22" className="text-orange-600 dark:text-orange-500 fill-current" />
                {/* Wireframe Orbits */}
                <g className="text-orange-700 dark:text-orange-400 opacity-60" stroke="currentColor" strokeWidth="0.5">
                    <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(0 50 50)" />
                    <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(20 50 50)" />
                    <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(40 50 50)" />
                    <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(60 50 50)" />
                    <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(80 50 50)" />
                    <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(100 50 50)" />
                    <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(120 50 50)" />
                    <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(140 50 50)" />
                    <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(160 50 50)" />
                </g>
            </svg>
        </div>

        <h1 className="font-display text-7xl md:text-9xl font-bold text-[#1c1917] dark:text-[#fafaf9] tracking-tighter mb-4 leading-none">
          Orbis
        </h1>
        
        <p className="text-stone-500 dark:text-stone-400 text-sm md:text-lg tracking-wide font-medium mb-12 max-w-md leading-relaxed">
          Your coursework, reimagined for <br/>
          <span className="text-orange-600 dark:text-orange-500 italic font-serif">effortless mastery.</span>
        </p>

        <button 
          onClick={onEnter}
          className="group relative px-10 py-4 bg-stone-900 dark:bg-stone-100 rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95 duration-300 shadow-lg hover:shadow-orange-500/20"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-orange-600 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <span className="relative text-xs md:text-sm font-bold uppercase tracking-widest text-white dark:text-stone-900 group-hover:text-white transition-colors flex items-center gap-2">
            Start Exploring
            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </span>
        </button>

      </div>
      
      {/* Footer Credits */}
      <div className="absolute bottom-8 text-[10px] md:text-xs text-stone-400 dark:text-stone-600 tracking-widest uppercase font-medium">
        v1.0 &bull; Made with passion by Darpreet Singh
      </div>

    </div>
  );
};

export default LandingView;
