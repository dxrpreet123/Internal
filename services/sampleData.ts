
import { Course } from '../types';

export const getSampleCourse = (ownerId: string): Course => ({
  id: `sample-${Date.now()}`,
  ownerId,
  isPublic: false,
  title: 'Mastering Atomic Habits',
  language: 'English',
  level: 'PROFESSIONAL',
  mode: 'VIDEO',
  createdAt: Date.now(),
  lastAccessedAt: Date.now(),
  status: 'READY',
  totalReels: 3,
  completedReels: 3,
  masteryScore: 0,
  thumbnailUri: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&q=80&w=800',
  reels: [
    {
      id: 'sample-reel-1',
      type: 'CONCEPT',
      title: 'The 1% Rule',
      script: "Success isn't an overnight event. It's the 1% rule. If you get 1% better each day for a year, you'll end up 37 times better. But if you get 1% worse, you drop to nearly zero. Small habits compound like interest.",
      visualPrompt: 'Exponential growth curve made of gold coins, cinematic lighting',
      keyConcept: '1.01^{365} \\approx 37.78',
      smartTip: 'Habits are the compound interest of self-improvement.',
      targetVisualType: 'IMAGE',
      imageUri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1080',
      quiz: {
        question: 'What is the mathematical result of improving 1% daily for one year?',
        options: ['2x better', '10x better', '37x better', 'It stays the same'],
        correctIndex: 2,
        explanation: 'Compound interest works on habits too. 1.01 to the power of 365 is roughly 37.78.'
      },
      isProcessing: false,
      isReady: true,
      audioUri: null 
    },
    {
      id: 'sample-reel-2',
      type: 'CONCEPT',
      title: 'The Habit Loop',
      script: "Every habit follows a 4-step pattern: Cue, Craving, Response, Reward. To build a good habit, make the cue obvious. To break a bad one, make the cue invisible. You are the architect of your environment.",
      visualPrompt: 'A glowing neurological loop in a human brain, abstract 3d render',
      keyConcept: 'Cue \\rightarrow Craving \\rightarrow Response \\rightarrow Reward',
      smartTip: 'Environment design beats willpower every time.',
      targetVisualType: 'IMAGE',
      imageUri: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&q=80&w=1080',
      quiz: {
        question: 'Which is the first step of the habit loop?',
        options: ['Reward', 'Response', 'Cue', 'Craving'],
        correctIndex: 2,
        explanation: 'The Cue triggers your brain to initiate a behavior. It predicts a reward.'
      },
      isProcessing: false,
      isReady: true,
      audioUri: null
    },
    {
      id: 'sample-reel-3',
      type: 'CONCEPT',
      title: 'The 2-Minute Rule',
      script: "Stop procrastinating. When starting a new habit, it should take less than two minutes to do. Read before bed? Read one page. Run 3 miles? Tie your running shoes. Master the art of showing up.",
      visualPrompt: 'A stopwatch freezing time, high speed photography',
      keyConcept: 'Start < 2 Minutes',
      smartTip: 'A habit must be established before it can be improved.',
      targetVisualType: 'IMAGE',
      imageUri: 'https://images.unsplash.com/photo-1501139083538-0139583c61df?auto=format&fit=crop&q=80&w=1080',
      quiz: {
        question: 'The 2-Minute Rule states a new habit should take how long to do?',
        options: ['20 minutes', 'Less than 2 minutes', 'Exactly 2 minutes', '1 hour'],
        correctIndex: 1,
        explanation: 'Make it easy to start. You can optimize the habit later.'
      },
      isProcessing: false,
      isReady: true,
      audioUri: null
    }
  ]
});
