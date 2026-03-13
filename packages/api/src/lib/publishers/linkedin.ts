// ─── LinkedIn Publisher ───────────────────────────────────────────────────────
// Publishes UGC posts to a LinkedIn member profile or Company Page
// Uses LinkedIn UGC Posts API v2
// accountId = LinkedIn member URN (e.g. "urn:li:person:abc123") or
//             company URN  (e.g. "urn:li:organization:12345")

import type { PublishContext, PublishResult } from "./index";
import { buildCaption } from "./index";

const LI_API = "https://api.linkedin.com/v2";

export async function publishToLinkedIn(ctx: PublishContext): Promise<PublishResult> {
  const caption = buildCaption(ctx.copy, ctx.hashtags);

  try {
    // Ensure accountId is a proper URN
    const authorUrn = ctx.accountId.startsWith("urn:")
      ? ctx.accountId
      : `urn:li:person:${ctx.accountId}`;

    if (ctx.mediaUrls.length > 0 && ctx.postType !== "TEXT") {
      return await publishWithImages(authorUrn, caption, ctx.mediaUrls, ctx.accessToken);
    }

    return await publishText(authorUrn, caption, ctx.accessToken);
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Error publicando en LinkedIn" };
  }
}

// ── Text Post ─────────────────────────────────────────────────────────────────
async function publishText(
  authorUrn: string,
  text: string,
  token: string
): Promise<PublishResult> {
  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch(`${LI_API}/ugcPosts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  return handleUGCResponse(res, await res.json());
}

// ── Image Post ────────────────────────────────────────────────────────────────
async function publishWithImages(
  authorUrn: string,
  text: string,
  imageUrls: string[],
  token: string
): Promise<PublishResult> {
  // LinkedIn requires uploading images to their servers first
  const uploadedAssets: string[] = [];

  for (const imageUrl of imageUrls.slice(0, 9)) { // max 9 images
    const assetUrn = await uploadImageToLinkedIn(authorUrn, imageUrl, token);
    uploadedAssets.push(assetUrn);
  }

  const media = uploadedAssets.map((assetUrn) => ({
    status: "READY",
    media: assetUrn,
    description: { text: "" },
    title: { text: "" },
  }));

  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: uploadedAssets.length === 1 ? "IMAGE" : "ARTICLE",
        media,
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch(`${LI_API}/ugcPosts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  return handleUGCResponse(res, await res.json());
}

// ── Image Upload Helper ───────────────────────────────────────────────────────
async function uploadImageToLinkedIn(
  authorUrn: string,
  imageUrl: string,
  token: string
): Promise<string> {
  // Step 1: Register upload
  const registerRes = await fetch(`${LI_API}/assets?action=registerUpload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: authorUrn,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    }),
  });

  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    throw new Error(
      registerData.message ?? "Error registrando imagen en LinkedIn"
    );
  }

  const assetUrn: string = registerData.value.asset;
  const uploadUrl: string =
    registerData.value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ].uploadUrl;

  // Step 2: Fetch image from Supabase and upload to LinkedIn
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error("No se pudo descargar la imagen para subir a LinkedIn");
  const imageBuffer = await imageRes.arrayBuffer();

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/jpeg",
    },
    body: imageBuffer,
  });

  if (!uploadRes.ok) throw new Error("Error subiendo imagen a LinkedIn");

  return assetUrn;
}

// ── Response Handler ──────────────────────────────────────────────────────────
async function handleUGCResponse(res: Response, data: any): Promise<PublishResult> {
  if (!res.ok) {
    return {
      success: false,
      error: data?.message ?? data?.["serviceErrorCode"]?.toString() ?? "Error publicando en LinkedIn",
    };
  }

  // LinkedIn returns the post ID in the X-RestLi-Id header or as response body id
  const postId: string = data?.id ?? res.headers.get("X-RestLi-Id") ?? "";
  const encodedId = encodeURIComponent(postId);

  return {
    success: true,
    platformPostId: postId,
    platformUrl: postId
      ? `https://www.linkedin.com/feed/update/${encodedId}/`
      : "https://www.linkedin.com/feed/",
  };
}
