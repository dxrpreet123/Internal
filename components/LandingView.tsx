

import React, { useEffect, useState } from 'react';

interface LandingViewProps {
  onEnter: () => void;
  onNavigate: (page: 'PRICING' | 'CONTACT' | 'SITEMAP') => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
}

const LandingView: React.FC<LandingViewProps> = ({ onEnter, onNavigate }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  return (
    <div className="h-[100dvh] w-full bg-[#0c0a09] flex flex-col relative overflow-hidden font-sans selection:bg-orange-500/30 selection:text-orange-200">
      
      {/* Background - Dark Brown to Black Gradient */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-stone-900 via-[#0c0a09] to-black"></div>

      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.07]" 
           style={{ 
             backgroundImage: `linear-gradient(to right, #a8a29e 1px, transparent 1px), linear-gradient(to bottom, #a8a29e 1px, transparent 1px)`, 
             backgroundSize: '60px 60px' 
           }}>
      </div>
      
      {/* Cinematic Fog/Light */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80vw] h-[40vw] bg-orange-500/10 rounded-full blur-[150px] pointer-events-none z-0 mix-blend-screen"></div>

      {/* Navbar - Minimal & High Contrast */}
      <nav 
        className={`w-full px-6 py-6 md:px-12 md:py-10 flex justify-between items-center z-50 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
          {/* Brand - Orange Logo */}
          <div className="flex items-center gap-3">
              <div className="w-5 h-5 md:w-6 md:h-6 text-orange-600">
                   <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
                        <circle cx="50" cy="50" r="14" />
                        <g className="opacity-90 stroke-current" fill="none" strokeWidth="3">
                            <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(0 50 50)" />
                            <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(60 50 50)" />
                            <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(120 50 50)" />
                        </g>
                    </svg>
              </div>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/90 font-grotesk">Orbis</span>
          </div>

          <div className="flex items-center gap-4 md:gap-12">
              <button 
                onClick={() => onNavigate('PRICING')} 
                className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 hover:text-white transition-colors duration-300"
              >
                Pricing
              </button>
              <button 
                onClick={() => onNavigate('CONTACT')} 
                className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 hover:text-white transition-colors duration-300"
              >
                Contact
              </button>
              <button 
                onClick={onEnter} 
                className="text-[10px] font-bold uppercase tracking-widest text-white hover:text-orange-500 transition-colors bg-white/5 backdrop-blur-md border border-white/10 px-6 py-2.5 rounded-full hover:bg-white/10"
              >
                Login
              </button>
          </div>
      </nav>

      {/* Main Hero Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
        
        <div className={`flex flex-col items-center text-center transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            
            {/* Center Logo - Floating */}
            <div 
                className="mb-10 md:mb-14 relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center cursor-pointer group rounded-full z-20 transition-transform duration-700 hover:scale-105" 
                onClick={onEnter}
            >
                 <div className="absolute inset-0 bg-orange-500/5 blur-2xl rounded-full group-hover:bg-orange-500/10 transition-colors duration-700"></div>
                 <div className="w-12 h-12 md:w-14 md:h-14 text-orange-600 transition-all duration-1000 group-hover:rotate-180 group-hover:text-orange-500">
                    <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
                         <circle cx="50" cy="50" r="14" />
                         <g className="opacity-90 stroke-current" fill="none" strokeWidth="3">
                             <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(0 50 50)" />
                             <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(60 50 50)" />
                             <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(120 50 50)" />
                         </g>
                    </svg>
                 </div>
            </div>

            {/* Title - Geometric Sans Serif */}
            <h1 className="font-grotesk font-bold text-5xl md:text-8xl lg:text-9xl text-white tracking-tighter mb-6 leading-[0.9] select-none mix-blend-normal">
              Study on <br className="hidden md:block" /> Autopilot.
            </h1>
            
            {/* Subtitle - Neater Font (Sans-Serif) */}
            <p className="font-sans text-lg md:text-2xl text-stone-400 mb-8 md:mb-12 max-w-2xl leading-relaxed tracking-wide font-medium">
              Turn studying into simple scrolling. One concept per swipe.
            </p>

            {/* Tagline - Small Uppercase */}
            <p className="text-orange-500/80 text-[9px] md:text-[10px] tracking-[0.3em] font-bold uppercase mb-16 relative">
               <span className="inline-block w-8 h-[1px] bg-orange-900/50 align-middle mr-3"></span>
               Designed for the Modern Scholar
               <span className="inline-block w-8 h-[1px] bg-orange-900/50 align-middle ml-3"></span>
            </p>

            {/* CTA Button */}
            <button 
              onClick={onEnter}
              className="group relative px-10 py-4 bg-white text-black text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-full hover:bg-stone-200 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] z-20 flex items-center gap-3 overflow-hidden"
            >
              <span className="relative z-10">Start Learning</span>
              <span className="material-symbols-outlined text-sm relative z-10 transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
            </button>

        </div>
      </div>
      
      {/* Minimal Footer */}
      <div className="w-full p-8 md:p-12 flex flex-col md:flex-row gap-4 md:gap-8 justify-center items-center relative z-10">
        <span className="text-[9px] text-stone-600 font-bold uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity cursor-default">
            A Darpreet Singh Build
        </span>
        <button 
            onClick={() => onNavigate('SITEMAP')}
            className="text-[9px] text-stone-600 font-bold uppercase tracking-[0.2em] opacity-40 hover:opacity-100 hover:text-orange-500 transition-all cursor-pointer"
        >
            Visual Map
        </button>
        <a 
            href="/sitemap.xml"
            target="_blank"
            className="text-[9px] text-stone-600 font-bold uppercase tracking-[0.2em] opacity-40 hover:opacity-100 hover:text-orange-500 transition-all cursor-pointer"
        >
            XML Map
        </a>
      </div>

    </div>
  );
};

export default LandingView;