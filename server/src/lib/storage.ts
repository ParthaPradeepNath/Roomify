import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

type StoredImage = {
  url: string;
  path?: string;
};

const isDataUrl = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("data:");

const isHttpUrl = (value: unknown): value is string =>
  typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"));

const parseDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
};

const extFromMime = (mimeType: string) => {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "png";
  }
};

export const toPublicUrl = (relativePath: string) => `${config.publicUrl}/${relativePath}`;

export const persistImage = async (
  source: string,
  projectId: string,
  label: string,
): Promise<StoredImage | null> => {
  if (isHttpUrl(source)) {
    return { url: source };
  }

  if (!isDataUrl(source)) return null;

  const parsed = parseDataUrl(source);
  if (!parsed) return null;

  const ext = extFromMime(parsed.mimeType);
  const dir = path.join(config.uploadDir, "projects", projectId);
  const filename = `${label}.${ext}`;
  const absolute = path.join(dir, filename);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(absolute, Buffer.from(parsed.data, "base64"));

  return {
    url: toPublicUrl(`uploads/projects/${projectId}/${filename}`),
    path: `uploads/projects/${projectId}/${filename}`,
  };
};
