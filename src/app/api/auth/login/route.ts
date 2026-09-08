import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { verifyPassword } from "@/lib/password";

const toSafeUser = (user: { id: string; email: string; name: string | null }) => ({
  id: user.id,
  email: user.email,
  name: user.name,
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };

    const { email, password } = body ?? {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const token = signToken(user.id);

    return NextResponse.json({ token, user: toSafeUser(user) });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 });
  }
}
