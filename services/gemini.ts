
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const generateAIResponse = async (prompt: string, noteContent?: string) => {
  const ai = getAIClient();
  const systemInstruction = noteContent 
    ? `You are an AI assistant for a note-taking app. The current note content is: "${noteContent}". Help the user based on this context.`
    : "You are a helpful AI assistant integrated into a modern note-taking application.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("AI Error:", error);
    return "An error occurred while connecting to the AI service.";
  }
};

export const streamAIResponse = async (prompt: string, noteContent?: string) => {
  const ai = getAIClient();
  const systemInstruction = noteContent 
    ? `You are an AI assistant for a note-taking app. The current note content is: "${noteContent}". Help the user based on this context.`
    : "You are a helpful AI assistant integrated into a modern note-taking application.";

  try {
    // Return the stream object directly
    return await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
  } catch (error) {
    console.error("AI Stream Error:", error);
    throw error;
  }
};
