
import React, { useState } from 'react';
import { CourseRequest, EducationLevel, User } from '../types';

interface IngestViewProps {
  user: User | null;
  onStart: (data: CourseRequest) => void;
  onCancel: () => void;
  loadingStatus: string;
  currentTheme: 'light' | 'dark';
}

const IngestView: React.FC<IngestViewProps> = ({ user, onStart, onCancel, loadingStatus }) => {
  const [syllabus, setSyllabus] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [notifyEmail, setNotifyEmail] = useState(true);

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const handleSubmit = () => {
    if (!syllabus.trim()) return;
    const cleanUrls = urls.filter(u => u.trim().length > 0);
    // Level and PYQ will be set in the Analysis Step, default here
    // maxReels is placeholder, will be overridden in App.tsx based on User Tier
    onStart({ syllabus, urls: cleanUrls, level: 'COLLEGE', notifyEmail: user ? notifyEmail : false, includePYQ: false, maxReels: 3 });
  };

  if (loadingStatus) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-stone-50 dark:bg-stone-950 p-6 text-center font-sans transition-colors duration-300">
         <div className="w-16 h-16 mb-8 relative">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full animate-spin">
                <circle cx="50" cy="50" r="22" className="text-orange-600 dark:text-orange-500 fill-current" />
                <g className="text-orange-700 dark:text-orange-400 opacity-60" stroke="currentColor" strokeWidth="0.5">
                   <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(0 50 50)" />
                   <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(45 50 50)" />
                   <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(90 50 50)" />
                   <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(135 50 50)" />
                </g>
            </svg>
         </div>
         <h2 className="text-lg md:text-xl font-bold text-stone-900 dark:text-white mb-2 tracking-tight font-display">Processing Input</h2>
         <p className="text-stone-500 dark:text-stone-400 mb-10 max-w-xs text-sm tracking-wide">{loadingStatus}</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-stone-50 dark:bg-stone-950 overflow-y-auto font-sans scroll-smooth transition-colors duration-300">
      <div className="flex flex-col items-center pt-4 pb-40 px-4 min-h-full">
        <div className="w-full max-w-3xl">
            
            <div className="mb-6 flex items-center justify-between">
                <button onClick={onCancel} className="text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest p-2 -ml-2">
                    <span className="material-symbols-outlined text-base">arrow_back</span> Back
                </button>
            </div>

            <div className="bg-white dark:bg-stone-900 p-6 md:p-12 border border-stone-200 dark:border-stone-800 shadow-sm transition-colors duration-300">
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-4 h-4 text-orange-600 dark:text-orange-500">
                            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                                <circle cx="50" cy="50" r="22" className="fill-current" />
                                <g className="opacity-60" stroke="currentColor" strokeWidth="0.5">
                                    <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(0 50 50)" />
                                    <ellipse cx="50" cy="50" rx="48" ry="14" transform="rotate(90 50 50)" />
                                </g>
                            </svg>
                        </div>
                        <span className="text-orange-600 dark:text-orange-500 font-bold text-[10px] tracking-widest uppercase">Step 1</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-stone-900 dark:text-white mb-3 tracking-tighter font-display">Input Curriculum</h1>
                    <p className="text-stone-500 dark:text-stone-400 text-sm md:text-base">Paste your syllabus or notes. Orbis will analyze it before generating.</p>
                </div>
                
                <div className="space-y-4 mb-8">
                    <label className="block text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">Syllabus Data</label>
                    <textarea
                        className="w-full min-h-[200px] p-5 text-sm md:text-base text-stone-900 dark:text-white bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 resize-none leading-relaxed focus:border-orange-600 dark:focus:border-orange-500 outline-none transition-all font-mono"
                        placeholder="Paste topics, notes, or full syllabus text here..."
                        value={syllabus}
                        onChange={(e) => setSyllabus(e.target.value)}
                    />
                    <div className="flex items-center justify-between px-1">
                        <p className="text-[10px] text-stone-400 uppercase tracking-wider">Plain text supported</p>
                        {user && (
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        checked={notifyEmail} 
                                        onChange={e => setNotifyEmail(e.target.checked)}
                                        className="peer h-3 w-3 cursor-pointer appearance-none border border-stone-300 dark:border-stone-700 bg-transparent checked:bg-orange-600 checked:border-orange-600 transition-all"
                                    />
                                </div>
                                <span className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 group-hover:text-orange-600 transition-colors">Email Notification</span>
                            </label>
                        )}
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <label className="block text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">External Context (Optional)</label>
                    {urls.map((url, idx) => (
                        <div key={idx} className="relative group">
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                <span className="material-symbols-outlined text-stone-400 text-lg">link</span>
                            </div>
                            <input
                                type="url"
                                className="w-full pl-12 p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-sm text-stone-900 dark:text-white focus:border-orange-600 dark:focus:border-orange-500 outline-none transition-all font-mono"
                                placeholder="https://..."
                                value={url}
                                onChange={(e) => handleUrlChange(idx, e.target.value)}
                            />
                        </div>
                    ))}
                    <div>
                        <button 
                            onClick={addUrlField}
                            className="text-orange-600 dark:text-orange-500 text-xs font-bold py-2 px-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors inline-flex items-center gap-1 uppercase tracking-wider"
                        >
                            + Add Resource
                        </button>
                    </div>
                </div>

                <div className="pt-12 mt-8 flex justify-end border-t border-stone-100 dark:border-stone-800">
                    <button
                        onClick={handleSubmit}
                        disabled={!syllabus.trim()}
                        className={`w-full md:w-auto px-10 py-4 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                            syllabus.trim() 
                            ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                        }`}
                    >
                        Analyze Syllabus
                        <span className="material-symbols-outlined text-base">analytics</span>
                    </button>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};

export default IngestView;
