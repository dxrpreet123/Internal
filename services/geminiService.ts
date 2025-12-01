import { GoogleGenAI, Modality } from "@google/genai";
import { ReelData, EducationLevel, SyllabusAnalysis, ConsultationAnswers, Course, User, CourseSuggestion, Language, VoiceName, ChatMessage, SemesterSubject, SyllabusDomain, CourseMode, CramType, SemesterTopic, Assignment, SemesterArchitecture, GradingSchema, ExamWeight, UserProfile, OnboardingStrategy, DailyInsight } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY || '';
  return new GoogleGenAI({ apiKey });
};

export const checkApiKey = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && (window as any).aistudio) {
     const hasKey = await (window as any).aistudio.hasSelectedApiKey();
     return hasKey;
  }
  return !!process.env.API_KEY;
};

export const promptForKey = async () => {
   if (typeof window !== 'undefined' && (window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
   }
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MODEL_PRIORITY = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-3-pro-preview'
];

// Helper to inject thinking config only for supported models
const getThinkingConfig = (model: string) => {
    // Gemini 2.5 and 3.0 support thinking. 1.5 does not.
    if (model.includes('2.5') || model.includes('3-pro')) {
        // Budget 2048 is a good balance for latency vs quality for interactive apps
        return { thinkingConfig: { thinkingBudget: 2048 } };
    }
    return {};
};

async function executeWithModelRotation<T>(
    operation: (model: string) => Promise<T>,
    fallbackModels: string[] = [...MODEL_PRIORITY]
): Promise<T> {
    const currentModel = fallbackModels[0];
    
    try {
        return await operation(currentModel);
    } catch (error: any) {
        const isRetryable = 
            error?.status === 429 || 
            error?.code === 429 || 
            error?.status === 503 ||
            (error?.message && (
                error.message.includes('429') || 
                error.message.includes('quota') || 
                error.message.includes('RESOURCE_EXHAUSTED') ||
                error.message.includes('overloaded')
            ));

        if (isRetryable && fallbackModels.length > 1) {
            console.warn(`Model ${currentModel} failed with ${error.status || 'Quota Limit'}. Switching to ${fallbackModels[1]}...`);
            await wait(1000);
            return executeWithModelRotation(operation, fallbackModels.slice(1));
        }
        throw error;
    }
}

async function retryWithBackoff<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retries > 0) {
        await wait(delay);
        return retryWithBackoff(operation, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

export const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const typedarray = new Uint8Array(reader.result as ArrayBuffer);
                // @ts-ignore
                const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
                let fullText = '';
                const maxPages = Math.min(pdf.numPages, 30);
                for (let i = 1; i <= maxPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                resolve(fullText);
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

export const extractTextFromImage = async (file: File): Promise<string> => {
    const hasKey = await checkApiKey();
    if (!hasKey) {
        await promptForKey();
        const nowHasKey = await checkApiKey();
        if (!nowHasKey) throw new Error("API Key required for Image Processing");
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const base64String = (reader.result as string).split(',')[1];
                const ai = getAiClient();
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: {
                        parts: [
                            { inlineData: { mimeType: file.type, data: base64String } },
                            { text: "Transcribe all the text visible in this image verbatim. If it is a diagram, describe it in detail." }
                        ]
                    }
                });
                resolve(response.text || "");
            } catch (e) {
                console.error("Image extraction failed", e);
                reject(e);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const chatWithTutor = async (message: string, history: ChatMessage[], activeReel: ReelData): Promise<string> => {
    return executeWithModelRotation(async (model) => {
        const ai = getAiClient();
        const context = `
          You are Orbis, a witty and fun personal tutor.
          CURRENT REEL: "${activeReel.title}"
          SCRIPT: "${activeReel.script}"
          KEY CONCEPT: "${activeReel.keyConcept}"
          TASK: Answer short, conversational, and encouraging.
        `;
        const chatHistory = history.map(h => ({ role: h.role, parts: [{ text: h.text }] }));
        const chat = ai.chats.create({ 
            model: model, 
            config: { 
                systemInstruction: context,
                ...getThinkingConfig(model)
            }, 
            history: chatHistory 
        });
        const result = await chat.sendMessage({ message });
        return result.text || "I'm sorry, I couldn't process that.";
    });
};

export const chatWithDashboardTutor = async (message: string, history: ChatMessage[], courseTitle: string, contextData: string): Promise<string> => {
    return executeWithModelRotation(async (model) => {
        const ai = getAiClient();
        
        const context = `
          You are the Orbis Tutor.
          The user is studying the course: "${courseTitle}".
          
          COURSE CONTEXT SUMMARY:
          ${contextData.substring(0, 10000)} // Truncate to safe limit if needed
          
          ROLE:
          1. You are a friendly, encouraging, and highly knowledgeable tutor.
          2. STICK TO THE CONTEXT of the course provided. Do not hallucinate outside info unless necessary to explain.
          3. If the user asks "What should I study?", suggest a specific topic from the Context.
          4. Keep answers concise (max 3 sentences) unless asked for a deep dive.
          
          Current Conversation History included.
        `;
        
        const chatHistory = history.map(h => ({ role: h.role, parts: [{ text: h.text }] }));
        const chat = ai.chats.create({ 
            model: model, 
            config: { 
                systemInstruction: context,
                ...getThinkingConfig(model)
            }, 
            history: chatHistory 
        });
        const result = await chat.sendMessage({ message });
        return result.text || "I'm having trouble connecting to your course data.";
    });
};

export const explainLikeIm5 = async (concept: string, context: string): Promise<string> => {
    return executeWithModelRotation(async (model) => {
        const ai = getAiClient();
        const prompt = `Explain the following concept to a 5-year-old using a simple, fun analogy. Keep it under 50 words. \n\n Concept: ${concept} \n Context: ${context}`;
        const response = await ai.models.generateContent({ model: model, contents: prompt });
        return response.text.trim();
    });
};

export const generateCourseSuggestions = async (user: User, recentCourses: Course[]): Promise<CourseSuggestion[]> => {
  return retryWithBackoff(async () => {
    const ai = getAiClient();
    const historyTitles = recentCourses.slice(0, 5).map(c => c.title).join(", ");
    const profileContext = user.profile ? `User: ${user.profile.role}, ${user.profile.majorInterest}` : "";
    const prompt = `Suggest 3 trending or fascinating follow-up topics based on: ${profileContext}, History: ${historyTitles}. Make them sound exciting (like YouTube video titles). JSON: [{ "title": "", "reason": "", "difficulty": "COLLEGE" }]`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
    let text = response.text || '[]';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try { return JSON.parse(text); } catch (e) { return []; }
  });
};

const extractJSON = (text: string): string => {
    const startIdx = text.indexOf('{');
    if (startIdx === -1) return text; 
    const endIdx = text.lastIndexOf('}');
    if (endIdx === -1) return text;
    return text.substring(startIdx, endIdx + 1);
};

const architectSemesterSimple = async (inputText: string): Promise<SemesterArchitecture> => {
    return executeWithModelRotation(async (model) => {
        const ai = getAiClient();
        const prompt = `
            You are a fallback parser. 
            TASK: Extract the Semester/Term Name and list of Subjects from the text below. 
            Ignore complex details.
            
            INPUT:
            ${inputText.substring(0, 20000)}

            OUTPUT JSON:
            {
                "semesterName": "string",
                "subjects": [
                    { "title": "string", "description": "Subject", "units": [] }
                ]
            }
        `;
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: prompt, 
            config: { responseMimeType: 'application/json' } 
        });
        
        const jsonStr = extractJSON(response.text || '{}');
        return JSON.parse(jsonStr);
    });
};

export const architectSemester = async (inputText: string, startDate?: string, endDate?: string, location?: string, goal?: string, university?: string): Promise<SemesterArchitecture> => {
    try {
        return await executeWithModelRotation(async (model) => {
            const ai = getAiClient();
            
            const hasLocation = !!(startDate && endDate && location);
            const calendarContext = hasLocation 
                ? `SEMESTER CONTEXT: Start=${startDate}, End=${endDate}, Location=${location}` 
                : "";
            
            const goalContext = goal ? `USER GOAL: ${goal}. Institution: ${university || 'Unknown'}` : "";

            const truncatedInput = inputText.length > 1000000 ? inputText.substring(0, 1000000) + "...[TRUNCATED]" : inputText;

            const prompt = `
                You are an expert Academic Architect.
                TASK: Analyze the provided combined input which contains info about Semester/Term Name, Subjects, Timetable, Syllabus, PYQs, and optionally an Academic Calendar.
                
                ${calendarContext}
                ${goalContext}
                
                INPUT DATA:
                ${truncatedInput}

                INSTRUCTIONS:
                1. **Subjects**: Identify all unique subjects mentioned. Map specific content labeled "SYLLABUS FOR SUBJECT: [Name]" to the correct subject as "Units".
                
                **CRITICAL FALLBACK RULE**: 
                If NO syllabus text is provided for a subject, you MUST generate 3-5 generic estimated units based on the Subject Title. Do not return empty units.

                2. **Timetable**: Create a weekly schedule if data exists.
                3. **ACADEMIC CALENDAR**:
                   - If Start/End dates and Location are provided, USE GOOGLE SEARCH to find public holidays.
                   - Calculate 'projectedTotalClasses' by counting weeks * classes per week - holidays.
                4. **Assignments**: Identify any exam dates, deadlines.
                5. **Strategic Analysis**:
                   - Estimate "difficulty" (1-10).
                   - Identify "highYieldUnitTitles" - units that seem fundamental or heavily weighted.
                   - Create a "strategy" tip.

                OUTPUT RAW JSON ONLY. NO MARKDOWN. NO CODE BLOCKS.
                Structure:
                {
                    "semesterName": "string",
                    "startDate": "YYYY-MM-DD",
                    "endDate": "YYYY-MM-DD",
                    "location": "string",
                    "holidays": [{ "date": "YYYY-MM-DD", "name": "string" }],
                    "subjects": [
                        { 
                            "title": "Math 101", 
                            "description": "Calculus", 
                            "units": [{ "title": "Unit 1", "description": "Limits" }],
                            "projectedTotalClasses": 45
                        }
                    ],
                    "timetable": [
                        { "day": "Monday", "classes": [{ "subjectName": "Math 101", "startTime": "09:00", "endTime": "10:00", "room": "101B" }] }
                    ],
                    "assignments": [
                        { "title": "Midterm", "subject": "Math 101", "dueDate": "YYYY-MM-DD", "type": "PROBLEM_SET" }
                    ],
                    "rawPyqs": "string",
                    "strategyAnalysis": {
                        "Subject Title": { "difficulty": 7, "strategy": "string", "highYieldUnitTitles": ["Unit 1", "Unit 3"] }
                    }
                }
            `;
            
            const tools = hasLocation ? [{ googleSearch: {} }] : undefined;

            const response = await ai.models.generateContent({ 
                model: model, 
                contents: prompt, 
                config: { 
                    tools: tools,
                    ...getThinkingConfig(model)
                } 
            });
            
            const text = response.text || '{}';
            const jsonStr = extractJSON(text);

            try { 
                const parsed = JSON.parse(jsonStr); 
                if (!parsed.subjects && !parsed.semesterName) throw new Error("Invalid structure");
                return parsed;
            } catch (e) { 
                console.error("Architect parsing failed. Attempting repair.", text.substring(0, 200));
                try {
                    const repairedText = jsonStr.replace(/,(\s*[}\]])/g, '$1'); 
                    return JSON.parse(repairedText);
                } catch (e2) {
                    throw new Error("JSON Parse Failed");
                }
            }
        });
    } catch (e) {
        console.error("Main architecture failed, trying simple mode.", e);
        try {
            const fallbackResult = await architectSemesterSimple(inputText);
            return {
                ...fallbackResult,
                startDate, endDate, location,
                holidays: [],
                timetable: [],
                assignments: [],
                rawPyqs: ""
            };
        } catch (e2) {
            console.error("Fallback failed", e2);
            throw new Error("Failed to analyze syllabus. Please try adding subjects manually.");
        }
    }
};

