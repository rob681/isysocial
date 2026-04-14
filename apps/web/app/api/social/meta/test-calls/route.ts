// ─── Meta Graph API Mandatory Test Calls ──────────────────────────────────────
// Demonstrates all required permissions for Meta App Review submission.
// Uses stored agency tokens to make real Graph API calls.
// Admin-only endpoint.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@isysocial/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRAPH = "https://graph.facebook.com/v21.0";

interface TestCallResult {
  permission: string;
  endpoint: string;
  method: string;
  status: "success" | "error" | "skipped";
  httpStatus?: number;
  data?: any;
  error?: string;
}

async function gCall(url: string, method = "GET", body?: any): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return { ok: res.ok && !data.error, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, data: { error: { message: err.message } } };
  }
}

export async function GET(req: NextRequest) {
  // Admin only
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencyId = user.agencyId;
  const results: TestCallResult[] = [];
  const meta: { testedAt: string; agencyId: string; fbAccount?: any; igAccount?: any } = {
    testedAt: new Date().toISOString(),
    agencyId,
  };

  // Fetch agency's Facebook and Instagram accounts
  const fbAccount = await db.agencySocialAccount.findFirst({
    where: { agencyId, network: "FACEBOOK", isActive: true },
  });
  const igAccount = await db.agencySocialAccount.findFirst({
    where: { agencyId, network: "INSTAGRAM", isActive: true },
  });

  if (!fbAccount && !igAccount) {
    return NextResponse.json({
      error: "No hay cuentas de Meta (Facebook/Instagram) conectadas para esta agencia.",
      results: [],
      meta,
    }, { status: 200 });
  }

  const fbToken = fbAccount?.accessToken ?? igAccount?.accessToken ?? "";
  const fbPageId = fbAccount?.pageId ?? fbAccount?.accountId;
  const igUserId = igAccount?.accountId;

  meta.fbAccount = fbAccount ? { id: fbAccount.accountId, name: fbAccount.accountName, pageId: fbPageId } : null;
  meta.igAccount = igAccount ? { id: igAccount.accountId, name: igAccount.accountName } : null;

  // ── 1. pages_show_list → GET /me/accounts ───────────────────────────────────
  {
    const r = await gCall(`${GRAPH}/me/accounts?fields=id,name,category,tasks&limit=5&access_token=${fbToken}`);
    results.push({
      permission: "pages_show_list",
      endpoint: "GET /me/accounts",
      method: "GET",
      status: r.ok ? "success" : "error",
      httpStatus: r.status,
      data: r.ok ? { pages_count: r.data.data?.length ?? 0, sample: r.data.data?.[0] } : undefined,
      error: !r.ok ? (r.data.error?.message ?? "Error desconocido") : undefined,
    });
  }

  // ── 2. pages_read_engagement → GET /{page-id}/feed ──────────────────────────
  if (fbPageId) {
    const r = await gCall(
      `${GRAPH}/${fbPageId}/feed?fields=id,message,created_time&limit=2&access_token=${fbToken}`
    );
    results.push({
      permission: "pages_read_engagement + pages_read_user_content",
      endpoint: `GET /${fbPageId}/feed`,
      method: "GET",
      status: r.ok ? "success" : "error",
      httpStatus: r.status,
      data: r.ok ? { posts_returned: r.data.data?.length ?? 0 } : undefined,
      error: !r.ok ? (r.data.error?.message ?? "Error desconocido") : undefined,
    });
  } else {
    results.push({
      permission: "pages_read_engagement",
      endpoint: "GET /{page-id}/feed",
      method: "GET",
      status: "skipped",
      error: "pageId no disponible — conectar Facebook primero",
    });
  }

  // ── 3. pages_read_engagement → GET /{page-id}/insights ──────────────────────
  if (fbPageId) {
    const r = await gCall(
      `${GRAPH}/${fbPageId}/insights?metric=page_impressions,page_reach&period=day&limit=1&access_token=${fbToken}`
    );
    results.push({
      permission: "pages_read_engagement (insights)",
      endpoint: `GET /${fbPageId}/insights`,
      method: "GET",
      status: r.ok ? "success" : "error",
      httpStatus: r.status,
      data: r.ok ? { metrics_returned: r.data.data?.length ?? 0 } : undefined,
      error: !r.ok ? (r.data.error?.message ?? "Error desconocido") : undefined,
    });
  } else {
    results.push({
      permission: "pages_read_engagement (insights)",
      endpoint: "GET /{page-id}/insights",
      method: "GET",
      status: "skipped",
      error: "pageId no disponible",
    });
  }

  // ── 4. pages_manage_metadata → GET /{page-id} ───────────────────────────────
  if (fbPageId) {
    const r = await gCall(
      `${GRAPH}/${fbPageId}?fields=id,name,category,followers_count,fan_count,instagram_business_account&access_token=${fbToken}`
    );
    results.push({
      permission: "pages_manage_metadata",
      endpoint: `GET /${fbPageId}?fields=id,name,category,followers_count,instagram_business_account`,
      method: "GET",
      status: r.ok ? "success" : "error",
      httpStatus: r.status,
      data: r.ok ? { page_name: r.data.name, has_ig_account: !!r.data.instagram_business_account } : undefined,
      error: !r.ok ? (r.data.error?.message ?? "Error desconocido") : undefined,
    });
  }

  // ── 5. instagram_basic → GET /{ig-user-id} ──────────────────────────────────
  if (igUserId) {
    const r = await gCall(
      `${GRAPH}/${igUserId}?fields=id,name,username,biography,followers_count,media_count&access_token=${fbToken}`
    );
    results.push({
      permission: "instagram_basic",
      endpoint: `GET /${igUserId}?fields=id,name,username,biography,followers_count,media_count`,
      method: "GET",
      status: r.ok ? "success" : "error",
      httpStatus: r.status,
      data: r.ok ? { username: r.data.username, followers: r.data.followers_count, posts: r.data.media_count } : undefined,
      error: !r.ok ? (r.data.error?.message ?? "Error desconocido") : undefined,
    });
  } else {
    results.push({
      permission: "instagram_basic",
      endpoint: "GET /{ig-user-id}",
      method: "GET",
      status: "skipped",
      error: "Cuenta de Instagram Business no conectada",
    });
  }

  // ── 6. instagram_basic → GET /{ig-user-id}/media ────────────────────────────
  if (igUserId) {
    const r = await gCall(
      `${GRAPH}/${igUserId}/media?fields=id,caption,media_type,media_url,timestamp&limit=2&access_token=${fbToken}`
    );
    results.push({
      permission: "instagram_basic (media)",
      endpoint: `GET /${igUserId}/media`,
      method: "GET",
      status: r.ok ? "success" : "error",
      httpStatus: r.status,
      data: r.ok ? { media_returned: r.data.data?.length ?? 0 } : undefined,
      error: !r.ok ? (r.data.error?.message ?? "Error desconocido") : undefined,
    });
  }

  // ── 7. instagram_content_publish → POST /{ig-user-id}/media (container) ─────
  // We only create the container with a test image URL, NOT calling media_publish
  // This demonstrates the permission without creating a real post.
  if (igUserId) {
    // Use a publicly accessible placeholder image from Meta's test set
    const testImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/240px-PNG_transparency_demonstration_1.png";
    const r = await gCall(
      `${GRAPH}/${igUserId}/media`,
      "POST",
      {
        image_url: testImageUrl,
        caption: "🧪 Test de integración — Isysocial App Review",
        access_token: fbToken,
      }
    );
    // Container creation attempt — error is expected if URL is not whitelisted by Instagram,
    // but the call itself demonstrates the permission usage
    results.push({
      permission: "instagram_content_publish",
      endpoint: `POST /${igUserId}/media`,
      method: "POST",
      status: r.ok ? "success" : "error",
      httpStatus: r.status,
      data: r.ok ? { container_id: r.data.id } : undefined,
      error: !r.ok ? (r.data.error?.message ?? "Error") : undefined,
    });
  } else {
    results.push({
      permission: "instagram_content_publish",
      endpoint: "POST /{ig-user-id}/media",
      method: "POST",
      status: "skipped",
      error: "Cuenta de Instagram Business no conectada",
    });
  }

  // ── 8. instagram_manage_comments → GET /{ig-user-id}/media (with comments) ──
  if (igUserId) {
    // First get latest media ID
    const mediaRes = await gCall(
      `${GRAPH}/${igUserId}/media?fields=id&limit=1&access_token=${fbToken}`
    );
    const latestMediaId = mediaRes.data?.data?.[0]?.id;

    if (latestMediaId) {
      const r = await gCall(
        `${GRAPH}/${latestMediaId}/comments?fields=id,text,username,timestamp&limit=5&access_token=${fbToken}`
      );
      results.push({
        permission: "instagram_manage_comments",
        endpoint: `GET /${latestMediaId}/comments`,
        method: "GET",
        status: r.ok ? "success" : "error",
        httpStatus: r.status,
        data: r.ok ? { comments_returned: r.data.data?.length ?? 0 } : undefined,
        error: !r.ok ? (r.data.error?.message ?? "Error desconocido") : undefined,
      });
    } else {
      results.push({
        permission: "instagram_manage_comments",
        endpoint: "GET /{media-id}/comments",
        method: "GET",
        status: "skipped",
        error: "No hay publicaciones en Instagram para consultar comentarios",
      });
    }
  }

  // ── 9. pages_manage_posts → GET /{page-id}/feed (verify write-capable token) ─
  if (fbPageId) {
    // We verify the page token has manage_posts scope by checking token debug info
    const r = await gCall(
      `${GRAPH}/debug_token?input_token=${fbToken}&access_token=${fbToken}`
    );
    const scopes: string[] = r.data?.data?.scopes ?? [];
    const hasManagePosts = scopes.includes("pages_manage_posts");
    results.push({
      permission: "pages_manage_posts",
      endpoint: "GET /debug_token",
      method: "GET",
      status: hasManagePosts ? "success" : (r.ok ? "error" : "error"),
      httpStatus: r.status,
      data: r.ok ? {
        token_type: r.data.data?.type,
        scopes_granted: scopes,
        has_pages_manage_posts: hasManagePosts,
        expires_at: r.data.data?.expires_at ? new Date(r.data.data.expires_at * 1000).toISOString() : "never",
      } : undefined,
      error: !hasManagePosts ? "pages_manage_posts no encontrado en los scopes del token" : undefined,
    });
  }

  // Summary
  const passed = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "error").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  return NextResponse.json({
    meta,
    summary: { total: results.length, passed, failed, skipped },
    results,
  }, { status: 200 });
}
