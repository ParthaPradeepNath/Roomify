import path from "node:path";

export const config = {
  jwtSecret: process.env.JWT_SECRET || "insecure-dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  aiImageModel: process.env.AI_IMAGE_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash-image",
  publicUrl: (process.env.PUBLIC_URL || "http://localhost:3000").replace(/\/$/, ""),
  uploadDir: path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "uploads"),
};
