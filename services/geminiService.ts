
import { GoogleGenAI, Modality } from "@google/genai";
import { ReelData, EducationLevel, SyllabusAnalysis, ConsultationAnswers } from "../types";

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

async function retryWithBackoff<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isQuotaError = 
      error?.status === 429 || 
      error?.code === 429 || 
      error?.status === 503 ||
      (error?.message && (
        error.message.includes('429') || 
        error.message.includes('quota') || 
        error.message.includes('RESOURCE_EXHAUSTED') ||
        error.message.includes('overloaded')
      ));

    if (isQuotaError) {
       if (retries > 0) {
          await wait(delay);
          return retryWithBackoff(operation, retries - 1, delay * 2);
       } else {
          throw new Error("QUOTA_EXHAUSTED");
       }
    }
    
    if (retries > 0) {
        await wait(delay);
        return retryWithBackoff(operation, retries - 1, delay);
    }
    throw error;
  }
}

export const analyzeSyllabus = async (syllabusText: string): Promise<SyllabusAnalysis> => {
  return retryWithBackoff(async () => {
    const ai = getAiClient();
    const prompt = `
      You are an expert academic counselor. Analyze the following syllabus/notes.
      1. Determine the likely Education Level.
      2. Summarize the core subject in 1 sentence.
      3. Identify 3 critical STRATEGIC questions to ask the user to tailor the course perfectly.
      
      CONSTRAINT: All questions MUST be multiple choice. Provide 2-4 distinct options.

      Input: ${syllabusText.substring(0, 2000)}

      Output JSON format:
      {
        "detectedLevel": "COLLEGE",
        "summary": "string",
        "topics": ["string", "string"],
        "questions": [
          { "id": "q1", "text": "Question?", "options": ["A", "B"] }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    return JSON.parse(response.text.trim());
  });
};

export const generateCourseOutline = async (
  syllabusText: string, 
  urls: string[], 
  level: EducationLevel,
  includePYQ: boolean,
  consultationAnswers: ConsultationAnswers = {},
  maxModules: number = 5
): Promise<ReelData[]> => {
  return retryWithBackoff(async () => {
    const ai = getAiClient();
    
    const consultationContext = Object.entries(consultationAnswers)
      .map(([id, answer]) => `- User Answer to Q${id}: ${answer}`)
      .join('\n');

    const prompt = `
      You are Orbis, a world-class science communicator and documentary producer (Style: Veritasium, Vox, Discovery Channel, Kurzgesagt).
      
      TASK: Architect a comprehensive video course based on the provided syllabus.
      CONSTRAINT: Create exactly ${maxModules} unique modules.

      User Context:
      ${consultationContext}
      Target Level: ${level}
      
      CRITICAL CONTENT RULES (INFOTAINMENT & DEPTH):
      1. **COMPLETE CONCEPTUAL MASTERY**: Do not just summarize. Explain the mechanics. If teaching thermodynamics, explain *how* molecules transfer energy, don't just state the law.
      2. **PRACTICAL & HISTORICAL**: Anchor every concept in reality. Who discovered it? What disaster happened because we didn't know it? How is it used in a Tesla/SpaceX rocket/Smartphone today?
      3. **NO "HELLO STUDENTS"**: Absolutely NO academic greetings. Start immediately with a hook, a paradox, or a question.
      4. **NO FORMULA SLIDES**: The video script and visuals must be strictly narrative and conceptual. 
         - IF a formula is essential (e.g., F=ma), explain the *relationship* in the script (e.g., "Force is directly tied to how heavy something is and how fast you push it"). 
         - PUT THE RAW FORMULA/DEFINITION into the 'keyConcept' field.
      5. **DENSE & VALUABLE**: The script should be ~130-150 words. Fast-paced, dense with insight, respecting the user's intelligence.
      
      Visual Style:
      - Request cinematic 3D animations, exploded views of machinery, abstract data visualizations, or historical reenactments.
      
      Input Syllabus: ${syllabusText.substring(0, 3000)}
      Reference URLs: ${urls.join(', ')}

      Output JSON Schema (Strict Array):
      [
        {
          "type": "CONCEPT",
          "title": "string (Punchy, Magazine-style title. No 'Module 1' prefix)",
          "script": "string (Narrator script. 130-150 words. Engaging, deep, documentary style.)",
          "visualPrompt": "string (Detailed prompt for a photorealistic 3D educational animation or motion graphic)",
          "keyConcept": "string (CRITICAL: The core mathematical equation, date, or strict definition. e.g. 'ΔU = Q - W' or 'Founded: 1899'. If purely narrative, summarize in 5 words.)",
          "youtubeQuery": "string (Optimized YouTube search query for this specific concept. Prioritize high-quality channels like Veritasium, CrashCourse, 3Blue1Brown. e.g. '3Blue1Brown neural networks visualization')",
          "quiz": {
            "question": "string (Conceptual check, not just memory recall)",
            "options": ["string", "string", "string", "string"],
            "correctIndex": number,
            "explanation": "string (Why is this the answer?)"
          }
        }
      ]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let sources: Array<{title: string, uri: string}> = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      sources = response.candidates[0].groundingMetadata.groundingChunks
        .map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
        .filter((s: any) => s !== null);
    }

    let text = response.text || '[]';
    // ROBUST JSON PARSING
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Try to find the first [ and last ]
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
        text = text.substring(start, end + 1);
    }

    let rawData = [];
    try {
        rawData = JSON.parse(text);
    } catch (e) {
        console.error("JSON Parsing failed", text);
        throw new Error("Failed to parse AI curriculum");
    }
    
    if (!Array.isArray(rawData)) rawData = [];
    if (rawData.length === 0) throw new Error("AI generated empty curriculum");

    rawData = rawData.slice(0, maxModules);

    return rawData.map((item: any, index: number) => ({
      id: `reel-${Date.now()}-${index}`,
      type: 'CONCEPT', // Force CONCEPT type
      title: item.title || "Untitled Module",
      script: item.script || "Content unavailable.",
      visualPrompt: item.visualPrompt || "Abstract educational visualization",
      keyConcept: item.keyConcept || item.title || "Core Concept", // Fallback to title if empty
      youtubeQuery: item.youtubeQuery || item.title + " explanation",
      quiz: item.quiz,
      isProcessing: true,
      isReady: false,
      sources: sources.slice(0, 3) 
    }));
  });
};

export const generateAudio = async (text: string): Promise<string> => {
  if (!text || !text.trim()) return "";
  return retryWithBackoff(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio failed");
    return base64Audio; 
  }, 3, 1000);
};

export const generateImagenImage = async (prompt: string): Promise<string> => {
    return retryWithBackoff(async () => {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: `Generate a high quality 3D educational illustration: ${prompt}. Clean, white background, studio lighting, Google material design.` }]
            }
        });
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                     return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No image generated");
    }, 3, 1000);
}

export const generateVeoVideo = async (prompt: string): Promise<string | null> => {
  try {
    return await retryWithBackoff(async () => {
        const ai = getAiClient();
        const enhancedPrompt = `Vertical video (9:16). Educational 3D animation: ${prompt}. Clean white background, studio lighting, minimalist Google Material design style, 4k resolution, smooth motion.`;
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: enhancedPrompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p', 
                aspectRatio: '9:16'
            }
        });
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            operation = await ai.operations.getVideosOperation({operation: operation});
        }
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("Video failed");

        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }, 2, 2000);
  } catch (e: any) {
      if (e.message === "QUOTA_EXHAUSTED" || e.status === 429) return null;
      console.warn("Video generation failed (non-quota):", e);
      return null;
  }
};
