import { NextResponse } from "next/server";

import { authenticateUser, createSessionToken, SESSION_MAX_AGE } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "").trim();

  if (!email || !password) {
    return NextResponse.json({ error: "EMAIL_PASSWORD_REQUIRED" }, { status: 400 });
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    await logActivity({
      actionKey: "AUTH_LOGIN_REJECTED",
      actionLabel: "Connexion rejetee",
      module: "AUTH_API",
      description: "Identifiants invalides (mobile).",
      metadata: { email },
    });

    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  const token = createSessionToken(user.id);

  await logActivity({
    actor: user,
    actionKey: "AUTH_LOGIN_SUCCESS",
    actionLabel: "Connexion reussie",
    module: "AUTH_API",
    description: "Connexion mobile reussie.",
  });

  return NextResponse.json({
    success: true,
    token,
    tokenType: "Bearer",
    expiresIn: SESSION_MAX_AGE,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  });
}
