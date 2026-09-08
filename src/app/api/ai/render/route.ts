import { NextResponse } from "next/server";
import { generate3DView } from "@/lib/ai";
import { isImageModelId } from "@/lib/models";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const body = (await request.json()) as { sourceImage?: string; model?: string };

    const { sourceImage, model } = body ?? {};

    if (!sourceImage) {
      return NextResponse.json({ error: "sourceImage is required" }, { status: 400 });
    }

    if (model !== undefined && !isImageModelId(model)) {
      return NextResponse.json({ error: `Unknown model "${model}"` }, { status: 400 });
    }

    const result = await generate3DView(sourceImage, { model });

    return NextResponse.json({
      renderedImage: result.renderedImage,
      model: result.model,
    });
  } catch (error) {
    console.error("Render failed:", error);
    return NextResponse.json({ error: "AI render failed" }, { status: 500 });
  }
}
