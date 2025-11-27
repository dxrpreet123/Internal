

import React, { useState } from 'react';
import { Course, Flashcard } from '../types';

interface FlashcardOverlayProps {
    course: Course;
    onClose: () => void;
}

const FlashcardOverlay: React.FC<FlashcardOverlayProps> = ({ course, onClose }) => {
    // Extract valid flashcards from reels
    const cards = course.reels.filter(r => r.flashcard).map(r => r.flashcard!) || [];
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [direction, setDirection] = useState<'left' | 'right' | null>(null);

    if (cards.length === 0) {
        return (
            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
                 <div className="bg-white dark:bg-stone-900 rounded-2xl p-8 text-center max-w-sm w-full">
                    <span className="material-symbols-outlined text-4xl text-stone-400 mb-4">style</span>
                    <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2">No Flashcards Yet</h3>
                    <p className="text-stone-500 mb-6 text-sm">Generate more modules to create a flashcard deck.</p>
                    <button onClick={onClose} className="w-full py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-lg font-bold uppercase tracking-widest text-xs">Close</button>
                 </div>
            </div>
        )
    }

    const handleNext = (swipeDir: 'left' | 'right') => {
        setIsFlipped(false);
        setDirection(swipeDir);
        setTimeout(() => {
            if (currentIndex < cards.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                // End of deck
                setCurrentIndex(0); 
            }
            setDirection(null);
        }, 300);
    };

    const currentCard = cards[currentIndex];
    const progress = ((currentIndex + 1) / cards.length) * 100;

    return (
        <div className="fixed inset-0 z-50 bg-[#0c0a09] flex flex-col items-center justify-center font-sans overflow-hidden">
            
            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-orange-900/30 text-orange-500 flex items-center justify-center border border-orange-500/20">
                        <span className="material-symbols-outlined text-sm">style</span>
                     </div>
                     <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">{currentIndex + 1} / {cards.length}</span>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-stone-900 border border-stone-800 text-stone-400 hover:text-white flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Card Container */}
            <div className="relative w-full max-w-md h-[60vh] px-6 perspective-1000">
                <div 
                    onClick={() => setIsFlipped(!isFlipped)}
                    className={`w-full h-full relative preserve-3d transition-transform duration-500 cursor-pointer ${isFlipped ? 'rotate-y-180' : ''} ${direction === 'left' ? '-translate-x-[150%] rotate-[-20deg] opacity-0' : direction === 'right' ? 'translate-x-[150%] rotate-[20deg] opacity-0' : ''}`}
                >
                    {/* Front */}
                    <div className="absolute inset-0 backface-hidden bg-stone-900 border border-stone-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
                         <span className="material-symbols-outlined text-orange-600 text-4xl mb-6">help</span>
                         <h2 className="text-2xl md:text-3xl font-bold text-white font-display leading-tight">{currentCard.front}</h2>
                         <p className="absolute bottom-8 text-stone-500 text-xs uppercase tracking-widest font-bold">Tap to flip</p>
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-orange-600 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
                        <span className="material-symbols-outlined text-white/50 text-4xl mb-6">lightbulb</span>
                        <h2 className="text-xl md:text-2xl font-medium text-white leading-relaxed">{currentCard.back}</h2>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-12 w-full max-w-md px-8 flex justify-between items-center gap-6">
                 <button onClick={() => handleNext('left')} className="flex-1 py-4 rounded-xl bg-stone-900 border border-stone-800 text-red-400 font-bold uppercase tracking-widest text-xs hover:bg-stone-800 transition-colors flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined">close</span>
                    Still Learning
                 </button>
                 <button onClick={() => handleNext('right')} className="flex-1 py-4 rounded-xl bg-stone-100 text-stone-900 font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined">check</span>
                    Got It
                 </button>
            </div>
            
            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-stone-900">
                <div className="h-full bg-orange-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>

        </div>
    );
};

export default FlashcardOverlay;