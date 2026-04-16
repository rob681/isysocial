// ─── Publisher Service ────────────────────────────────────────────────────────
// Dispatcher + shared interfaces for all social network publishers

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
  requiresReconnect?: boolean; // true when OAuthException code 190 (token invalidated)
}

export interface PublishContext {
  network: string;
  copy: string;
  hashtags: string;
  mediaUrls: string[];     // publicly accessible URLs (Supabase storage)
  postType: string;        // IMAGE, CAROUSEL, STORY, REEL, VIDEO, TEXT
  accountId: string;       // Platform user/page ID
  accessToken: string;     // OAuth access token
  pageId?: string;         // Facebook Page ID (Meta only)
}

/**
 * Dispatches to the correct platform publisher based on network.
 */
export async function publishToNetwork(ctx: PublishContext): Promise<PublishResult> {
  try {
    switch (ctx.network) {
      case "FACEBOOK": {
        const { publishToFacebook } = await import("./facebook");
        return await publishToFacebook(ctx);
      }
      case "INSTAGRAM": {
        const { publishToInstagram } = await import("./instagram");
        return await publishToInstagram(ctx);
      }
      case "LINKEDIN": {
        const { publishToLinkedIn } = await import("./linkedin");
        return await publishToLinkedIn(ctx);
      }
      case "X": {
        const { publishToX } = await import("./x");
        return await publishToX(ctx);
      }
      case "TIKTOK": {
        const { publishToTikTok } = await import("./tiktok");
        return await publishToTikTok(ctx);
      }
      default:
        return { success: false, error: `Red no soportada: ${ctx.network}` };
    }
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Error desconocido al publicar" };
  }
}

/** Builds the full caption text: copy + newline + hashtags */
export function buildCaption(copy: string, hashtags: string): string {
  const parts: string[] = [];
  if (copy?.trim()) parts.push(copy.trim());
  if (hashtags?.trim()) parts.push(hashtags.trim());
  return parts.join("\n\n");
}
