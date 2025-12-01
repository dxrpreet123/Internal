
import React from 'react';

interface RefundViewProps {
  onBack: () => void;
}

const RefundView: React.FC<RefundViewProps> = ({ onBack }) => {
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
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-10">Refund Policy</h1>
          
          <div className="space-y-8 text-stone-600 dark:text-stone-300 leading-relaxed text-sm md:text-base">
              <section>
                  <h3 className="text-stone-900 dark:text-white font-bold text-lg mb-2">1. Satisfaction Guarantee</h3>
                  <p>We want you to be completely satisfied with Orbis Scholar. If you are not satisfied with the premium features, you may request a refund within <strong>14 days</strong> of your initial purchase.</p>
              </section>

              <section>
                  <h3 className="text-stone-900 dark:text-white font-bold text-lg mb-2">2. Eligibility for Refund</h3>
                  <ul className="list-disc pl-5 space-y-1">
                      <li>Refund requests must be made within 14 days of the original transaction date.</li>
                      <li>This policy applies to the first billing cycle of monthly or yearly subscriptions.</li>
                      <li>Renewal payments are non-refundable unless required by local law, but you may cancel your subscription at any time to prevent future charges.</li>
                  </ul>
              </section>

              <section>
                  <h3 className="text-stone-900 dark:text-white font-bold text-lg mb-2">3. How to Request a Refund</h3>
                  <p>To request a refund, please email our support team at <strong>support@onorbis.com</strong> with the subject line "Refund Request". Please include your account email address and transaction ID (if available).</p>
              </section>

              <section>
                  <h3 className="text-stone-900 dark:text-white font-bold text-lg mb-2">4. Processing Time</h3>
                  <p>Once your refund is approved, it will be processed immediately. Depending on your bank or payment provider, it may take 5-10 business days for the funds to appear in your account.</p>
              </section>

              <section>
                  <h3 className="text-stone-900 dark:text-white font-bold text-lg mb-2">5. Cancellation</h3>
                  <p>You can cancel your subscription at any time via the Profile settings page. Cancellation will stop future billing, and you will retain access to Scholar features until the end of your current billing period.</p>
              </section>
              
              <p className="text-xs text-stone-400 mt-12 pt-12 border-t border-stone-200 dark:border-stone-800">
                  Last Updated: October 2023
              </p>
          </div>
      </div>
    </div>
  );
};

export default RefundView;
