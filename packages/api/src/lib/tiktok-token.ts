// ─── TikTok Token Utilities ───────────────────────────────────────────────────
// Handles access token refresh for TikTok v2 API.
// TikTok access tokens expire after 24 hours; refresh tokens last up to 1 year.

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

export interface TikTokTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Refreshes a TikTok access token using the stored refresh token.
 * Returns the new token data or throws on failure.
 */
export async function refreshTikTokToken(
  refreshToken: string
): Promise<TikTokTokenResult> {
  const clientKey = (process.env.TIKTOK_CLIENT_KEY ?? "").trim();
  const clientSecret = (process.env.TIKTOK_CLIENT_SECRET ?? "").trim();

  if (!clientKey || !clientSecret) {
    throw new Error("TikTok credentials not configured (TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET)");
  }

  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json();

  // TikTok OAuth v2 returns the token payload at the ROOT level on success:
  //   { access_token, refresh_token, expires_in, refresh_expires_in, scope, ... }
  // On error it returns: { error, error_description, log_id } — no nested `data` key.
  // Our old parsing read `data.data.access_token` and checked `data.error.code === "ok"`
  // which is wrong on both counts: neither field exists in the real response shape.
  const payload: any = data?.data ?? data;

  if (!res.ok || !payload?.access_token) {
    const msg = data?.error?.error_description ??
                data?.error_description ??
                data?.error?.message ??
                data?.error ??
                data?.message ??
                "Error refreshing TikTok token";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  const expiresIn: number = payload.expires_in ?? 86400; // default 24h

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? refreshToken, // TikTok may return a new refresh_token
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

/**
 * Returns true if the token is expired or will expire within the next 5 minutes.
 * Use this to decide whether to refresh proactively before publishing.
 */
export function isTikTokTokenExpired(tokenExpiresAt: Date | null | undefined): boolean {
  if (!tokenExpiresAt) return false; // No expiry date — assume still valid
  const BUFFER_MS = 5 * 60 * 1000; // 5-minute buffer
  return tokenExpiresAt.getTime() - Date.now() < BUFFER_MS;
}
