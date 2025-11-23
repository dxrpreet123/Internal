
import React, { useState } from 'react';

interface AuthViewProps {
  onLogin: () => void;
  onGuest: () => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin, onGuest, onToggleTheme, currentTheme }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await onLogin();
  };

  return (
    <div className="h-[100dvh] w-full bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-6 font-sans transition-colors duration-300 relative fade-in">
      
      {/* Theme Toggle Corner */}
      <button 
        onClick={onToggleTheme} 
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 flex items-center justify-center hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
      >
        <span className="material-symbols-outlined">
            {currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
        </span>
      </button>

      <div className="w-full max-w-sm flex flex-col items-center">
        
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-4">
           {/* New Orbis SVG Logo */}
           <div className="w-16 h-16 text-orange-600 dark:text-orange-500">
               <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full animate-spin-slow">
                   <circle cx="50" cy="50" r="22" className="fill-current" />
                   <g className="opacity-60" stroke="currentColor" strokeWidth="0.5">
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
           <h1 className="text-4xl font-bold text-stone-900 dark:text-stone-50 tracking-tighter font-display">Orbis</h1>
        </div>

        <div className="w-full space-y-4">
            <div className="text-center mb-10">
                <h2 className="text-lg font-medium text-stone-900 dark:text-white mb-2">Welcome back.</h2>
                <p className="text-stone-500 dark:text-stone-400 text-sm">Sync your structured knowledge library.</p>
            </div>

            {/* Google Button */}
            <button 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-orange-600 dark:hover:border-orange-500 text-stone-700 dark:text-stone-200 font-medium py-4 rounded-none transition-all relative overflow-hidden group shadow-sm"
            >
                {isLoading ? (
                   <div className="w-5 h-5 border-2 border-orange-600 dark:border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" />
                        <span className="tracking-wide text-sm">Sign in with Google</span>
                    </>
                )}
            </button>

            {/* Divider */}
            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200 dark:border-stone-800"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-stone-50 dark:bg-stone-950 px-3 text-[10px] text-stone-400 dark:text-stone-600 uppercase tracking-widest font-bold">or</span>
                </div>
            </div>

            {/* Guest Button */}
            <button 
                onClick={onGuest}
                className="w-full text-stone-500 dark:text-stone-400 font-bold text-xs uppercase tracking-widest hover:text-orange-600 dark:hover:text-orange-400 py-3 transition-colors"
            >
                Continue as Guest
            </button>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