export const structureSemester = async (syllabusText: string): Promise<SemesterSubject[]> => {
    return executeWithModelRotation(async (model) => {
        const ai = getAiClient();
        const prompt = `Break syllabus into Subjects and Units. JSON: [{ "title": "Subject", "units": [{ "title": "Unit", "description": "Summary" }] }] \n\n Input: ${syllabusText.substring(0, 15000)}`;
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { responseMimeType: 'application/json' } });
        let text = response.text || '[]';
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let data = [];
        try { data = JSON.parse(text); } catch (e) { data = []; }
        return data.map((subject: any, sIdx: number) => ({
            id: `subject-${Date.now()}-${sIdx}`,
            title: subject.title,
            units: (subject.units || []).map((unit: any, uIdx: number) => ({
                id: `unit-${Date.now()}-${sIdx}-${uIdx}`,
                title: unit.title,
                description: unit.description,
                status: 'PENDING'
            })),
            attendance: { attended: 0, total: 0 }
        }));
    });
};

export const parseAssignment = async (text: string): Promise<Partial<Assignment>> => {
    return executeWithModelRotation(async (model) => {
        const ai = getAiClient();
        const prompt = `
            Analyze this text (from an assignment sheet or image OCR):
            ${text.substring(0, 10000)}

            TASK: Extract structured assignment details.
            
            GUIDELINES:
            - Title: Be concise (e.g. "Math Problem Set 3").
            - Due Date: Infer ISO YYYY-MM-DD. Assume today is ${new Date().toISOString().split('T')[0]}. If "next Monday", calculate it.
            - Type: One of [ESSAY, PROBLEM_SET, PROJECT, READING].
            - Description: Brief summary of what to do.

            OUTPUT JSON:
            {
                "title": "string",
                "subject": "string",
                "dueDate": "YYYY-MM-DD",
                "type": "PROBLEM_SET",
                "description": "string"
            }
        `;
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { responseMimeType: 'application/json' } });
        let raw = response.text || '{}';
        raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        try { return JSON.parse(raw); } catch (e) { return {}; }
    });
};

