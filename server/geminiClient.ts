import { GoogleGenAI } from "@google/genai";

export function createGeminiClient(apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment secrets.");
  }

  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export function createGeminiLiveClient(apiVersion: "v1beta" | "v1alpha" = "v1beta"): GoogleGenAI {
  // @google/genai >= 3.3.0 defaults to v1, whereas Gemini Live (BidiGenerateContent) requires v1beta/v1alpha.
  return createGeminiClient(apiVersion);
}
