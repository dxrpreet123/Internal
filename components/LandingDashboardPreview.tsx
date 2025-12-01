
import React, { useState } from 'react';

const LandingDashboardPreview: React.FC = () => {
  const [mockTab, setMockTab] = useState('HOME');
  const [insightVibe, setInsightVibe] = useState('FOCUS');

  return (
    <div 
        className="relative w-full min-h-[500px] md:min-h-0 md:aspect-[16/9] lg:aspect-[21/9] bg-[#0c0a09] rounded-[2rem] overflow-hidden"
    >
        {/* Traffic Lights (Window Controls) */}
        <div className="absolute top-6 left-6 flex gap-2 z-20 opacity-30 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]"></div>
            <div className="w-3 h-3 rounded-full bg-[#28C840]"></div>
        </div>

        <div className="absolute inset-0 flex font-sans text-white text-left">
            
            {/* Sidebar - Hidden on mobile */}
            <div className="hidden md:flex w-20 border-r border-white/5 flex-col items-center py-8 gap-8 bg-[#0c0a09] z-10 backdrop-blur-xl">
                    <div className="w-10 h-10 mb-4 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center p-1 text-[#ea580c]">
                        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                            <circle cx="50" cy="50" r="14" fill="currentColor" />
                            <g stroke="currentColor" strokeWidth="3" opacity="0.9">
                                <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(0 50 50)" />
                                <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(60 50 50)" />
                                <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(120 50 50)" />
                            </g>
                        </svg>
                    </div>
                    
                    {[
                        { id: 'HOME', icon: 'dashboard' },
                        { id: 'COURSES', icon: 'school' },
                        { id: 'CALENDAR', icon: 'calendar_month' },
                        { id: 'SETTINGS', icon: 'settings' }
                    ].map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => setMockTab(item.id)}
                            className={`p-3 rounded-xl transition-all ${mockTab === item.id ? 'bg-white/10 text-white shadow-lg shadow-white/5' : 'text-stone-500 hover:text-stone-300 hover:bg-white/5'}`}
                        >
                            <span className="material-symbols-rounded text-xl">{item.icon}</span>
                        </button>
                    ))}
            </div>

            {/* Main Dashboard Area */}
            <div className="flex-1 bg-[#0c0a09] relative overflow-y-auto md:overflow-hidden flex flex-col custom-scrollbar">
                
                {/* Top Bar */}
                <div className="h-20 flex items-center justify-end px-4 md:px-8 border-b border-white/5 bg-[#0c0a09]/80 backdrop-blur-md sticky top-0 z-10 gap-6">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-[10px] font-bold uppercase tracking-widest cursor-default">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Online
                        </div>
                        <div className="w-8 h-8 rounded-full bg-stone-800 border border-white/10 flex items-center justify-center text-xs font-bold shadow-inner cursor-pointer hover:ring-2 hover:ring-orange-600 transition-all text-white">
                            A
                        </div>
                </div>

                <div className="flex-1 p-4 md:p-8 overflow-y-auto md:overflow-hidden relative">
                    {/* Background Gradients */}
                    <div className={`absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-orange-600/5 rounded-full blur-[80px] md:blur-[120px] transition-all duration-1000 ${insightVibe === 'CHILL' ? 'opacity-0' : 'opacity-100'}`}></div>
                    <div className={`absolute bottom-0 left-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-600/5 rounded-full blur-[80px] md:blur-[120px] transition-all duration-1000 ${insightVibe === 'CHILL' ? 'opacity-100' : 'opacity-0'}`}></div>

                    <div className="max-w-4xl mx-auto relative z-10">
                        {/* Greeting */}
                        <div className="mb-6 md:mb-8 mt-4 md:mt-0">
                            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-1">Good afternoon, Alex.</h2>
                            <p className="text-stone-500 text-sm">Ready to crush your goals today?</p>
                        </div>

                        {/* Insight Widget */}
                        <div 
                            onClick={() => setInsightVibe(prev => prev === 'FOCUS' ? 'CHILL' : 'FOCUS')}
                            className={`w-full rounded-[2rem] p-6 md:p-8 relative overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl group ${insightVibe === 'FOCUS' ? 'bg-orange-600' : 'bg-emerald-600'}`}
                        >
                            {/* Decor */}
                            <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none group-hover:rotate-12 transition-transform duration-700">
                                <span className="material-symbols-rounded text-6xl md:text-8xl text-white">lightbulb</span>
                            </div>
                            <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>

                            <div className="relative z-10 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="bg-black/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg">
                                            {insightVibe} VIBE
                                        </span>
                                        <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Today</span>
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
                                        {insightVibe === 'FOCUS' ? 'Pre-Exam Power Up' : 'Recovery Mode'}
                                    </h3>
                                    <p className="text-white/90 text-sm max-w-md font-medium leading-relaxed">
                                        {insightVibe === 'FOCUS' 
                                        ? "Finals start in 3 days. High probability of Math questions on derivatives." 
                                        : "You crushed that last exam. Take the evening off to recharge."}
                                    </p>
                                </div>
                                <button className="bg-white text-black px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-xl hover:scale-105 transition-transform flex items-center gap-2">
                                    {insightVibe === 'FOCUS' ? 'Start Review' : 'Relax Now'}
                                    <span className="material-symbols-rounded text-base">arrow_forward</span>
                                </button>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pb-8 md:pb-0">
                            {/* Card 1 */}
                            <div 
                                className="bg-[#1c1917]/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5 hover:bg-[#1c1917] transition-all cursor-pointer group hover:-translate-y-1 duration-300"
                            >
                                <div className="h-32 bg-stone-800 rounded-2xl mb-4 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                                    <img 
                                        src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600" 
                                        className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" 
                                        alt="Physics"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                    <div className="absolute bottom-3 left-3 z-20">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 bg-black/40 px-2 py-1 rounded backdrop-blur-md">Physics</span>
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
                                        <span className="material-symbols-rounded text-white text-4xl drop-shadow-lg">play_circle</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-white text-sm">Quantum Mechanics</h4>
                                    <span className="text-[10px] text-stone-400 font-bold">75%</span>
                                </div>
                                <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-600 transition-all duration-500" style={{ width: '75%' }}></div>
                                </div>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-[#1c1917]/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5 hover:bg-[#1c1917] transition-all cursor-pointer group hover:-translate-y-1 duration-300">
                                <div className="h-32 bg-stone-800 rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center">
                                    <span className="material-symbols-rounded text-4xl text-stone-600 group-hover:text-white transition-colors">history_edu</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-white text-sm">World History</h4>
                                    <span className="text-[10px] text-stone-400 font-bold">12%</span>
                                </div>
                                <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: '12%' }}></div>
                                </div>
                            </div>

                            {/* Card 3 (Add) */}
                            <div className="border-2 border-dashed border-stone-800 rounded-3xl p-5 flex flex-col items-center justify-center text-stone-600 hover:text-white hover:border-orange-600/50 hover:bg-orange-600/5 transition-all cursor-pointer group min-h-[180px]">
                                <div className="w-12 h-12 rounded-full bg-stone-900 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-rounded text-2xl group-hover:text-orange-500 transition-colors">add</span>
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest">New Course</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default LandingDashboardPreview;
