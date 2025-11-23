
export interface QuizOption {
  text: string;
}

export interface Quiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export type ReelType = 'CONCEPT'; // Removed FORMULA, everything is concept/story now

export type EducationLevel = 'SCHOOL' | 'HIGH_SCHOOL' | 'COLLEGE' | 'PROFESSIONAL' | 'HOBBY';

export type UserTier = 'FREE' | 'PRO';

export interface ReelData {
  id: string;
  type: ReelType;
  title: string;
  script: string;
  visualPrompt: string;
  keyConcept?: string; // New: Holds the formula, date, or core definition for the sidebar
  youtubeQuery?: string; // New: Optimized search query for external video
  quiz?: Quiz;
  videoUri?: string; 
  audioUri?: string; 
  imageUri?: string;
  isProcessing: boolean;
  isReady: boolean;
  sources?: Array<{ title: string; uri: string }>;
}

export type CourseStatus = 'GENERATING' | 'READY' | 'ERROR';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  tier: UserTier;
}

export interface Course {
  id: string;
  ownerId: string;
  isPublic: boolean;
  syllabusHash?: string;
  title: string;
  level: EducationLevel;
  createdAt: number;
  lastAccessedAt: number;
  reels: ReelData[];
  totalReels: number;
  completedReels: number; 
  completedVideos?: number;
  status: CourseStatus;
  estimatedReadyTime?: number;
  thumbnailUri?: string;
  processingStatus?: string;
}

export interface SyllabusAnalysis {
  detectedLevel: EducationLevel;
  summary: string;
  topics: string[];
  questions: Array<{
    id: string;
    text: string;
    options?: string[];
  }>;
}

export interface ConsultationAnswers {
  [questionId: string]: string;
}

export interface CourseRequest {
  syllabus: string;
  urls: string[];
  level: EducationLevel;
  notifyEmail: boolean;
  includePYQ: boolean;
  consultationAnswers?: ConsultationAnswers;
  maxReels: number;
}

export enum AppState {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  INGEST = 'INGEST',
  ANALYSIS = 'ANALYSIS',
  FEED = 'FEED',
}
