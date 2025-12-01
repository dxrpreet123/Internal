
import React, { useState } from 'react';
import { User, UserProfile, Language, VoiceName } from '../types';

interface ProfileViewProps {
  user: User;
  onBack: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onSignOut: () => void;
  onStartExamCram: () => void;
  onStartSemester: () => void;
  onUpgrade: () => void;
}

const LANGUAGES: Language[] = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Portuguese', 'Italian', 'Russian', 'Arabic'];
const VOICES: { name: VoiceName, label: string }[] = [
    { name: 'Kore', label: 'Kore (Calm)' },
    { name: 'Puck', label: 'Puck (Energetic)' },
    { name: 'Charon', label: 'Charon (Deep)' },
    { name: 'Fenrir', label: 'Fenrir (Intense)' },
    { name: 'Zephyr', label: 'Zephyr (Friendly)' },
];

const ProfileView: React.FC<ProfileViewProps> = ({ user, onBack, onUpdateProfile, onSignOut, onStartExamCram, onStartSemester, onUpgrade }) => {
  const [profile, setProfile] = useState<UserProfile>(user.profile || {
      role: 'Student',
      learningStyle: 'Visual',
      institution: '',
      degree: '',
      year: '',
      location: '',
      language: 'English',
      voice: 'Kore'
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (field: keyof UserProfile, value: any) => {
      setProfile(prev => ({ ...prev, [field]: value }));
      setHasChanges(true);
  };

  const handleSave = () => {
      onUpdateProfile(profile);
      setHasChanges(false);
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#fafaf9] dark:bg-[#0c0a09] font-sans flex flex-col z-50 overflow-y-auto">
        
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-stone-900 dark:text-white font-display">Student Profile</h1>
            </div>
            {hasChanges && (
                <button 
                    onClick={handleSave}
                    className="px-6 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                >
                    Save Changes
                </button>
            )}
        </div>

        <div className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-12 pb-24">
            
            {/* Identity Card */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-orange-600 text-white flex items-center justify-center text-4xl font-bold font-display shadow-xl">
                        {user.name[0]}
                    </div>
                </div>
                <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-1">{user.name}</h2>
                    <p className="text-stone-500 text-sm mb-3">{user.email}</p>
                    <div className="flex gap-2 justify-center md:justify-start">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${user.tier === 'PRO' ? 'bg-orange-100 text-orange-700' : 'bg-stone-200 text-stone-600'}`}>
                            {user.tier === 'PRO' ? 'Scholar Plan' : 'Starter Plan'}
                        </span>
                        {user.tier !== 'PRO' && (
                            <button onClick={onUpgrade} className="text-[10px] font-bold uppercase tracking-widest text-orange-600 hover:underline decoration-2">
                                Upgrade
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                
                {/* Academic Identity */}
                <section>
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6 border-b border-stone-200 dark:border-stone-800 pb-2">Academic Identity</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">School / College</label>
                            <input 
                                className="w-full p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-orange-500 transition-colors text-stone-900 dark:text-white font-medium"
                                value={profile.institution}
                                onChange={e => handleChange('institution', e.target.value)}
                                placeholder="Institution Name"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Class / Grade / Degree</label>
                            <input 
                                className="w-full p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-orange-500 transition-colors text-stone-900 dark:text-white font-medium"
                                value={profile.degree}
                                onChange={e => handleChange('degree', e.target.value)}
                                placeholder="e.g. 10th Grade, Computer Science"
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Current Year</label>
                                <input 
                                    className="w-full p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-orange-500 transition-colors text-stone-900 dark:text-white font-medium"
                                    value={profile.year}
                                    onChange={e => handleChange('year', e.target.value)}
                                    placeholder="e.g. 2025"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Location</label>
                                <input 
                                    className="w-full p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-orange-500 transition-colors text-stone-900 dark:text-white font-medium"
                                    value={profile.location}
                                    onChange={e => handleChange('location', e.target.value)}
                                    placeholder="City, Country"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* App Preferences */}
                <section>
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6 border-b border-stone-200 dark:border-stone-800 pb-2">App Experience</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Learning Style</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Visual', 'Theoretical', 'Practical'].map(style => (
                                    <button
                                        key={style}
                                        onClick={() => handleChange('learningStyle', style)}
                                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                                            profile.learningStyle === style 
                                            ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-stone-900 dark:border-white' 
                                            : 'border-stone-200 dark:border-stone-800 text-stone-500 hover:border-orange-500'
                                        }`}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Tutor Voice</label>
                            <select 
                                value={profile.voice}
                                onChange={e => handleChange('voice', e.target.value)}
                                className="w-full p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-orange-500 transition-colors text-stone-900 dark:text-white cursor-pointer"
                            >
                                {VOICES.map(v => <option key={v.name} value={v.name}>{v.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Language</label>
                            <select 
                                value={profile.language}
                                onChange={e => handleChange('language', e.target.value)}
                                className="w-full p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-orange-500 transition-colors text-stone-900 dark:text-white cursor-pointer"
                            >
                                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>
                </section>

                {/* Quick Mode Switcher */}
                <section className="md:col-span-2 mt-8">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6 border-b border-stone-200 dark:border-stone-800 pb-2">Academic Mode</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Exam Cram Card */}
                        <button 
                            onClick={onStartExamCram}
                            className="group relative overflow-hidden bg-red-600 rounded-2xl p-6 text-left transition-all hover:scale-[1.01] hover:shadow-xl"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-20">
                                <span className="material-symbols-outlined text-8xl text-white">emergency_home</span>
                            </div>
                            <div className="relative z-10 text-white">
                                <span className="inline-block px-2 py-1 bg-white/20 rounded text-[10px] font-bold uppercase tracking-widest mb-3">
                                    Urgent
                                </span>
                                <h4 className="text-2xl font-bold font-display mb-2">Exam Cram Mode</h4>
                                <p className="text-red-100 text-sm max-w-xs">
                                    Test tomorrow? Skip the fluff.
                                </p>
                            </div>
                        </button>

                        {/* Semester Architect Card */}
                        <button 
                            onClick={onStartSemester}
                            className="group relative overflow-hidden bg-stone-900 dark:bg-white rounded-2xl p-6 text-left transition-all hover:scale-[1.01] hover:shadow-xl border border-stone-200 dark:border-stone-800"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                <span className="material-symbols-outlined text-8xl text-white dark:text-black">architecture</span>
                            </div>
                            <div className="relative z-10 text-white dark:text-stone-900">
                                <span className="inline-block px-2 py-1 bg-white/20 dark:bg-black/10 rounded text-[10px] font-bold uppercase tracking-widest mb-3">
                                    Long Term
                                </span>
                                <h4 className="text-2xl font-bold font-display mb-2">Academic Architect</h4>
                                <p className="text-stone-400 dark:text-stone-600 text-sm max-w-xs">
                                    Plan the term. Track everything.
                                </p>
                            </div>
                        </button>

                    </div>
                </section>

                <div className="md:col-span-2 border-t border-stone-200 dark:border-stone-800 pt-8 flex justify-center">
                    <button 
                        onClick={onSignOut}
                        className="text-stone-400 hover:text-red-600 text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                        Sign Out
                    </button>
                </div>

            </div>
        </div>
    </div>
  );
};

export default ProfileView;
