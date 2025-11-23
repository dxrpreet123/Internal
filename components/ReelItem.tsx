
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ReelData } from '../types';
import QuizOverlay from './QuizOverlay';

interface ReelItemProps {
  reel: ReelData;
  onUpdateReel: (id: string, updates: Partial<ReelData>) => void;
  isActive: boolean;
  onComplete: () => void;
}

const ReelItem: React.FC<ReelItemProps> = ({ reel, onUpdateReel, isActive, onComplete }) => {
  // -- State --
  const [showQuiz, setShowQuiz] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [progress, setProgress] = useState(0);
  const [bufferProgress, setBufferProgress] = useState(0); // Track loaded percentage
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [formulaFontSize, setFormulaFontSize] = useState('text-3xl');

  // -- Refs --
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Track active state immediately for async operations
  const activeRef = useRef(isActive);
  const isPlayingRef = useRef(isPlaying);
  // Ref to track if we've manually paused (so we don't auto-resume on buffer end)
  const userPausedRef = useRef(false);

  // Sync refs
  useEffect(() => {
    activeRef.current = isActive;
    isPlayingRef.current = isPlaying;
  }, [isActive, isPlaying]);

  // -- Formula Adaptive Font Size --
  useEffect(() => {
      if (reel.keyConcept && !reel.videoUri && !reel.imageUri) {
          const len = reel.keyConcept.length;
          if (len < 20) setFormulaFontSize('text-5xl md:text-7xl');
          else if (len < 50) setFormulaFontSize('text-4xl md:text-6xl');
          else if (len < 100) setFormulaFontSize('text-2xl md:text-4xl');
          else setFormulaFontSize('text-xl md:text-2xl');
      }
  }, [reel.keyConcept, reel.videoUri, reel.imageUri]);

  // -- Audio Engine --
  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
      try { audioSourceRef.current.disconnect(); } catch (e) {}
      audioSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend().catch(() => {});
    }
  }, []);

  const playAudio = useCallback(async () => {
    if (!reel.audioUri || isMuted) return;

    try {
      // 1. Setup Context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      
      // CRITICAL: Check if still active after resume await
      if (!activeRef.current) {
          stopAudio();
          return;
      }

      if (audioSourceRef.current) return; // Already playing

      // 2. Decode Data
      const binaryString = atob(reel.audioUri);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

      // 3. Create Source
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
         audioSourceRef.current = null;
         // Auto-advance logic for non-video reels
         if (activeRef.current && isPlayingRef.current && !userPausedRef.current) {
             if (!reel.videoUri) {
                 setTimeout(() => { 
                     // Double check state before advancing
                     if(activeRef.current && isPlayingRef.current && !audioSourceRef.current && !userPausedRef.current) {
                        onComplete(); 
                     }
                 }, 500);
             }
         }
      };

      // CRITICAL: Final Check before starting sound
      if (!activeRef.current || isMuted) {
          return;
      }

      source.start(0);
      audioSourceRef.current = source;

    } catch (e) {
      console.error("Audio playback error", e);
    }
  }, [reel.audioUri, isMuted, reel.videoUri, onComplete, stopAudio]);

  // Cleanup on unmount or when navigating away
  useEffect(() => {
      if (!isActive) {
          stopAudio();
          setIsPlaying(false);
      }
      return () => {
          stopAudio();
          if (audioContextRef.current) {
              audioContextRef.current.close().catch(() => {});
              audioContextRef.current = null;
          }
      };
  }, [isActive, stopAudio]);

  // -- Lifecycle --
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isActive && reel.isReady && !hasError) {
      userPausedRef.current = false; // Reset manual pause on activation
      
      if (reel.videoUri) {
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
          // Fallback timer for auto-advance if no audio
          if (!reel.audioUri) {
              const wordCount = (reel.script || "").split(" ").length;
              // Approx reading speed or min 5s, max 30s
              const duration = Math.max(5000, Math.min(30000, (wordCount / 3.3) * 1000));
              timeout = setTimeout(() => {
                  if (activeRef.current && isPlayingRef.current && !userPausedRef.current) onComplete();
              }, duration);
          }
      }
    } else {
      // Deactivation logic handled by the separate cleanup effect above
      videoRef.current?.pause();
    }
    return () => clearTimeout(timeout);
  }, [isActive, reel.isReady, hasError, reel.videoUri, playAudio, reel.audioUri, reel.script, onComplete]);

  // Sync mute state changes
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

  const handleVideoProgress = () => {
      if (videoRef.current && videoRef.current.duration > 0) {
          const duration = videoRef.current.duration;
          const buffered = videoRef.current.buffered;
          if (buffered.length > 0) {
              // Find buffer range covering current time
              const currentTime = videoRef.current.currentTime;
              for (let i = 0; i < buffered.length; i++) {
                   if (buffered.start(i) <= currentTime && buffered.end(i) >= currentTime) {
                       setBufferProgress((buffered.end(i) / duration) * 100);
                       return;
                   }
              }
              // Fallback to end of last buffer
              setBufferProgress((buffered.end(buffered.length - 1) / duration) * 100);
          }
      }
  };

  const handleWaiting = () => setIsBuffering(true);
  
  const handleCanPlay = () => {
      setIsBuffering(false);
      // Auto resume if we were waiting but not manually paused
      if (isActive && !userPausedRef.current && !isPlaying) {
          videoRef.current?.play().then(() => {
              setIsPlaying(true);
              playAudio();
          }).catch(() => {});
      }
  };
  
  const handleError = () => { setHasError(true); setIsBuffering(false); };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
  };

  // -- Render Loading State --
  if (!reel.isReady) {
    return (
      <div className="w-full h-full bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-8 transition-colors duration-300">
        <div className="relative w-16 h-16 mb-8">
            <div className="absolute inset-0 border-4 border-stone-200 dark:border-stone-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-orange-600 dark:border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h3 className="text-stone-900 dark:text-white font-bold text-lg mb-2 tracking-tight uppercase font-display">Constructing Asset</h3>
        <p className="text-stone-500 dark:text-stone-400 text-xs text-center max-w-xs tracking-wider">Rendering high-fidelity media for {reel.title}</p>
      </div>
    );
  }

  // -- Main Render --
  return (
    <div ref={containerRef} className="w-full h-full relative bg-black flex flex-col overflow-hidden group">
      
      {/* Click layer for Play/Pause */}
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
            onProgress={handleVideoProgress}
            onWaiting={handleWaiting}
            onCanPlay={handleCanPlay}
            onError={handleError}
            onEnded={() => {
                setIsPlaying(false);
                // Robust auto-advance on video end
                setTimeout(() => { 
                    if (activeRef.current && isPlayingRef.current && !userPausedRef.current) onComplete(); 
                }, 200);
            }}
          />
        ) : reel.imageUri ? (
          <div className="w-full h-full overflow-hidden relative">
              <img 
                src={reel.imageUri} 
                alt="Visualization"
                className={`w-full h-full object-cover transform transition-transform duration-[30s] ease-linear ${isPlaying ? 'scale-125' : 'scale-100'}`}
              />
               {/* Visual tag for Preview Mode */}
              {!reel.videoUri && !hasError && (
                 <div className="absolute top-4 right-4 z-20">
                     <div className="bg-orange-600/90 backdrop-blur-md text-white text-[9px] font-bold px-3 py-1.5 rounded-full border border-white/10 uppercase tracking-widest flex items-center gap-2 shadow-lg">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                        Preview Mode
                     </div>
                 </div>
              )}
          </div>
        ) : (
           // Fallback for missing media
           <div className="w-full h-full bg-stone-900 flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-stone-700 text-6xl mb-4">image_not_supported</span>
           </div>
        )}
        
        {/* Buffering Indicator - Centered Pill */}
        {reel.videoUri && isBuffering && !hasError && (
             <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
                 <div className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-3">
                     <div className="flex gap-1">
                         <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                         <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                         <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
                     </div>
                     <span className="text-[10px] font-bold text-white uppercase tracking-widest">Buffering</span>
                 </div>
             </div>
        )}

        {/* Cinematic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 pointer-events-none transition-opacity duration-500"></div>
      </div>

      {/* Info Overlay (Bottom Left) */}
      <div className="absolute bottom-0 left-0 w-full p-6 pb-24 md:p-8 md:pb-28 z-20 flex flex-col items-start pointer-events-none">
        
        {/* Concept Label */}
        <div className="flex items-center gap-2 mb-3 opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
             <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-[10px] font-bold px-2 py-1 uppercase tracking-widest rounded-sm">
                Concept
            </span>
            {isPlaying && !isBuffering && (
                <div className="flex gap-0.5 h-3 items-end">
                    <div className="w-0.5 bg-orange-500 animate-[bounce_1s_infinite] h-2"></div>
                    <div className="w-0.5 bg-orange-500 animate-[bounce_1.2s_infinite] h-3"></div>
                    <div className="w-0.5 bg-orange-500 animate-[bounce_0.8s_infinite] h-1.5"></div>
                </div>
            )}
        </div>
       
        {/* Title & Script */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-none drop-shadow-lg font-display tracking-tight opacity-0 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          {reel.title}
        </h2>
        <p className="text-stone-200 text-sm md:text-base leading-relaxed font-medium drop-shadow-md max-w-[85%] line-clamp-4 md:line-clamp-none border-l-2 border-orange-500 pl-4 opacity-0 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          {reel.script}
        </p>
      </div>

      {/* Control Buttons (Bottom Right) */}
      <div className="absolute right-4 bottom-20 md:bottom-24 z-30 flex flex-col space-y-4 items-center pointer-events-auto">
        <ControlBtn onClick={() => setIsMuted(!isMuted)} tooltip={isMuted ? "Unmute" : "Mute"}>
           <span className="material-symbols-outlined text-2xl">{isMuted ? 'volume_off' : 'volume_up'}</span>
        </ControlBtn>

        {reel.sources && reel.sources.length > 0 && (
          <ControlBtn onClick={() => setShowSources(true)} active={showSources} tooltip="Sources">
             <span className="material-symbols-outlined text-2xl">link</span>
          </ControlBtn>
        )}

        <ControlBtn onClick={() => setShowTranscript(true)} active={showTranscript} tooltip="Transcript">
            <span className="material-symbols-outlined text-2xl">description</span>
        </ControlBtn>
        
        {reel.youtubeQuery && (
          <ControlBtn 
             onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(reel.youtubeQuery || reel.title)}`, '_blank')}
             tooltip="Deep Dive"
          >
             <span className="material-symbols-outlined text-2xl">smart_display</span>
          </ControlBtn>
        )}

        <ControlBtn onClick={toggleFullscreen} tooltip={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <span className="material-symbols-outlined text-2xl">{isFullscreen ? 'close_fullscreen' : 'open_in_full'}</span>
        </ControlBtn>

        {reel.quiz && (
          <ControlBtn onClick={() => setShowQuiz(true)} active={true} tooltip="Take Quiz">
            <span className="material-symbols-outlined text-2xl">quiz</span>
          </ControlBtn>
        )}
      </div>

      {/* Progress Bar (Timeline) */}
      {reel.videoUri && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-30 cursor-pointer group-hover:h-2 transition-all">
            {/* Buffer Bar (Loaded) */}
            <div 
                className="absolute top-0 left-0 h-full bg-white/30 transition-all duration-300 ease-out" 
                style={{ width: `${bufferProgress}%` }}
            ></div>
            
            {/* Playback Bar (Played) */}
            <div 
                className={`absolute top-0 left-0 h-full transition-all duration-100 ease-linear ${isBuffering ? 'bg-orange-400/80 animate-pulse' : 'bg-orange-600'}`} 
                style={{ width: `${progress}%` }}
            >
                {/* Thumb */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"></div>
            </div>
          </div>
      )}

      {/* Overlays */}
      {showQuiz && reel.quiz && <QuizOverlay quiz={reel.quiz} onClose={() => setShowQuiz(false)} />}
      {showSources && reel.sources && <SourceOverlay sources={reel.sources} onClose={() => setShowSources(false)} />}
      {showTranscript && <TranscriptOverlay script={reel.script} onClose={() => setShowTranscript(false)} />}
    </div>
  );
};

// ... Subcomponents (ControlBtn, SourceOverlay, TranscriptOverlay) remain unchanged ...
const ControlBtn = ({ onClick, children, active = false, tooltip }: any) => (
    <div className="relative group">
        <button 
            onClick={onClick} 
            className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-300 shadow-lg active:scale-95 ${
                active 
                ? 'bg-white text-orange-600 border-white hover:bg-orange-50' 
                : 'bg-black/40 border-white/20 text-white hover:bg-orange-600 hover:border-orange-600'
            }`}
        >
            {children}
        </button>
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap uppercase tracking-wider">
            {tooltip}
        </div>
    </div>
);

