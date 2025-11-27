import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ReelData } from '../types';
import QuizOverlay from './QuizOverlay';

interface ReelItemProps {
  reel: ReelData;
  onUpdateReel: (id: string, updates: Partial<ReelData>) => void;
  isActive: boolean;
  onComplete: () => void;
  onQuizResult?: (correct: boolean) => void;
  audioOnlyMode?: boolean; 
  onRegenerateImage?: () => void;
  shouldLoad?: boolean; // New prop for virtualization
}

const ReelItem: React.FC<ReelItemProps> = ({ reel, onUpdateReel, isActive, onComplete, onQuizResult, audioOnlyMode = false, onRegenerateImage, shouldLoad = true }) => {
  // -- State --
  const [showQuiz, setShowQuiz] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false); 
  
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);

  // -- Refs --
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  const activeRef = useRef(isActive);
  const isPlayingRef = useRef(isPlaying);
  const userPausedRef = useRef(false);

  useEffect(() => {
    activeRef.current = isActive;
    isPlayingRef.current = isPlaying;
  }, [isActive, isPlaying]);

  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
      try { audioSourceRef.current.disconnect(); } catch (e) {}
      audioSourceRef.current = null;
    }
  }, []);

  const handleMediaEnded = useCallback(() => {
     setIsPlaying(false);
     if (activeRef.current && !userPausedRef.current) {
         if (reel.quiz && !reel.userQuizResult) {
             setShowQuiz(true);
         } else {
             onComplete();
         }
     }
  }, [reel.quiz, reel.userQuizResult, onComplete]);

  const playAudio = useCallback(async () => {
    if (!reel.audioUri || isMuted) {
        if (!reel.videoUri) {
             const wordCount = (reel.script || "").split(" ").length;
             const duration = Math.max(5000, Math.min(30000, (wordCount / 3.0) * 1000));
             setTimeout(() => {
                 if (activeRef.current && isPlayingRef.current && !userPausedRef.current) handleMediaEnded();
             }, duration);
        }
        return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.gain.value = 1.0; 
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      
      if (!activeRef.current) {
          stopAudio();
          return;
      }

      if (audioSourceRef.current) return; 

      const binaryString = atob(reel.audioUri);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      if (gainNodeRef.current) source.connect(gainNodeRef.current);
      else source.connect(ctx.destination);
      
      source.onended = () => {
         audioSourceRef.current = null;
         if (activeRef.current && isPlayingRef.current && !userPausedRef.current) {
             if (!reel.videoUri || hasError || audioOnlyMode) { 
                 setTimeout(() => { 
                     if(activeRef.current && isPlayingRef.current && !audioSourceRef.current && !userPausedRef.current) {
                        handleMediaEnded();
                     }
                 }, 500);
             }
         }
      };

      if (!activeRef.current || isMuted) return;
      source.start(0);
      audioSourceRef.current = source;

    } catch (e) { console.error("Audio playback error", e); }
  }, [reel.audioUri, isMuted, reel.videoUri, handleMediaEnded, stopAudio, hasError, audioOnlyMode]);

  useEffect(() => {
      if (!isActive) {
          stopAudio();
          setIsPlaying(false);
      }
      return () => {
          stopAudio();
          if (audioContextRef.current && audioContextRef.current.state === 'running') {
              audioContextRef.current.suspend().catch(() => {});
          }
      };
  }, [isActive, stopAudio]);

  useEffect(() => {
    let timeout: any;
    if (isActive && reel.isReady) {
      userPausedRef.current = false;
      if (reel.videoUri && !hasError && !audioOnlyMode) {
          const playPromise = videoRef.current?.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
                setIsPlaying(true);
                playAudio();
            }).catch(() => setIsPlaying(false));
          }
      } else {
          setIsPlaying(true);
          playAudio();
          setIsBuffering(false);
          // Fallback timer if audio fails to load or is null
          if (!reel.audioUri || hasError) {
              const wordCount = (reel.script || "").split(" ").length;
              // Approx reading speed or min 5s, max 30s
              const duration = Math.max(5000, Math.min(30000, (wordCount / 3.3) * 1000));
              timeout = setTimeout(() => {
                  if (activeRef.current && isPlayingRef.current && !userPausedRef.current) handleMediaEnded();
              }, duration);
          }
      }
    } else {
      videoRef.current?.pause();
    }
    return () => clearTimeout(timeout);
  }, [isActive, reel.isReady, hasError, reel.videoUri, playAudio, reel.audioUri, reel.script, handleMediaEnded, audioOnlyMode]);

  useEffect(() => {
    if (isActive && isPlaying) {
      if (isMuted) stopAudio();
      else playAudio();
    }
  }, [isMuted, isActive, isPlaying, playAudio, stopAudio]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration || 1;
      const current = videoRef.current.currentTime;
      setProgress((current / duration) * 100);
    }
  };

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }
    if (isPlaying) {
        userPausedRef.current = true;
        videoRef.current?.pause();
        stopAudio();
    } else {
        userPausedRef.current = false;
        videoRef.current?.play();
        playAudio();
    }
    setIsPlaying(!isPlaying);
  };

  const handleQuizResult = (correct: boolean) => {
      onUpdateReel(reel.id, { userQuizResult: correct });
      if (onQuizResult) onQuizResult(correct);
  };

  if (!shouldLoad) {
      return <div className="w-full h-full bg-black/90 flex items-center justify-center"></div>;
  }

  if (audioOnlyMode) {
      return (
          <div className="w-full bg-white dark:bg-stone-900 rounded-xl shadow-md border border-stone-200 dark:border-stone-800 p-4 flex items-center gap-4">
              <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center text-white shadow-lg hover:bg-orange-700 transition-colors">
                  <span className="material-symbols-outlined text-2xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
              </button>
              <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Audio Lecture</span>
                      {isPlaying && <div className="flex gap-0.5 h-3 items-end">
                            <div className="w-1 bg-orange-500 animate-[bounce_1s_infinite] h-2"></div>
                            <div className="w-1 bg-orange-500 animate-[bounce_1.2s_infinite] h-3"></div>
                            <div className="w-1 bg-orange-500 animate-[bounce_0.8s_infinite] h-1.5"></div>
                      </div>}
                  </div>
                  { !reel.audioUri && <span className="text-[10px] text-red-500 font-bold uppercase">Audio unavailable</span> }
              </div>
          </div>
      )
  }

  if (!reel.isReady) {
    return (
      <div className="w-full h-full bg-black flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-2 border-white/20 border-t-orange-500 rounded-full animate-spin mb-4"></div>
        <p className="text-stone-400 text-xs tracking-wider uppercase">Loading Visuals...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-black flex flex-col overflow-hidden group">
      
      {/* Media Layer */}
      <div className="absolute inset-0 z-0" onClick={togglePlay}>
        {reel.videoUri && !hasError ? (
          <video
            ref={videoRef}
            src={reel.videoUri}
            className="w-full h-full object-cover"
            muted
            playsInline
            loop={false}
            onTimeUpdate={handleTimeUpdate}
            onWaiting={() => setIsBuffering(true)}
            onCanPlay={() => setIsBuffering(false)}
            onError={() => { setHasError(true); setIsBuffering(false); setIsPlaying(false); }}
            onEnded={() => { setIsPlaying(false); handleMediaEnded(); }}
          />
        ) : reel.imageUri ? (
          <div className="w-full h-full overflow-hidden relative">
              <img 
                src={reel.imageUri} 
                alt="Visualization"
                loading="lazy"
                className={`w-full h-full object-cover transform transition-transform duration-[40s] ease-linear ${isPlaying ? 'scale-110' : 'scale-100'}`}
              />
          </div>
        ) : (
           <div className="w-full h-full bg-stone-900 flex flex-col items-center justify-center relative">
                <span className="material-symbols-outlined text-stone-700 text-6xl mb-4">image_not_supported</span>
                {onRegenerateImage && !reel.isProcessing && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRegenerateImage(); }}
                        className="px-4 py-2 bg-stone-800 hover:bg-orange-600 text-white font-bold uppercase tracking-widest text-[10px] rounded-full transition-all shadow-lg flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">palette</span>
                        Generate
                    </button>
                )}
           </div>
        )}
        
        {/* Gradients for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 pointer-events-none"></div>
        
        {reel.videoUri && isBuffering && !hasError && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
             </div>
        )}
      </div>

      {/* --- Controls Overlay (Minimal) --- */}
      
      {/* Top Right */}
      <div className="absolute top-6 right-6 z-30 flex flex-col gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           {reel.audioUri && (
             <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <span className="material-symbols-outlined text-lg">{isMuted ? 'volume_off' : 'volume_up'}</span>
             </button>
           )}
      </div>

      {/* Bottom Info Area */}
      <div className="absolute bottom-0 left-0 w-full p-6 pb-20 md:pb-8 z-20 flex flex-col items-start pointer-events-none">
        
        {showCaptions && (
            <div className="mb-4 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/5 max-h-[200px] overflow-y-auto pointer-events-auto w-[90%] md:w-[80%] custom-scrollbar animate-fade-in">
                <p className="text-white/90 text-sm md:text-base font-medium leading-relaxed font-sans">{reel.script}</p>
            </div>
        )}

        <div className="flex items-center gap-2 mb-2 pointer-events-auto">
             <span className="bg-white/20 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest rounded-sm">
                 Module
             </span>
             { !reel.audioUri && <span className="bg-red-500/80 text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest rounded-sm">No Audio</span>}
        </div>
        
        <div className="flex justify-between items-end w-full">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1 leading-tight font-display tracking-tight w-[80%] drop-shadow-md">
              {reel.title}
            </h2>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pointer-events-auto">
                 <button 
                    onClick={(e) => { e.stopPropagation(); setShowCaptions(!showCaptions); }} 
                    className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${showCaptions ? 'bg-white text-black border-white' : 'bg-black/40 border-white/20 text-white hover:bg-white/10'}`}
                >
                    <span className="material-symbols-outlined text-xl">closed_caption</span>
                 </button>

                 {reel.quiz && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowQuiz(true); }} 
                    className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg hover:bg-orange-700 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">assignment_late</span>
                  </button>
                )}
            </div>
        </div>
      </div>

      {/* Progress Bar */}
      {reel.videoUri && !hasError && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-30 cursor-pointer hover:h-1.5 transition-all">
            <div className="absolute top-0 left-0 h-full bg-orange-600 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div>
          </div>
      )}

      {showQuiz && reel.quiz && <QuizOverlay quiz={reel.quiz} onClose={() => { setShowQuiz(false); onComplete(); }} onResult={handleQuizResult} />}
      {showSources && reel.sources && <div className="absolute inset-0 z-50 bg-black/90 p-8 text-white"><button onClick={()=>setShowSources(false)}>Close</button> Sources...</div>}
    </div>
  );
};

export default ReelItem;