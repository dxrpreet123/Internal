
import React, { useState, useEffect, useRef } from 'react';
import { ReelData, ChatMessage } from '../types';
import { chatWithTutor } from '../services/geminiService';

interface TutorOverlayProps {
  activeReel: ReelData;
  onClose: () => void;
}

const TutorOverlay: React.FC<TutorOverlayProps> = ({ activeReel, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: `Hi! I'm your AI Tutor. I can answer questions about "${activeReel.title}". What's confusing you?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset chat when reel changes
    setMessages([
        { id: 'welcome', role: 'model', text: `Hi! I'm ready to explain "${activeReel.title}". Ask me anything!` }
    ]);
  }, [activeReel.id]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
        const responseText = await chatWithTutor(userMsg.text, messages, activeReel);
        const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
        setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
        const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: "Sorry, I'm having trouble connecting. Please try again." };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsTyping(false);
    }
  };

  return (
    <div className="absolute bottom-20 right-4 md:bottom-8 md:right-8 w-[90vw] md:w-[350px] h-[50vh] md:h-[500px] bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200 dark:border-stone-700 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-[slideUp_0.3s_ease-out] font-sans">
        {/* Header */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center bg-stone-50/50 dark:bg-stone-800/30">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-500 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">smart_toy</span>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">Orbis Tutor</h3>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate max-w-[150px]">{activeReel.title}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-full transition-colors">
                <span className="material-symbols-outlined text-stone-500">close</span>
            </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50 dark:bg-stone-950">
            {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-orange-600 text-white rounded-br-none' 
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-100 dark:border-stone-700 rounded-bl-none shadow-sm'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isTyping && (
                <div className="flex justify-start">
                    <div className="bg-white dark:bg-stone-800 p-3 rounded-2xl rounded-bl-none border border-stone-100 dark:border-stone-700 shadow-sm">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Input */}
        <div className="p-3 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800">
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Ask a doubt..."
                    className="flex-1 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-full px-4 py-2 text-sm text-stone-900 dark:text-white focus:border-orange-500 outline-none transition-colors"
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="w-9 h-9 bg-stone-900 dark:bg-stone-100 hover:bg-orange-600 dark:hover:bg-orange-500 text-white dark:text-stone-900 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="material-symbols-outlined text-sm">send</span>
                </button>
            </div>
        </div>
    </div>
  );
};

export default TutorOverlay;