export const breakUnitIntoTopics = async (unitTitle: string, unitDescription: string): Promise<SemesterTopic[]> => {
     return executeWithModelRotation(async (model) => {
        const ai = getAiClient();
        const prompt = `
            You are an expert curriculum architect.
            TASK: Break down this specific Unit into 4 to 8 granular, deep-dive learning topics. Each topic will eventually be a full course, so they must be substantial.
            UNIT: ${unitTitle}
            DESC: ${unitDescription}

            OUTPUT: JSON Array of objects: { "title": "Specific Topic Name", "description": "What this deep dive covers" }
        `;
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { responseMimeType: 'application/json' } });
        let text = response.text || '[]';
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let data = [];
        try { data = JSON.parse(text); } catch(e) { data = []; }
        return data.map((item: any, idx: number) => ({
            id: `topic-${Date.now()}-${idx}`,
            title: item.title,
            description: item.description,
            status: 'PENDING'
        }));
    });
};

export const analyzeSyllabus = async (syllabusText: string): Promise<SyllabusAnalysis> => {
  return executeWithModelRotation(async (model) => {
    const ai = getAiClient();
    const prompt = `Analyze syllabus. JSON: { "detectedLevel": "COLLEGE", "summary": "", "selectableTopics": ["Unit 1", "Unit 2"], "topics": ["Tag1"], "questions": [{ "id": "q1", "text": "", "options": ["A", "B"] }] } \n\n Input: ${syllabusText.substring(0, 10000)}`;
    const response = await ai.models.generateContent({ model: model, contents: prompt, config: { responseMimeType: 'application/json' } });
    return JSON.parse(response.text.trim());
  });
};

