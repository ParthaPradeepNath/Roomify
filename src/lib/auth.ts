import { prisma } from "./db";
import { verifyToken } from "./jwt";

export async function requireAuth(request: Request) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return { error: { message: "Missing authorization header", status: 401 } };
  }

  try {
    const payload = verifyToken(header.slice(7));
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return { error: { message: "User no longer exists", status: 401 } };
    }

    return { user };
  } catch {
    return { error: { message: "Invalid or expired token", status: 401 } };
  }
}
