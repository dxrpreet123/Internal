
import React, { useState } from 'react';
import { UserProfile, OnboardingStrategy } from '../types';
import { generateOnboardingStrategy } from '../services/geminiService';

interface OnboardingViewProps {
  onComplete: (profile: UserProfile) => void;
  onStartCrashCourse?: () => void;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete, onStartCrashCourse }) => {
  const [step, setStep] = useState(0); // 0 = Choice, 1=Basic, 2=Academic, 3=Interest, 4=Loading, 5=Strategy
  const [profile, setProfile] = useState<UserProfile>({
    role: 'Student',
    learningStyle: 'Visual',
    age: '',
    institution: '',
    location: '',
    degree: '',
    year: '',
    majorInterest: ''
  });
  const [strategy, setStrategy] = useState<OnboardingStrategy | null>(null);
  const [loadingText, setLoadingText] = useState("Initializing...");

  const handleChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    if (step < 3) {
        setStep(step + 1);
    } else if (step === 3) {
        // Start Analysis
        setStep(4);
        await performAnalysis();
    }
  };

  const performAnalysis = async () => {
      const texts = [
          `Scanning ${profile.institution} forums...`,
          `Analyzing ${profile.degree} curriculum...`,
          "Finding tough subjects on Reddit...",
          "Checking exam trends...",
          "Compiling strategy..."
      ];
      
      let textIdx = 0;
      const interval = setInterval(() => {
          setLoadingText(texts[textIdx % texts.length]);
          textIdx++;
      }, 1500);

      try {
          const strat = await generateOnboardingStrategy(profile);
          setStrategy(strat);
          clearInterval(interval);
          setStep(5);
      } catch (e) {
          console.error("Strategy generation failed", e);
          // Fallback if AI fails: just finish
          onComplete(profile);
      }
  };

  const handleFinishStrategy = () => {
      onComplete({ ...profile, strategy: strategy || undefined });
  };

  const isValid = () => {
    if (step === 1) return profile.age && profile.role;
    if (step === 2) return profile.institution && profile.degree;
    if (step === 3) return profile.majorInterest;
    return true;
  };

  // Step 0: The Fork in the Road
  if (step === 0) {
      return (
        <div className="h-[100dvh] w-full bg-[#0c0a09] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden text-white">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900 via-black to-black animate-pulse"></div>
            
            <div className="relative z-10 max-w-md w-full text-center space-y-8 animate-fade-in">
                <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight leading-tight">
                    What's the situation?
                </h1>
                
                <div className="grid gap-4">
                    <button 
                        onClick={() => onStartCrashCourse && onStartCrashCourse()}
                        className="group relative overflow-hidden bg-red-600 hover:bg-red-700 p-6 rounded-2xl text-left transition-all hover:scale-[1.02] shadow-2xl shadow-red-900/20"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="material-symbols-rounded text-3xl">emergency</span>
                            <span className="bg-white/20 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Emergency</span>
                        </div>
                        <h3 className="text-2xl font-bold font-display">Exam in 24 Hours</h3>
                        <p className="text-red-100 text-sm mt-1">Skip setup. Build a crash course now.</p>
                    </button>

                    <button 
                        onClick={() => setStep(1)}
                        className="group bg-stone-900 hover:bg-stone-800 border border-stone-800 p-6 rounded-2xl text-left transition-all hover:scale-[1.02]"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="material-symbols-rounded text-3xl text-green-500">calendar_month</span>
                            <span className="bg-stone-800 text-stone-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Planning</span>
                        </div>
                        <h3 className="text-2xl font-bold font-display">New Term</h3>
                        <p className="text-stone-400 text-sm mt-1">Architect your schedule and goals.</p>
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // Step 4: Loading Analysis
  if (step === 4) {
      return (
          <div className="h-[100dvh] w-full bg-black flex flex-col items-center justify-center font-sans text-white relative">
              <div className="w-24 h-24 border-t-4 border-orange-600 border-solid rounded-full animate-spin mb-8"></div>
              <h2 className="text-2xl font-bold font-display animate-pulse">{loadingText}</h2>
              <div className="mt-8 max-w-sm w-full bg-stone-900 rounded-full h-1 overflow-hidden">
                  <div className="h-full bg-orange-600 animate-[loading_2s_ease-in-out_infinite]"></div>
              </div>
          </div>
      )
  }

  // Step 5: Strategy Reveal
  if (step === 5 && strategy) {
      return (
          <div className="h-[100dvh] w-full bg-[#0c0a09] flex flex-col font-sans text-white overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
                  <div className="max-w-2xl mx-auto animate-[slideUp_0.5s_ease-out]">
                      <div className="mb-8">
                          <span className="text-orange-500 font-bold uppercase tracking-widest text-xs mb-2 block">Orbis Intelligence Report</span>
                          <h1 className="text-4xl md:text-5xl font-bold font-display leading-tight">
                              Here is the truth about your term.
                          </h1>
                      </div>

                      <div className="grid gap-6">
                          {/* Tough Subjects */}
                          <div className="bg-red-900/10 border border-red-900/30 p-6 rounded-2xl">
                              <div className="flex items-center gap-3 mb-4">
                                  <span className="material-symbols-rounded text-red-500 text-2xl">warning</span>
                                  <h3 className="text-lg font-bold text-red-100">Danger Zones</h3>
                              </div>
                              <p className="text-stone-400 text-sm mb-4">Students online consistently report these subjects as high-fail:</p>
                              <div className="flex flex-wrap gap-2">
                                  {strategy.toughSubjects.map(sub => (
                                      <span key={sub} className="px-3 py-1 bg-red-500/20 text-red-300 rounded text-sm font-bold border border-red-500/30">{sub}</span>
                                  ))}
                              </div>
                          </div>

                          {/* Advice */}
                          <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl">
                              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                                  <span className="material-symbols-rounded text-orange-500">forum</span>
                                  Word on Campus
                              </h3>
                              <p className="text-stone-300 italic leading-relaxed">"{strategy.generalAdvice}"</p>
                          </div>

                          {/* Career Tip */}
                          <div className="bg-gradient-to-br from-green-900/20 to-stone-900 border border-green-900/30 p-6 rounded-2xl">
                              <div className="flex items-center gap-3 mb-3">
                                  <span className="material-symbols-rounded text-green-500 text-2xl">paid</span>
                                  <h3 className="text-lg font-bold text-green-100">Strategic Move</h3>
                              </div>
                              <p className="text-green-50 font-medium">{strategy.careerTip}</p>
                          </div>
                      </div>
                  </div>
              </div>
              
              <div className="p-6 border-t border-stone-800 bg-[#0c0a09] shrink-0 flex justify-end">
                  <button 
                      onClick={handleFinishStrategy}
                      className="px-8 py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs hover:bg-stone-200 transition-colors flex items-center gap-2"
                  >
                      Open Dashboard <span className="material-symbols-rounded">arrow_forward</span>
                  </button>
              </div>
          </div>
      )
  }

  // Regular Wizard Steps
  return (
    <div className="h-[100dvh] w-full bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl overflow-hidden animate-fade-in relative flex flex-col max-h-[90vh]">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-stone-100 dark:bg-stone-800">
           <div 
             className="h-full bg-orange-600 dark:bg-orange-500 transition-all duration-500" 
             style={{ width: `${(step / 3) * 100}%` }}
           ></div>
        </div>

        <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar">
           <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-500 rounded-full flex items-center justify-center mb-6 shrink-0">
              <span className="material-symbols-outlined text-2xl">
                 {step === 1 ? 'person' : step === 2 ? 'school' : 'psychology'}
              </span>
           </div>
           
           <h1 className="text-3xl font-bold text-stone-900 dark:text-white font-display mb-2">
             {step === 1 ? "Who are you?" : step === 2 ? "Academic Profile" : "Final Touches"}
           </h1>
           <p className="text-stone-500 dark:text-stone-400 mb-8">
             {step === 1 ? "Basic details for your profile." : 
              step === 2 ? "We'll search online for insights about your specific academic year." : 
              "Tailoring the AI persona."}
           </p>

           <div className="space-y-6">
              {step === 1 && (
                <>
                   <div>
                       <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">I am a</label>
                       <div className="flex gap-2">
                           {['Student', 'Professional', 'Lifelong Learner'].map(r => (
                               <button 
                                 key={r}
                                 onClick={() => handleChange('role', r as any)}
                                 className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border rounded transition-all ${
                                     profile.role === r 
                                     ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-stone-900 dark:border-white' 
                                     : 'bg-transparent border-stone-200 dark:border-stone-700 text-stone-500 hover:border-orange-500'
                                 }`}
                               >
                                   {r}
                               </button>
                           ))}
                       </div>
                   </div>
                   <div>
                       <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Age</label>
                       <input 
                         type="number" 
                         value={profile.age}
                         onChange={e => handleChange('age', e.target.value)}
                         className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                         placeholder="e.g. 15, 21"
                       />
                   </div>
                </>
              )}

              {step === 2 && (
                 <>
                    <div>
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">School / College / Institution</label>
                        <input 
                            type="text" 
                            value={profile.institution}
                            onChange={e => handleChange('institution', e.target.value)}
                            className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                            placeholder="e.g. Lincoln High, Stanford"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Location (City)</label>
                        <input 
                            type="text" 
                            value={profile.location}
                            onChange={e => handleChange('location', e.target.value)}
                            className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                            placeholder="e.g. Austin"
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Class / Grade / Degree</label>
                            <input 
                                type="text" 
                                value={profile.degree}
                                onChange={e => handleChange('degree', e.target.value)}
                                className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                                placeholder="e.g. 10th Grade, B.Sc"
                            />
                        </div>
                        <div className="w-1/3">
                            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Year</label>
                            <input 
                                type="text" 
                                value={profile.year}
                                onChange={e => handleChange('year', e.target.value)}
                                className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                                placeholder="e.g. 2025"
                            />
                        </div>
                    </div>
                 </>
              )}

              {step === 3 && (
                  <>
                    <div>
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Passions & Interests</label>
                        <textarea
                            value={profile.majorInterest}
                            onChange={e => handleChange('majorInterest', e.target.value)}
                            className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded outline-none focus:border-orange-500 text-stone-900 dark:text-white h-24 resize-none"
                            placeholder="e.g. Coding, Space, Startups, History..."
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Learning Style</label>
                        <div className="grid gap-2">
                            {['Visual', 'Theoretical', 'Practical'].map(style => (
                                <button
                                    key={style}
                                    onClick={() => handleChange('learningStyle', style as any)}
                                    className={`p-3 border rounded-xl text-left text-sm transition-all ${
                                        profile.learningStyle === style 
                                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-600 dark:border-orange-500 text-orange-700 dark:text-orange-400 font-bold' 
                                        : 'bg-transparent border-stone-200 dark:border-stone-700 text-stone-500 hover:border-orange-400'
                                    }`}
                                >
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>
                  </>
              )}
           </div>

           <div className="mt-10 flex justify-end">
               <button 
                 onClick={handleNext}
                 disabled={!isValid()}
                 className={`px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs transition-colors shadow-lg ${
                     isValid() 
                     ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:scale-105 transform' 
                     : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                 }`}
               >
                   {step === 3 ? 'Analyze Strategy' : 'Next'}
               </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;