const SourceOverlay = ({ sources, onClose }: { sources: { title: string; uri: string }[], onClose: () => void }) => (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 animate-[slideUp_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-600 dark:text-orange-500">link</span>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white">References</h3>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {sources.map((source, idx) => (
                    <a 
                        key={idx} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="block p-4 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 hover:border-orange-600 dark:hover:border-orange-500 transition-all group"
                    >
                        <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200 leading-tight mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors">
                                {source.title || 'External Resource'}
                            </h4>
                            <span className="material-symbols-outlined text-sm text-stone-400 group-hover:text-orange-600 -mt-1 -mr-1">open_in_new</span>
                        </div>
                        <p className="text-[10px] text-stone-400 font-mono truncate">
                            {new URL(source.uri).hostname.replace('www.', '')}
                        </p>
                    </a>
                ))}
            </div>
        </div>
    </div>
);

const TranscriptOverlay = ({ script, onClose }: { script: string, onClose: () => void }) => (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800 animate-[slideUp_0.3s_ease-out] flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-600 dark:text-orange-500">description</span>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white">Transcript</h3>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            <div className="overflow-y-auto pr-2 custom-scrollbar">
                <p className="text-base text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap font-serif">
                    {script}
                </p>
            </div>
        </div>
    </div>
);

export default ReelItem;
