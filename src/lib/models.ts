import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { config } from "./config";

export const IMAGE_MODEL_IDS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image",
  "gemini-3-pro-image",
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
] as const;

export type ImageModelId = (typeof IMAGE_MODEL_IDS)[number];

export const DEFAULT_IMAGE_MODEL: ImageModelId = "gemini-2.5-flash-image";

const IMAGE_MODEL_LABELS: Record<ImageModelId, string> = {
  "gemini-2.5-flash-image": "Gemini 2.5 Flash Image (default, balanced)",
  "gemini-3.1-flash-image": "Gemini 3.1 Flash Image (newer, fast)",
  "gemini-3-pro-image": "Gemini 3 Pro Image (higher quality)",
  "gemini-3.1-flash-image-preview": "Gemini 3.1 Flash Image Preview",
  "gemini-3-pro-image-preview": "Gemini 3 Pro Image Preview",
};

export const listImageModels = () =>
  IMAGE_MODEL_IDS.map((id) => ({ id, label: IMAGE_MODEL_LABELS[id] }));

export const isImageModelId = (value: unknown): value is ImageModelId =>
  typeof value === "string" && (IMAGE_MODEL_IDS as readonly string[]).includes(value);

export const resolveImageModelId = (value?: string | null): ImageModelId => {
  if (value && isImageModelId(value)) return value;
  if (value) {
    throw new Error(
      `Unknown image model "${value}". Available models: ${IMAGE_MODEL_IDS.join(", ")}`,
    );
  }
  return DEFAULT_IMAGE_MODEL;
};

export const createImageModel = (modelId: ImageModelId = DEFAULT_IMAGE_MODEL) => {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const google = createGoogleGenerativeAI({ apiKey: config.geminiApiKey });
  return { provider: "google" as const, modelId, model: google(modelId) };
};
