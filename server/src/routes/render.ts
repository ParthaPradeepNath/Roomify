import { Router } from "express";
import { generate3DView } from "../lib/ai.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/render", requireAuth, async (req, res) => {
  try {
    const { sourceImage } = (req.body ?? {}) as { sourceImage?: string };

    if (!sourceImage) {
      res.status(400).json({ error: "sourceImage is required" });
      return;
    }

    const result = await generate3DView(sourceImage);

    res.json({
      renderedImage: result.renderedImage,
    });
  } catch (error) {
    console.error("Render failed:", error);
    res.status(500).json({ error: "AI render failed" });
  }
});

export default router;
