
import React, { useState } from 'react';

interface ContactViewProps {
  onBack: () => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
  onNavigate?: (page: any) => void;
}

const ContactView: React.FC<ContactViewProps> = ({ onBack, onToggleTheme, currentTheme, onNavigate }) => {
  const [formState, setFormState] = useState({ name: '', email: '', subject: 'Support', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    // Simulate API
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#FAFAFA] dark:bg-[#000000] font-sans text-[#1D1D1F] dark:text-[#F5F5F7] z-50 overflow-y-auto">
       
       <div className="sticky top-0 w-full p-6 flex justify-end z-50">
          <button 
              onClick={onBack} 
              className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center hover:scale-110 transition-transform"
          >
              <span className="material-symbols-rounded">close</span>
          </button>
      </div>

      <div className="min-h-[80vh] flex flex-col md:flex-row items-center max-w-7xl mx-auto px-6 pb-20 animate-fade-in">
          
          {/* Left Text */}
          <div className="flex-1 md:pr-20 mb-12 md:mb-0">
              <h1 className="text-6xl md:text-8xl font-bold font-display tracking-tighter mb-8 leading-none">
                  Let's<br/>Talk.
              </h1>
              <p className="text-xl text-stone-500 max-w-md leading-relaxed">
                  We're here to help you optimize your academic journey. Reach out for support, partnerships, or just to say hello.
              </p>
              
              <div className="mt-12 space-y-4">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-stone-100 dark:bg-stone-900 rounded-full flex items-center justify-center">
                          <span className="material-symbols-rounded">mail</span>
                      </div>
                      <div>
                          <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Email</div>
                          <div className="font-bold">support@onorbis.com</div>
                      </div>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-stone-100 dark:bg-stone-900 rounded-full flex items-center justify-center">
                          <span className="material-symbols-rounded">location_on</span>
                      </div>
                      <div>
                          <div className="text-xs font-bold uppercase tracking-widest text-stone-400">HQ</div>
                          <div className="font-bold">San Francisco, CA</div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Right Form */}
          <div className="flex-1 w-full max-w-xl">
              {isSubmitted ? (
                  <div className="bg-green-50 dark:bg-green-900/20 p-10 rounded-[2rem] text-center">
                      <span className="material-symbols-rounded text-6xl text-green-600 mb-6">check_circle</span>
                      <h3 className="text-3xl font-bold mb-4">Message Sent</h3>
                      <p className="text-stone-500 mb-8">We'll be in touch shortly.</p>
                      <button onClick={onBack} className="text-stone-900 dark:text-white font-bold underline">Return Home</button>
                  </div>
              ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="group">
                              <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Name</label>
                              <input 
                                required
                                className="w-full bg-transparent border-b border-stone-300 dark:border-stone-700 py-3 text-xl outline-none focus:border-orange-600 transition-colors"
                                placeholder="Jane Doe"
                                value={formState.name}
                                onChange={e => setFormState({...formState, name: e.target.value})}
                              />
                          </div>
                          <div className="group">
                              <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Email</label>
                              <input 
                                required
                                type="email"
                                className="w-full bg-transparent border-b border-stone-300 dark:border-stone-700 py-3 text-xl outline-none focus:border-orange-600 transition-colors"
                                placeholder="jane@example.com"
                                value={formState.email}
                                onChange={e => setFormState({...formState, email: e.target.value})}
                              />
                          </div>
                      </div>
                      
                      <div className="group">
                          <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Subject</label>
                          <select 
                              className="w-full bg-transparent border-b border-stone-300 dark:border-stone-700 py-3 text-xl outline-none focus:border-orange-600 transition-colors cursor-pointer"
                              value={formState.subject}
                              onChange={e => setFormState({...formState, subject: e.target.value})}
                          >
                              <option className="bg-white dark:bg-black" value="Support">Technical Support</option>
                              <option className="bg-white dark:bg-black" value="Billing">Billing Question</option>
                              <option className="bg-white dark:bg-black" value="Feature">Feature Request</option>
                          </select>
                      </div>

                      <div className="group">
                          <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Message</label>
                          <textarea 
                              required
                              className="w-full bg-transparent border-b border-stone-300 dark:border-stone-700 py-3 text-xl outline-none focus:border-orange-600 transition-colors min-h-[100px] resize-none"
                              placeholder="How can we help?"
                              value={formState.message}
                              onChange={e => setFormState({...formState, message: e.target.value})}
                          />
                      </div>

                      <button type="submit" className="px-10 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold uppercase tracking-widest text-xs hover:scale-105 transition-transform shadow-lg">
                          Send Message
                      </button>
                  </form>
              )}
          </div>

      </div>
    </div>
  );
};

export default ContactView;
