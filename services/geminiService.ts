import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PaperAnalysis } from "../types";

// Define the exact JSON schema for the model output based on Types defined
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    citationKey: { type: Type.STRING, description: "AuthorYear format, e.g., Smith2023" },
    title: { type: Type.STRING, description: "Title of the paper" },
    categoryA: {
      type: Type.OBJECT,
      properties: {
        coreProblem: { type: Type.STRING, description: "Specific limitation the paper solves" },
        theVillain: { type: Type.STRING, description: "Technology or paradigm being criticized" },
        gapClaim: { type: Type.STRING, description: "What is missing in state of the art" },
        keyDefinitions: { type: Type.STRING, description: "Important definitions like Legibility, Co-presence" },
      },
    },
    categoryB: {
      type: Type.OBJECT,
      properties: {
        interactionParadigm: { type: Type.STRING, description: "Synchronous/Async, Symmetric/Asymmetric, etc." },
        embodimentType: { type: Type.STRING, description: "Mobile, Arm, Humanoid, Avatar, etc." },
        inputModality: { type: Type.STRING, description: "Joystick, VR, Voice, Gaze, etc." },
        autonomyLevel: { type: Type.STRING, description: "Direct, Shared, Supervisory, etc." },
      },
    },
    categoryC: {
      type: Type.OBJECT,
      properties: {
        algorithmModel: { type: Type.STRING, description: "Algorithms or AI models used" },
        hardwareSpecs: { type: Type.STRING, description: "Robot hardware used (e.g., Franka, UR5)" },
        latencyPerformance: { type: Type.STRING, description: "Inference time or network lag stats" },
        safetyMechanisms: { type: Type.STRING, description: "Safety implementations" },
      },
    },
    categoryD: {
      type: Type.OBJECT,
      properties: {
        studyDesign: { type: Type.STRING, description: "Within/Between subjects, WoZ vs Functional" },
        sampleSize: { type: Type.STRING, description: "N number of participants" },
        taskDescription: { type: Type.STRING, description: "What users actually did" },
        independentVariables: { type: Type.STRING, description: "Variables changed (e.g., speed, modality)" },
        dependentVariables: { type: Type.STRING, description: "Metrics (Objective and Subjective)" },
      },
    },
    categoryE: {
      type: Type.OBJECT,
      properties: {
        keyFinding: { type: Type.STRING, description: "The most important result (one liner)" },
        unexpectedResults: { type: Type.STRING, description: "Did something go wrong or surprise authors?" },
        limitations: { type: Type.STRING, description: "Self-reported limitations" },
        futureWork: { type: Type.STRING, description: "Suggested next steps" },
        relevanceToTelementoring: { type: Type.STRING, description: "Relevance to Ambient Physical Telementoring and semantic avatars" },
      },
    },
  },
  required: ["citationKey", "title", "categoryA", "categoryB", "categoryC", "categoryD", "categoryE"],
};

export const analyzePaperWithGemini = async (base64Pdf: string): Promise<PaperAnalysis> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are an expert Research Assistant in Human-Robot Interaction (HRI). 
    Your goal is to analyze the provided academic paper PDF and extract structured data to help write a Literature Review.
    
    Focus specifically on the lens of "Ambient Physical Telementoring", "Social Robotics", and "VLM-based interaction".
    
    Extract information into the specific JSON categories provided.
    If information is missing, infer it reasonably from context or state "Not Explicitly Stated".
    Be concise but comprehensive.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-latest", // Using 2.5 Flash for high efficiency with large contexts (PDFs)
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Pdf,
            },
          },
          {
            text: "Analyze this HRI paper and fill out the schema.",
          },
        ],
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2, // Low temperature for factual extraction
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text from Gemini");
    }

    return JSON.parse(text) as PaperAnalysis;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
