import { config } from "../config.js";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Gemini image generation returns url-safe (escaped) base64. Normalize it.
const unescapeBase64 = (data: string) =>
  data.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (data.length % 4)) % 4);

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

export const generate3DView = async (sourceImage: string) => {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

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

  const POPULATION_TEXT = `CONVERT this 2D FLOOR PLAN into a photorealistic 3D architectural render.

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

  const response = await fetch(
    `${GEMINI_BASE}/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: { mimeType, data: inputData },
              },
              {
                text: POPULATION_TEXT,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
          text?: string;
        }>;
      };
    }>;
  };

  const imagePart = json.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini returned no rendered image");
  }

  const { mimeType: outMime, data } = imagePart.inlineData;
  const dataUrl = `data:${outMime || "image/png"};base64,${unescapeBase64(data)}`;

  return { renderedImage: dataUrl };
};