export const generateRemedialCurriculum = async (failedReels: ReelData[], level: EducationLevel): Promise<ReelData[]> => {
    return executeWithModelRotation(async (model) => {
        const ai = getAiClient();
        const failureContext = failedReels.map(r => `Topic: "${r.title}"`).join('\n');
        const prompt = `Create 3 "Remedial Shorts" for a student who failed these topics. Use simple, viral analogies (like "Imagine if..."). \n Context: ${failureContext}. \n JSON: [{ "type": "CONCEPT", "title": "Viral Title", "script": "High energy explanation...", "visualPrompt": "Surreal, 4k", "keyConcept": "Core Idea", "smartTip": "Fun Fact", "targetVisualType": "IMAGE", "quiz": { "question": "", "options": [], "correctIndex": 0, "explanation": "" } }]`;
        const response = await ai.models.generateContent({ model: model, contents: prompt, config: { responseMimeType: 'application/json' } });
        let text = response.text || '[]';
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let rawData = [];
        try { rawData = JSON.parse(text); } catch (e) { rawData = []; }
        return rawData.map((item: any, index: number) => ({
            id: `reel-remedial-${Date.now()}-${index}`,
            type: 'CONCEPT',
            title: item.title,
            script: item.script,
            visualPrompt: item.visualPrompt,
            keyConcept: item.keyConcept,
            smartTip: item.smartTip || "You got this!",
            targetVisualType: item.targetVisualType || 'IMAGE',
            quiz: item.quiz,
            isProcessing: true,
            isReady: false
        }));
    });
};

