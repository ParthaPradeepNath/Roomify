import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toDesignItem } from "@/lib/project-serializer";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id, ownerId: auth.user!.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project: toDesignItem(project) });
  } catch (error) {
    console.error("Get project failed:", error);
    return NextResponse.json({ error: "Failed to get project" }, { status: 500 });
  }
}
