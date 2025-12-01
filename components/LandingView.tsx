




import React, { useEffect, useState, Suspense, useRef } from 'react';

// Lazy Load heavy interactive component
const LandingDashboardPreview = React.lazy(() => import('./LandingDashboardPreview'));

const PRICING_CONFIG = {
    USD: {
        symbol: '$',
        monthly: 9,
        yearly: 89,
        free: 0
    },
    INR: {
        symbol: '₹',
        monthly: 359,
        yearly: 3599,
        free: 0
    }
};

interface LandingViewProps {
  onEnter: () => void;
  onNavigate: (page: 'PRICING' | 'CONTACT' | 'SITEMAP' | 'TERMS' | 'PRIVACY' | 'REFUND') => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
}

const LandingView: React.FC<LandingViewProps> = ({ onEnter, onNavigate }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'blur-0');
          entry.target.classList.remove('opacity-0', 'translate-y-10', 'scale-95', 'blur-sm');
        }
      });
    }, { threshold: 0.1, rootMargin: "-50px" });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz.includes('Calcutta') || tz.includes('Kolkata') || tz.includes('India')) {
            setCurrency('INR');
        }
    } catch (e) {}

    return () => observer.disconnect();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setIsScrolled(scrollTop > 50);
  };

  const prices = PRICING_CONFIG[currency];

  return (
    <div 
      ref={scrollRef}
      className="h-[100dvh] w-full bg-[#000000] text-[#F5F5F7] font-sans overflow-y-auto overflow-x-hidden selection:bg-orange-500/30 selection:text-orange-500 scroll-smooth relative"
      onScroll={handleScroll}
    >
      {/* --- AMBIENT BACKGROUND --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-orange-600/10 blur-[120px] rounded-full mix-blend-screen opacity-60 animate-[pulse_8s_ease-in-out_infinite]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-indigo-900/10 blur-[120px] rounded-full mix-blend-screen opacity-40"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* --- NAV --- */}
      <nav className={`fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[1000px] z-50 transition-all duration-500 rounded-full border ${isScrolled ? 'bg-black/50 border-white/10 backdrop-blur-xl py-3 px-6 shadow-2xl' : 'bg-transparent border-transparent py-4 px-0'}`}>
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={onEnter}>
                  <div className="w-10 h-10 flex items-center justify-center text-[#ea580c] group-hover:scale-110 transition-transform p-1">
                      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                        <circle cx="50" cy="50" r="14" fill="currentColor" />
                        <g stroke="currentColor" strokeWidth="3" opacity="0.9">
                            <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(0 50 50)" />
                            <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(60 50 50)" />
                            <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(120 50 50)" />
                        </g>
                      </svg>
                  </div>
                  <span className="font-bold text-lg tracking-tight font-display text-white">Orbis</span>
              </div>

              <div className="flex items-center gap-6">
                   <div className="hidden md:flex gap-8 text-xs font-bold uppercase tracking-widest text-stone-400">
                       <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth'})} className="hover:text-white transition-colors">Features</button>
                       <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth'})} className="hover:text-white transition-colors">Pricing</button>
                   </div>
                   <button onClick={onEnter} className="px-6 py-2.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-stone-200 hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2">
                       Launch App
                   </button>
              </div>
          </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="min-h-[100vh] flex flex-col justify-center items-center relative px-6 pt-32 pb-20 overflow-hidden perspective-1000">
          <div className="max-w-5xl mx-auto z-10 flex flex-col items-center text-center">
              
              {/* Badge */}
              <div className="mb-8 opacity-0 translate-y-10 blur-sm reveal transition-all duration-1000 ease-out">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors cursor-default">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                      </span>
                      <span className="text-stone-300 font-bold tracking-widest uppercase text-[10px]">
                          Meet Orbis Intelligence
                      </span>
                  </div>
              </div>
              
              {/* Headline */}
              <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-8 opacity-0 translate-y-10 blur-sm reveal transition-all duration-1000 ease-out delay-100 text-white drop-shadow-2xl">
                  The Academic<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-b from-orange-500 via-white to-white/60">Autopilot.</span>
              </h1>
              
              {/* Subheadline */}
              <p className="font-medium text-lg md:text-xl text-stone-400 max-w-2xl mx-auto leading-relaxed opacity-0 translate-y-10 blur-sm reveal transition-all duration-1000 ease-out delay-200">
                  Orbis transforms your syllabus into interactive video courses, quizzes, and flashcards instantly. Stop studying hard. Start studying smart.
              </p>

              {/* CTAs */}
              <div className="mt-12 flex flex-col sm:flex-row gap-4 opacity-0 translate-y-10 blur-sm reveal transition-all duration-1000 ease-out delay-300">
                  <button 
                    onClick={onEnter}
                    className="px-10 py-4 bg-orange-600 text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-orange-500 transition-all shadow-[0_0_40px_rgba(234,88,12,0.4)] hover:shadow-[0_0_60px_rgba(234,88,12,0.6)] active:scale-95 flex items-center justify-center gap-3 group"
                  >
                    Start Learning Free
                    <span className="material-symbols-rounded group-hover:translate-x-1 transition-transform text-lg">arrow_forward</span>
                  </button>
                  <button 
                    onClick={() => document.getElementById('preview')?.scrollIntoView({behavior: 'smooth'})}
                    className="px-10 py-4 bg-white/5 border border-white/10 text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all backdrop-blur-md flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-rounded text-lg">play_circle</span> See Demo
                  </button>
              </div>
          </div>

          {/* 3D Dashboard Preview */}
          <div id="preview" className="w-full max-w-[1100px] mt-24 opacity-0 translate-y-20 blur-sm reveal transition-all duration-1000 ease-out delay-500 perspective-1000 group">
                <div className="relative transform rotate-x-12 group-hover:rotate-x-0 transition-transform duration-[1.5s] ease-out shadow-2xl shadow-orange-900/20 rounded-[2rem] border border-white/10 bg-[#0c0a09] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-orange-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>
                    <Suspense fallback={<div className="h-[600px] bg-stone-900 rounded-[2rem] animate-pulse border border-white/5"></div>}>
                        <LandingDashboardPreview />
                    </Suspense>
                </div>
                {/* Floor Reflection/Glow */}
                <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[80%] h-24 bg-orange-500/20 blur-[80px] rounded-full z-0 opacity-50 group-hover:opacity-80 transition-opacity duration-1000"></div>
          </div>
      </section>

      {/* --- FEATURES BENTO GRID --- */}
      <section id="features" className="py-32 px-6 relative z-10 bg-black">
          <div className="max-w-6xl mx-auto">
              <div className="text-center mb-24 opacity-0 translate-y-10 blur-sm reveal transition-all duration-1000">
                  <h2 className="text-4xl md:text-6xl font-bold font-display tracking-tight mb-6 text-white">Engineered for mastery.</h2>
                  <p className="text-stone-400 text-lg max-w-xl mx-auto">A complete academic operating system designed to get you better grades in less time.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-6 grid-rows-[auto_auto]">
                  
                  {/* Card 1: Syllabus to Video (Large) */}
                  <div className="md:col-span-4 row-span-2 bg-[#0c0a09] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden group hover:border-white/20 transition-all opacity-0 translate-y-10 blur-sm reveal duration-1000 delay-100 flex flex-col justify-between min-h-[400px]">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="relative z-10">
                          <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                              <span className="material-symbols-rounded text-2xl">movie_filter</span>
                          </div>
                          <h3 className="text-3xl font-bold font-display mb-4 text-white">Syllabus to Stream</h3>
                          <p className="text-stone-400 max-w-sm leading-relaxed">Don't read 500 pages. Upload your syllabus and get a personalized, high-fidelity video course generated instantly.</p>
                      </div>
                      <div className="absolute right-0 bottom-0 w-3/4 h-3/4 translate-x-1/4 translate-y-1/4 opacity-40 group-hover:opacity-60 transition-opacity duration-700">
                           {/* Abstract visual representation of video stream */}
                           <div className="w-full h-full bg-gradient-to-tl from-orange-600/20 to-transparent rounded-tl-[100px] border-t border-l border-white/10"></div>
                      </div>
                  </div>

                  {/* Card 2: AI Tutor */}
                  <div className="md:col-span-2 bg-[#0c0a09] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-white/20 transition-colors opacity-0 translate-y-10 blur-sm reveal duration-1000 delay-200 h-full">
                      <div className="relative z-10">
                          <div className="w-10 h-10 bg-stone-800 rounded-full flex items-center justify-center text-white mb-4 border border-white/10">
                              <span className="material-symbols-rounded text-xl">psychology</span>
                          </div>
                          <h3 className="text-xl font-bold font-display mb-2 text-white">AI Professor</h3>
                          <p className="text-stone-400 text-sm">Stuck? Chat with a tutor who knows your exact curriculum context.</p>
                      </div>
                  </div>

                  {/* Card 3: Exam Cram */}
                  <div className="md:col-span-2 bg-[#0c0a09] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-red-500/30 transition-colors opacity-0 translate-y-10 blur-sm reveal duration-1000 delay-300 h-full">
                      <div className="absolute inset-0 bg-gradient-to-t from-red-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative z-10">
                          <div className="w-10 h-10 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                              <span className="material-symbols-rounded text-xl">emergency_home</span>
                          </div>
                          <h3 className="text-xl font-bold font-display mb-2 text-white">Exam Cram</h3>
                          <p className="text-stone-400 text-sm">Test tomorrow? We strip the fluff and focus purely on high-yield topics.</p>
                      </div>
                  </div>

                  {/* Card 4: Architect (Medium) */}
                  <div className="md:col-span-6 bg-[#0c0a09] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden group hover:border-white/20 transition-colors opacity-0 translate-y-10 blur-sm reveal duration-1000 delay-400 flex items-center justify-between">
                      <div className="relative z-10 max-w-xl">
                          <div className="flex items-center gap-4 mb-4">
                              <div className="w-10 h-10 bg-stone-800 rounded-full flex items-center justify-center text-white border border-white/10">
                                  <span className="material-symbols-rounded text-xl">architecture</span>
                              </div>
                              <h3 className="text-2xl font-bold font-display text-white">Semester Architect</h3>
                          </div>
                          <p className="text-stone-400 leading-relaxed">Input your deadlines and goals. Orbis builds a dynamic schedule, tracks attendance, and forecasts your GPA in real-time.</p>
                      </div>
                      <div className="hidden md:block relative w-32 h-32">
                           <div className="absolute inset-0 border-2 border-dashed border-stone-800 rounded-full animate-[spin_10s_linear_infinite]"></div>
                           <div className="absolute inset-4 border-2 border-stone-800 rounded-full"></div>
                           <div className="absolute inset-0 flex items-center justify-center font-bold text-stone-600">PLAN</div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* --- STATS TICKER --- */}
      <section className="py-20 border-y border-white/5 bg-white/[0.02] relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-around items-center gap-12 text-center opacity-0 translate-y-10 blur-sm reveal duration-1000">
              <div className="group cursor-default">
                  <div className="text-5xl md:text-7xl font-bold font-display text-white mb-2 group-hover:text-orange-500 transition-colors">20h</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-stone-500">Saved / Week</div>
              </div>
              <div className="group cursor-default">
                  <div className="text-5xl md:text-7xl font-bold font-display text-white mb-2 group-hover:text-orange-500 transition-colors">3.8+</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-stone-500">Average GPA</div>
              </div>
              <div className="group cursor-default">
                  <div className="text-5xl md:text-7xl font-bold font-display text-white mb-2 group-hover:text-orange-500 transition-colors">10x</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-stone-500">Retention</div>
              </div>
          </div>
      </section>

      {/* --- PRICING --- */}
      <section id="pricing" className="py-32 px-6 relative z-10 bg-black">
          <div className="max-w-5xl mx-auto flex flex-col items-center">
              <div className="text-center mb-16 opacity-0 translate-y-10 blur-sm reveal transition-all duration-1000">
                  <h2 className="text-4xl md:text-7xl font-bold font-display tracking-tight mb-6 text-white">
                      Invest in your mind.
                  </h2>
                  
                  <div className="inline-flex bg-white/5 backdrop-blur-md p-1 rounded-full border border-white/10 mt-8">
                      <button 
                          onClick={() => setBillingCycle('MONTHLY')}
                          className={`px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${billingCycle === 'MONTHLY' ? 'bg-white text-black shadow-lg' : 'text-stone-400 hover:text-white'}`}
                      >
                          Monthly
                      </button>
                      <button 
                          onClick={() => setBillingCycle('YEARLY')}
                          className={`px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${billingCycle === 'YEARLY' ? 'bg-white text-black shadow-lg' : 'text-stone-400 hover:text-white'}`}
                      >
                          Yearly <span className="text-orange-500 ml-1">-20%</span>
                      </button>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                  {/* Starter */}
                  <div className="p-10 rounded-[3rem] bg-[#0c0a09] border border-white/10 flex flex-col relative overflow-hidden group hover:border-white/20 transition-all opacity-0 translate-y-10 blur-sm reveal duration-1000 delay-200">
                      <div className="mb-8">
                          <h3 className="text-xl font-bold mb-2 text-stone-300">Starter</h3>
                          <div className="text-5xl font-bold font-display tracking-tight text-white">
                              {prices.symbol}{prices.free}
                          </div>
                      </div>
                      <ul className="space-y-4 mb-10 flex-1">
                          <li className="flex gap-3 text-sm font-medium text-stone-400">
                              <span className="material-symbols-rounded text-white">check</span>
                              3 Courses / Month
                          </li>
                          <li className="flex gap-3 text-sm font-medium text-stone-400">
                              <span className="material-symbols-rounded text-white">check</span>
                              Basic Dashboard
                          </li>
                      </ul>
                      <button onClick={onEnter} className="w-full py-4 border border-white/20 bg-transparent text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all">
                          Get Started Free
                      </button>
                  </div>

                  {/* Scholar */}
                  <div className="p-10 rounded-[3rem] bg-white text-black shadow-2xl shadow-white/10 flex flex-col relative overflow-hidden transform hover:-translate-y-2 transition-transform duration-500 opacity-0 translate-y-10 blur-sm reveal duration-1000 delay-300">
                      <div className="absolute top-0 right-0 bg-orange-600 text-white text-[10px] font-bold px-6 py-3 rounded-bl-3xl uppercase tracking-widest">
                          Best Value
                      </div>
                      <div className="mb-8">
                          <h3 className="text-xl font-bold mb-2">Scholar</h3>
                          <div className="text-5xl font-bold font-display tracking-tight">
                              {billingCycle === 'MONTHLY' ? `${prices.symbol}${prices.monthly}` : `${prices.symbol}${prices.yearly}`}
                              <span className="text-xl opacity-60 font-normal ml-1">
                                  /{billingCycle === 'MONTHLY' ? 'mo' : 'yr'}
                              </span>
                          </div>
                      </div>
                      <ul className="space-y-4 mb-10 flex-1">
                          <li className="flex gap-3 text-sm font-bold">
                              <span className="material-symbols-rounded text-orange-600">check</span>
                              Unlimited Courses
                          </li>
                          <li className="flex gap-3 text-sm font-bold">
                              <span className="material-symbols-rounded text-orange-600">check</span>
                              Advanced AI Models
                          </li>
                          <li className="flex gap-3 text-sm font-bold">
                              <span className="material-symbols-rounded text-orange-600">check</span>
                              4K Video Export
                          </li>
                          <li className="flex gap-3 text-sm font-bold">
                              <span className="material-symbols-rounded text-orange-600">check</span>
                              Priority Processing
                          </li>
                      </ul>
                      <button onClick={onEnter} className="w-full py-4 bg-black text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-orange-600 transition-colors shadow-xl">
                          Join Orbis Scholar
                      </button>
                  </div>
              </div>
          </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-white/5 bg-black px-6 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-6">
              Designed in San Francisco
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-xs font-bold uppercase tracking-widest text-stone-400">
              <button onClick={() => onNavigate('SITEMAP')} className="hover:text-white transition-colors">Sitemap</button>
              <button onClick={() => onNavigate('CONTACT')} className="hover:text-white transition-colors">Contact</button>
              <button onClick={() => onNavigate('TERMS')} className="hover:text-white transition-colors">Terms</button>
              <button onClick={() => onNavigate('PRIVACY')} className="hover:text-white transition-colors">Privacy</button>
              <button onClick={() => onNavigate('REFUND')} className="hover:text-white transition-colors">Refund Policy</button>
          </div>
          <p className="mt-8 text-[10px] text-stone-600 font-mono">
              © 2025 Orbis Learning Inc. All rights reserved.
          </p>
      </footer>

    </div>
  );
};

export default LandingView;