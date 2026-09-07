import { generateText } from "ai";
import { config } from "../config.js";
import { createImageModel, resolveImageModelId } from "./models.js";

const unescapeBase64 = (data: string) =>
  data.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (data.length % 4)) % 4);

const toDataUrl = (mediaType: string, data: string) =>
  data.startsWith("data:")
    ? data
    : `data:${mediaType || "image/png"};base64,${unescapeBase64(data)}`;

export const fetchAsBase64 = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const blob = await response.blob();
  const buffer = Buffer.from(await blob.arrayBuffer());

  return {
    data: buffer.toString("base64"),
    mimeType: blob.type || "image/png",
  };
};

const ROOMIFY_RENDER_PROMPT = `CONVERT this 2D FLOOR PLAN into a photorealistic 3D architectural render.

STRICT REQUIREMENTS:
1. REMOVE ALL TEXT: no letters, numbers, labels, dimensions, or annotations.
2. GEOMETRY MUST MATCH: walls, rooms, doors, and windows follow exact lines and positions. Do not shift or resize.
3. TOP-DOWN ONLY: orthographic top-down view. No perspective tilt.
4. CLEAN, REALISTIC OUTPUT: crisp edges, balanced lighting, realistic materials.
5. NO EXTRA CONTENT: do not add anything not clearly indicated by the plan.

DETAILS:
- Walls: extrude precisely from plan lines, consistent height and thickness.
- Doors: convert swing arcs into open doors aligned to the plan.
- Windows: convert thin perimeter lines into realistic glass.
- Add furniture only where icons/fixtures are clearly shown: bed, sofa, dining table, kitchen counters, bathroom fixtures, office desk, balcony seating.

STYLE: bright neutral daylight, professional architectural visualization, no text, no watermarks, no logos.`;

export const generate3DView = async (
  sourceImage: string,
  options: { model?: string | null } = {},
) => {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const modelId = resolveImageModelId(options.model ?? config.aiImageModel);

  let inputData: string;
  let mimeType: string;

  if (sourceImage.startsWith("data:")) {
    const match = sourceImage.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) throw new Error("Invalid source image payload");
    mimeType = match[1];
    inputData = match[2];
  } else if (sourceImage.startsWith("http://") || sourceImage.startsWith("https://")) {
    const fetched = await fetchAsBase64(sourceImage);
    mimeType = fetched.mimeType;
    inputData = fetched.data;
  } else {
    throw new Error("Invalid source image payload");
  }

  const { model } = createImageModel(modelId);

  let result;
  try {
    result = await generateText({
      model,
      providerOptions: {
        google: { responseModalities: ["TEXT", "IMAGE"] },
      },
      prompt: [
        {
          role: "user",
          content: [
            { type: "text", text: ROOMIFY_RENDER_PROMPT },
            {
              type: "file",
              data: Buffer.from(inputData, "base64"),
              mediaType: mimeType,
            },
          ],
        },
      ],
    });
  } catch (error) {
    throw new Error(`AI render failed with model "${modelId}": ${(error as Error).message}`);
  }

  const imageFile = result.files.find((file) => file.mediaType.startsWith("image/"));

  if (!imageFile) {
    throw new Error(`Model "${modelId}" returned no rendered image`);
  }

  return { renderedImage: toDataUrl(imageFile.mediaType, imageFile.base64), model: modelId };
};
