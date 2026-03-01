import { NextResponse } from "next/server";

import { authenticateUser, getSessionCookieConfig } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { buildAppUrl } from "@/lib/url";

function redirectWithError(request: Request, message: string) {
  const url = buildAppUrl(request, "/login");
  url.searchParams.set("error", encodeURIComponent(message));
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    await logActivity({
      actionKey: "AUTH_LOGIN_REJECTED",
      actionLabel: "Connexion rejetee",
      module: "AUTH",
      description: "Tentative de connexion sans identifiants complets.",
      metadata: { email },
    });
    return redirectWithError(request, "Email et mot de passe requis");
  }

  const user = await authenticateUser(email, password);

  if (!user) {
    await logActivity({
      actionKey: "AUTH_LOGIN_REJECTED",
      actionLabel: "Connexion rejetee",
      module: "AUTH",
      description: "Identifiants invalides.",
      metadata: { email },
    });
    return redirectWithError(request, "Identifiants invalides");
  }

  await logActivity({
    actor: user,
    actionKey: "AUTH_LOGIN_SUCCESS",
    actionLabel: "Connexion reussie",
    module: "AUTH",
    description: "Ouverture de session utilisateur.",
  });

  const response = NextResponse.redirect(buildAppUrl(request, "/dashboard"));
  const cookie = getSessionCookieConfig(user.id);
  response.cookies.set(cookie.name, cookie.value, cookie.options);

  return response;
}
