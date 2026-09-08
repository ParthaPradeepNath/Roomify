import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toDesignItem, type ProjectRow } from "@/lib/project-serializer";
import { persistImage } from "@/lib/storage";
import { requireAuth } from "@/lib/auth";

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

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const body = (await request.json()) as {
      project?: IncomingProject;
      visibility?: "private" | "public";
    };

    const { project, visibility = "private" } = body ?? {};

    if (!project?.id || !project.sourceImage) {
      return NextResponse.json(
        { error: "Project ID and source image are required" },
        { status: 400 },
      );
    }

    if (!/^[\w-]+$/.test(project.id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const userId = auth.user!.id;

    let timestamp: number;
    try {
      timestamp = toTimestampMs(project.timestamp);
    } catch {
      return NextResponse.json({ error: "Invalid project timestamp" }, { status: 400 });
    }

    const existing = await prisma.project.findUnique({
      where: { id: project.id },
    });

    if (existing && existing.ownerId !== userId) {
      return NextResponse.json({ error: "You do not own this project" }, { status: 403 });
    }

    const source = await persistImage(project.sourceImage, project.id, "source");
    const rendered = project.renderedImage
      ? await persistImage(project.renderedImage, project.id, "rendered")
      : null;

    if (!source) {
      return NextResponse.json({ error: "Could not persist source image" }, { status: 400 });
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

    return NextResponse.json({
      saved: true,
      id: savedProject.id,
      project: toDesignItem(savedProject as unknown as ProjectRow),
    });
  } catch (error) {
    console.error("Save project failed:", error);
    return NextResponse.json({ error: "Failed to save project" }, { status: 500 });
  }
}
