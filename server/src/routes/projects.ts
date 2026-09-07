import { Router } from "express";
import { prisma } from "../db.js";
import { persistImage } from "../lib/storage.js";
import { requireAuth } from "../middleware/auth.js";
import type { AuthedRequest } from "../middleware/auth.js";

const router = Router();

type IncomingProject = {
  id: string;
  name?: string | null;
  sourceImage?: string;
  renderedImage?: string | null;
  timestamp?: number | string;
  isPublic?: boolean;
};

const toTimestampMs = (value: unknown): number => {
  const timestamp = value === undefined ? Date.now() : Number(value);

  if (!Number.isFinite(timestamp)) {
    throw new Error("Invalid project timestamp");
  }

  return timestamp;
};

const toDesignItem = (project: {
  id: string;
  name: string | null;
  sourceImage: string;
  sourcePath: string | null;
  renderedImage: string | null;
  renderedPath: string | null;
  isPublic: boolean;
  timestamp: bigint;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: project.id,
  name: project.name,
  sourceImage: project.sourceImage,
  sourcePath: project.sourcePath,
  renderedImage: project.renderedImage,
  renderedPath: project.renderedPath,
  isPublic: project.isPublic,
  timestamp: Number(project.timestamp),
  ownerId: project.ownerId,
});

router.post("/save", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { project, visibility = "private" } = (req.body ?? {}) as {
      project?: IncomingProject;
      visibility?: "private" | "public";
    };

    if (!project?.id || !project.sourceImage) {
      res.status(400).json({ error: "Project ID and source image are required" });
      return;
    }

    if (!/^[\w-]+$/.test(project.id)) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Missing authenticated user" });
      return;
    }

    let timestamp: number;
    try {
      timestamp = toTimestampMs(project.timestamp);
    } catch {
      res.status(400).json({ error: "Invalid project timestamp" });
      return;
    }

    const existing = await prisma.project.findUnique({
      where: { id: project.id },
    });

    if (existing && existing.ownerId !== userId) {
      res.status(403).json({ error: "You do not own this project" });
      return;
    }

    const source = await persistImage(project.sourceImage, project.id, "source");
    const rendered = project.renderedImage
      ? await persistImage(project.renderedImage, project.id, "rendered")
      : null;

    if (!source) {
      res.status(400).json({ error: "Could not persist source image" });
      return;
    }

    const savedProject = await prisma.project.upsert({
      where: { id: project.id },
      create: {
        id: project.id,
        ownerId: userId,
        name: project.name ?? null,
        sourceImage: source.url,
        sourcePath: source.path ?? null,
        renderedImage: rendered?.url ?? null,
        renderedPath: rendered?.path ?? null,
        isPublic: visibility === "public" || !!project.isPublic,
        timestamp: BigInt(timestamp),
      },
      update: {
        name: project.name ?? null,
        sourceImage: source.url,
        sourcePath: source.path ?? existing?.sourcePath ?? null,
        renderedImage: rendered?.url ?? existing?.renderedImage ?? null,
        renderedPath: rendered?.path ?? existing?.renderedPath ?? null,
        isPublic: visibility === "public" || !!project.isPublic,
        timestamp: BigInt(timestamp),
      },
    });

    res.status(200).json({
      saved: true,
      id: savedProject.id,
      project: toDesignItem(savedProject),
    });
  } catch (error) {
    console.error("Save project failed:", error);
    res.status(500).json({ error: "Failed to save project" });
  }
});

router.get("/list", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { ownerId: req.userId },
      orderBy: { updatedAt: "desc" },
    });

    res.json({ projects: projects.map(toDesignItem) });
  } catch (error) {
    console.error("List projects failed:", error);
    res.status(500).json({ error: "Failed to list projects" });
  }
});

router.get("/get", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const id = req.query.id;

    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "Project ID is required" });
      return;
    }

    const project = await prisma.project.findFirst({
      where: { id, ownerId: req.userId },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json({ project: toDesignItem(project) });
  } catch (error) {
    console.error("Get project failed:", error);
    res.status(500).json({ error: "Failed to get project" });
  }
});

export default router;
