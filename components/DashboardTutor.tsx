
import React, { useState, useRef, useEffect } from 'react';
import { Course, ChatMessage } from '../types';
import { chatWithDashboardTutor } from '../services/geminiService';

interface DashboardTutorProps {
    courses: Course[];
    username: string;
}

const DashboardTutor: React.FC<DashboardTutorProps> = ({ courses, username }) => {
    const [step, setStep] = useState<'SELECT' | 'CHAT'>('SELECT');
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const availableCourses = courses.filter(c => !c.deletedAt);

    const handleSelectCourse = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        if (course) {
            setSelectedCourse(course);
            setStep('CHAT');
            setChatHistory([{
                id: 'init',
                role: 'model',
                text: `Okay, let's study "${course.title}". What specific topic is confusing you? Or ask me to quiz you!`
            }]);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim() || !selectedCourse) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputValue };
        setChatHistory(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        try {
            // Context Construction: Flatten Reel Data
            const contextData = selectedCourse.reels.map(r => `Module: ${r.title}\nConcept: ${r.keyConcept}\nScript: ${r.script}\n`).join('\n---\n');
            
            const response = await chatWithDashboardTutor(userMsg.text, chatHistory, selectedCourse.title, contextData);
            
            const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'model', text: response };
            setChatHistory(prev => [...prev, aiMsg]);
        } catch (e) {
            console.error(e);
            setChatHistory(prev => [...prev, { id: 'err', role: 'model', text: "I'm having trouble connecting. Check your internet." }]);
        } finally {
            setIsTyping(false);
        }
    };

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        
        // Render Math
        if (scrollRef.current && (window as any).renderMathInElement) {
            setTimeout(() => {
                if (scrollRef.current) {
                    (window as any).renderMathInElement(scrollRef.current, {
                        delimiters: [
                            {left: '$$', right: '$$', display: true},
                            {left: '$', right: '$', display: false},
                            {left: '\\(', right: '\\)', display: false},
                            {left: '\\[', right: '\\]', display: true}
                        ],
                        throwOnError: false
                    });
                }
            }, 50);
        }
    }, [chatHistory, isTyping]);

    return (
        <div className="w-full bg-white dark:bg-stone-900 rounded-[2rem] p-6 md:p-8 shadow-sm border border-stone-200 dark:border-stone-800 flex flex-col h-[400px] overflow-hidden relative">
            
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 shrink-0 z-10">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full flex items-center justify-center">
                    <span className="material-symbols-rounded">school</span>
                </div>
                <div>
                    <h3 className="font-bold text-stone-900 dark:text-white font-display text-lg">AI Professor</h3>
                    <p className="text-xs text-stone-500">Your personal academic guide.</p>
                </div>
                {step === 'CHAT' && (
                    <button onClick={() => setStep('SELECT')} className="ml-auto text-xs font-bold text-stone-400 hover:text-stone-900 dark:hover:text-white uppercase tracking-widest transition-colors">
                        Change Subject
                    </button>
                )}
            </div>

            {/* Content */}
            {step === 'SELECT' ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <p className="text-stone-900 dark:text-white font-medium mb-4 text-lg">Hi {username}, what are we mastering today?</p>
                    <div className="space-y-3">
                        {availableCourses.length === 0 ? (
                            <div className="text-center py-8 text-stone-400">
                                <p className="text-sm">No courses yet. Generate one to start tutoring.</p>
                            </div>
                        ) : (
                            availableCourses.map(course => (
                                <button
                                    key={course.id}
                                    onClick={() => handleSelectCourse(course.id)}
                                    className="w-full p-4 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 text-left transition-all group"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-stone-700 dark:text-stone-300 group-hover:text-orange-700 dark:group-hover:text-orange-400">{course.title}</span>
                                        <span className="material-symbols-rounded text-stone-300 group-hover:text-orange-500">arrow_forward</span>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">{course.totalReels} Modules</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Chat Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar pb-4">
                        {chatHistory.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                                    msg.role === 'user' 
                                    ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white rounded-br-none' 
                                    : 'bg-orange-50 dark:bg-orange-900/10 text-stone-800 dark:text-stone-200 rounded-bl-none border border-orange-100 dark:border-orange-900/30'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-2xl rounded-bl-none border border-orange-100 dark:border-orange-900/30">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="mt-auto pt-4 border-t border-stone-100 dark:border-stone-800 flex gap-2">
                        <input 
                            className="flex-1 bg-stone-50 dark:bg-stone-800 rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500 text-stone-900 dark:text-white placeholder-stone-400"
                            placeholder="Ask about a concept..."
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!inputValue.trim() || isTyping}
                            className="w-10 h-10 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full flex items-center justify-center hover:bg-orange-600 dark:hover:bg-stone-200 transition-colors disabled:opacity-50"
                        >
                            <span className="material-symbols-rounded text-sm">send</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardTutor;
