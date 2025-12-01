
import React, { useState, useEffect, useRef } from 'react';
import { Course, ChatMessage } from '../types';
import { chatWithDashboardTutor } from '../services/geminiService';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import ReactMarkdown from 'react-markdown';

interface TutorViewProps {
    courses: Course[];
    username: string;
    onBack: () => void;
}

const TutorView: React.FC<TutorViewProps> = ({ courses, username, onBack }) => {
    const [mode, setMode] = useState<'TEXT' | 'VOICE'>('TEXT');
    const [selectedCourseId, setSelectedCourseId] = useState<string>(''); // '' = All Context
    
    // Text Mode State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textModeContainerRef = useRef<HTMLDivElement>(null);

    // Voice Mode State
    const [isLiveConnected, setIsLiveConnected] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [liveStatus, setLiveStatus] = useState("Ready");
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const sessionRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);

    const availableCourses = courses.filter(c => !c.deletedAt);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        
        // Render math in new messages
        if (textModeContainerRef.current && (window as any).renderMathInElement) {
            setTimeout(() => {
                if(textModeContainerRef.current) {
                    (window as any).renderMathInElement(textModeContainerRef.current, {
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

    useEffect(() => {
        return () => {
            stopLiveSession();
        };
    }, []);

    const handleSendText = async () => {
        if (!inputValue.trim()) return;
        
        const currentCourse = availableCourses.find(c => c.id === selectedCourseId);
        const courseTitle = currentCourse ? currentCourse.title : "All Courses";
        
        // Prepare context dynamically
        let contextData = "";
        if (currentCourse) {
             contextData = currentCourse.reels.slice(0, 15).map(r => `Module: ${r.title}\nKey Point: ${r.keyConcept}\nContent: ${r.script}\n`).join('\n---\n');
        } else {
             // If "All Context", grab a summary of all courses (first 3 reels each)
             contextData = availableCourses.map(c => 
                `COURSE: ${c.title}\n` + 
                c.reels.slice(0, 3).map(r => `- ${r.title}: ${r.keyConcept}`).join('\n')
             ).join('\n\n');
        }

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputValue };
        setChatHistory(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        try {
            const response = await chatWithDashboardTutor(userMsg.text, chatHistory, courseTitle, contextData);
            const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'model', text: response };
            setChatHistory(prev => [...prev, aiMsg]);
        } catch (e) {
            console.error(e);
            setChatHistory(prev => [...prev, { id: 'err', role: 'model', text: "I'm having trouble connecting right now." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const startLiveSession = async () => {
        try {
            setLiveStatus("Connecting...");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const currentCourse = availableCourses.find(c => c.id === selectedCourseId);
            const systemInstruction = `You are the Orbis Professor, a helpful and knowledgeable academic tutor. 
            ${currentCourse ? `The user is studying ${currentCourse.title}. Focus on this subject.` : 'You are helping the user with their general studies.'} 
            Keep your spoken responses concise, encouraging, and conversational. Avoid reading long lists.`;

            // Audio Setup
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = audioContextRef.current.currentTime;

            const stream = await navigator.mediaDevices.getUserMedia({ audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                autoGainControl: true,
                noiseSuppression: true
            }});
            streamRef.current = stream;

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setLiveStatus("Listening");
                        setIsLiveConnected(true);
                        
                        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        const source = inputCtx.createMediaStreamSource(stream);
                        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                        
                        processor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            
                            // Visualizer Logic
                            let sum = 0;
                            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                            const rms = Math.sqrt(sum / inputData.length);
                            setVolumeLevel(Math.min(1, rms * 5)); 

                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };

                        source.connect(processor);
                        processor.connect(inputCtx.destination);
                        processorRef.current = processor;
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData) {
                            queueAudio(audioData);
                            setLiveStatus("Speaking");
                        }
                        if (msg.serverContent?.turnComplete) {
                            setLiveStatus("Listening");
                        }
                    },
                    onclose: () => {
                        setLiveStatus("Disconnected");
                        setIsLiveConnected(false);
                    },
                    onerror: (e) => {
                        console.error("Live Error", e);
                        setLiveStatus("Connection Error");
                        setIsLiveConnected(false);
                    }
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: systemInstruction,
                }
            });
            sessionRef.current = sessionPromise;

        } catch (e) {
            console.error("Failed to start live session", e);
            setLiveStatus("Microphone Error");
            alert("Please allow microphone access to use voice mode.");
        }
    };

    const stopLiveSession = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (sessionRef.current) {
            sessionRef.current.then((s: any) => s.close());
            sessionRef.current = null;
        }
        activeSourcesRef.current.forEach(s => s.stop());
        activeSourcesRef.current.clear();
        
        setIsLiveConnected(false);
        setLiveStatus("Ready");
        setVolumeLevel(0);
    };

    const queueAudio = async (base64Data: string) => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;
        const buffer = await decodeAudio(base64Data, ctx);
        
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        
        const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;
        
        activeSourcesRef.current.add(source);
        source.onended = () => activeSourcesRef.current.delete(source);
    };

    function createBlob(data: Float32Array): Blob {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
        const binary = new Uint8Array(int16.buffer);
        let binaryString = '';
        for (let i = 0; i < binary.byteLength; i++) binaryString += String.fromCharCode(binary[i]);
        return { data: btoa(binaryString), mimeType: 'audio/pcm;rate=16000' };
    }

    async function decodeAudio(base64: string, ctx: AudioContext): Promise<AudioBuffer> {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
        const buffer = ctx.createBuffer(1, float32.length, 24000);
        buffer.copyToChannel(float32, 0);
        return buffer;
    }

    return (
        <div className="fixed inset-0 bg-[#0c0a09] z-50 flex flex-col font-sans text-stone-200">
            
            {/* Header */}
            <header className="px-6 py-4 flex justify-between items-center bg-[#0c0a09] z-20 shrink-0">
                <button onClick={() => { stopLiveSession(); onBack(); }} className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    BACK
                </button>
                
                <div className="flex bg-stone-900 rounded-full p-1 border border-stone-800">
                    <button 
                        onClick={() => { stopLiveSession(); setMode('TEXT'); }} 
                        className={`px-6 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'TEXT' ? 'bg-stone-700 text-white shadow-sm' : 'text-stone-500 hover:text-stone-300'}`}
                    >
                        CHAT
                    </button>
                    <button 
                        onClick={() => setMode('VOICE')} 
                        className={`px-6 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'VOICE' ? 'bg-stone-700 text-white shadow-sm' : 'text-stone-500 hover:text-stone-300'}`}
                    >
                        LIVE
                    </button>
                </div>

                <div className="w-10"></div> {/* Balance Spacer */}
            </header>

            {/* Context Bar */}
            <div className="bg-[#0c0a09] border-b border-stone-800 pb-2 px-6 flex justify-center shrink-0">
                <div className="relative group">
                    <select 
                        className="bg-transparent text-xs font-bold uppercase tracking-widest text-stone-500 outline-none text-center cursor-pointer hover:text-white transition-colors appearance-none pr-4"
                        value={selectedCourseId}
                        onChange={(e) => { setSelectedCourseId(e.target.value); setChatHistory([]); }}
                    >
                        <option value="">All Context</option>
                        {availableCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-stone-600 material-symbols-outlined pointer-events-none">unfold_more</span>
                </div>
            </div>

            {/* --- TEXT MODE --- */}
            {mode === 'TEXT' && (
                <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto overflow-hidden relative min-h-0">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        <div ref={textModeContainerRef}>
                            {chatHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-stone-600 animate-fade-in pb-20">
                                    <span className="material-symbols-outlined text-6xl mb-4 opacity-50">school</span>
                                    <p className="text-sm font-bold uppercase tracking-widest text-center">
                                        Ask me anything about your courses
                                    </p>
                                </div>
                            ) : (
                                chatHistory.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                        <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 text-sm md:text-base leading-relaxed ${
                                            msg.role === 'user' 
                                            ? 'bg-stone-800 text-white rounded-br-sm' 
                                            : 'text-stone-300' // Minimalist style for AI: no background, just text
                                        }`}>
                                            {msg.role === 'model' ? (
                                                <ReactMarkdown 
                                                    components={{
                                                        strong: ({node, ...props}) => <span className="font-bold text-white" {...props} />,
                                                        ul: ({node, ...props}) => <ul className="list-disc pl-4 my-2 space-y-1" {...props} />,
                                                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 my-2 space-y-1" {...props} />,
                                                        code: ({node, ...props}) => <code className="bg-stone-900 px-1 py-0.5 rounded text-orange-400 font-mono text-xs" {...props} />
                                                    }}
                                                >
                                                    {msg.text}
                                                </ReactMarkdown>
                                            ) : (
                                                msg.text
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {isTyping && (
                            <div className="flex justify-start animate-pulse">
                                <div className="text-stone-500 text-xs font-bold uppercase tracking-widest ml-4">Thinking...</div>
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 p-4 md:p-6 bg-[#0c0a09] border-t border-stone-800">
                        <div className="relative max-w-3xl mx-auto bg-stone-900 border border-stone-800 rounded-full flex items-center p-2 shadow-2xl">
                            <input 
                                className="flex-1 bg-transparent px-6 py-3 text-base md:text-sm outline-none text-white placeholder-stone-600"
                                placeholder="Type your question..."
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendText()}
                                autoFocus
                            />
                            <button 
                                onClick={handleSendText}
                                disabled={!inputValue.trim() || isTyping}
                                className="w-10 h-10 bg-stone-800 text-stone-400 rounded-full flex items-center justify-center hover:bg-stone-700 hover:text-white transition-all disabled:opacity-50"
                            >
                                <span className="material-symbols-rounded text-lg">arrow_upward</span>
                            </button>
                        </div>
                        <div className="text-center mt-3 hidden md:block">
                            <p className="text-[10px] text-stone-700 font-bold uppercase tracking-widest">Orbis can make mistakes. Check important info.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- VOICE MODE --- */}
            {mode === 'VOICE' && (
                <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-[#0c0a09]">
                    
                    {/* Minimalist Orb Visualizer */}
                    <div className="relative flex items-center justify-center h-[300px] w-full">
                        {isLiveConnected ? (
                            <>
                                {/* Core */}
                                <div className="w-4 h-4 bg-white rounded-full z-20 shadow-[0_0_20px_rgba(255,255,255,0.8)]"></div>
                                
                                {/* Dynamic Rings based on Volume */}
                                <div 
                                    className="absolute w-32 h-32 border border-stone-800 rounded-full transition-all duration-75 ease-out"
                                    style={{ transform: `scale(${1 + volumeLevel * 3})`, opacity: 0.5 + volumeLevel }}
                                ></div>
                                <div 
                                    className="absolute w-48 h-48 border border-stone-800 rounded-full transition-all duration-150 ease-out"
                                    style={{ transform: `scale(${1 + volumeLevel * 2})`, opacity: 0.3 + volumeLevel }}
                                ></div>
                                <div 
                                    className="absolute w-64 h-64 border border-stone-800 rounded-full transition-all duration-200 ease-out"
                                    style={{ transform: `scale(${1 + volumeLevel})`, opacity: 0.1 + volumeLevel }}
                                ></div>
                            </>
                        ) : (
                            <div className="w-32 h-32 rounded-full border border-stone-800 flex items-center justify-center">
                                <span className="material-symbols-rounded text-4xl text-stone-700">mic_off</span>
                            </div>
                        )}
                    </div>

                    <div className="text-center z-10 mt-8 mb-16 h-12">
                        <h2 className="text-lg font-bold text-white tracking-widest uppercase animate-pulse">{liveStatus}</h2>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-8 z-10">
                        {!isLiveConnected ? (
                            <button 
                                onClick={startLiveSession}
                                className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                            >
                                <span className="material-symbols-rounded text-2xl">mic</span>
                            </button>
                        ) : (
                            <button 
                                onClick={stopLiveSession}
                                className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-500 hover:scale-110 transition-all shadow-lg"
                            >
                                <span className="material-symbols-rounded text-2xl">call_end</span>
                            </button>
                        )}
                    </div>

                </div>
            )}

        </div>
    );
};

export default TutorView;
