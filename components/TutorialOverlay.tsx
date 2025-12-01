
import React, { useState, useEffect, useRef } from 'react';

export interface TutorialStep {
  target: string; // data-tour attribute value, empty string for center modal
  title: string;
  content: string;
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ steps, onComplete, onSkip }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ 
      top: number; 
      left: number; 
      placement: 'top' | 'bottom' | 'center';
      arrowOffset: number;
  }>({ top: 0, left: 0, placement: 'center', arrowOffset: 0 });

  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    const updatePosition = () => {
      if (!currentStep.target) {
        setRect(null);
        setTooltipPos({ top: 0, left: 0, placement: 'center', arrowOffset: 0 });
        return;
      }

      const element = document.querySelector(`[data-tour="${currentStep.target}"]`);
      if (element) {
        // Scroll element into view smoothly
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

        const r = element.getBoundingClientRect();
        setRect(r);

        // Determine dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Tooltip dimensions (approximate or max)
        const tooltipWidth = Math.min(350, viewportWidth * 0.9);
        const tooltipHeight = 250; // Estimate
        const padding = 20; // Safe distance from edges

        // --- Horizontal Positioning ---
        const targetCenterX = r.left + (r.width / 2);
        
        // Clamp center X to ensure tooltip fits within viewport width
        // Left edge of tooltip = center - width/2. Must be >= padding.
        // Right edge of tooltip = center + width/2. Must be <= viewportWidth - padding.
        const minCenterX = (tooltipWidth / 2) + padding;
        const maxCenterX = viewportWidth - (tooltipWidth / 2) - padding;
        
        const tooltipCenterX = Math.max(minCenterX, Math.min(targetCenterX, maxCenterX));
        
        // Calculate arrow offset (relative to tooltip center)
        // If tooltip is shifted left relative to target, arrow needs to shift right (positive)
        const arrowOffset = targetCenterX - tooltipCenterX;
        
        // Clamp arrow to keep it within the rounded corners
        const maxArrowOffset = (tooltipWidth / 2) - 30;
        const clampedArrowOffset = Math.max(-maxArrowOffset, Math.min(arrowOffset, maxArrowOffset));

        // --- Vertical Positioning ---
        const spaceBelow = viewportHeight - r.bottom;
        const spaceAbove = r.top;
        
        let top = 0;
        let placement: 'top' | 'bottom' = 'bottom';

        if (spaceBelow >= tooltipHeight + 20) {
            // Prefer bottom
            top = r.bottom + 16;
            placement = 'bottom';
        } else if (spaceAbove >= tooltipHeight + 20) {
            // Place on top if no space below
            top = r.top - 16;
            placement = 'top';
        } else {
            // Fallback: Place where there is more space or center if element is huge
            if (spaceBelow > spaceAbove) {
                top = r.bottom + 16;
                placement = 'bottom';
            } else {
                top = r.top - 16;
                placement = 'top';
            }
        }

        setTooltipPos({ 
            top, 
            left: tooltipCenterX, 
            placement, 
            arrowOffset: clampedArrowOffset 
        });

      } else {
        // Target not found, fallback to center
        setRect(null);
        setTooltipPos({ top: 0, left: 0, placement: 'center', arrowOffset: 0 });
      }
    };

    // Initial delay to allow rendering/transitions
    const t = setTimeout(updatePosition, 300);
    window.addEventListener('resize', updatePosition);
    return () => {
        window.removeEventListener('resize', updatePosition);
        clearTimeout(t);
    };
  }, [currentStepIndex, steps]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
      if (currentStepIndex > 0) {
          setCurrentStepIndex(prev => prev - 1);
      }
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden font-sans" role="dialog" aria-modal="true">
      
      {/* Spotlight Effect - Mask */}
      {rect ? (
          <div 
             className="absolute inset-0 transition-all duration-500 ease-in-out"
             style={{
                 // Using a massive shadow to create the spotlight mask
                 boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.75)`,
                 borderRadius: '16px',
                 top: rect.top - 4, // Slight padding around target
                 left: rect.left - 4,
                 width: rect.width + 8,
                 height: rect.height + 8,
                 pointerEvents: 'none',
                 zIndex: 100
             }}
          ></div>
      ) : (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-all duration-500 z-[100]"></div>
      )}

      {/* Tooltip Card */}
      <div 
        className={`absolute transition-all duration-500 ease-out w-[90vw] md:w-[350px] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-6 flex flex-col z-[101] ${
            tooltipPos.placement === 'center' 
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' 
            : tooltipPos.placement === 'top' 
                ? '-translate-x-1/2 -translate-y-full' 
                : '-translate-x-1/2'
        }`}
        style={tooltipPos.placement !== 'center' ? { top: tooltipPos.top, left: tooltipPos.left } : {}}
      >
          {/* Arrow */}
          {tooltipPos.placement !== 'center' && (
              <div 
                className={`absolute w-4 h-4 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 rotate-45 transition-all duration-500 ${
                    tooltipPos.placement === 'top' 
                    ? 'bottom-[-9px] border-b border-r' 
                    : 'top-[-9px] border-t border-l'
                }`}
                style={{ left: `calc(50% + ${tooltipPos.arrowOffset}px)`, transform: 'translateX(-50%) rotate(45deg)' }}
              ></div>
          )}

          <div className="flex justify-between items-start mb-4">
               <div className="flex items-center gap-3">
                   <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-600 text-white text-xs font-bold shadow-lg">
                       {currentStepIndex + 1}
                   </div>
                   <h3 className="font-bold text-stone-900 dark:text-white font-display text-lg tracking-tight">{currentStep.title}</h3>
               </div>
               <button onClick={onSkip} className="text-[10px] font-bold text-stone-400 hover:text-stone-900 dark:hover:text-white uppercase tracking-widest transition-colors px-2 py-1">Skip</button>
          </div>

          <p className="text-stone-600 dark:text-stone-300 text-sm mb-8 leading-relaxed font-medium">
              {currentStep.content}
          </p>

          <div className="flex justify-between items-center mt-auto pt-2">
               <button 
                  onClick={handleBack}
                  disabled={currentStepIndex === 0}
                  className="text-stone-400 hover:text-stone-900 dark:hover:text-white text-xs font-bold uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
               >
                   Back
               </button>
               
               <div className="flex gap-1.5">
                    {steps.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStepIndex ? 'w-6 bg-orange-600' : 'w-1.5 bg-stone-200 dark:bg-stone-800'}`}></div>
                    ))}
               </div>

               <button 
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-bold uppercase tracking-widest rounded-full transition-all hover:scale-105 shadow-md flex items-center gap-2"
               >
                   {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                   {currentStepIndex !== steps.length - 1 && <span className="material-symbols-rounded text-sm">arrow_forward</span>}
               </button>
          </div>
      </div>

    </div>
  );
};

export default TutorialOverlay;
