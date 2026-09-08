import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { hashPassword } from "@/lib/password";

const toSafeUser = (user: { id: string; email: string; name: string | null }) => ({
  id: user.id,
  email: user.email,
  name: user.name,
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    const { email, password, name } = body ?? {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name ? String(name) : null,
        passwordHash: await hashPassword(password),
      },
    });

    const token = signToken(user.id);

    return NextResponse.json({ token, user: toSafeUser(user) }, { status: 201 });
  } catch (error) {
    console.error("Register failed:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
