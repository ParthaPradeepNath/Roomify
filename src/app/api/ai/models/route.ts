import { NextResponse } from "next/server";
import { listImageModels } from "@/lib/models";

export async function GET() {
  return NextResponse.json({ models: listImageModels() });
}
