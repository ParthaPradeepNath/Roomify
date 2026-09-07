import { fetchAsDataUrl } from "./utils";
import { ROOMIFY_RENDER_PROMPT } from "./constants";
import { isInHouseConfigured, generate3DView as inHouseGenerate3DView } from "./api";

export const generate3DView = async ({
  sourceImage,
}: Generate3DViewParams): Promise<Generate3DViewResult> => {
  // Prefer the in-house backend when configured.
  if (isInHouseConfigured()) return inHouseGenerate3DView({ sourceImage });

  // Fallback: Puter AI via Gemini.
  const puterModule = await import("@heyputer/puter.js");
  const puter = puterModule.default ?? puterModule;

  const dataUrl = sourceImage.startsWith("data:") ? sourceImage : await fetchAsDataUrl(sourceImage);

  const base64Data = dataUrl.split(",")[1];
  const mimeType = dataUrl.split(";")[0].split(":")[1];

  if (!mimeType || !base64Data) throw new Error("Invalid source image payload");

  const response = (await puter.ai.txt2img(ROOMIFY_RENDER_PROMPT, {
    provider: "gemini",
    model: "gemini-2.5-flash-image",
    input_image: base64Data,
    input_image_mime_type: mimeType,
    ratio: { w: 1024, h: 1024 },
  })) as HTMLImageElement;

  const rawImageUrl = response.src ?? null;

  if (!rawImageUrl) return { renderedImage: null, renderedPath: undefined };

  const renderedImage = rawImageUrl.startsWith("data")
    ? rawImageUrl
    : await fetchAsDataUrl(rawImageUrl);

  return { renderedImage, renderedPath: undefined };
};
