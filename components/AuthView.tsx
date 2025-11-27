
import React, { useState } from 'react';
import { CloudService } from '../services/cloud';

interface AuthViewProps {
  onLogin: () => void;
  onGuest: () => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin, onGuest, onToggleTheme, currentTheme }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
        await onLogin();
    } catch (e) {
        setError("Google sign in failed.");
        setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);
      
      try {
          if (isSignUp) {
              if (!name) throw new Error("Name is required");
              await CloudService.signUpWithEmail(email, password, name);
          } else {
              await CloudService.signInWithEmail(email, password);
          }
      } catch (err: any) {
          console.error(err);
          setError(err.message || "Authentication failed.");
          setIsLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#fafaf9] dark:bg-[#0c0a09] flex flex-col items-center justify-center p-6 font-sans transition-colors duration-1000 relative">
      
       {/* Seamless Grid Pattern */}
       <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] dark:opacity-[0.05]" 
           style={{ 
             backgroundImage: `linear-gradient(to right, #808080 1px, transparent 1px), linear-gradient(to bottom, #808080 1px, transparent 1px)`, 
             backgroundSize: '40px 40px' 
           }}>
       </div>

      {/* Theme Toggle */}
      <button 
        onClick={onToggleTheme} 
        className="absolute top-8 right-8 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors z-20"
      >
        <span className="material-symbols-outlined text-xl">
            {currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
        </span>
      </button>

      <div className="w-full max-w-sm animate-fade-in relative z-10">
          
          <div className="mb-12 text-center">
              <div className="relative w-12 h-12 mx-auto mb-6 flex items-center justify-center text-orange-600">
                    <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
                         <circle cx="50" cy="50" r="14" />
                         <g className="opacity-90 stroke-current" fill="none" strokeWidth="3">
                             <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(0 50 50)" />
                             <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(60 50 50)" />
                             <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(120 50 50)" />
                         </g>
                    </svg>
              </div>
              <h1 className="text-3xl font-bold text-stone-900 dark:text-white font-display mb-2">
                  {isSignUp ? "Create Account" : "Welcome Back"}
              </h1>
              <p className="text-stone-500 dark:text-stone-400 text-sm">
                  {isSignUp ? "Begin your learning journey." : "Continue where you left off."}
              </p>
          </div>

          {error && (
              <div className="mb-6 text-red-600 text-xs font-bold text-center bg-red-50 dark:bg-red-900/10 py-2 rounded">
                  {error}
              </div>
          )}

          <div className="space-y-6">
              <button 
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm border border-stone-200 dark:border-stone-800 hover:border-orange-500 dark:hover:border-orange-500 text-stone-900 dark:text-white font-bold py-3.5 rounded-lg transition-all text-xs uppercase tracking-widest"
              >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                  <span>Google</span>
              </button>

              <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                  <span className="flex-shrink-0 mx-4 text-[10px] text-stone-400 font-bold uppercase tracking-widest">Or</span>
                  <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                  {isSignUp && (
                      <div>
                          <input 
                              type="text" 
                              placeholder="Full Name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              required={isSignUp}
                              className="w-full py-3 bg-transparent border-b border-stone-200 dark:border-stone-800 focus:border-orange-600 dark:focus:border-orange-500 outline-none text-stone-900 dark:text-white placeholder-stone-400 transition-colors font-display"
                          />
                      </div>
                  )}
                  <div>
                      <input 
                          type="email" 
                          placeholder="Email Address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full py-3 bg-transparent border-b border-stone-200 dark:border-stone-800 focus:border-orange-600 dark:focus:border-orange-500 outline-none text-stone-900 dark:text-white placeholder-stone-400 transition-colors font-display"
                      />
                  </div>
                  <div>
                      <input 
                          type="password" 
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="w-full py-3 bg-transparent border-b border-stone-200 dark:border-stone-800 focus:border-orange-600 dark:focus:border-orange-500 outline-none text-stone-900 dark:text-white placeholder-stone-400 transition-colors font-display"
                      />
                  </div>
                  
                  <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-orange-600 dark:hover:bg-orange-500 hover:text-white dark:hover:text-white transition-all mt-4 shadow-lg hover:shadow-xl"
                  >
                      {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                  </button>
              </form>

              <div className="flex flex-col items-center gap-4 mt-8">
                  <button 
                      onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                      className="text-stone-500 hover:text-stone-900 dark:hover:text-white text-xs transition-colors"
                  >
                      {isSignUp ? "Have an account? Sign in" : "No account? Create one"}
                  </button>
                  
                  <button 
                      onClick={onGuest}
                      className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-orange-600 transition-colors"
                  >
                      Continue as Guest
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default AuthView;
