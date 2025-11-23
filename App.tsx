
import React, { useState, useEffect, useRef } from 'react';
import LandingView from './components/LandingView';
import IngestView from './components/IngestView';
import AnalysisView from './components/AnalysisView';
import ReelFeed from './components/ReelFeed';
import Dashboard from './components/Dashboard';
import AuthView from './components/AuthView';
import { ReelData, AppState, CourseRequest, Course, User, SyllabusAnalysis, ConsultationAnswers, EducationLevel, UserTier } from './types';
import { generateCourseOutline, generateAudio, generateVeoVideo, generateImagenImage, checkApiKey, promptForKey, analyzeSyllabus } from './services/geminiService';
import { getAllCourses, saveCourse as saveLocalCourse, deleteCourse as deleteLocalCourse, getCourseById } from './services/storage';
import { CloudService, generateSyllabusHash } from './services/cloud';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);
  const processingRef = useRef(false);

  // Temporary state for the Ingest -> Analysis -> Generation flow
  const [pendingRequest, setPendingRequest] = useState<CourseRequest | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SyllabusAnalysis | null>(null);
  
  // Share Import State
  const [sharedCourseToImport, setSharedCourseToImport] = useState<Course | null>(null);
  
  // Queue for Stage 2 (Video Upgrade)
  const [videoQueue, setVideoQueue] = useState<Array<{courseId: string, reelId: string, prompt: string, notifyEmail: boolean, totalReels: number}>>([]);

  // Auth Persistence & Theme
  useEffect(() => {
    // Theme
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');
    if (isDark) document.documentElement.classList.add('dark');

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        if (newTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    };
    mediaQuery.addEventListener('change', handleChange);

    // Check for Share Link Param
    const checkShareLink = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const shareHash = urlParams.get('share');
        if (shareHash) {
            setLoadingStatus("Fetching Shared Course...");
            const sharedCourse = await CloudService.getPublicCourseByHash(shareHash);
            if (sharedCourse) {
                setSharedCourseToImport(sharedCourse);
            }
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            setLoadingStatus("");
        }
    };
    checkShareLink();

    // Auth Subscription
    const unsubscribe = CloudService.subscribeToAuthChanges(async (restoredUser) => {
        if (restoredUser) {
            setUser(restoredUser);
            setAppState(AppState.DASHBOARD);
        } else {
            // Check for persistent guest mode
            const isGuest = localStorage.getItem('orbis_guest_mode') === 'true';
            if (isGuest) {
                 setUser({ id: 'guest', name: 'Guest User', email: '', avatarUrl: '', tier: 'FREE' });
                 setAppState(AppState.DASHBOARD);
            }
        }
        setAuthLoading(false);
    });

    return () => {
        mediaQuery.removeEventListener('change', handleChange);
        unsubscribe();
    }
  }, []);

  // RESUME INTERRUPTED GENERATIONS ON LOAD
  useEffect(() => {
      if (!authLoading && courses.length > 0) {
          // 1. Resume Phase 1 (Generating)
          const stuckCourses = courses.filter(c => c.status === 'GENERATING');
          stuckCourses.forEach(course => {
              console.log("Resuming generation for:", course.title);
              // Restart the queue processor. It handles idempotency (skips already ready reels).
              processAssetQueueBackground(course, false); 
          });

          // 2. Resume Phase 2 (Video Queue reconstruction)
          // Since videoQueue is in-memory, we need to find reels that are images but intended for video (if Pro)
          if (user?.tier === 'PRO') {
              const pendingVideos: typeof videoQueue = [];
              courses.forEach(course => {
                  if (course.completedVideos !== undefined && course.completedVideos < course.totalReels) {
                      course.reels.forEach(reel => {
                          if (reel.type === 'CONCEPT' && reel.imageUri && !reel.videoUri) {
                                pendingVideos.push({
                                    courseId: course.id,
                                    reelId: reel.id,
                                    prompt: reel.visualPrompt,
                                    notifyEmail: false,
                                    totalReels: course.totalReels
                                });
                          }
                      });
                  }
              });
              if (pendingVideos.length > 0) {
                  setVideoQueue(prev => [...prev, ...pendingVideos]);
              }
          }
      }
  }, [authLoading, courses.length, user?.tier]);

  const handleToggleTheme = () => {
      setTheme(prev => {
          const next = prev === 'light' ? 'dark' : 'light';
          if (next === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
          return next;
      });
  };

  useEffect(() => {
      if (appState !== AppState.LANDING && appState !== AppState.AUTH && !authLoading) {
          loadCourses();
      }
  }, [appState, user, authLoading]);

  const loadCourses = async () => {
      try {
        if (user && user.id !== 'guest') {
            // Load from Cloud if logged in
            const cloudCourses = await CloudService.getUserCourses(user.id);
            setCourses(cloudCourses);
        } else {
            // Load from Local Device if guest
            const list = await getAllCourses();
            setCourses(list);
        }
      } catch (e) {
        console.error("Failed to load courses", e);
      }
  };

  const persistCourse = async (course: Course) => {
      // 1. Always save to local IndexDB for offline/performance
      await saveLocalCourse(course);

      // 2. If logged in, sync to Cloud
      if (user && user.id !== 'guest') {
          await CloudService.saveUserCourse(user.id, course);
      }
  };

  const handleEnterApp = () => {
      if (!authLoading) {
        // If already logged in (restored), go to dashboard, else auth
        if (user) setAppState(AppState.DASHBOARD);
        else setAppState(AppState.AUTH);
      }
  };

  const handleLogin = async () => {
      try {
          const loggedUser = await CloudService.signInWithGoogle();
          setUser(loggedUser);
          localStorage.removeItem('orbis_guest_mode');
          setAppState(AppState.DASHBOARD);
      } catch (e) {
          console.error("Login failed", e);
      }
  };

  const handleGuest = () => {
      // Guest is strictly FREE tier
      setUser({ id: 'guest', name: 'Guest User', email: '', avatarUrl: '', tier: 'FREE' });
      localStorage.setItem('orbis_guest_mode', 'true');
      setAppState(AppState.DASHBOARD);
  };

  const handleSignOut = () => {
      CloudService.signOut();
      localStorage.removeItem('orbis_guest_mode');
      setUser(null);
      setActiveCourse(null);
      setAppState(AppState.LANDING);
  };

  const handleImportSharedCourse = async () => {
      if (!sharedCourseToImport) return;
      
      const newCourse: Course = {
          ...sharedCourseToImport,
          id: `course-${Date.now()}-imported`,
          ownerId: user ? user.id : 'guest',
          lastAccessedAt: Date.now(),
          isPublic: false
      };

      await persistCourse(newCourse);
      await loadCourses();
      setSharedCourseToImport(null);
      
      if (!user) {
          handleGuest(); // Auto-login as guest if not logged in
      } else {
          setAppState(AppState.DASHBOARD);
      }
  };

  // --- STAGE 2: BACKGROUND VIDEO PROCESSOR ---
  // Processes 1 video every 10 seconds. Triggers email on completion.
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const processNextVideo = async () => {
        if (videoQueue.length === 0) return;

        const task = videoQueue[0];
        
        try {
            // Attempt to generate video
            const videoUri = await generateVeoVideo(task.prompt);
            
            if (videoUri) {
                // Fetch latest state (Local first for speed)
                const course = await getCourseById(task.courseId) || courses.find(c => c.id === task.courseId);
                
                if (course) {
                    const updatedReels = course.reels.map(r => 
                        r.id === task.reelId ? { ...r, videoUri, imageUri: undefined } : r
                    );
                    const completedVids = (course.completedVideos || 0) + 1;
                    const updatedCourse = { 
                        ...course, 
                        reels: updatedReels, 
                        completedVideos: completedVids,
                        processingStatus: completedVids === task.totalReels ? undefined : `Phase 2: Synthesizing Video ${completedVids}/${task.totalReels}`
                    };
                    
                    await persistCourse(updatedCourse);
                    
                    if (activeCourse?.id === task.courseId) setActiveCourse(updatedCourse);
                    setCourses(prev => prev.map(c => c.id === task.courseId ? updatedCourse : c));

                    // TRIGGER NOTIFICATION: When 100% of videos are done
                    if (task.notifyEmail && completedVids === task.totalReels && user?.email) {
                        await CloudService.sendCompletionEmail(user.email, course.title);
                        if ("Notification" in window && Notification.permission === "granted") {
                             new Notification("Orbis Course Complete", {
                                body: `The full video course "${course.title}" is ready.`,
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("Video Queue Error", e);
        } finally {
            setVideoQueue(prev => prev.slice(1));
        }
    };

    if (videoQueue.length > 0) {
        timeoutId = setTimeout(processNextVideo, 10000);
    }

    return () => clearTimeout(timeoutId);
  }, [videoQueue, activeCourse, user, courses]);

  // STEP 1: Start Analysis Flow
  const startAnalysis = async (request: CourseRequest) => {
    if (processingRef.current) return;
    
    const isGuest = user?.id === 'guest';
    const isPro = user?.tier === 'PRO';

    // LIMIT CHECK: 
    // Guest: 1 Course Max
    // Free (Logged In): 3 Courses Max (New Requirement)
    // Pro: Unlimited
    
    if (isGuest && courses.length >= 1) {
        alert("Guest Limit Reached. Sign in to create more courses.");
        return;
    }

    if (!isGuest && !isPro && courses.length >= 3) {
        alert("Free Tier Limit (3 Courses) Reached. Join the Pro waitlist for unlimited access.");
        return;
    }

    processingRef.current = true;
    setLoadingStatus("Analyzing syllabus structure...");

    try {
        const hasKey = await checkApiKey();
        if (!hasKey) {
            await promptForKey();
            if (!(await checkApiKey())) {
                setLoadingStatus("");
                processingRef.current = false;
                return;
            }
        }

        // Public Library Check First (Feature available to all, but only PRO can publish usually, keeping simple for now)
        const syllabusHash = generateSyllabusHash(request.syllabus);
        setLoadingStatus("Checking knowledge base...");
        const publicMatch = await CloudService.findPublicCourseMatch(syllabusHash);
        
        if (publicMatch) {
            setLoadingStatus("Found existing course! cloning...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            const clonedCourse: Course = {
                ...publicMatch,
                id: `course-${Date.now()}-cloned`,
                ownerId: user ? user.id : 'guest',
                lastAccessedAt: Date.now(),
            };
            await persistCourse(clonedCourse);
            await loadCourses();
            setAppState(AppState.DASHBOARD);
            setLoadingStatus("");
            processingRef.current = false;
            return;
        }

        // If no match, run AI Analysis
        setLoadingStatus("AI Consultation in progress...");
        const analysis = await analyzeSyllabus(request.syllabus);
        setAnalysisResult(analysis);
        setPendingRequest(request);
        setAppState(AppState.ANALYSIS);
        
        setLoadingStatus("");
        processingRef.current = false;

    } catch (e) {
        console.error(e);
        setLoadingStatus("Analysis failed. Please try again.");
        processingRef.current = false;
    }
  };

  // STEP 2: Confirm Generation after Analysis
  const confirmGeneration = async (level: EducationLevel, includePYQ: boolean, answers: ConsultationAnswers, maxReels: number) => {
     if (!pendingRequest || !analysisResult) return;
     
     // Determine Reel Count based on User Status
     const isGuest = user?.id === 'guest';
     
     // Guest: 3 Modules (Preview)
     // Logged In (Free or Pro): 8 Modules (Detailed)
     const calculatedMaxReels = isGuest ? 3 : 8; 

     const finalRequest: CourseRequest = {
         ...pendingRequest,
         level,
         includePYQ,
         consultationAnswers: answers,
         maxReels: calculatedMaxReels
     };

     setAppState(AppState.INGEST); // Show spinner in ingest view
     setLoadingStatus("Architecting Curriculum...");
     processingRef.current = true;

     try {
         const initialReels = await generateCourseOutline(
             finalRequest.syllabus, 
             finalRequest.urls, 
             finalRequest.level,
             finalRequest.includePYQ,
             finalRequest.consultationAnswers,
             finalRequest.maxReels
         );

         const timePerReelMs = 8000;
         const eta = Date.now() + (initialReels.length * timePerReelMs);
         const syllabusHash = generateSyllabusHash(finalRequest.syllabus);

         const newCourse: Course = {
            id: `course-${Date.now()}`,
            ownerId: user ? user.id : 'guest',
            isPublic: true,
            syllabusHash: syllabusHash,
            title: initialReels[0]?.title ? `${initialReels[0].title}` : 'New Curriculum',
            level: finalRequest.level,
            createdAt: Date.now(),
            lastAccessedAt: Date.now(),
            reels: initialReels,
            totalReels: initialReels.length,
            completedReels: 0,
            completedVideos: 0,
            status: 'GENERATING',
            estimatedReadyTime: eta,
            processingStatus: "Initializing generation queue..."
        };

        await persistCourse(newCourse);
        await loadCourses();
        setAppState(AppState.DASHBOARD);
        setLoadingStatus("");
        processingRef.current = false;
        setPendingRequest(null);
        setAnalysisResult(null);

        // Start PHASE 1 (Images) -> Which triggers PHASE 2 (Videos) IF Pro
        processAssetQueueBackground(newCourse, finalRequest.notifyEmail);

     } catch (e) {
         console.error(e);
         setLoadingStatus("Generation failed.");
         processingRef.current = false;
     }
  };

  const processAssetQueueBackground = async (course: Course, notifyEmail: boolean) => {
    // Reload course from storage to ensure we have latest state (in case of resume)
    const freshCourse = await getCourseById(course.id) || course;
    const allReels = [...freshCourse.reels];
    let currentCourseState = { ...freshCourse };
    
    const BATCH_SIZE = 3;
    const isPro = user?.tier === 'PRO';

    for (let i = 0; i < allReels.length; i += BATCH_SIZE) {
        // Skip if this batch is already done
        const batch = allReels.slice(i, i + BATCH_SIZE);
        const needsProcessing = batch.some(r => !r.isReady);
        
        if (!needsProcessing) continue;

        const batchStartIndex = i;
        const batchEndIndex = Math.min(i + BATCH_SIZE, allReels.length);
        
        currentCourseState = { ...currentCourseState, processingStatus: `Synthesizing Phase 1 (Visuals) for Modules ${batchStartIndex + 1}-${batchEndIndex}...` };
        await persistCourse(currentCourseState);
        setCourses(prev => prev.map(c => c.id === currentCourseState.id ? currentCourseState : c));

        // PHASE 1: Generate Images & Audio Parallel
        const processedBatch = await Promise.all(batch.map(async (reel) => {
            if (reel.isReady) return reel;

            let audioUri: string | undefined;
            try { audioUri = await generateAudio(reel.script); } catch (e) { console.warn("Audio fail", e); }

            let imageUri: string | undefined;
            if (reel.type === 'CONCEPT') {
                try {
                    imageUri = await generateImagenImage(reel.visualPrompt);
                    
                    // PHASE 2 CHECK: Only add to Video Queue if PRO
                    if (isPro) {
                        setVideoQueue(prev => {
                            // Deduplicate
                            if (prev.find(p => p.reelId === reel.id)) return prev;
                            return [...prev, {
                                courseId: course.id,
                                reelId: reel.id,
                                prompt: reel.visualPrompt,
                                notifyEmail: notifyEmail,
                                totalReels: allReels.length
                            }];
                        });
                    }
                } catch (e) { console.warn("Image fail", e); }
            }

            return {
                ...reel,
                audioUri,
                imageUri,
                isProcessing: false,
                isReady: true,
                script: (!audioUri && !imageUri && reel.type === 'CONCEPT') ? "Content unavailable due to network." : reel.script
            };
        }));

        processedBatch.forEach((reel, index) => { allReels[batchStartIndex + index] = reel; });

        const completedCount = allReels.filter(r => r.isReady).length;
        const isPhase1Complete = completedCount >= allReels.length;

        currentCourseState = {
            ...currentCourseState,
            reels: allReels,
            completedReels: completedCount,
            status: isPhase1Complete ? 'READY' : 'GENERATING',
            processingStatus: isPhase1Complete 
                ? (isPro ? 'Phase 1 Complete. Entering Phase 2: Video Synthesis...' : 'Course Ready (Standard Tier)')
                : `Batch ${Math.ceil((i + 1)/BATCH_SIZE)} finished.`
        };

        await persistCourse(currentCourseState);
        setCourses(prev => prev.map(c => c.id === currentCourseState.id ? currentCourseState : c));

        if (isPhase1Complete) {
            await CloudService.publishCourseToLibrary(currentCourseState);
            // Trigger Phase 1 Notification
             if ("Notification" in window && Notification.permission === "granted") {
                 new Notification("Orbis Course Preview Ready", {
                    body: `"${currentCourseState.title}" is ready for viewing.`,
                });
            }
        }
    }
  };

  const handleSelectCourse = async (courseId: string) => {
      // Try local first
      let course = await getCourseById(courseId);
      
      // If not local (maybe new device sync), check state
      if (!course) {
          course = courses.find(c => c.id === courseId);
      }

      if (course) {
          const canOpen = course.status === 'READY' || course.completedReels >= 1;
          if (canOpen) {
            const updated = { ...course, lastAccessedAt: Date.now() };
            await persistCourse(updated);
            setActiveCourse(updated);
            setAppState(AppState.FEED);
          }
      }
  };

  const handleDeleteCourse = async (courseId: string) => {
      if (user && user.id !== 'guest') {
          await CloudService.deleteUserCourse(user.id, courseId);
      }
      await deleteLocalCourse(courseId);
      await loadCourses();
  };

  const handleUpdateReel = (id: string, updates: Partial<ReelData>) => {
      if (activeCourse) {
          const newReels = activeCourse.reels.map(r => r.id === id ? { ...r, ...updates } : r);
          const updatedCourse = { ...activeCourse, reels: newReels };
          setActiveCourse(updatedCourse);
          persistCourse(updatedCourse);
      }
  };

  const handleBackToHome = () => {
      setAppState(AppState.DASHBOARD);
      setActiveCourse(null);
      setLoadingStatus("");
      loadCourses();
  };
  
  // Show Loading Spinner while checking auth state
  if (authLoading) {
      return (
        <div className="h-[100dvh] w-full bg-[var(--orbis-bg)] flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
  }

  return (
    <div className="w-full h-[100dvh] bg-[var(--orbis-bg)] text-[var(--orbis-text)] font-sans overflow-hidden transition-colors duration-300">
      
      {/* Import Shared Course Modal */}
      {sharedCourseToImport && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-2xl p-8 border border-stone-200 dark:border-stone-800 shadow-2xl animate-fade-in relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-orange-600"></div>
                  
                  <div className="mb-6 flex flex-col items-center text-center">
                       <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-500 rounded-full flex items-center justify-center mb-4">
                           <span className="material-symbols-outlined text-2xl">download</span>
                       </div>
                       <h2 className="text-xl font-bold text-stone-900 dark:text-white font-display mb-1">Incoming Course</h2>
                       <p className="text-sm text-stone-500 dark:text-stone-400">"{sharedCourseToImport.title}"</p>
                  </div>

                  <div className="bg-stone-50 dark:bg-stone-950 p-4 rounded-lg mb-8 border border-stone-100 dark:border-stone-800">
                      <div className="flex justify-between items-center text-xs mb-2">
                          <span className="text-stone-500 uppercase font-bold tracking-wider">Level</span>
                          <span className="text-stone-800 dark:text-stone-200 font-bold">{sharedCourseToImport.level}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                          <span className="text-stone-500 uppercase font-bold tracking-wider">Modules</span>
                          <span className="text-stone-800 dark:text-stone-200 font-bold">{sharedCourseToImport.totalReels}</span>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <button 
                        onClick={handleImportSharedCourse}
                        className="w-full py-4 bg-stone-900 dark:bg-stone-100 hover:bg-orange-600 dark:hover:bg-orange-500 text-white dark:text-stone-900 font-bold uppercase tracking-widest text-xs transition-colors shadow-lg rounded"
                      >
                          {user ? 'Import to Library' : 'Copy Structure (Guest)'}
                      </button>
                      <button 
                        onClick={() => setSharedCourseToImport(null)}
                        className="w-full py-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-xs font-bold uppercase tracking-widest"
                      >
                          Discard
                      </button>
                  </div>
              </div>
          </div>
      )}

      {appState === AppState.LANDING && (
          <LandingView onEnter={handleEnterApp} />
      )}

      {appState === AppState.AUTH && (
          <AuthView 
            onLogin={handleLogin} 
            onGuest={handleGuest} 
            onToggleTheme={handleToggleTheme} 
            currentTheme={theme}
          />
      )}

      {appState === AppState.DASHBOARD && (
          <Dashboard 
            user={user}
            courses={courses}
            onCreateNew={() => setAppState(AppState.INGEST)}
            onSelectCourse={handleSelectCourse}
            onDeleteCourse={handleDeleteCourse}
            onSignOut={handleSignOut}
            onToggleTheme={handleToggleTheme}
            currentTheme={theme}
          />
      )}

      {appState === AppState.INGEST && (
        <IngestView 
            user={user}
            onStart={startAnalysis} 
            onCancel={handleBackToHome}
            loadingStatus={loadingStatus}
            currentTheme={theme}
        />
      )}

      {appState === AppState.ANALYSIS && analysisResult && (
        <AnalysisView 
            analysis={analysisResult}
            onConfirm={(l, p, a) => confirmGeneration(l, p, a, 0)} // maxReels calculated in function
            onCancel={handleBackToHome}
        />
      )}

      {appState === AppState.FEED && activeCourse && (
        <ReelFeed 
            reels={activeCourse.reels} 
            onUpdateReel={handleUpdateReel} 
            onBack={handleBackToHome}
        />
      )}
    </div>
  );
};

export default App;
