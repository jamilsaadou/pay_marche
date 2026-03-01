function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim();
}

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

export function getAppOrigin(request: Request) {
  const configuredOrigin = process.env.APP_URL?.trim();
  if (configuredOrigin) {
    return normalizeOrigin(configuredOrigin);
  }

  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost ?? firstHeaderValue(request.headers.get("host"));
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));

  if (host) {
    const protocol =
      forwardedProto ??
      (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
}

export function buildAppUrl(request: Request, pathname: string) {
  return new URL(pathname, getAppOrigin(request));
}
