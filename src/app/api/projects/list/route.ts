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

    const projects = await prisma.project.findMany({
      where: { ownerId: auth.user!.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ projects: projects.map(toDesignItem) });
  } catch (error) {
    console.error("List projects failed:", error);
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 });
  }
}
