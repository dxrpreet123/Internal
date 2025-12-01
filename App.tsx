




import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { ReelData, AppState, CourseRequest, Course, User, SyllabusAnalysis, ConsultationAnswers, EducationLevel, Semester, SemesterUnit, SemesterTopic, UserProfile, TimeTableDay, ClassSession, Assignment } from './types';
import { generateCourseOutline, generateAudio, triggerVeoGeneration, pollVeoOperation, generateImagenImage, checkApiKey, promptForKey, analyzeSyllabus, generateRemedialCurriculum, structureSemester, architectSemester } from './services/geminiService';
import { getAllCourses, saveCourse as saveLocalCourse, deleteCourse as deleteLocalCourse, saveSemester as saveLocalSemester, getAllSemesters, deleteSemester as deleteLocalSemester, saveTimetableDay, getTimetable, getAllAssignments, saveAssignment } from './services/storage';
import { CloudService } from './services/cloud';
import { getSampleCourse } from './services/sampleData';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy Load Components
const LandingView = lazy(() => import('./components/LandingView'));
const IngestView = lazy(() => import('./components/IngestView'));
const AnalysisView = lazy(() => import('./components/AnalysisView'));
const ReelFeed = lazy(() => import('./components/ReelFeed'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const AuthView = lazy(() => import('./components/AuthView'));
const SemesterView = lazy(() => import('./components/SemesterView'));
const PricingView = lazy(() => import('./components/PricingView'));
const ContactView = lazy(() => import('./components/ContactView'));
const ClassroomView = lazy(() => import('./components/ClassroomView'));
const ExamView = lazy(() => import('./components/ExamView'));
const OnboardingView = lazy(() => import('./components/OnboardingView'));
const TimetableView = lazy(() => import('./components/TimetableView')); 
const AssignmentView = lazy(() => import('./components/AssignmentView')); 
const ProfileView = lazy(() => import('./components/ProfileView'));
const TutorView = lazy(() => import('./components/TutorView'));
const SitemapView = lazy(() => import('./components/SitemapView'));
const TermsView = lazy(() => import('./components/TermsView'));
const PrivacyView = lazy(() => import('./components/PrivacyView'));
const RefundView = lazy(() => import('./components/RefundView'));

const LoadingFallback = () => (
  <div className="h-[100dvh] w-full bg-[#fafaf9] dark:bg-[#0c0a09] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-800 border-t-orange-600 rounded-full animate-spin"></div>
  </div>
);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [ingestMode, setIngestMode] = useState<'SINGLE' | 'SEMESTER'>('SINGLE');
  const [ingestSubMode, setIngestSubMode] = useState<'VIDEO' | 'CRASH_COURSE'>('VIDEO');
  
  const [timetable, setTimetable] = useState<TimeTableDay[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);
  const processingRef = useRef(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [pendingRequest, setPendingRequest] = useState<CourseRequest | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SyllabusAnalysis | null>(null);
  const [sharedCourseToImport, setSharedCourseToImport] = useState<Course | null>(null);
  const [videoQueue, setVideoQueue] = useState<Array<{courseId: string, reelId: string, prompt: string, notifyEmail: boolean, totalReels: number}>>([]);
  const [startReelIndex, setStartReelIndex] = useState(0);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const [examCramMode, setExamCramMode] = useState(false);

  const activeSemester = semesters.find(s => s.id === activeSemesterId) || null;

  const showToast = (msg: string) => {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    // Basic Client-Side Router
    const path = window.location.pathname;
    if (path === '/terms') setAppState(AppState.TERMS);
    else if (path === '/privacy') setAppState(AppState.PRIVACY);
    else if (path === '/refund') setAppState(AppState.REFUND);
    
    const timer = setTimeout(() => setAuthLoading(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
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
    
    const checkShareLink = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedHash = urlParams.get('c');
        if (sharedHash) {
             const publicCourse = await CloudService.findPublicCourseMatch(sharedHash);
             if (publicCourse) setSharedCourseToImport(publicCourse);
        }
    };
    checkShareLink();

    CloudService.subscribeToAuthChanges((u) => {
        setUser(u);
        
        // Don't auto-redirect if on a public policy page
        const path = window.location.pathname;
        const isPublicPage = path === '/terms' || path === '/privacy' || path === '/refund';

        if (u) {
            if (!isPublicPage) setAppState(AppState.DASHBOARD);
            CloudService.getUserCourses(u.id).then(c => { 
                if(c.length === 0) {
                     const sample = getSampleCourse(u.id);
                     CloudService.saveUserCourse(u.id, sample);
                     setCourses([sample]);
                } else {
                    setCourses(c); 
                }
            });
            CloudService.getUserSemesters(u.id).then(s => { if(s.length > 0) setSemesters(s); });
        } else {
             getAllCourses().then(c => {
                 if (c.length === 0) {
                      const sample = getSampleCourse('local');
                      saveLocalCourse(sample);
                      setCourses([sample]);
                 } else {
                     setCourses(c);
                 }
             });
             getAllSemesters().then(s => setSemesters(s));
        }
        setAuthLoading(false);
    });
    
    refreshGlobalData();
  }, []);

  const refreshGlobalData = async () => {
      const t = await getTimetable();
      setTimetable(t);
      const a = await getAllAssignments();
      setAssignments(a);
  };

  const handleToggleTheme = () => {
      setTheme(prev => {
          const next = prev === 'light' ? 'dark' : 'light';
          if (next === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
          return next;
      });
  };

  const handleLogin = () => {
      setAppState(AppState.DASHBOARD);
  };

  const handleGuest = () => {
      setUser({ id: 'guest', name: 'Guest', email: '', avatarUrl: '', tier: 'FREE' });
      setAppState(AppState.DASHBOARD);
  };

  const handleProfileUpdate = (newProfile: UserProfile) => {
      if (user) {
          const updatedUser = { ...user, profile: newProfile };
          setUser(updatedUser);
          if (user.id !== 'guest') {
              CloudService.updateUserProfile(user.id, newProfile);
          }
      }
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
      handleProfileUpdate({...profile, tutorialCompleted: true});
      setOnboardingComplete(true);
      if (examCramMode) {
          setIngestMode('SINGLE');
          setIngestSubMode('CRASH_COURSE');
          setAppState(AppState.INGEST);
      } else {
          setAppState(AppState.DASHBOARD);
      }
  };

  const handleStartCrashCourseFromOnboarding = () => {
      setExamCramMode(true);
      handleProfileUpdate({ role: 'Student', learningStyle: 'Visual', tutorialCompleted: true } as UserProfile);
      setOnboardingComplete(true);
      
      setIngestMode('SINGLE');
      setIngestSubMode('CRASH_COURSE');
      setAppState(AppState.INGEST);
  };

  const checkFreeLimit = () => {
      if (user?.tier === 'PRO') return true;
      const activeCount = courses.filter(c => !c.deletedAt).length;
      if (activeCount >= 3) {
          setAppState(AppState.PRICING);
          showToast("Free Plan Limit Reached. Upgrade for unlimited courses.");
          return false;
      }
      return true;
  };

  const handleUpgradeSuccess = async () => {
      if (user && user.id !== 'guest') {
          await CloudService.upgradeUserToPro(user.id);
          setUser({ ...user, tier: 'PRO' });
          showToast("Welcome to Scholar! Subscription Active.");
          setAppState(AppState.DASHBOARD);
      } else {
          showToast("Please sign in to upgrade.");
          setAppState(AppState.AUTH);
      }
  };

  const handleAddAssignment = async (newAssignment: Assignment) => {
      await saveAssignment(newAssignment);
      await refreshGlobalData();
      showToast(`${newAssignment.type === 'EXAM' ? 'Exam' : 'Assignment'} Scheduled`);
  };

  const handleStartAnalysis = async (data: CourseRequest) => {
      try {
          const hasKey = await checkApiKey();
          if (!hasKey) {
             await promptForKey();
             const nowHasKey = await checkApiKey();
             if (!nowHasKey) { alert("API Key Required"); return; }
          }
      } catch (e) { console.error(e); }

      setPendingRequest(data);
      
      try {
          if (data.isSemesterInit) {
               setLoadingStatus("Architecting Semester Plan...");
               
               const semesterArchitecture = await architectSemester(
                   data.syllabus, 
                   data.semesterStartDate, 
                   data.semesterEndDate, 
                   data.semesterLocation,
                   data.semesterGoal?.toString(),
                   data.semesterUniversity
               );
               
               const newSemester: Semester = {
                   id: `sem-${Date.now()}`,
                   ownerId: user?.id || 'local',
                   title: data.semesterName || semesterArchitecture.semesterName || 'My Semester',
                   level: data.level,
                   createdAt: Date.now(),
                   startDate: semesterArchitecture.startDate || data.semesterStartDate,
                   endDate: semesterArchitecture.endDate || data.semesterEndDate,
                   location: semesterArchitecture.location || data.semesterLocation,
                   holidays: semesterArchitecture.holidays,
                   targetGoal: data.semesterGoal,
                   university: data.semesterUniversity,
                   gradingSchema: data.semesterGradingSchema,
                   attendancePolicy: data.semesterAttendancePolicy,
                   subjects: semesterArchitecture.subjects.map((sub, idx) => {
                       const insights = semesterArchitecture.strategyAnalysis?.[sub.title] || semesterArchitecture.strategyAnalysis?.[Object.keys(semesterArchitecture.strategyAnalysis || {}).find(k => sub.title.includes(k) || k.includes(sub.title)) || ''];
                       return {
                           id: `subject-${Date.now()}-${idx}`,
                           title: sub.title,
                           units: (sub.units || []).map((unit, uIdx) => ({
                               id: `unit-${Date.now()}-${idx}-${uIdx}`,
                               title: unit.title,
                               description: unit.description,
                               status: 'PENDING',
                               isHighYield: insights?.highYieldUnitTitles?.some((t: string) => unit.title.includes(t) || t.includes(unit.title)),
                           })),
                           attendance: { attended: 0, total: 0 },
                           projectedTotalClasses: sub.projectedTotalClasses,
                           difficulty: insights?.difficulty,
                           scoringStrategy: insights?.strategy,
                           examWeights: data.semesterExamStructure 
                       }
                   }),
                   pyqContent: semesterArchitecture.rawPyqs 
               };
               
               if (user && user.id !== 'guest') await CloudService.saveUserSemester(user.id, newSemester);
               else await saveLocalSemester(newSemester);
               
               setSemesters(prev => [newSemester, ...prev]);

               if (semesterArchitecture.timetable && semesterArchitecture.timetable.length > 0) {
                   for (const daySchedule of semesterArchitecture.timetable) {
                       const classesWithIds = daySchedule.classes.map(c => ({
                           ...c,
                           id: `class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                           color: '#' + Math.floor(Math.random()*16777215).toString(16)
                       }));
                       await saveTimetableDay({ day: daySchedule.day, classes: classesWithIds });
                   }
               }
               
               if (semesterArchitecture.assignments && semesterArchitecture.assignments.length > 0) {
                    for (const assign of semesterArchitecture.assignments) {
                        await saveAssignment({
                            id: `assign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            title: assign.title,
                            subject: assign.subject,
                            dueDate: assign.dueDate || new Date().toISOString().split('T')[0],
                            type: assign.type || 'PROBLEM_SET',
                            status: 'PENDING',
                            description: assign.description
                        });
                    }
               }
               
               refreshGlobalData();
               setLoadingStatus('');
               setActiveSemesterId(newSemester.id);
               setAppState(AppState.SEMESTER_VIEW);

          } else {
               setLoadingStatus("Analyzing Syllabus Architecture...");
               const analysis = await analyzeSyllabus(data.syllabus);
               setAnalysisResult(analysis);
               setAppState(AppState.ANALYSIS);
          }
      } catch (e) {
          console.error(e);
          setLoadingStatus('');
          alert("Failed to analyze syllabus. Try again.");
      }
      setLoadingStatus('');
  };

  const handleConfirmCourse = async (level: EducationLevel, includePYQ: boolean, answers: ConsultationAnswers, selectedTopics: string[]) => {
      if (!pendingRequest) return;
      
      setAppState(AppState.INGEST); 
      setLoadingStatus("Architecting Course Modules...");

      const request = { 
          ...pendingRequest, 
          level, 
          includePYQ, 
          consultationAnswers: answers, 
          selectedTopics 
      };

      try {
           const syllabusToUse = selectedTopics.length > 0 
                ? `Focus ONLY on these topics from the syllabus: ${selectedTopics.join(', ')}. \n\n Context: ${pendingRequest.syllabus}`
                : pendingRequest.syllabus;

           const reels = await generateCourseOutline(
               syllabusToUse, 
               request.urls, 
               request.level, 
               request.includePYQ,
               request.language,
               request.pyqContent,
               request.consultationAnswers,
               request.maxReels,
               analysisResult?.domain,
               request.mode,
               request.cramConfig
           );

           const newCourse: Course = {
                id: `course-${Date.now()}`,
                ownerId: user?.id || 'local',
                isPublic: false,
                title: analysisResult?.summary || "New Course",
                language: request.language,
                level: request.level,
                mode: request.mode,
                createdAt: Date.now(),
                lastAccessedAt: Date.now(),
                reels: reels,
                totalReels: reels.length,
                completedReels: 0,
                status: 'GENERATING'
           };

           if (user && user.id !== 'guest') await CloudService.saveUserCourse(user.id, newCourse);
           else await saveLocalCourse(newCourse);

           setCourses(prev => [newCourse, ...prev]);
           setActiveCourse(newCourse);
           setLoadingStatus('');
           
           setAppState(AppState.CLASSROOM);
           processGenerationQueue(newCourse, request.notifyEmail);

      } catch (e) {
           console.error(e);
           setLoadingStatus('');
           alert("Failed to generate course. Please try again.");
           setAppState(AppState.DASHBOARD);
      }
  };

  const processGenerationQueue = async (course: Course, notifyEmail: boolean) => {
       const updatedCourse = JSON.parse(JSON.stringify(course));
       
       for (let i = 0; i < updatedCourse.reels.length; i++) {
            const reel = updatedCourse.reels[i];
            if (reel.isReady) continue;

            try {
                if (!reel.audioUri) {
                    const voice = user?.profile?.voice || 'Kore';
                    const audioBase64 = await generateAudio(reel.script, voice);
                    updatedCourse.reels[i].audioUri = audioBase64;
                }
                
                if (course.mode === 'CRASH_COURSE') {
                    updatedCourse.reels[i].isReady = true;
                    updatedCourse.reels[i].isProcessing = false;
                    updatedCourse.completedReels += 1;
                }
                
                if (user && user.id !== 'guest') await CloudService.saveUserCourse(user.id, updatedCourse);
                else await saveLocalCourse(updatedCourse);
                setActiveCourse({...updatedCourse});

            } catch (e) { console.error("Audio gen failed", e); }
       }

       if (course.mode !== 'CRASH_COURSE') {
            for (let i = 0; i < updatedCourse.reels.length; i++) {
                const reel = updatedCourse.reels[i];
                if (reel.isReady) continue;
                
                setVideoQueue(prev => [...prev, {
                    courseId: course.id,
                    reelId: reel.id,
                    prompt: reel.visualPrompt,
                    notifyEmail,
                    totalReels: course.totalReels
                }]);
            }
       } else {
            updatedCourse.status = 'READY';
            updatedCourse.completedReels = updatedCourse.totalReels;
            setActiveCourse({...updatedCourse});
            setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
            if (user && user.id !== 'guest') await CloudService.saveUserCourse(user.id, updatedCourse);
            else await saveLocalCourse(updatedCourse);
       }
  };

  useEffect(() => {
      if (processingRef.current || videoQueue.length === 0) return;

      const processItem = async () => {
          processingRef.current = true;
          const item = videoQueue[0];
          
          try {
              const currentCourse = courses.find(c => c.id === item.courseId);
              if (!currentCourse) {
                  setVideoQueue(prev => prev.slice(1));
                  processingRef.current = false;
                  return;
              }
              
              const updatedCourse = JSON.parse(JSON.stringify(currentCourse));
              const reelIndex = updatedCourse.reels.findIndex((r: ReelData) => r.id === item.reelId);
              if (reelIndex === -1) {
                   setVideoQueue(prev => prev.slice(1));
                   processingRef.current = false;
                   return;
              }

              const reel = updatedCourse.reels[reelIndex];

              let audioUri = reel.audioUri;
              if (!audioUri) {
                  audioUri = await generateAudio(reel.script, user?.profile?.voice || 'Kore');
                  updatedCourse.reels[reelIndex].audioUri = audioUri;
              }

              let videoUri = null;
              let imageUri = null;

              try {
                  const opName = await triggerVeoGeneration(item.prompt);
                  if (opName) {
                      const startTime = Date.now();
                      while (Date.now() - startTime < 30000) {
                          const status = await pollVeoOperation(opName);
                          if (status.status === 'COMPLETE' && status.uri) {
                              videoUri = status.uri;
                              break;
                          }
                          if (status.status === 'FAILED') break;
                          await new Promise(r => setTimeout(r, 2000));
                      }
                  }
              } catch (e) {
                  console.warn("Veo generation attempt failed", e);
              }

              if (!videoUri) {
                  const useHighQuality = user?.tier === 'PRO';
                  imageUri = await generateImagenImage(item.prompt, useHighQuality);
              }

              updatedCourse.reels[reelIndex].videoUri = videoUri;
              updatedCourse.reels[reelIndex].imageUri = imageUri;
              
              updatedCourse.reels[reelIndex].isReady = true;
              updatedCourse.reels[reelIndex].isProcessing = false;
              updatedCourse.completedReels += 1;

              if (updatedCourse.completedReels === updatedCourse.totalReels) {
                  updatedCourse.status = 'READY';
                  if (item.notifyEmail && user?.email) {
                      CloudService.sendCompletionEmail(user.email, updatedCourse.title);
                  }
              }

              if (activeCourse?.id === updatedCourse.id) setActiveCourse(updatedCourse);
              setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
              
              if (user && user.id !== 'guest') await CloudService.saveUserCourse(user.id, updatedCourse);
              else await saveLocalCourse(updatedCourse);

          } catch (e) {
              console.error("Generation failed for item", item, e);
              const currentCourse = courses.find(c => c.id === item.courseId);
              if (currentCourse) {
                  const updatedCourse = JSON.parse(JSON.stringify(currentCourse));
                  const reelIndex = updatedCourse.reels.findIndex((r: ReelData) => r.id === item.reelId);
                  if (reelIndex !== -1) {
                      updatedCourse.reels[reelIndex].isReady = true; 
                      updatedCourse.reels[reelIndex].isProcessing = false;
                      if (activeCourse?.id === updatedCourse.id) setActiveCourse(updatedCourse);
                      setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
                  }
              }
          } finally {
              setVideoQueue(prev => prev.slice(1));
              processingRef.current = false;
          }
      };

      processItem();
  }, [videoQueue, courses, activeCourse, user]);

  const handleUpdateReel = (id: string, updates: Partial<ReelData>) => {
      if (!activeCourse) return;
      const updatedCourse = { ...activeCourse };
      const reelIndex = updatedCourse.reels.findIndex(r => r.id === id);
      if (reelIndex !== -1) {
          updatedCourse.reels[reelIndex] = { ...updatedCourse.reels[reelIndex], ...updates };
          
          const totalQuizzes = updatedCourse.reels.filter(r => r.quiz).length;
          const passedQuizzes = updatedCourse.reels.filter(r => r.userQuizResult === true).length;
          if (totalQuizzes > 0) {
              updatedCourse.masteryScore = Math.round((passedQuizzes / totalQuizzes) * 100);
          }

          updatedCourse.lastAccessedAt = Date.now();
          setActiveCourse(updatedCourse);
          setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
          
          if (user && user.id !== 'guest') CloudService.saveUserCourse(user.id, updatedCourse);
          else saveLocalCourse(updatedCourse);
      }
  };

  const handleRegenerateImage = async (reelId: string) => {
      if (!activeCourse) return;
      const courseClone = JSON.parse(JSON.stringify(activeCourse));
      const reelIndex = courseClone.reels.findIndex((r: ReelData) => r.id === reelId);
      if (reelIndex === -1) return;

      const reel = courseClone.reels[reelIndex];
      reel.isProcessing = true;
      courseClone.reels[reelIndex] = reel;
      
      setActiveCourse({...courseClone});
      setCourses(prev => prev.map(c => c.id === courseClone.id ? courseClone : c));

      try {
          const useHighQuality = user?.tier === 'PRO';
          const imageUri = await generateImagenImage(reel.visualPrompt, useHighQuality);
          
          const updatedReel = { ...reel, imageUri, isProcessing: false, isReady: true };
          courseClone.reels[reelIndex] = updatedReel;
          
          setActiveCourse({...courseClone});
          setCourses(prev => prev.map(c => c.id === courseClone.id ? courseClone : c));
          
          if (user && user.id !== 'guest') await CloudService.saveUserCourse(user.id, courseClone);
          else await saveLocalCourse(courseClone);
          
          showToast("Visual regenerated!");
      } catch (e) {
          console.error("Image generation failed", e);
          courseClone.reels[reelIndex].isProcessing = false;
          setActiveCourse({...courseClone}); 
          setCourses(prev => prev.map(c => c.id === courseClone.id ? courseClone : c));
          showToast("Failed to generate image.");
      }
  };

  const handleGenerateRemedial = async (failedReels: ReelData[]) => {
      if (!activeCourse) return;
      setLoadingStatus("Generating Remedial Modules...");
      try {
          const remedialReels = await generateRemedialCurriculum(failedReels, activeCourse.level);
          const updatedCourse = { ...activeCourse };
          updatedCourse.reels = [...updatedCourse.reels, ...remedialReels];
          updatedCourse.totalReels += remedialReels.length;
          updatedCourse.remedialCount = (updatedCourse.remedialCount || 0) + 1;
          
          setActiveCourse(updatedCourse);
          setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
          if (user && user.id !== 'guest') await CloudService.saveUserCourse(user.id, updatedCourse);
          else await saveLocalCourse(updatedCourse);
          
          setLoadingStatus('');
          processGenerationQueue(updatedCourse, false);
      } catch (e) {
          setLoadingStatus('');
          alert("Could not generate remedial content.");
      }
  };

  const handleGenerateTopic = async (semesterId: string, subjectId: string, unitId: string, topic: SemesterTopic) => {
        const updatedSemesters = [...semesters];
        const semIdx = updatedSemesters.findIndex(s => s.id === semesterId);
        if (semIdx === -1) return;
        const sub = updatedSemesters[semIdx].subjects.find(s => s.id === subjectId);
        const unit = sub?.units.find((u: any) => u.id === unitId);
        const t = unit?.topics?.find((t: any) => t.id === topic.id);
        
        if (t) t.status = 'GENERATING';
        setSemesters(updatedSemesters);

        try {
            const reels = await generateCourseOutline(
               `${topic.title}: ${topic.description}. Context: ${unit?.description}`, 
               [], 
               updatedSemesters[semIdx].level, 
               false,
               'English',
               undefined,
               {},
               5,
               'GENERAL',
               'VIDEO'
            );

            const newCourse: Course = {
                id: `course-${Date.now()}`,
                ownerId: user?.id || 'local',
                isPublic: false,
                title: topic.title,
                language: 'English',
                level: updatedSemesters[semIdx].level,
                mode: 'VIDEO',
                createdAt: Date.now(),
                lastAccessedAt: Date.now(),
                reels: reels,
                totalReels: reels.length,
                completedReels: 0,
                status: 'GENERATING',
                semesterId, subjectId, unitId, topicId: topic.id
           };

           if (user && user.id !== 'guest') await CloudService.saveUserCourse(user.id, newCourse);
           else await saveLocalCourse(newCourse);
           setCourses(prev => [newCourse, ...prev]);

           t.status = 'GENERATED';
           t.courseId = newCourse.id;
           setSemesters([...updatedSemesters]); 
           
           if (user && user.id !== 'guest') await CloudService.saveUserSemester(user.id, updatedSemesters[semIdx]);
           else await saveLocalSemester(updatedSemesters[semIdx]);

           processGenerationQueue(newCourse, false);

        } catch (e) {
             console.error(e);
             t.status = 'PENDING';
             setSemesters([...updatedSemesters]);
        }
  };

  const handleDailyCheckinComplete = (attendedSubjects: string[]) => {
      if (semesters.length > 0) {
          const targetSemester = activeSemesterId ? semesters.find(s => s.id === activeSemesterId) : semesters[0];
          
          if (targetSemester) {
              const updatedSem = JSON.parse(JSON.stringify(targetSemester));
              
              attendedSubjects.forEach(subjectName => {
                  const subject = updatedSem.subjects.find((s: any) => s.title.toLowerCase().includes(subjectName.toLowerCase()) || subjectName.toLowerCase().includes(s.title.toLowerCase()));
                  if (subject) {
                      subject.attendance.attended += 1;
                      subject.attendance.total += 1;
                  }
              });
              
              setSemesters(prev => prev.map(s => s.id === updatedSem.id ? updatedSem : s));
              if (user && user.id !== 'guest') CloudService.saveUserSemester(user.id, updatedSem);
              else saveLocalSemester(updatedSem);
          }
      }
      refreshGlobalData();
  };

  const handleDeleteCourse = async (id: string) => {
      if (user && user.id !== 'guest') await CloudService.deleteUserCourse(user.id, id);
      else await deleteLocalCourse(id);
      
      setCourses(prev => prev.filter(c => c.id !== id));
      if (activeCourse?.id === id) setActiveCourse(null);
  };

  const handleDeleteSemester = async (id: string) => {
      if (user && user.id !== 'guest') await CloudService.deleteUserSemester(user.id, id);
      else await deleteLocalSemester(id);
      
      setSemesters(prev => prev.filter(s => s.id !== id));
      if (activeSemesterId === id) { setActiveSemesterId(null); setAppState(AppState.DASHBOARD); }
  };

  const handleXPUpgrade = (amount: number) => {
      if (user && user.id !== 'guest') {
          const newXP = (user.profile?.xp || 0) + amount;
          const updatedProfile = { ...user.profile, xp: newXP } as any;
          handleProfileUpdate(updatedProfile);
      }
  };

  const handleOpenReel = (index: number) => {
      setStartReelIndex(index);
      setAppState(AppState.FEED);
  };

  if (authLoading) return <LoadingFallback />;

  const needsOnboarding = user && user.id !== 'guest' && !user.profile && !onboardingComplete;
  if (needsOnboarding) return (
    <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
            <OnboardingView 
                onComplete={handleOnboardingComplete}
                onStartCrashCourse={handleStartCrashCourseFromOnboarding}
            />
        </Suspense>
    </ErrorBoundary>
  );

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        {toastMsg && (
            <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-stone-900 text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest z-[100] animate-fade-in shadow-xl">
                {toastMsg}
            </div>
        )}

        {appState === AppState.LANDING && (
            <LandingView 
            onEnter={() => setAppState(user ? AppState.DASHBOARD : AppState.AUTH)} 
            onNavigate={(page) => {
                setAppState(page as any);
                if(page === 'TERMS') window.history.pushState(null, '', '/terms');
                if(page === 'PRIVACY') window.history.pushState(null, '', '/privacy');
                if(page === 'REFUND') window.history.pushState(null, '', '/refund');
            }}
            onToggleTheme={handleToggleTheme}
            currentTheme={theme}
            />
        )}

        {appState === AppState.AUTH && (
            <AuthView 
                onLogin={handleLogin} 
                onGuest={handleGuest} 
                onToggleTheme={handleToggleTheme}
                currentTheme={theme}
            />
        )}

        {appState === AppState.PRICING && (
            <PricingView 
                user={user}
                onBack={() => setAppState(user ? AppState.DASHBOARD : AppState.LANDING)} 
                onGetStarted={() => setAppState(user ? AppState.DASHBOARD : AppState.AUTH)}
                onUpgradeSuccess={handleUpgradeSuccess}
                onToggleTheme={handleToggleTheme}
                currentTheme={theme}
            />
        )}

        {appState === AppState.CONTACT && (
            <ContactView 
                onBack={() => setAppState(user ? AppState.DASHBOARD : AppState.LANDING)}
                onToggleTheme={handleToggleTheme}
                currentTheme={theme}
                onNavigate={(page) => setAppState(page as any)}
            />
        )}

        {appState === AppState.TERMS && (
            <TermsView onBack={() => {
                setAppState(user ? AppState.DASHBOARD : AppState.LANDING);
                window.history.pushState(null, '', '/');
            }} />
        )}

        {appState === AppState.PRIVACY && (
            <PrivacyView onBack={() => {
                setAppState(user ? AppState.DASHBOARD : AppState.LANDING);
                window.history.pushState(null, '', '/');
            }} />
        )}

        {appState === AppState.REFUND && (
            <RefundView onBack={() => {
                setAppState(user ? AppState.DASHBOARD : AppState.LANDING);
                window.history.pushState(null, '', '/');
            }} />
        )}

        {appState === AppState.DASHBOARD && (
            <Dashboard 
            user={user} 
            courses={courses} 
            semesters={semesters}
            timetable={timetable}
            assignments={assignments}
            onCreateNew={() => { 
                if (checkFreeLimit()) {
                    setIngestMode('SINGLE'); 
                    setIngestSubMode('VIDEO');
                    setAppState(AppState.INGEST); 
                }
            }}
            onStartSemester={() => { 
                if (checkFreeLimit()) {
                    setIngestMode('SEMESTER'); 
                    setAppState(AppState.INGEST);
                }
            }}
            onStartCourse={() => { 
                if (checkFreeLimit()) {
                    setIngestMode('SINGLE'); 
                    setIngestSubMode('VIDEO');
                    setAppState(AppState.INGEST);
                }
            }}
            onSelectCourse={(id) => { 
                const c = courses.find(c => c.id === id); 
                if (c) { setActiveCourse(c); setAppState(AppState.CLASSROOM); } 
            }}
            onSelectSemester={(sem) => {
                setActiveSemesterId(sem.id);
                setAppState(AppState.SEMESTER_VIEW);
            }}
            onDeleteCourse={handleDeleteCourse}
            onSignOut={() => { CloudService.signOut(); setUser(null); setAppState(AppState.LANDING); }}
            onToggleTheme={handleToggleTheme}
            currentTheme={theme}
            onUpdateProfile={(p) => { handleProfileUpdate(p); setAppState(AppState.PROFILE); }} 
            onOpenTimetable={() => setAppState(AppState.TIMETABLE)}
            onOpenAssignments={() => setAppState(AppState.ASSIGNMENTS)}
            onUpgrade={() => setAppState(AppState.PRICING)}
            onReviewSubject={(subject) => {
                if (checkFreeLimit()) {
                    setIngestMode('SINGLE');
                    setIngestSubMode('CRASH_COURSE');
                    setAppState(AppState.INGEST);
                }
            }}
            onOpenTutor={() => setAppState(AppState.TUTOR)}
            />
        )}

        {appState === AppState.TUTOR && (
            <TutorView 
                courses={courses} 
                username={user?.name?.split(' ')[0] || 'Scholar'}
                onBack={() => setAppState(AppState.DASHBOARD)} 
            />
        )}

        {appState === AppState.PROFILE && user && (
            <ProfileView 
                user={user}
                onBack={() => setAppState(AppState.DASHBOARD)}
                onUpdateProfile={handleProfileUpdate}
                onSignOut={() => { CloudService.signOut(); setUser(null); setAppState(AppState.LANDING); }}
                onStartExamCram={() => { 
                    if (checkFreeLimit()) {
                        setIngestMode('SINGLE');
                        setIngestSubMode('CRASH_COURSE');
                        setAppState(AppState.INGEST);
                    }
                }}
                onStartSemester={() => {
                    if (checkFreeLimit()) {
                        setIngestMode('SEMESTER');
                        setAppState(AppState.INGEST);
                    }
                }}
                onUpgrade={() => setAppState(AppState.PRICING)}
            />
        )}

        {appState === AppState.TIMETABLE && (
            <TimetableView 
                onBack={() => setAppState(AppState.DASHBOARD)} 
                onUpdate={refreshGlobalData}
            />
        )}

        {appState === AppState.ASSIGNMENTS && (
            <AssignmentView onBack={() => { refreshGlobalData(); setAppState(AppState.DASHBOARD); }} />
        )}

        {appState === AppState.SEMESTER_VIEW && activeSemester && (
            <SemesterView 
                semester={activeSemester}
                assignments={assignments} 
                timetable={timetable} 
                onBack={() => setAppState(AppState.DASHBOARD)}
                onGenerateUnit={() => {}}
                onGenerateTopic={handleGenerateTopic}
                onOpenUnit={(courseId) => {
                    const c = courses.find(c => c.id === courseId);
                    if (c) { setActiveCourse(c); setAppState(AppState.CLASSROOM); }
                }}
                onUpdateSemester={(updated) => {
                    setSemesters(prev => prev.map(s => s.id === updated.id ? updated : s));
                    if (user && user.id !== 'guest') CloudService.saveUserSemester(user.id, updated);
                    else saveLocalSemester(updated);
                }}
                onDeleteSemester={handleDeleteSemester}
                onAddAssignment={handleAddAssignment}
            />
        )}

        {appState === AppState.INGEST && (
            <IngestView 
            user={user}
            initialMode={ingestMode}
            initialSubMode={ingestSubMode}
            onStart={handleStartAnalysis} 
            onCancel={() => setAppState(AppState.DASHBOARD)}
            loadingStatus={loadingStatus}
            currentTheme={theme}
            />
        )}

        {appState === AppState.ANALYSIS && analysisResult && (
            <AnalysisView 
            analysis={analysisResult} 
            onConfirm={handleConfirmCourse} 
            onCancel={() => setAppState(AppState.INGEST)} 
            />
        )}

        {appState === AppState.CLASSROOM && activeCourse && (
            <ClassroomView 
                course={activeCourse}
                user={user}
                onBack={() => setAppState(AppState.DASHBOARD)}
                onOpenReel={handleOpenReel}
                onStartExam={() => setAppState(AppState.EXAM)}
                onToggleTheme={handleToggleTheme}
                currentTheme={theme}
                onUpgrade={() => setAppState(AppState.PRICING)}
            />
        )}

        {appState === AppState.EXAM && activeCourse && (
            <ExamView
                course={activeCourse}
                onClose={() => setAppState(AppState.CLASSROOM)}
                onComplete={(score) => handleXPUpgrade(score * 10)}
            />
        )}

        {appState === AppState.FEED && activeCourse && (
            <ReelFeed 
            activeCourse={activeCourse} 
            reels={activeCourse.reels} 
            onUpdateReel={handleUpdateReel} 
            onBack={() => setAppState(AppState.CLASSROOM)}
            onGenerateRemedial={handleGenerateRemedial}
            onXPUpgrade={handleXPUpgrade}
            onRegenerateImage={handleRegenerateImage}
            />
        )}

        {appState === AppState.SITEMAP && (
            <SitemapView
                onNavigate={(page) => {
                    setAppState(page);
                    if(page === AppState.TERMS) window.history.pushState(null, '', '/terms');
                    if(page === AppState.PRIVACY) window.history.pushState(null, '', '/privacy');
                    if(page === AppState.REFUND) window.history.pushState(null, '', '/refund');
                }}
                onBack={() => setAppState(user ? AppState.DASHBOARD : AppState.LANDING)}
            />
        )}
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
