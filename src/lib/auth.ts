import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";

import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "pay_refondation_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
};

function getSessionSecret() {
  return process.env.AUTH_SECRET ?? "change-me-in-production";
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

export function createSessionToken(userId: string) {
  const payload = `${userId}:${Date.now()}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

function extractUserIdFromToken(token?: string) {
  if (!token) {
    return null;
  }

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userId, timestamp, incomingSignature] = decoded.split(":");

    if (!userId || !timestamp || !incomingSignature) {
      return null;
    }

    const payload = `${userId}:${timestamp}`;
    const expectedSignature = sign(payload);

    const incoming = Buffer.from(incomingSignature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");

    if (incoming.length !== expected.length) {
      return null;
    }

    if (!timingSafeEqual(incoming, expected)) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}

function extractCookieValue(cookieHeader: string, name: string) {
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(`${name}=`));
  return found?.split("=")[1];
}

async function getSessionUserById(userId: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user?.isActive) {
    return null;
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
}

export function getSessionCookieConfig(userId: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(userId),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  };
}

export function getExpiredSessionCookieConfig() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    },
  };
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user || !user.isActive) {
    return null;
  }

  const isValid = await compare(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  return user;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const userId = extractUserIdFromToken(token);

  if (!userId) {
    return null;
  }

  return getSessionUserById(userId);
}

export async function getCurrentUserFromRequest(request: Request): Promise<SessionUser | null> {
  const authHeader = request.headers.get("authorization");
  let token: string | undefined;

  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    token = extractCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  }

  const userId = extractUserIdFromToken(token);
  if (!userId) {
    return null;
  }

  return getSessionUserById(userId);
}

export async function requireUser(roles?: UserRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (roles && !roles.includes(user.role)) {
    redirect("/dashboard");
  }

  return user;
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE, UserRole };
