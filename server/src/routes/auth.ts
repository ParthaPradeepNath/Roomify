import { Router } from "express";
import { prisma } from "../db.js";
import { signToken } from "../lib/jwt.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { requireAuth } from "../middleware/auth.js";
import type { AuthedRequest } from "../middleware/auth.js";

const router = Router();

const toSafeUser = (user: { id: string; email: string; name: string | null }) => ({
  id: user.id,
  email: user.email,
  name: user.name,
});

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters long" });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name ? String(name) : null,
        passwordHash: await hashPassword(password),
      },
    });

    const token = signToken(user.id);

    res.status(201).json({ token, user: toSafeUser(user) });
  } catch (error) {
    console.error("Register failed:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken(user.id);

    res.json({ token, user: toSafeUser(user) });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ error: "Failed to sign in" });
  }
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error("Me failed:", error);
    res.status(500).json({ error: "Failed to load user" });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

export default router;
