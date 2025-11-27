

import { GoogleGenAI, Modality } from "@google/genai";
import { ReelData, EducationLevel, SyllabusAnalysis, ConsultationAnswers, Course, User, CourseSuggestion, Language, VoiceName, ChatMessage, SemesterSubject, SyllabusDomain, CourseMode, CramType, SemesterTopic } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY || '';
  if (!apiKey) {
    throw new Error("API Key not found");
  }
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

// MODEL ROTATION CONFIGURATION
const MODEL_PRIORITY = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
];

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

export const chatWithTutor = async (message: string, history: ChatMessage[], activeReel: ReelData): Promise<string> => {
    return executeWithModelRotation(async (model) => {
        const ai = getAiClient();
        const context = `
          You are Orbis AI, a witty and fun personal tutor.
          CURRENT REEL: "${activeReel.title}"
          SCRIPT: "${activeReel.script}"
          KEY CONCEPT: "${activeReel.keyConcept}"
          TASK: Answer short, conversational, and encouraging.
        `;
        const chatHistory = history.map(h => ({ role: h.role, parts: [{ text: h.text }] }));
        const chat = ai.chats.create({ model: model, config: { systemInstruction: context }, history: chatHistory });
        const result = await chat.sendMessage({ message });
        return result.text || "I'm sorry, I couldn't process that.";
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
    const prompt = `Suggest 3 trending or fascinating follow-up topics based on: ${profileContext}, History: ${historyTitles}. Make them sound exciting. JSON: [{ "title": "", "reason": "", "difficulty": "COLLEGE" }]`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
    let text = response.text || '[]';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try { return JSON.parse(text); } catch (e) { return []; }
  });
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
            }))
        }));
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
        const prompt = `Create 3 remedial modules for failed topics. Use simpler analogies. \n Context: ${failureContext}. \n JSON: [{ "type": "CONCEPT", "title": "", "script": "", "visualPrompt": "", "keyConcept": "", "targetVisualType": "IMAGE", "quiz": { "question": "", "options": [], "correctIndex": 0, "explanation": "" } }]`;
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

    if (mode === 'CRASH_COURSE') {
        const hours = cramConfig?.hoursLeft || 12;
        const type = cramConfig?.type || 'TEACH';
        const focus = type === 'TEACH' ? 'teaching core concepts from scratch fast' : 'revising key high-yield topics';

        prompt = `
          You are Orbis Exam Cram AI. The user has an exam in ${hours} hours.
          TASK: Create a ${maxModules}-part CRASH COURSE focused on ${focus}.
          
          Domain: ${domain}, Level: ${level}, Language: ${language}
          
          OUTPUT FORMAT:
          JSON Array.
          Each item represents a topic.
          
          FIELDS REQUIRED:
          - "title": string
          - "script": string (The audio lecture script. Concise, dense, high-yield. 120 words max.)
          - "bulletPoints": string[] (Array of 3-5 key facts/formulas. IMPORTANT: Use LaTeX for any math formulas, e.g. $$x^2$$.)
          - "keyConcept": string (The one thing to memorize, use LaTeX for math)
          - "quiz": { "question": "", "options": [], "correctIndex": 0, "explanation": "" }
          - "flashcard": { "front": "", "back": "" }
          
          ${pyqSection}
          ${baseInput}
        `;
    } else {
        // VIDEO MODE (Ace Exam Style)
        prompt = `
          You are Orbis, a rigorous and elite exam tutor. You are NOT just making viral videos; you are ensuring the student ACES their exam.
          TASK: Create a ${maxModules}-part course. 
          
          PEDAGOGY (Concept + Practice Loop):
          - Each module must focus on ONE concept, explain it clearly, and then IMMEDIATELY force the student to practice with a HARD exam-style question.
          - **CRITICAL:** If a topic is complex or broad, DO NOT compress it. Break it down into multiple Reels (e.g., "Thermodynamics Part 1: First Law", "Thermodynamics Part 2: Entropy"). 
          - Give one module more than one reel if needed to go in-depth.
          - Do not fluff. Go into detail.
          
          Domain: ${domain}, Level: ${level}, Language: ${language}
          Context: ${consultationContext}
          
          **STYLE RULES:**
          1. **SCRIPT:** Teach the concept effectively in 140 words. End the script by introducing the practice problem.
          2. **QUIZ IS MANDATORY:** The quiz question MUST be an application-based exam problem, not just simple recall.
          3. **VISUALS:** "Cinematic, 4K, Hyper-detailed, educational visualization".
          4. **FORMULAS:** If there are formulas in "keyConcept" or "bulletPoints", use LaTeX format (e.g. $$E=mc^2$$).
          
          ${pyqSection}
          ${baseInput}
    
          Output JSON Schema:
          [
            {
              "type": "CONCEPT",
              "title": "string (Topic Name)",
              "script": "string (Lecture script)",
              "visualPrompt": "string (Cinematic prompt)",
              "keyConcept": "string (The core formula/axiom - Use LaTeX if needed)",
              "bulletPoints": ["string", "string"],
              "targetVisualType": "VIDEO" | "IMAGE",
              "youtubeQueries": ["string", "string"], 
              "quiz": { 
                  "question": "string (A difficult, application-based exam question)", 
                  "options": ["A", "B", "C", "D"], 
                  "correctIndex": number, 
                  "explanation": "string (Detailed step-by-step solution)" 
              },
              "flashcard": { "front": "", "back": "" }
            }
          ]
        `;
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
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
    try { rawData = JSON.parse(text); } catch (e) { throw new Error("Failed to parse AI curriculum"); }
    if (!Array.isArray(rawData) || rawData.length === 0) throw new Error("Empty curriculum");

    return rawData.slice(0, maxModules).map((item: any, index: number) => ({
      id: `reel-${Date.now()}-${index}`,
      type: 'CONCEPT', 
      title: item.title || "Module " + (index + 1),
      script: item.script || "Content unavailable.",
      visualPrompt: item.visualPrompt || "Abstract concept visualization",
      keyConcept: item.keyConcept || item.title, 
      bulletPoints: item.bulletPoints || [], 
      targetVisualType: item.targetVisualType || 'VIDEO', 
      youtubeQuery: item.youtubeQuery || item.title + " explanation",
      youtubeQueries: item.youtubeQueries || [], 
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
  
  // We return null if it fails instead of throwing, so the course generation isn't blocked by audio quotas.
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
      }, 3, 2000); // Increased delay and retries for stability
  } catch (e) {
      console.warn("Audio generation skipped/failed:", e);
      return null;
  }
};

export const generateImagenImage = async (prompt: string, useImagenModel = false): Promise<string> => {
    return retryWithBackoff(async () => {
        const ai = getAiClient();
        if (useImagenModel) {
            // Using Imagen 4 for high-quality requests as requested
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
        
        // Default faster generation
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Cinematic, 8k, highly detailed, photorealistic: ${prompt}. Dramatic lighting.` }] }
        });
        
        // Robust part extraction
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
export const generateVeoVideo = async () => null;
