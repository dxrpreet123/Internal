
import React, { useState, useEffect, useRef } from 'react';
import { CloudService } from '../services/cloud';

interface AuthViewProps {
  onLogin: () => void;
  onGuest: () => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin, onGuest, onToggleTheme, currentTheme }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone Auth State
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  
  // Recaptcha Reference to prevent re-initialization
  const recaptchaVerifierRef = useRef<any>(null);

  // Initialize Recaptcha when Phone Mode opens
  useEffect(() => {
    if (isPhoneMode && !recaptchaVerifierRef.current) {
        try {
            // Ensure the element exists before initializing
            const container = document.getElementById('recaptcha-container');
            if (container) {
                const verifier = CloudService.setupRecaptcha('recaptcha-container');
                recaptchaVerifierRef.current = verifier;
                // Pre-render the invisible widget
                verifier.render().catch((e: any) => console.warn("Recaptcha render warning:", e));
            }
        } catch (e) {
            console.error("Recaptcha Setup Error:", e);
        }
    }
    
    // Cleanup function not typically needed for firebase verifier as it attaches to window/auth instance,
    // but we reset our ref when closing phone mode to allow re-creation if needed.
    return () => {
        if (!isPhoneMode) {
             if (recaptchaVerifierRef.current) {
                 try { recaptchaVerifierRef.current.clear(); } catch(e) {}
                 recaptchaVerifierRef.current = null;
             }
        }
    };
  }, [isPhoneMode]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
        await CloudService.signInWithGoogle();
        await onLogin();
    } catch (e: any) {
        console.error(e);
        setError("Google sign in failed. Please try again.");
        setIsLoading(false);
    }
  };

  const handleSendCode = async () => {
      if (!phoneNumber || phoneNumber.length < 10) {
          setError("Please enter a valid phone number with country code (e.g., +15555555555).");
          return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
          if (!recaptchaVerifierRef.current) {
               // Fallback initialization if useEffect didn't catch it
               recaptchaVerifierRef.current = CloudService.setupRecaptcha('recaptcha-container');
          }

          const confirmation = await CloudService.signInWithPhone(phoneNumber, recaptchaVerifierRef.current);
          setConfirmationResult(confirmation);
      } catch (e: any) {
          console.error("Phone Auth Error:", e);
          if (e.code === 'auth/internal-error') {
              setError("Configuration Error. Ensure Phone Auth is enabled in Firebase Console and domain is whitelisted.");
          } else if (e.code === 'auth/invalid-phone-number') {
              setError("Invalid phone number format.");
          } else if (e.code === 'auth/billing-not-enabled') {
              setError("Project billing is not enabled. Phone Auth requires the Blaze plan (Pay-as-you-go).");
          } else if (e.code === 'auth/quota-exceeded') {
              setError("SMS quota exceeded for this project.");
          } else {
              setError(e.message || "Failed to send code. Please try again.");
          }
          
          // Reset recaptcha on error so user can try again
          if (recaptchaVerifierRef.current) {
              try { recaptchaVerifierRef.current.clear(); } catch (err) {}
              recaptchaVerifierRef.current = null;
          }
      } finally {
          setIsLoading(false);
      }
  };

  const handleVerifyOtp = async () => {
      if (!otp) return;
      setIsLoading(true);
      setError(null);
      try {
          await CloudService.verifyPhoneOTP(confirmationResult, otp);
          await onLogin();
      } catch (e: any) {
          console.error(e);
          setError("Invalid code. Please check and try again.");
          setIsLoading(false);
      }
  };

  const resetPhoneFlow = () => {
      setIsPhoneMode(false);
      setConfirmationResult(null);
      setError(null);
      setPhoneNumber('');
      setOtp('');
      if (recaptchaVerifierRef.current) {
          try { recaptchaVerifierRef.current.clear(); } catch(e) {}
          recaptchaVerifierRef.current = null;
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
                  Welcome Back
              </h1>
              <p className="text-stone-500 dark:text-stone-400 text-sm">
                  {isPhoneMode 
                    ? (confirmationResult ? "Enter the verification code." : "Enter your mobile number.") 
                    : "Continue your learning journey."}
              </p>
          </div>

          {error && (
              <div className="mb-6 text-red-600 text-xs font-bold text-center bg-red-50 dark:bg-red-900/10 py-3 px-4 rounded border border-red-100 dark:border-red-900/20">
                  {error}
              </div>
          )}

          {!isPhoneMode ? (
              // Default Auth Options
              <div className="space-y-6">
                  <button 
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold py-4 rounded-lg transition-all text-xs uppercase tracking-widest hover:bg-orange-600 dark:hover:bg-orange-500 hover:text-white dark:hover:text-white shadow-lg hover:shadow-xl hover:-translate-y-1"
                  >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                      <span>Sign in with Google</span>
                  </button>
                  
                  <button
                      onClick={() => setIsPhoneMode(true)}
                      className="w-full flex items-center justify-center gap-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white font-bold py-4 rounded-lg transition-all text-xs uppercase tracking-widest hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                      <span className="material-symbols-outlined text-sm">phone_iphone</span>
                      <span>Continue with Mobile</span>
                  </button>

                  <div className="flex flex-col items-center gap-4 mt-8">
                      <div className="relative flex py-2 items-center w-full">
                          <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                          <span className="flex-shrink-0 mx-4 text-[10px] text-stone-400 font-bold uppercase tracking-widest">Or</span>
                          <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                      </div>
                      
                      <button 
                          onClick={onGuest}
                          className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-orange-600 transition-colors"
                      >
                          Continue as Guest
                      </button>
                  </div>
              </div>
          ) : (
              // Phone Auth Mode
              <div className="space-y-6">
                  <div id="recaptcha-container"></div>
                  
                  {!confirmationResult ? (
                      // Step 1: Phone Number Input
                      <div className="space-y-4">
                          <div className="group">
                              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 group-focus-within:text-orange-600 transition-colors">Mobile Number</label>
                              <input 
                                  type="tel"
                                  value={phoneNumber}
                                  onChange={e => setPhoneNumber(e.target.value)}
                                  placeholder="+1 555 555 5555"
                                  className="w-full py-3 bg-transparent border-b border-stone-200 dark:border-stone-800 text-lg outline-none focus:border-orange-600 dark:focus:border-orange-500 text-stone-900 dark:text-white transition-colors placeholder-stone-300 dark:placeholder-stone-700 font-display"
                              />
                          </div>
                          <button 
                              onClick={handleSendCode}
                              disabled={isLoading}
                              className="w-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold py-4 rounded-lg transition-all text-xs uppercase tracking-widest hover:bg-orange-600 dark:hover:bg-orange-500 hover:text-white dark:hover:text-white shadow-lg flex items-center justify-center gap-2"
                          >
                              {isLoading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span> : <span>Send Verification Code</span>}
                          </button>
                      </div>
                  ) : (
                      // Step 2: OTP Input
                      <div className="space-y-4">
                          <div className="group">
                              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 group-focus-within:text-orange-600 transition-colors">Verification Code</label>
                              <input 
                                  type="text"
                                  value={otp}
                                  onChange={e => setOtp(e.target.value)}
                                  placeholder="123456"
                                  className="w-full py-3 bg-transparent border-b border-stone-200 dark:border-stone-800 text-lg outline-none focus:border-orange-600 dark:focus:border-orange-500 text-stone-900 dark:text-white transition-colors placeholder-stone-300 dark:placeholder-stone-700 font-display tracking-widest"
                              />
                          </div>
                          <button 
                              onClick={handleVerifyOtp}
                              disabled={isLoading}
                              className="w-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold py-4 rounded-lg transition-all text-xs uppercase tracking-widest hover:bg-orange-600 dark:hover:bg-orange-500 hover:text-white dark:hover:text-white shadow-lg flex items-center justify-center gap-2"
                          >
                               {isLoading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span> : <span>Verify & Sign In</span>}
                          </button>
                      </div>
                  )}

                  <button 
                      onClick={resetPhoneFlow}
                      className="w-full text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
                  >
                      Cancel & Go Back
                  </button>
              </div>
          )}
      </div>
    </div>
  );
};

export default AuthView;
