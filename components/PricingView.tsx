
import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface PricingViewProps {
  onBack: () => void;
  onGetStarted: () => void; // Used for Auth redirection
  onUpgradeSuccess: () => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
  user: User | null;
}

// --- CONFIGURATION ---
// 1. Deploy server.js to a cloud provider (e.g., Render, Railway, Heroku).
// 2. Paste the provided URL here (e.g., 'https://orbis-backend.onrender.com').
const PRODUCTION_API_URL = 'https://internal-wzbh.onrender.com'; 

const PRICING_CONFIG = {
    USD: {
        symbol: '$',
        monthly: 9,
        yearly: 89,
        free: 0
    },
    INR: {
        symbol: '₹',
        monthly: 359,
        yearly: 3599,
        free: 0
    }
};

const PricingView: React.FC<PricingViewProps> = ({ onBack, onGetStarted, onUpgradeSuccess, onToggleTheme, currentTheme, user }) => {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      // Simple heuristic to detect India based on Timezone
      try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (tz.includes('Calcutta') || tz.includes('Kolkata') || tz.includes('India')) {
              setCurrency('INR');
          }
      } catch (e) {
          console.warn("Could not detect timezone for currency");
      }
  }, []);

  const prices = PRICING_CONFIG[currency];

  const handleUpgrade = () => {
      // If user is not logged in, redirect to auth
      if (!user || user.id === 'guest') {
          onGetStarted();
          return;
      }

      handleRazorpaySubscription();
  };

  const handleRazorpaySubscription = async () => {
      // Safety Check: Ensure Razorpay SDK is loaded
      if (typeof window !== 'undefined' && !(window as any).Razorpay) {
          alert("Razorpay SDK failed to load. Please check your internet connection.");
          return;
      }

      setLoading(true);
      
      // Determine Backend URL based on Environment
      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      
      // If we are in production but haven't configured the URL yet, guide the user.
      if (!isLocal && !PRODUCTION_API_URL) {
          setLoading(false);
          const simulate = window.confirm(
              "Setup Required for Payments\n\n" +
              "To accept real payments on this domain (" + window.location.hostname + "):\n" +
              "1. Deploy 'server.js' to a cloud host (like Render or Railway).\n" +
              "2. Paste the resulting URL into the 'PRODUCTION_API_URL' variable in 'components/PricingView.tsx'.\n\n" +
              "Would you like to SIMULATE a successful upgrade for testing now?"
          );
          
          if (simulate) {
              onUpgradeSuccess();
          }
          return;
      }

      const apiBase = isLocal ? 'http://localhost:5000' : PRODUCTION_API_URL;
      
      try {
          // Attempt to connect to backend
          const subResponse = await fetch(`${apiBase}/api/payment/subscription`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  planType: billingCycle 
              })
          });

          if (!subResponse.ok) {
              const errText = await subResponse.text();
              throw new Error(`Server returned ${subResponse.status}: ${errText}`);
          }

          const subData = await subResponse.json();

          if (!subData.success) {
              throw new Error(subData.error || "Failed to create subscription");
          }

          // Open Razorpay Checkout
          const options = {
              key: subData.key_id, 
              subscription_id: subData.id, 
              name: "Orbis Scholar",
              description: `${billingCycle === 'MONTHLY' ? 'Monthly' : 'Yearly'} Membership`,
              image: "https://res.cloudinary.com/dnbwvwaoe/image/upload/v1763891408/social_zefj9u.png",
              
              handler: async function (response: any) {
                  try {
                      // Verify Subscription Payment
                      const verifyResponse = await fetch(`${apiBase}/api/payment/verify-subscription`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                              razorpay_payment_id: response.razorpay_payment_id,
                              razorpay_subscription_id: response.razorpay_subscription_id,
                              razorpay_signature: response.razorpay_signature
                          })
                      });

                      const verifyData = await verifyResponse.json();

                      if (verifyData.success) {
                          onUpgradeSuccess();
                      } else {
                          alert("Subscription verification failed: " + verifyData.error);
                      }
                  } catch (e) {
                      console.error("Verification Error", e);
                      alert("Server error during verification. Please contact support.");
                  } finally {
                      setLoading(false);
                  }
              },
              prefill: {
                  name: user?.name || "",
                  email: user?.email || "",
                  contact: "" 
              },
              theme: {
                  color: "#ea580c"
              },
              modal: {
                  ondismiss: function() {
                      setLoading(false);
                  }
              }
          };

          // @ts-ignore
          const rzp = new window.Razorpay(options);
          
          rzp.on('payment.failed', function (response: any){
                console.error(response.error);
                alert(`Payment Failed: ${response.error.description}`);
                setLoading(false);
          });

          rzp.open();

      } catch (e: any) {
          console.error("Payment Initiation Failed:", e);
          setLoading(false);

          const isNetworkError = e.message && (
              e.message.includes('Failed to fetch') || 
              e.message.includes('NetworkError') ||
              e.message.includes('Network request failed') ||
              e.message.includes('Mixed Content')
          );

          if (isNetworkError && isLocal) {
              const confirmSim = window.confirm(
                  "Backend Server Unreachable (http://localhost:5000).\n\n" +
                  "Ensure 'node server.js' is running in your terminal.\n\n" +
                  "Would you like to SIMULATE a successful upgrade for development?"
              );
              if (confirmSim) onUpgradeSuccess();
          } else {
              alert(`Payment Error: ${e.message}`);
          }
      }
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-white/95 dark:bg-black/95 backdrop-blur-3xl font-sans text-[#1D1D1F] dark:text-[#F5F5F7] z-50 overflow-y-auto">
      
      {/* Header */}
      <div className="sticky top-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
          {/* Currency Toggle */}
          <div className="pointer-events-auto bg-stone-100 dark:bg-stone-900 rounded-full p-1 flex items-center shadow-sm border border-stone-200 dark:border-stone-800">
              <button 
                  onClick={() => setCurrency('USD')}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${currency === 'USD' ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
              >
                  USD
              </button>
              <button 
                  onClick={() => setCurrency('INR')}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${currency === 'INR' ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
              >
                  INR
              </button>
          </div>

          <button 
              onClick={onBack} 
              className="pointer-events-auto w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center hover:scale-110 transition-transform shadow-md"
          >
              <span className="material-symbols-rounded">close</span>
          </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-24 pt-4 animate-fade-in">
          
          <div className="text-center mb-16">
              <span className="text-orange-600 font-bold uppercase tracking-widest text-xs mb-4 block">Plans</span>
              <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight mb-6">
                  Invest in your mind.
              </h1>
              <p className="text-xl text-stone-500 max-w-xl mx-auto mb-10">
                  Unlock the full power of the Smart Academic Dashboard.
              </p>

              {/* Billing Cycle Toggle */}
              <div className="inline-flex bg-stone-100 dark:bg-stone-900 p-1 rounded-full relative border border-stone-200 dark:border-stone-800">
                  <button 
                      onClick={() => setBillingCycle('MONTHLY')}
                      className={`px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${billingCycle === 'MONTHLY' ? 'bg-white dark:bg-stone-800 shadow-md text-stone-900 dark:text-white' : 'text-stone-500'}`}
                  >
                      Monthly
                  </button>
                  <button 
                      onClick={() => setBillingCycle('YEARLY')}
                      className={`px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${billingCycle === 'YEARLY' ? 'bg-white dark:bg-stone-800 shadow-md text-stone-900 dark:text-white' : 'text-stone-500'}`}
                  >
                      Yearly <span className="text-orange-600 ml-1">-20%</span>
                  </button>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free */}
              <div className="p-10 rounded-[2.5rem] bg-white dark:bg-[#111] border border-stone-200 dark:border-stone-800 flex flex-col relative overflow-hidden">
                  <div className="mb-8">
                      <h3 className="text-2xl font-bold mb-2">Starter</h3>
                      <div className="text-5xl font-bold font-display tracking-tight">
                          {prices.symbol}{prices.free}
                      </div>
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex gap-3 text-sm font-medium text-stone-600 dark:text-stone-400"><span className="text-stone-900 dark:text-white font-bold">3</span> Courses per Month</li>
                      <li className="flex gap-3 text-sm font-medium text-stone-600 dark:text-stone-400"><span className="text-stone-900 dark:text-white font-bold">Basic</span> Semester Planning</li>
                      <li className="flex gap-3 text-sm font-medium text-stone-600 dark:text-stone-400">Standard Definition Video</li>
                  </ul>
                  <button className="w-full py-4 border border-stone-200 dark:border-stone-800 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors">
                      {user?.tier === 'FREE' ? 'Current Plan' : 'Downgrade'}
                  </button>
              </div>

              {/* Pro */}
              <div className="p-10 rounded-[2.5rem] bg-stone-900 dark:bg-white text-white dark:text-black shadow-2xl flex flex-col relative overflow-hidden transform hover:-translate-y-2 transition-transform duration-500">
                  <div className="absolute top-0 right-0 bg-gradient-to-bl from-orange-500 to-red-600 text-white text-[10px] font-bold px-6 py-2 rounded-bl-2xl uppercase tracking-widest">
                      Best Value
                  </div>
                  <div className="mb-8">
                      <h3 className="text-2xl font-bold mb-2">Scholar</h3>
                      <div className="text-5xl font-bold font-display tracking-tight">
                          {billingCycle === 'MONTHLY' 
                            ? `${prices.symbol}${prices.monthly}` 
                            : `${prices.symbol}${prices.yearly}`
                          }
                          <span className="text-xl text-stone-500 font-normal ml-1">
                              /{billingCycle === 'MONTHLY' ? 'mo' : 'yr'}
                          </span>
                      </div>
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex gap-3 text-sm font-medium"><span className="text-orange-500 material-symbols-rounded text-lg">check</span> <span className="font-bold">Unlimited</span> Courses</li>
                      <li className="flex gap-3 text-sm font-medium"><span className="text-orange-500 material-symbols-rounded text-lg">check</span> <span className="font-bold">AI</span> Grade Forecasting</li>
                      <li className="flex gap-3 text-sm font-medium"><span className="text-orange-500 material-symbols-rounded text-lg">check</span> <span className="font-bold">4K</span> Video Export</li>
                      <li className="flex gap-3 text-sm font-medium"><span className="text-orange-500 material-symbols-rounded text-lg">check</span> <span className="font-bold">Exam Cram</span> Mode</li>
                  </ul>
                  
                  {user?.tier === 'PRO' ? (
                      <button disabled className="w-full py-4 bg-green-500 text-white rounded-full font-bold uppercase tracking-widest text-xs cursor-default">
                          Active Plan
                      </button>
                  ) : (
                      <button 
                          onClick={handleUpgrade}
                          disabled={loading}
                          className="w-full py-4 bg-white dark:bg-black text-black dark:text-white rounded-full font-bold uppercase tracking-widest text-xs hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                          {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>}
                          {loading ? 'Processing...' : 'Subscribe Now'}
                      </button>
                  )}
              </div>
          </div>

          <div className="mt-16 text-center">
              <p className="text-xs text-stone-400 max-w-lg mx-auto leading-relaxed">
                  Prices in {currency}. Local taxes may apply. Cancel anytime.
                  <br/>
                  <span className="opacity-50">Secure subscription processing via Razorpay.</span>
              </p>
          </div>

      </div>
    </div>
  );
};

export default PricingView;
