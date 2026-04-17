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

  if (!res.ok || data?.error?.code !== "ok") {
    const msg = data?.error?.message ?? data?.error?.code ?? "Error refreshing TikTok token";
    throw new Error(msg);
  }

  const expiresIn: number = data.data?.expires_in ?? 86400; // default 24h

  return {
    accessToken: data.data.access_token,
    refreshToken: data.data.refresh_token ?? refreshToken, // TikTok may return a new refresh_token
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
