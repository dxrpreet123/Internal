

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

export interface YoutubeResource {
    title: string;
    url: string;
    timestamp: string; // e.g., "04:20"
    thumbnail?: string;
}

export type ReelType = 'CONCEPT'; 

export type EducationLevel = 'SCHOOL' | 'HIGH_SCHOOL' | 'COLLEGE' | 'PROFESSIONAL' | 'HOBBY';

export type UserTier = 'FREE' | 'PRO';

export type Language = 'English' | 'Hindi' | 'Spanish' | 'French' | 'German' | 'Chinese' | 'Japanese' | 'Korean' | 'Portuguese' | 'Italian' | 'Russian' | 'Arabic';

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export type SyllabusDomain = 'HISTORY' | 'MATH' | 'SCIENCE' | 'LITERATURE' | 'CODING' | 'BUSINESS' | 'GENERAL';

export type CourseMode = 'VIDEO' | 'CRASH_COURSE'; 

export type CramType = 'TEACH' | 'REVISE'; 

export interface MonthAdvice {
    month: string; 
    focus: string; 
    advice: string; 
}

export interface OnboardingStrategy {
    toughSubjects: string[];
    easySubjects: string[];
    generalAdvice: string;
    careerTip: string;
    sourceLinks: Array<{title: string, uri: string}>;
    timeline?: MonthAdvice[]; 
}

export interface DailyInsight {
    date: string;
    vibe: 'CHILL' | 'FOCUS' | 'URGENT' | 'RECOVERY';
    title: string;
    prediction: string; 
    action: string; 
    relevantSubject?: string;
}

export interface UserProfile {
  age?: string;
  institution?: string; 
  location?: string; 
  degree?: string; 
  year?: string; 
  role: 'Student' | 'Professional' | 'Lifelong Learner';
  learningStyle: 'Visual' | 'Theoretical' | 'Practical';
  majorInterest?: string;
  language?: Language;
  voice?: VoiceName;
  xp?: number; 
  streak?: number; 
  lastStudyDate?: string; 
  tutorialCompleted?: boolean;
  lastCheckinDate?: string; 
  strategy?: OnboardingStrategy; 
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface ReelData {
  id: string;
  type: ReelType;
  title: string;
  script: string;
  visualPrompt: string;
  visualStyle?: string; 
  keyConcept?: string; 
  smartTip?: string; 
  bulletPoints?: string[]; 
  youtubeQueries?: string[]; 
  youtubeResource?: YoutubeResource;
  targetVisualType?: 'VIDEO' | 'IMAGE';
  quiz?: Quiz;
  flashcard?: Flashcard; 
  userQuizResult?: boolean; 
  videoUri?: string; 
  audioUri?: string | null; 
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
  courseId?: string; 
  topics?: SemesterTopic[]; 
  status: 'PENDING' | 'PLANNING_TOPICS' | 'TOPICS_READY' | 'GENERATING' | 'GENERATED';
  isHighYield?: boolean; 
  isEasyScoring?: boolean;
}

export interface ExamWeight {
    name: string; 
    weight: number; 
}

export interface SemesterSubject {
  id: string;
  title: string;
  units: SemesterUnit[];
  attendance: {
    attended: number;
    total: number;
    targetPct?: number; 
  };
  projectedTotalClasses?: number;
  color?: string; 
  grading?: {
      credits: number;
      targetGrade: number; 
      currentAverage?: number;
  };
  difficulty?: number; 
  scoringStrategy?: string; 
  examWeights?: ExamWeight[]; 
}

export interface Holiday {
  date: string; 
  name: string;
}

export interface GradingSchema {
    id: string;
    name: string;
    type: 'PERCENTAGE' | 'GPA_4' | 'GPA_5' | 'GPA_10';
    maxScore: number;
}

export interface Semester {
  id: string;
  ownerId: string;
  title: string; 
  level: EducationLevel;
  createdAt: number;
  subjects: SemesterSubject[];
  deletedAt?: number;
  pyqContent?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  holidays?: Holiday[];
  midtermStartDate?: string;
  finalStartDate?: string;
  examFormat?: 'WRITTEN' | 'MCQ' | 'PROJECT_BASED' | 'ORAL' | 'HYBRID' | 'ONLINE';
  targetGoal?: number; 
  university?: string;
  gradingSchema?: GradingSchema;
  attendancePolicy?: {
      type: 'PER_SUBJECT' | 'AGGREGATE';
      minPct: number;
  };
}

export interface Course {
  id: string;
  ownerId: string;
  isPublic: boolean;
  syllabusHash?: string;
  title: string;
  language: Language;
  level: EducationLevel;
  mode: CourseMode; 
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

export interface ClassSession {
  id: string;
  subjectName: string;
  startTime: string; 
  endTime: string; 
  room?: string;
  color?: string; 
}

export interface TimeTableDay {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  classes: ClassSession[];
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  description?: string;
  dueDate: string; 
  time?: string; 
  status: 'PENDING' | 'COMPLETED';
  type: 'ESSAY' | 'PROBLEM_SET' | 'PROJECT' | 'READING' | 'EXAM' | 'QUIZ';
  attachments?: string[];
  aiHelpUsed?: boolean;
  score?: number; 
  maxScore?: number;
  weight?: number; 
}

export interface DailyLog {
  date: string; 
  attendedClassIds: string[];
  topicsCovered: Array<{ classId: string, topic: string }>;
  recapGenerated?: boolean;
}

export interface SemesterArchitecture {
    semesterName?: string;
    startDate?: string;
    endDate?: string;
    midtermStartDate?: string;
    finalStartDate?: string;
    location?: string;
    holidays?: Holiday[];
    subjects: Array<{ 
        title: string, 
        description: string, 
        units?: Array<{title: string, description: string}>,
        projectedTotalClasses?: number 
    }>;
    timetable: TimeTableDay[];
    assignments?: Array<{ title: string, subject: string, dueDate?: string, type: 'ESSAY' | 'PROBLEM_SET' | 'PROJECT' | 'READING', description?: string }>;
    rawPyqs?: string; 
    strategyAnalysis?: Record<string, { difficulty: number, strategy: string, highYieldUnitTitles: string[] }>;
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
  TIMETABLE = 'TIMETABLE', 
  ASSIGNMENTS = 'ASSIGNMENTS',
  PROFILE = 'PROFILE',
  TUTOR = 'TUTOR',
  SITEMAP = 'SITEMAP',
  TERMS = 'TERMS',
  PRIVACY = 'PRIVACY',
  REFUND = 'REFUND',
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
  semesterStartDate?: string;
  semesterEndDate?: string;
  semesterMidtermDate?: string;
  semesterFinalDate?: string;
  semesterExamFormat?: 'WRITTEN' | 'MCQ' | 'PROJECT_BASED' | 'ORAL' | 'HYBRID' | 'ONLINE';
  semesterLocation?: string;
  mode: CourseMode;
  cramConfig?: { hoursLeft: number; type: CramType };
  consultationAnswers?: ConsultationAnswers;
  selectedTopics?: string[];
  semesterArchitecture?: SemesterArchitecture;
  semesterGoal?: number;
  semesterUniversity?: string;
  semesterGradingSchema?: GradingSchema;
  semesterExamStructure?: ExamWeight[];
  semesterAttendancePolicy?: {
      type: 'PER_SUBJECT' | 'AGGREGATE';
      minPct: number;
  };
}