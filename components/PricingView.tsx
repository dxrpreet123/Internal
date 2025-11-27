
import React from 'react';

interface PricingViewProps {
  onBack: () => void;
  onGetStarted: () => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
}

const PricingView: React.FC<PricingViewProps> = ({ onBack, onGetStarted, onToggleTheme, currentTheme }) => {
  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#fafaf9] dark:bg-[#0c0a09] font-sans text-stone-900 dark:text-white transition-colors duration-500 flex flex-col z-50">
      
       {/* Seamless Grid Pattern */}
       <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] dark:opacity-[0.05]" 
           style={{ 
             backgroundImage: `linear-gradient(to right, #808080 1px, transparent 1px), linear-gradient(to bottom, #808080 1px, transparent 1px)`, 
             backgroundSize: '40px 40px' 
           }}>
       </div>

      {/* Minimal Header */}
      <div className="w-full p-6 md:p-8 flex justify-end items-center z-50 shrink-0 relative">
          <button 
              onClick={onBack} 
              className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
          >
              <span>Close</span>
              <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform">close</span>
          </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          <div className="max-w-6xl mx-auto px-6 py-8 md:py-20 animate-dreamy-in pb-20">
            
            <div className="mb-12 md:mb-20">
                <h1 className="font-display text-4xl md:text-8xl font-bold mb-4 md:mb-6 tracking-tighter leading-none">
                    Invest in <br/> <span className="text-stone-400 dark:text-stone-600">compound growth.</span>
                </h1>
                <p className="text-base md:text-xl text-stone-500 dark:text-stone-400 max-w-xl leading-relaxed">
                    Select a plan that fits your learning velocity.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-start">
                
                {/* Free Plan */}
                <div className="flex flex-col border-t border-stone-200 dark:border-stone-800 pt-8 group">
                    <div className="flex justify-between items-baseline mb-4">
                        <h2 className="text-2xl font-bold font-display">Basic</h2>
                    </div>
                    <p className="text-sm text-stone-500 mb-8 h-10">Essential tools for casual learners.</p>
                    
                    <ul className="space-y-4 mb-12 flex-1">
                        <li className="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
                            <span className="w-1.5 h-1.5 bg-stone-300 rounded-full"></span> 3 Courses / month
                        </li>
                        <li className="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
                            <span className="w-1.5 h-1.5 bg-stone-300 rounded-full"></span> Standard Generation
                        </li>
                        <li className="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
                            <span className="w-1.5 h-1.5 bg-stone-300 rounded-full"></span> Web Access
                        </li>
                    </ul>

                    <div className="w-full py-4 text-stone-400 dark:text-stone-600 font-bold uppercase tracking-widest text-xs border-t border-transparent cursor-default">
                        Already Free
                    </div>
                </div>

                {/* Pro Plan */}
                <div className="flex flex-col border-t-2 border-orange-600 pt-8 relative">
                    <div className="absolute top-0 right-0 -mt-3 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest">Selected</div>
                    
                    <div className="flex justify-between items-baseline mb-4">
                        <h2 className="text-2xl font-bold font-display">Pro</h2>
                        <span className="text-3xl font-bold text-orange-600">$9<span className="text-base font-normal text-stone-400">/mo</span></span>
                    </div>
                    <p className="text-sm text-stone-500 mb-8 h-10">Unlimited power for serious students.</p>
                    
                    <ul className="space-y-4 mb-12 flex-1">
                         <li className="flex items-center gap-3 text-sm text-stone-900 dark:text-white font-medium">
                            <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span> Unlimited Courses
                        </li>
                        <li className="flex items-center gap-3 text-sm text-stone-900 dark:text-white font-medium">
                            <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span> Priority 4K Video
                        </li>
                        <li className="flex items-center gap-3 text-sm text-stone-900 dark:text-white font-medium">
                            <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span> Deep-Dive Mode (30+ Reels)
                        </li>
                        <li className="flex items-center gap-3 text-sm text-stone-900 dark:text-white font-medium">
                            <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span> Advanced AI Tutor
                        </li>
                        <li className="flex items-center gap-3 text-sm text-stone-900 dark:text-white font-medium">
                            <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span> PDF Exports
                        </li>
                    </ul>

                    <button onClick={onGetStarted} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-widest text-xs transition-all duration-300 shadow-lg hover:shadow-xl">
                        Upgrade
                    </button>
                </div>

            </div>
            
            <div className="mt-20 pt-10 border-t border-stone-100 dark:border-stone-800 text-center">
                 <p className="text-xs text-stone-400">Prices in USD. Cancel anytime.</p>
            </div>
          </div>
      </div>
    </div>
  );
};

export default PricingView;
