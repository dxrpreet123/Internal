




import React from 'react';
import { AppState } from '../types';

interface SitemapViewProps {
  onNavigate: (state: AppState) => void;
  onBack: () => void;
}

const SitemapView: React.FC<SitemapViewProps> = ({ onNavigate, onBack }) => {
  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#fafaf9] dark:bg-[#0c0a09] font-sans text-stone-900 dark:text-white transition-colors duration-1000 flex flex-col z-50">
      
       {/* Seamless Grid Pattern */}
       <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] dark:opacity-[0.05]" 
           style={{ 
             backgroundImage: `linear-gradient(to right, #808080 1px, transparent 1px), linear-gradient(to bottom, #808080 1px, transparent 1px)`, 
             backgroundSize: '40px 40px' 
           }}>
       </div>

       {/* Minimal Header */}
       <div className="w-full p-6 md:p-8 flex justify-between items-center z-50 shrink-0 animate-fade-in relative">
        <div className="flex items-center gap-3">
             <div className="w-5 h-5 text-orange-600">
                  <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
                       <circle cx="50" cy="50" r="14" />
                       <g className="opacity-90 stroke-current" fill="none" strokeWidth="3">
                           <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(0 50 50)" />
                           <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(60 50 50)" />
                           <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(120 50 50)" />
                       </g>
                   </svg>
             </div>
             <span className="text-xs font-bold uppercase tracking-widest">Site Map</span>
        </div>
        <button 
            onClick={onBack} 
            className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
        >
            <span>Close</span>
            <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform">close</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto z-10 custom-scrollbar p-6 md:p-12">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-24 animate-dreamy-in">
              
              {/* Public Pages */}
              <div>
                  <h3 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-6">Explore</h3>
                  <ul className="space-y-4">
                      <li>
                          <button onClick={() => onNavigate(AppState.LANDING)} className="text-2xl md:text-3xl font-bold font-display text-stone-900 dark:text-white hover:text-orange-600 transition-colors">
                              Home
                          </button>
                      </li>
                      <li>
                          <button onClick={() => onNavigate(AppState.PRICING)} className="text-2xl md:text-3xl font-bold font-display text-stone-900 dark:text-white hover:text-orange-600 transition-colors">
                              Pricing
                          </button>
                      </li>
                      <li>
                          <button onClick={() => onNavigate(AppState.CONTACT)} className="text-2xl md:text-3xl font-bold font-display text-stone-900 dark:text-white hover:text-orange-600 transition-colors">
                              Contact
                          </button>
                      </li>
                  </ul>
              </div>

              {/* Platform */}
              <div>
                  <h3 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-6">Platform</h3>
                  <ul className="space-y-4">
                      <li>
                          <button onClick={() => onNavigate(AppState.DASHBOARD)} className="text-2xl md:text-3xl font-bold font-display text-stone-900 dark:text-white hover:text-orange-600 transition-colors">
                              Dashboard
                          </button>
                      </li>
                      <li>
                          <button onClick={() => onNavigate(AppState.INGEST)} className="text-2xl md:text-3xl font-bold font-display text-stone-900 dark:text-white hover:text-orange-600 transition-colors">
                              Create Course
                          </button>
                      </li>
                       <li>
                          <button onClick={() => onNavigate(AppState.AUTH)} className="text-2xl md:text-3xl font-bold font-display text-stone-900 dark:text-white hover:text-orange-600 transition-colors">
                              Login / Sign Up
                          </button>
                      </li>
                  </ul>
              </div>

              {/* Resources / Legal */}
              <div>
                  <h3 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-6">Resources</h3>
                  <ul className="space-y-4">
                      <li>
                          <button onClick={() => onNavigate(AppState.TERMS)} className="text-2xl md:text-3xl font-bold font-display text-stone-900 dark:text-white hover:text-orange-600 transition-colors">
                              Terms of Service
                          </button>
                      </li>
                      <li>
                          <button onClick={() => onNavigate(AppState.PRIVACY)} className="text-2xl md:text-3xl font-bold font-display text-stone-900 dark:text-white hover:text-orange-600 transition-colors">
                              Privacy Policy
                          </button>
                      </li>
                      <li>
                          <button onClick={() => onNavigate(AppState.REFUND)} className="text-2xl md:text-3xl font-bold font-display text-stone-900 dark:text-white hover:text-orange-600 transition-colors">
                              Refund Policy
                          </button>
                      </li>
                  </ul>
              </div>

          </div>
      </div>

      <div className="w-full p-6 md:p-8 flex justify-center border-t border-stone-100 dark:border-stone-800 z-10">
           <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">© 2025 Orbis Learning Inc.</p>
      </div>

    </div>
  );
};

export default SitemapView;