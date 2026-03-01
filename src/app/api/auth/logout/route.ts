import { NextResponse } from "next/server";

import { getCurrentUser, getExpiredSessionCookieConfig } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { buildAppUrl } from "@/lib/url";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user) {
    await logActivity({
      actor: user,
      actionKey: "AUTH_LOGOUT",
      actionLabel: "Deconnexion",
      module: "AUTH",
      description: "Fermeture de session utilisateur.",
    });
  }

  const response = NextResponse.redirect(buildAppUrl(request, "/login"));
  const cookie = getExpiredSessionCookieConfig();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
