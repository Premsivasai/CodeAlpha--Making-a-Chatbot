import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

if (!apiKey || apiKey === "_DUMMY_API_KEY_") {
  console.warn(
    "[WARNING] Neither OPENAI_API_KEY nor AI_INTEGRATIONS_OPENAI_API_KEY is configured. Using dummy key. OpenAI API requests will fail or use offline mock responses.",
  );
}

export const isModelFarm = !!(baseURL && baseURL.includes("modelfarm"));
export const isGemini = !!(
  (baseURL && baseURL.includes("googleapis.com")) ||
  (apiKey && apiKey.startsWith("AIzaSy"))
);

export const openai = new OpenAI({
  apiKey: apiKey || "dummy-key",
  ...(baseURL ? { baseURL } : {}),
});

export function getChatModel(requestedModel?: string): string {
  if (isGemini) {
    return "models/gemini-3.5-flash";
  }
  if (isModelFarm) {
    return requestedModel || "gpt-5.4";
  }
  return "gpt-4o-mini";
}


