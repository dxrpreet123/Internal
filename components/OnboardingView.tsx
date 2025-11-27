
import React, { useState } from 'react';
import { UserProfile } from '../types';

interface OnboardingViewProps {
  onComplete: (profile: UserProfile) => void;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>({
    role: 'Student',
    learningStyle: 'Visual',
    age: '',
    institution: '',
    majorInterest: ''
  });

  const handleChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else onComplete(profile);
  };

  const isValid = () => {
    if (step === 1) return profile.age && profile.institution;
    if (step === 2) return profile.majorInterest;
    return true;
  };

  return (
    <div className="h-[100dvh] w-full bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl overflow-hidden animate-fade-in relative">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-stone-100 dark:bg-stone-800">
           <div 
             className="h-full bg-orange-600 dark:bg-orange-500 transition-all duration-500" 
             style={{ width: `${(step / 3) * 100}%` }}
           ></div>
        </div>

        <div className="p-8 md:p-12">
           <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-500 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-2xl">
                 {step === 1 ? 'person' : step === 2 ? 'school' : 'psychology'}
              </span>
           </div>
           
           <h1 className="text-3xl font-bold text-stone-900 dark:text-white font-display mb-2">
             {step === 1 ? "Who are you?" : step === 2 ? "What inspires you?" : "How do you learn?"}
           </h1>
           <p className="text-stone-500 dark:text-stone-400 mb-8">
             {step === 1 ? "Tell us a bit about yourself to tailor your experience." : 
              step === 2 ? "This helps Orbis suggest relevant coursework." : 
              "We'll adjust the AI tone based on your preference."}
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
                                 onClick={() => handleChange('role', r)}
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
                   <div className="flex gap-4">
                       <div className="w-1/3">
                           <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Age</label>
                           <input 
                             type="number" 
                             value={profile.age}
                             onChange={e => handleChange('age', e.target.value)}
                             className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                             placeholder="21"
                           />
                       </div>
                       <div className="flex-1">
                           <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Institution / Company</label>
                           <input 
                             type="text" 
                             value={profile.institution}
                             onChange={e => handleChange('institution', e.target.value)}
                             className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded outline-none focus:border-orange-500 text-stone-900 dark:text-white"
                             placeholder="University of California"
                           />
                       </div>
                   </div>
                </>
              )}

              {step === 2 && (
                 <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Major Interest / Field of Study</label>
                    <input 
                        type="text" 
                        value={profile.majorInterest}
                        onChange={e => handleChange('majorInterest', e.target.value)}
                        className="w-full p-4 text-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded outline-none focus:border-orange-500 text-stone-900 dark:text-white font-display"
                        placeholder="e.g. Astrophysics, Medieval History, React Development..."
                    />
                 </div>
              )}

              {step === 3 && (
                  <div className="grid gap-3">
                      {['Visual', 'Theoretical', 'Practical'].map(style => (
                          <button
                            key={style}
                            onClick={() => handleChange('learningStyle', style as any)}
                            className={`p-4 border rounded-xl text-left transition-all ${
                                profile.learningStyle === style 
                                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-600 dark:border-orange-500' 
                                : 'bg-transparent border-stone-200 dark:border-stone-700 hover:border-orange-400'
                            }`}
                          >
                              <div className="flex items-center justify-between mb-1">
                                  <span className={`text-sm font-bold uppercase tracking-wide ${profile.learningStyle === style ? 'text-orange-700 dark:text-orange-400' : 'text-stone-700 dark:text-stone-300'}`}>
                                      {style} Learner
                                  </span>
                                  {profile.learningStyle === style && <span className="material-symbols-outlined text-orange-600 text-sm">check_circle</span>}
                              </div>
                              <p className="text-xs text-stone-500 dark:text-stone-400">
                                  {style === 'Visual' ? 'Prefers diagrams, animations, and video content.' : 
                                   style === 'Theoretical' ? 'Prefers deep dives into concepts, history, and definitions.' : 
                                   'Prefers real-world examples, case studies, and application.'}
                              </p>
                          </button>
                      ))}
                  </div>
              )}
           </div>

           <div className="mt-10 flex justify-end">
               <button 
                 onClick={handleNext}
                 disabled={!isValid()}
                 className={`px-8 py-3 rounded font-bold uppercase tracking-widest text-xs transition-colors ${
                     isValid() 
                     ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-orange-600 dark:hover:bg-orange-500' 
                     : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                 }`}
               >
                   {step === 3 ? 'Finish Setup' : 'Continue'}
               </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;