export const generateCourseOutline = async (
  syllabusText: string, 
  urls: string[], 
  level: EducationLevel,
  includePYQ: boolean,
  language: Language = 'English',
  pyqContent?: string,
  consultationAnswers: ConsultationAnswers = {},
  maxModules: number = 30,
  domain: SyllabusDomain = 'GENERAL',
  mode: CourseMode = 'VIDEO',
  cramConfig?: { hoursLeft: number; type: CramType }
): Promise<ReelData[]> => {
  return executeWithModelRotation(async (model) => {
    const ai = getAiClient();
    
    const consultationContext = Object.entries(consultationAnswers).map(([id, answer]) => `- Q${id}: ${answer}`).join('\n');
    
    let prompt = '';
    const pyqSection = pyqContent ? `USER PROVIDED EXAM QUESTIONS: "${pyqContent.substring(0, 3000)}..."` : '';
    const baseInput = `Input Syllabus: ${syllabusText.substring(0, 6000)}`;

    const youtubeInstruction = `
        VIDEO SEARCH:
        For each module, use Google Search to find ONE highly specific, relevant YouTube video that explains this exact concept.
        - Prefer videos < 15 minutes.
        - Prefer high-quality educational channels (e.g. Khan Academy, Crash Course, organic chemistry tutor, etc).
        - Suggest a timestamp if the topic starts mid-video (e.g. "02:30"), otherwise "00:00".
        - Return structure: "youtubeResource": { "title": "Video Title", "url": "https://youtube.com/...", "timestamp": "00:00" }
    `;

    if (mode === 'CRASH_COURSE') {
        const hours = cramConfig?.hoursLeft || 12;
        const type = cramConfig?.type || 'TEACH';
        const focus = type === 'TEACH' ? 'teaching core concepts from scratch fast' : 'revising key high-yield topics';

        prompt = `
          You are Orbis Exam Cram. The user has an exam in ${hours} hours.
          TASK: Create a ${maxModules}-part CRASH COURSE focused on ${focus}.
          
          **CRITICAL FOCUS FOR EXAM CRAM:**
          1. **Scoring Stuff**: Prioritize topics that carry the most marks. Ignore "nice-to-know" fluff.
          2. **Marking Scheme Hacks**: Mention keywords that examiners look for.
          3. **Repeated Questions**: If you know PYQ trends for this subject, highlight them.
          4. **Pareto Principle**: 20% of the syllabus that gives 80% of the results.
          
          Domain: ${domain}, Level: ${level}, Language: ${language}
          
          ${youtubeInstruction}

          OUTPUT FORMAT:
          JSON Array.
          Each item represents a topic.
          
          FIELDS REQUIRED:
          - "title": string
          - "script": string (Concise, dense, high-yield. Mention "This often comes as a 5-mark question...").
          - "bulletPoints": string[] (Array of 3-5 key facts/formulas/marking keywords.)
          - "keyConcept": string (The one thing to memorize)
          - "quiz": { "question": "", "options": [], "correctIndex": 0, "explanation": "" }
          - "youtubeResource": { "title": "string", "url": "string", "timestamp": "string" }
          
          ${pyqSection}
          ${baseInput}
        `;
    } else {
        prompt = `
          You are Orbis, a world-class educational content creator. 
          Your goal: Turn a dry syllabus into addictive, high-energy video lessons that effectively TEACH the student. 
          The motive is to TEACH the student everything efficiently.
          
          TASK: Create a ${maxModules}-part course. 
          
          STYLE GUIDE:
          1. "The Myth Buster"
          2. "The Visual Hook"
          3. "The Secret Hack"
          4. "The Challenge"

          CONTENT RULES:
          1. **TITLE:** Clickbait-worthy but accurate.
          2. **SCRIPT:** Conversational, fast-paced, high energy. Max 140 words. Focus on teaching the concept.
          3. **VISUAL PROMPT:** Surreal, Cinematic, 4K, Abstract.
          4. **QUIZ:** Interactive challenge.
          5. **SMART TIP:** A mind-blowing one-liner or fun fact.
          
          ${youtubeInstruction}

          Domain: ${domain}, Level: ${level}, Language: ${language}
          Context: ${consultationContext}
          
          ${pyqSection}
          ${baseInput}
    
          Output JSON Schema:
          [
            {
              "type": "CONCEPT",
              "title": "string",
              "script": "string",
              "visualPrompt": "string",
              "keyConcept": "string",
              "smartTip": "string",
              "bulletPoints": ["string", "string"],
              "targetVisualType": "VIDEO" | "IMAGE",
              "youtubeQueries": ["string", "string"],
              "youtubeResource": { "title": "string", "url": "string", "timestamp": "string" },
              "quiz": { 
                  "question": "string", 
                  "options": ["A", "B", "C", "D"], 
                  "correctIndex": number, 
                  "explanation": "string" 
              },
              "flashcard": { "front": "", "back": "" }
            }
          ]
        `;
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { 
          tools: [{ googleSearch: {} }],
          ...getThinkingConfig(model) 
      }
    });

    let sources: Array<{title: string, uri: string}> = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      sources = response.candidates[0].groundingMetadata.groundingChunks
        .map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
        .filter((s: any) => s !== null);
    }

    let text = response.text || '[]';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) text = text.substring(start, end + 1);

    let rawData = [];
    try { rawData = JSON.parse(text); } catch (e) { throw new Error("Failed to parse curriculum"); }
    if (!Array.isArray(rawData) || rawData.length === 0) throw new Error("Empty curriculum");

    return rawData.slice(0, maxModules).map((item: any, index: number) => ({
      id: `reel-${Date.now()}-${index}`,
      type: 'CONCEPT', 
      title: item.title || "Module " + (index + 1),
      script: item.script || "Content unavailable.",
      visualPrompt: item.visualPrompt || "Abstract concept visualization",
      keyConcept: item.keyConcept || item.title, 
      smartTip: item.smartTip || "Stay curious!",
      bulletPoints: item.bulletPoints || [], 
      targetVisualType: item.targetVisualType || 'VIDEO', 
      youtubeQuery: item.youtubeQuery || item.title + " explanation",
      youtubeQueries: item.youtubeQueries || [],
      youtubeResource: item.youtubeResource, 
      quiz: item.quiz,
      flashcard: item.flashcard,
      isProcessing: true,
      isReady: false,
      sources: sources.slice(0, 3)
    }));
  });
};

