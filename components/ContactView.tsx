

import React, { useState } from 'react';

interface ContactViewProps {
  onBack: () => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
  onNavigate?: (page: 'SITEMAP') => void;
}

const ContactView: React.FC<ContactViewProps> = ({ onBack, onToggleTheme, currentTheme, onNavigate }) => {
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    // Simulate API call
    setTimeout(() => {
        // Logic to send would go here
    }, 1000);
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#fafaf9] dark:bg-[#0c0a09] font-sans text-stone-900 dark:text-white transition-colors duration-1000 flex flex-col z-50">
      
       {/* Seamless Grid Pattern */}
       <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] dark:opacity-[0.05]" 
           style={{ 
             backgroundImage: `linear-gradient(to right, #808080 1px, transparent 1px), linear-gradient(to bottom, #808080 1px, transparent 1px)`, 
             backgroundSize: '40px 40px' 
           }}>
       </div>

       {/* Ambient Light */}
       <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-[120px]"></div>
       </div>

       {/* Minimal Header */}
       <div className="w-full p-6 md:p-8 flex justify-end items-center z-50 shrink-0 animate-fade-in relative">
        <button 
            onClick={onBack} 
            className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
        >
            <span>Close</span>
            <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform">close</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto z-10 custom-scrollbar flex flex-col items-center justify-center p-6 relative">
          <div className="w-full max-w-2xl animate-dreamy-in pb-12">
                
                <div className="mb-8 md:mb-16">
                     <span className="block text-orange-600 dark:text-orange-500 font-bold uppercase tracking-widest text-[10px] md:text-xs mb-4">Contact</span>
                     <h1 className="font-display text-4xl md:text-7xl font-bold mb-4 md:mb-6 text-stone-900 dark:text-white leading-tight">
                        Let's start a <br/> conversation.
                     </h1>
                </div>

                {isSubmitted ? (
                    <div className="py-12 border-l-2 border-green-500 pl-8 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm rounded-r-xl">
                        <h3 className="text-xl md:text-2xl font-bold mb-2 text-stone-900 dark:text-white">Message received.</h3>
                        <p className="text-stone-500 text-base md:text-lg mb-8 max-w-md">Thank you for reaching out. We'll get back to you shortly.</p>
                        <button onClick={onBack} className="text-stone-900 dark:text-white font-bold underline decoration-orange-500 underline-offset-4 hover:text-orange-600 transition-colors">Return to Home</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
                            <div className="group">
                                <label className="block text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 group-focus-within:text-orange-600 transition-colors">Your Name</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full py-3 md:py-4 bg-transparent border-b border-stone-200 dark:border-stone-800 text-lg md:text-2xl outline-none focus:border-orange-600 dark:focus:border-orange-500 text-stone-900 dark:text-white transition-colors placeholder-stone-300 dark:placeholder-stone-700 font-display"
                                    placeholder="Jane Doe"
                                    value={formState.name}
                                    onChange={e => setFormState({...formState, name: e.target.value})}
                                />
                            </div>
                            <div className="group">
                                <label className="block text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 group-focus-within:text-orange-600 transition-colors">Email Address</label>
                                <input 
                                    type="email" 
                                    required
                                    className="w-full py-3 md:py-4 bg-transparent border-b border-stone-200 dark:border-stone-800 text-lg md:text-2xl outline-none focus:border-orange-600 dark:focus:border-orange-500 text-stone-900 dark:text-white transition-colors placeholder-stone-300 dark:placeholder-stone-700 font-display"
                                    placeholder="jane@example.com"
                                    value={formState.email}
                                    onChange={e => setFormState({...formState, email: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="group">
                            <label className="block text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 group-focus-within:text-orange-600 transition-colors">Message</label>
                            <textarea 
                                required
                                className="w-full py-3 md:py-4 bg-transparent border-b border-stone-200 dark:border-stone-800 text-lg md:text-2xl outline-none focus:border-orange-600 dark:focus:border-orange-500 text-stone-900 dark:text-white transition-colors min-h-[100px] resize-none placeholder-stone-300 dark:placeholder-stone-700 font-display"
                                placeholder="Tell us about your project..."
                                value={formState.message}
                                onChange={e => setFormState({...formState, message: e.target.value})}
                            />
                        </div>
                        
                        <div className="flex flex-col md:flex-row items-center justify-between pt-4 gap-6">
                            <div className="hidden md:block text-xs text-stone-400 max-w-xs">
                                By submitting this form, you agree to our privacy policy.
                            </div>
                            <button type="submit" className="w-full md:w-auto px-8 py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold uppercase tracking-widest text-xs rounded-full hover:bg-orange-600 dark:hover:bg-orange-500 hover:text-white dark:hover:text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                                Send Request
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-16 md:mt-20 pt-10 border-t border-stone-200 dark:border-stone-800 flex flex-col md:flex-row gap-8 md:gap-16">
                    <div>
                         <span className="block text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">Email</span>
                         <a href="mailto:hello@orbis.com" className="text-base md:text-lg font-medium text-stone-900 dark:text-white hover:text-orange-600 transition-colors">hello@orbis.com</a>
                    </div>
                     {onNavigate && (
                        <div>
                            <span className="block text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">More</span>
                            <button onClick={() => onNavigate('SITEMAP')} className="text-base md:text-lg font-medium text-stone-900 dark:text-white hover:text-orange-600 transition-colors">Sitemap</button>
                        </div>
                    )}
                </div>
          </div>
      </div>
    </div>
  );
};

export default ContactView;
