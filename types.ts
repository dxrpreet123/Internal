

export interface QuizOption {
  text: string;
}

export interface Quiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export type ReelType = 'CONCEPT'; 

export type EducationLevel = 'SCHOOL' | 'HIGH_SCHOOL' | 'COLLEGE' | 'PROFESSIONAL' | 'HOBBY';

export type UserTier = 'FREE' | 'PRO';

export type Language = 'English' | 'Hindi' | 'Spanish' | 'French' | 'German' | 'Chinese' | 'Japanese' | 'Korean' | 'Portuguese' | 'Italian' | 'Russian' | 'Arabic';

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export type SyllabusDomain = 'HISTORY' | 'MATH' | 'SCIENCE' | 'LITERATURE' | 'CODING' | 'BUSINESS' | 'GENERAL';

export type CourseMode = 'VIDEO' | 'CRASH_COURSE'; // New Mode

export type CramType = 'TEACH' | 'REVISE'; // New Option

export interface UserProfile {
  age?: string;
  institution?: string; 
  role: 'Student' | 'Professional' | 'Lifelong Learner';
  learningStyle: 'Visual' | 'Theoretical' | 'Practical';
  majorInterest?: string;
  language?: Language;
  voice?: VoiceName;
  xp?: number; 
  streak?: number; 
  lastStudyDate?: string; 
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface YouTubeVideo {
    id: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
}

export interface ReelData {
  id: string;
  type: ReelType;
  title: string;
  script: string;
  visualPrompt: string;
  visualStyle?: string; 
  keyConcept?: string; 
  bulletPoints?: string[]; // New: For Cram Mode notes
  youtubeQueries?: string[]; // New: AI suggested specific video searches
  targetVisualType?: 'VIDEO' | 'IMAGE';
  quiz?: Quiz;
  flashcard?: Flashcard; 
  userQuizResult?: boolean; 
  videoUri?: string; 
  audioUri?: string | null; // Allow null for failures
  imageUri?: string;
  isProcessing: boolean;
  isReady: boolean;
  sources?: Array<{ title: string; uri: string }>;
  veoOperationName?: string;
  youtubeQuery?: string;
}

export type CourseStatus = 'GENERATING' | 'READY' | 'ERROR';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  tier: UserTier;
  profile?: UserProfile;
}

export interface CourseSuggestion {
  title: string;
  reason: string;
  difficulty: EducationLevel;
}

export interface SemesterTopic {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'GENERATING' | 'GENERATED';
  courseId?: string;
}

export interface SemesterUnit {
  id: string;
  title: string;
  description: string;
  courseId?: string; // Legacy support
  topics?: SemesterTopic[]; // New granular layer
  status: 'PENDING' | 'PLANNING_TOPICS' | 'TOPICS_READY' | 'GENERATING' | 'GENERATED';
}

export interface SemesterSubject {
  id: string;
  title: string;
  units: SemesterUnit[];
}

export interface Semester {
  id: string;
  ownerId: string;
  title: string; 
  level: EducationLevel;
  createdAt: number;
  subjects: SemesterSubject[];
  deletedAt?: number;
}

export interface Course {
  id: string;
  ownerId: string;
  isPublic: boolean;
  syllabusHash?: string;
  title: string;
  language: Language;
  level: EducationLevel;
  mode: CourseMode; // New field
  createdAt: number;
  lastAccessedAt: number;
  deletedAt?: number; 
  reels: ReelData[];
  totalReels: number;
  completedReels: number; 
  completedVideos?: number;
  status: CourseStatus;
  estimatedReadyTime?: number;
  thumbnailUri?: string;
  processingStatus?: string;
  masteryScore?: number; 
  remedialCount?: number;
  semesterId?: string;
  subjectId?: string;
  unitId?: string;
  topicId?: string;
}

export enum AppState {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  INGEST = 'INGEST',
  ANALYSIS = 'ANALYSIS',
  FEED = 'FEED',
  CLASSROOM = 'CLASSROOM',
  EXAM = 'EXAM',
  SEMESTER_VIEW = 'SEMESTER_VIEW',
  PRICING = 'PRICING',
  CONTACT = 'CONTACT',
  SITEMAP = 'SITEMAP',
}

export type ConsultationAnswers = Record<string, string>;

export interface SyllabusQuestion {
  id: string;
  text: string;
  options?: string[];
}

export interface SyllabusAnalysis {
  detectedLevel: EducationLevel;
  summary: string;
  selectableTopics: string[];
  topics: string[];
  questions: SyllabusQuestion[];
  domain?: SyllabusDomain;
}

export interface CourseRequest {
  syllabus: string;
  urls: string[];
  level: EducationLevel;
  language: Language;
  pyqContent?: string;
  notifyEmail: boolean;
  includePYQ: boolean;
  maxReels: number;
  isSemesterInit: boolean;
  semesterName?: string;
  mode: CourseMode;
  cramConfig?: { hoursLeft: number; type: CramType };
  consultationAnswers?: ConsultationAnswers;
  selectedTopics?: string[];
}