export const generateAudio = async (text: string, voiceName: VoiceName = 'Kore'): Promise<string | null> => {
  if (!text || !text.trim()) return null;
  try {
      return await retryWithBackoff(async () => {
        const ai = getAiClient();
        const cleanText = text.replace(/[*#]/g, ''); 
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: cleanText }] }],
          config: { 
              responseModalities: [Modality.AUDIO], 
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } 
          },
        });
        const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64) throw new Error("Audio generation failed: Empty response");
        return base64; 
      }, 3, 2000);
  } catch (e) {
      console.warn("Audio generation skipped/failed:", e);
      return null;
  }
};

export const generateImagenImage = async (prompt: string, useImagenModel = false): Promise<string> => {
    return retryWithBackoff(async () => {
        const ai = getAiClient();
        if (useImagenModel) {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: `Cinematic, 8k, highly detailed, photorealistic: ${prompt}. Dramatic lighting.`,
                config: {
                    numberOfImages: 1,
                    aspectRatio: '9:16',
                    outputMimeType: 'image/jpeg',
                }
            });
            const base64 = response.generatedImages?.[0]?.image?.imageBytes;
            if (base64) return `data:image/jpeg;base64,${base64}`;
            throw new Error("No image from Imagen 4.0");
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Cinematic, 8k, highly detailed, photorealistic: ${prompt}. Dramatic lighting.` }] }
        });
        
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No image from gemini-flash-image");
    }, 3, 1000);
}

export const triggerVeoGeneration = async (prompt: string): Promise<string | null> => {
  try {
    return await retryWithBackoff(async () => {
        const ai = getAiClient();
        const operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: `Cinematic 4k video (9:16). ${prompt}. Photorealistic, high texture details, dramatic lighting, trending on artstation.`,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
        });
        return operation.name;
    }, 2, 2000);
  } catch (e) { 
    console.warn("Veo generation request failed", e);
    return null; 
  }
}

export const pollVeoOperation = async (operationName: string): Promise<{status: 'PENDING'|'COMPLETE'|'FAILED', uri?: string}> => {
    try {
        const ai = getAiClient();
        const operation = await ai.operations.getVideosOperation({ operation: { name: operationName } as any });
        if (operation.done) {
             if (operation.error || !operation.response?.generatedVideos?.[0]?.video?.uri) return { status: 'FAILED' };
             try {
                const response = await fetch(`${operation.response.generatedVideos[0].video.uri}&key=${process.env.API_KEY}`);
                const blob = await response.blob();
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
                return { status: 'COMPLETE', uri: base64 };
             } catch (e) { return { status: 'FAILED' }; }
        }
        return { status: 'PENDING' };
    } catch (e) { return { status: 'PENDING' }; }
}

export const generateAssignmentHelp = async (assignment: Assignment): Promise<string> => {
    return executeWithModelRotation(async (model) => {
        const ai = getAiClient();
        const prompt = `
            You are an expert tutor. A student needs help with this assignment.
            
            ASSIGNMENT: ${assignment.title}
            SUBJECT: ${assignment.subject}
            DETAILS: ${assignment.description || "No description provided."}
            TYPE: ${assignment.type}

            TASK: Act as a teaching assistant. 
            1. First, explain the core concept behind this assignment.
            2. Then, provide a structured "Attack Plan" to solve it.
            3. If there are questions implied, guide the user to the answer without giving it directly.
            4. Suggest resources or formulas they might need.
            
            Format as clear Markdown with headings.
        `;
        const response = await ai.models.generateContent({ model: model, contents: prompt });
        return response.text.trim();
    });
};

export const analyzeAssignmentStrategy = async (assignments: Assignment[]): Promise<string> => {
    return executeWithModelRotation(async (model) => {
        const ai = getAiClient();
        const assignmentsText = assignments.map(a => `- Title: ${a.title}, Desc: ${a.description || 'N/A'}`).join('\n');
        
        const prompt = `
            You are a Strategic Academic Advisor.
            
            Here are the assignments uploaded for a specific subject so far:
            ${assignmentsText}
            
            TASK: Analyze these assignments to find patterns.
            1. What modules or topics seem most critical? (e.g. "3 out of 4 assignments focus on Thermodynamics")
            2. Predict what might be on the exam based on this emphasis.
            3. Give a 1-sentence strategic tip (e.g. "Focus 80% of your study time on Unit 3").
            
            Keep the response short, punchy, and actionable. Max 100 words.
        `;
        
        const response = await ai.models.generateContent({ model: model, contents: prompt });
        return response.text.trim();
    });
}

export const generateDailyRecap = async (topics: string[]): Promise<string> => {
    return executeWithModelRotation(async (model) => {
        const ai = getAiClient();
        const prompt = `
           You are Orbis. The student learned these topics today in school:
           ${topics.join(', ')}

           TASK: Write a "Daily Recap" summary. 
           Connect these topics together if possible, or give a 1-sentence "Bottom Line" for each.
           End with a motivating quote.
           Keep it under 150 words.
        `;
        const response = await ai.models.generateContent({ model: model, contents: prompt });
        return response.text.trim();
    });
};

export const generateOnboardingStrategy = async (profile: UserProfile): Promise<OnboardingStrategy> => {
    return executeWithModelRotation(async (model) => {
        const ai = getAiClient();
        
        const searchQuery = `${profile.degree} ${profile.year} year at ${profile.institution} ${profile.location} academic calendar reviews difficult subjects placements`;
        
        const prompt = `
            You are a ruthless Career and Academic Strategist.
            
            USER PROFILE:
            Institution: ${profile.institution}
            Location: ${profile.location}
            Class/Degree: ${profile.degree}
            Year: ${profile.year}
            Interests: ${profile.majorInterest}
            
            TASK:
            1. Search Google for "Reddit ${profile.institution} ${profile.degree} difficulty reviews" and "exam tips student life".
            2. Search for the generic academic calendar for ${profile.institution} or general schools/colleges in ${profile.location} to build a timeline.
            3. Identify 2-3 notorious "tough subjects" for this specific course/year.
            4. Identify 2-3 "easy scoring" subjects.
            5. Summarize general student sentiment/advice.
            6. Provide a "Future Tip" (Career or Higher Ed) for success.
            7. **TIMELINE**: Generate a month-by-month generic guide for the academic year (Aug-May or Jan-Dec based on region).
               - For each relevant month, give a "Focus" (e.g. Midterms, Internships) and "Advice".

            OUTPUT JSON ONLY:
            {
                "toughSubjects": ["string"],
                "easySubjects": ["string"],
                "generalAdvice": "string",
                "careerTip": "string",
                "timeline": [
                    { "month": "August", "focus": "Orientation", "advice": "Join clubs." },
                    { "month": "November", "focus": "Midterms", "advice": "Start studying." }
                ]
            }
        `;

        const response = await ai.models.generateContent({ 
            model: model, 
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });

        let text = response.text || '{}';
        const jsonStr = extractJSON(text);
        const data = JSON.parse(jsonStr);
        
        let sources: Array<{title: string, uri: string}> = [];
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            sources = response.candidates[0].groundingMetadata.groundingChunks
                .map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
                .filter((s: any) => s !== null);
        }
        
        return { ...data, sourceLinks: sources };
    });
};

export const generateDailyInsight = async (
    profile: UserProfile, 
    upcomingAssignments: Assignment[], 
    toughSubjects: string[] = []
): Promise<DailyInsight> => {
    return executeWithModelRotation(async (model) => {
        const ai = getAiClient();
        const today = new Date().toDateString();
        const year = new Date().getFullYear();
        
        const assignmentsContext = upcomingAssignments.length > 0 
            ? upcomingAssignments.map(a => `- ${a.title} (${a.type}) due ${a.dueDate}`).join('\n')
            : "No immediate assignments.";
            
        const prompt = `
            You are Orbis, a hyper-aware academic strategist.
            TODAY: ${today}
            USER: ${profile.role} at ${profile.institution || 'School/University'}.
            LOCATION: ${profile.location || 'Unknown'}.
            CURRENT STAGE: ${profile.degree || 'General'}.
            
            UPCOMING TASKS (Next 14 days):
            ${assignmentsContext}
            
            TOUGH SUBJECTS (Prioritize these): ${toughSubjects.join(', ')}
            
            TASK:
            1. **SEARCH**: Use Google Search to find the "Academic Calendar ${profile.institution || ''} ${year}" or general school schedule in ${profile.location}.
               - Specifically look for: exam dates, holidays, term start/end.
            2. **ANALYZE**: Combine the search results with the user's workload.
            3. **DETERMINE VIBE**:
               - CHILL: No exams/assignments soon, holiday, or weekend.
               - FOCUS: Assignments due in 3-10 days OR Exam period approaching (within 2 weeks).
               - URGENT: Assignments/Exams in < 3 days.
               - RECOVERY: Day after a big exam.
            4. **GENERATE CONTENT**:
               - Title: Punchy, relevant (e.g. "Pre-Exam Power Up", "Weekend Warrior", "Chill Mode").
               - Prediction: Explain *why* based on the Date/Search (e.g. "With Finals starting Dec 7th..."). Keep it under 40 words.
               - Action: Specific task for a tough subject (e.g. "Review Kinematics"). Keep it under 20 words.
               - relevantSubject: Pick ONE subject to focus on.
            
            OUTPUT JSON ONLY:
            {
                "date": "${today}",
                "vibe": "CHILL" | "FOCUS" | "URGENT" | "RECOVERY",
                "title": "string",
                "prediction": "string",
                "action": "string",
                "relevantSubject": "string"
            }
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });

        const jsonStr = extractJSON(response.text || '{}');
        return JSON.parse(jsonStr);
    });
};