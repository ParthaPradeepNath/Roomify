import "dotenv/config";
import path from "node:path";
import { DEFAULT_IMAGE_MODEL } from "./lib/models.js";

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "insecure-dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  aiImageModel: process.env.AI_IMAGE_MODEL || process.env.GEMINI_MODEL || DEFAULT_IMAGE_MODEL,
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`).replace(
    /\/$/,
    "",
  ),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || "uploads"),
};
