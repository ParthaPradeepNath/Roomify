import { Router } from "express";
import { generate3DView } from "../lib/ai.js";
import { isImageModelId, listImageModels } from "../lib/models.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/models", (_req, res) => {
  res.json({ models: listImageModels() });
});

router.post("/render", requireAuth, async (req, res) => {
  try {
    const { sourceImage, model } = (req.body ?? {}) as {
      sourceImage?: string;
      model?: string;
    };

    if (!sourceImage) {
      res.status(400).json({ error: "sourceImage is required" });
      return;
    }

    if (model !== undefined && !isImageModelId(model)) {
      res.status(400).json({ error: `Unknown model "${model}"` });
      return;
    }

    const result = await generate3DView(sourceImage, { model });

    res.json({
      renderedImage: result.renderedImage,
      model: result.model,
    });
  } catch (error) {
    console.error("Render failed:", error);
    res.status(500).json({ error: "AI render failed" });
  }
});

export default router;
