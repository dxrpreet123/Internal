
import React from 'react';

interface PrivacyViewProps {
  onBack: () => void;
}

const PrivacyView: React.FC<PrivacyViewProps> = ({ onBack }) => {
  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#FAFAFA] dark:bg-[#000000] font-sans text-[#1D1D1F] dark:text-[#F5F5F7] z-50 overflow-y-auto">
       <div className="sticky top-0 w-full p-6 flex justify-end z-50 pointer-events-none">
          <button 
              onClick={onBack} 
              className="pointer-events-auto w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center hover:scale-110 transition-transform"
          >
              <span className="material-symbols-rounded">close</span>
          </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-20 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-10">Privacy Policy</h1>
          
          <div className="space-y-8 text-stone-600 dark:text-stone-300 leading-relaxed text-sm md:text-base">
              <section>
                  <h3 className="text-stone-900 dark:text-white font-bold text-lg mb-2">1. Information We Collect</h3>
                  <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Account Information:</strong> Name, email address, profile picture (via Google Sign-In or email registration).</li>
                      <li><strong>Usage Data:</strong> Syllabi uploaded, chat history with AI tutor, course progress, and interaction data.</li>
                      <li><strong>Technical Data:</strong> IP address, browser type, and device information for security and analytics.</li>
                  </ul>
              </section>

              <section>
                  <h3 className="text-stone-900 dark:text-white font-bold text-lg mb-2">2. How We Use Your Information</h3>
                  <p>We use your information to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                      <li>Generate personalized course content and quizzes.</li>
                      <li>Provide AI tutoring services specific to your curriculum.</li>
                      <li>Improve the accuracy of our AI models.</li>
                      <li>Process payments and manage subscriptions.</li>
                  </ul>
              </section>

              <section>
                  <h3 className="text-stone-900 dark:text-white font-bold text-lg mb-2">3. Data Sharing and Third Parties</h3>
                  <p>We do not sell your personal data. We share data with trusted third-party service providers solely for the purpose of operating our services:</p>
                  <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Google Gemini API:</strong> For content generation and AI processing.</li>
                      <li><strong>Firebase (Google):</strong> For authentication, database storage, and hosting.</li>
                      <li><strong>Razorpay/Stripe:</strong> For secure payment processing.</li>
                  </ul>
              </section>

              <section>
                  <h3 className="text-stone-900 dark:text-white font-bold text-lg mb-2">4. Data Security</h3>
                  <p>We implement industry-standard security measures to protect your data. All data transmission is encrypted via SSL/TLS. However, no method of transmission over the internet is 100% secure.</p>
              </section>

              <section>
                  <h3 className="text-stone-900 dark:text-white font-bold text-lg mb-2">5. Your Rights</h3>
                  <p>You have the right to access, correct, or delete your personal data. You can delete your account and all associated data directly from the Profile settings in the app.</p>
              </section>

              <section>
                  <h3 className="text-stone-900 dark:text-white font-bold text-lg mb-2">6. Cookies</h3>
                  <p>We use cookies to maintain your session and preferences. You can control cookie settings through your browser.</p>
              </section>
              
              <p className="text-xs text-stone-400 mt-12 pt-12 border-t border-stone-200 dark:border-stone-800">
                  Last Updated: October 2023
              </p>
          </div>
      </div>
    </div>
  );
};

export default PrivacyView;
