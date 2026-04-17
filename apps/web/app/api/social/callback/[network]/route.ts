// ─── OAuth Callback ───────────────────────────────────────────────────────────
// Handles the OAuth callback from social networks.
// Exchanges code for token, fetches profile info, stores in DB.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@isysocial/db";
import { uploadFile, getSignedUrl } from "@isysocial/api/src/lib/supabase-storage";

type NetworkKey = "facebook" | "instagram" | "linkedin" | "x" | "tiktok";

/**
 * Downloads a profile picture from a remote URL and caches it in Supabase Storage.
 * Returns the permanent Supabase URL, or the original URL if caching fails.
 */
async function cacheProfilePic(remoteUrl: string, clientId: string, network: string): Promise<string> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return remoteUrl;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("gif") ? "gif" : "jpg";
    const path = `client-logos/${clientId}/${network}.${ext}`;
    const { storagePath } = await uploadFile("isysocial-media", path, buffer, contentType);
    // Return a long-lived signed URL (24h) for profile pictures stored in DB
    const signedUrl = await getSignedUrl(storagePath, 86400);
    return signedUrl;
  } catch (err) {
    console.warn("[cacheProfilePic] Failed to cache, using original URL:", err);
    return remoteUrl;
  }
}

const REDIRECT_BASE = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").trim();

// ── Token Exchange Config ─────────────────────────────────────────────────────
interface TokenConfig {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
}

function getTokenConfig(network: NetworkKey): TokenConfig {
  switch (network) {
    case "facebook":
    case "instagram":
      return {
        tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
        clientId: (process.env.META_APP_ID ?? "").trim(),
        clientSecret: (process.env.META_APP_SECRET ?? "").trim(),
      };
    case "linkedin":
      return {
        tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
        clientId: (process.env.LINKEDIN_CLIENT_ID ?? "").trim(),
        clientSecret: (process.env.LINKEDIN_CLIENT_SECRET ?? "").trim(),
      };
    case "x":
      return {
        tokenUrl: "https://api.twitter.com/2/oauth2/token",
        clientId: (process.env.X_CLIENT_ID ?? "").trim(),
        clientSecret: (process.env.X_CLIENT_SECRET ?? "").trim(),
      };
    case "tiktok":
      return {
        tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
        clientId: (process.env.TIKTOK_CLIENT_KEY ?? "").trim(),
        clientSecret: (process.env.TIKTOK_CLIENT_SECRET ?? "").trim(),
      };
  }
}

// ── Map network string to SocialNetwork enum ──────────────────────────────────
const networkEnumMap: Record<NetworkKey, string> = {
  facebook: "FACEBOOK",
  instagram: "INSTAGRAM",
  linkedin: "LINKEDIN",
  x: "X",
  tiktok: "TIKTOK",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { network: string } }
) {
  // Only ADMIN and SUPER_ADMIN roles can complete social network OAuth connections
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const userRole = (session.user as any).role as string | undefined;
  if (!["ADMIN", "SUPER_ADMIN"].includes(userRole ?? "")) {
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", req.url));
  }

  const networkKey = params.network.toLowerCase() as NetworkKey;
  const redirectUri = `${REDIRECT_BASE}/api/social/callback/${networkKey}`;

  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  // Handle user denial
  if (errorParam) {
    return NextResponse.redirect(`${REDIRECT_BASE}/admin/clientes?error=oauth_denied`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${REDIRECT_BASE}/admin/clientes?error=missing_params`);
  }

  // Decode state
  let statePayload: { clientId: string; userId: string; network: string; ts: number };
  try {
    statePayload = JSON.parse(Buffer.from(stateParam, "base64url").toString());
  } catch {
    return NextResponse.redirect(`${REDIRECT_BASE}/admin/clientes?error=invalid_state`);
  }

  const { clientId } = statePayload;
  const networkEnum = networkEnumMap[networkKey];

  if (!networkEnum) {
    return NextResponse.redirect(`${REDIRECT_BASE}/admin/clientes?error=unsupported_network`);
  }

  const tokenConfig = getTokenConfig(networkKey);

  try {
    // ── Step 1: Exchange code for access token ────────────────────────────────
    let accessToken = "";
    let refreshToken: string | undefined;
    let tokenExpiresAt: Date | undefined;

    if (networkKey === "x") {
      // X uses Basic Auth
      const credentials = Buffer.from(
        `${tokenConfig.clientId}:${tokenConfig.clientSecret}`
      ).toString("base64");

      const tokenRes = await fetch(tokenConfig.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code_verifier: "challenge",
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description ?? "Error obteniendo token de X");
      }
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token;
      if (tokenData.expires_in) {
        tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      }
    } else if (networkKey === "tiktok") {
      const tokenRes = await fetch(tokenConfig.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: tokenConfig.clientId,
          client_secret: tokenConfig.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || tokenData.error?.code !== "ok") {
        throw new Error(
          tokenData.error?.message ??
          `Error obteniendo token de TikTok (${tokenData.error?.code ?? tokenRes.status})`
        );
      }
      accessToken = tokenData.data.access_token;
      // TikTok returns a new refresh_token each exchange; store it
      refreshToken = tokenData.data.refresh_token ?? undefined;
      // access_token expires in 24h; refresh_token expires in ~365 days
      if (tokenData.data.expires_in) {
        tokenExpiresAt = new Date(Date.now() + tokenData.data.expires_in * 1000);
      }
    } else if (networkKey === "linkedin") {
      // LinkedIn uses POST with form body
      const tokenRes = await fetch(tokenConfig.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: tokenConfig.clientId,
          client_secret: tokenConfig.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error ?? tokenData.message ?? "Error obteniendo token de LinkedIn");
      }
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token;
      if (tokenData.expires_in) {
        tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      }
    } else {
      // Facebook / Instagram — Graph API accepts GET with query params
      const queryParams = new URLSearchParams({
        client_id: tokenConfig.clientId,
        client_secret: tokenConfig.clientSecret,
        code,
        redirect_uri: redirectUri,
      });
      const tokenRes = await fetch(`${tokenConfig.tokenUrl}?${queryParams}`);
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error?.message ?? "Error obteniendo token de Meta");
      }
      accessToken = tokenData.access_token;

      // Exchange short-lived user token for long-lived (60 days)
      const llParams = new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: tokenConfig.clientId,
        client_secret: tokenConfig.clientSecret,
        fb_exchange_token: accessToken,
      });
      const llRes = await fetch(`${tokenConfig.tokenUrl}?${llParams}`);
      const llData = await llRes.json();
      if (llRes.ok && llData.access_token) {
        accessToken = llData.access_token;
        if (llData.expires_in) {
          tokenExpiresAt = new Date(Date.now() + llData.expires_in * 1000);
        }
      } else if (tokenData.expires_in) {
        // Fallback: use short-lived expiry
        tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      }
    }

    // ── Step 2: Fetch profile info ────────────────────────────────────────────
    let accountId = "";
    let accountName = "";
    let profilePic: string | undefined;
    let pageId: string | undefined;
    let pageAccessToken: string | undefined;

    if (networkKey === "facebook") {
      // Get user's Pages from two sources:
      // 1. Personal account pages via /me/accounts
      // 2. Business Manager pages via /me/businesses + /owned_pages
      // This ensures we show ALL pages the user has access to.

      const allPages: any[] = [];

      // PART 1: Fetch personal account pages
      // REQUEST `access_token` in fields to get ALL pages user has ANY access to.
      // Including pages where token might be null (read-only access) — we'll handle
      // token exchange in finalize-selection for pages that have tokens, and attempt
      // to fetch page tokens there for pages without.
      let nextUrl: string | null =
        `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,picture,access_token&limit=100&access_token=${accessToken}`;
      let personalPageCount = 0;
      while (nextUrl) {
        // eslint-disable-next-line no-await-in-loop
        const fbPagesFetch: Response = await fetch(nextUrl);
        // eslint-disable-next-line no-await-in-loop
        const fbPagesData: any = await fbPagesFetch.json();
        const pages = fbPagesData.data ?? [];
        personalPageCount += pages.length;
        allPages.push(...pages);
        console.log(`[facebook callback] /me/accounts returned ${pages.length} pages (total so far: ${personalPageCount})`);
        nextUrl = fbPagesData.paging?.next ?? null;
      }
      console.log(`[facebook callback] PART 1 complete: ${personalPageCount} personal account pages`);

      // PART 2: Fetch Business Manager accounts and their pages
      let businessPageCount = 0;
      try {
        const businessesRes: Response = await fetch(
          `https://graph.facebook.com/v20.0/me/businesses?fields=id,name&limit=100&access_token=${accessToken}`
        );
        const businessesData: any = await businessesRes.json();
        const businesses = businessesData.data ?? [];
        console.log(`[facebook callback] /me/businesses returned ${businesses.length} business accounts`);

        for (const business of businesses) {
          console.log(`[facebook callback] Fetching pages for business: ${business.id} (${business.name})`);
          // Fetch both owned_pages AND client_pages for this Business Manager
          // - owned_pages: pages the BM owns directly
          // - client_pages: pages of clients shared with this BM (agency use case)
          for (const pageEndpoint of ["owned_pages", "client_pages"]) {
            let businessPageUrl: string | null =
              `https://graph.facebook.com/v20.0/${business.id}/${pageEndpoint}?fields=id,name,picture&limit=100&access_token=${accessToken}`;

            let pagesFromEndpoint = 0;
            while (businessPageUrl) {
              // eslint-disable-next-line no-await-in-loop
              const businessPagesFetch: Response = await fetch(businessPageUrl);
              // eslint-disable-next-line no-await-in-loop
              const businessPagesData: any = await businessPagesFetch.json();

              if (businessPagesData.error) {
                console.log(`[facebook callback] ${pageEndpoint} error for ${business.id}: ${businessPagesData.error.message}`);
                break;
              }

              const bpages = businessPagesData.data ?? [];
              pagesFromEndpoint += bpages.length;

              // Add pages to allPages (avoid duplicates by ID)
              const existingIds = new Set(allPages.map((p: any) => p.id));
              for (const bp of bpages) {
                if (!existingIds.has(bp.id)) {
                  allPages.push(bp);
                  businessPageCount++;
                }
              }

              businessPageUrl = businessPagesData.paging?.next ?? null;
            }
            console.log(`[facebook callback] Business ${business.id} ${pageEndpoint}: ${pagesFromEndpoint} pages found`);
          }
        }
        console.log(`[facebook callback] PART 2 complete: ${businessPageCount} business manager pages added`);
      } catch (err) {
        // Business Manager fetch failed, but we still have personal pages — continue
        console.error("[facebook callback] Error fetching Business Manager pages:", err);
      }

      const pages = allPages;
      console.log(`[facebook callback] TOTAL PAGES COLLECTED: ${pages.length}`);
      console.log(`[facebook callback] Pages: ${JSON.stringify(pages.map((p: any) => ({ id: p.id, name: p.name, hasToken: !!p.access_token })))}`);

      if (pages.length === 0) {
        // Fallback to user info (no pages)
        const meRes = await fetch(
          `https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${accessToken}`
        );
        const meData = await meRes.json();
        accountId = meData.id;
        accountName = meData.name;
        profilePic = meData.picture?.data?.url;
      } else if (pages.length === 1) {
        // Single business page — show selector including personal profile
        const meRes = await fetch(
          `https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${accessToken}`
        );
        const meData = await meRes.json();
        const personalProfile = meData.id
          ? [{
              id: meData.id,
              name: meData.name ?? "Mi perfil personal",
              accessToken: accessToken,
              picture: meData.picture?.data?.url ?? null,
              isPersonalProfile: true,
            }]
          : [];

        const p = pages[0];
        const pagesForSelection = [
          ...personalProfile,
          { id: p.id, name: p.name, accessToken: p.access_token ?? null, picture: p.picture?.data?.url ?? null },
        ];

        if (pagesForSelection.length === 1) {
          // Only the business page (no personal profile retrieved) — auto-select
          pageId = p.id;
          accountId = p.id;
          accountName = p.name;
          pageAccessToken = p.access_token;
        } else {
          const selectionToken = crypto.randomUUID();
          await db.systemConfig.upsert({
            where: { key: `pending_oauth_${selectionToken}` },
            update: { value: JSON.stringify({ accessToken, userAccessToken: accessToken, clientId, network: networkKey, pages: pagesForSelection, expiresAt: Date.now() + 600000 }) },
            create: { key: `pending_oauth_${selectionToken}`, value: JSON.stringify({ accessToken, userAccessToken: accessToken, clientId, network: networkKey, pages: pagesForSelection, expiresAt: Date.now() + 600000 }) },
          });
          return NextResponse.redirect(
            `${REDIRECT_BASE}/admin/clientes/${clientId}/seleccionar-pagina?network=facebook&token=${selectionToken}`
          );
        }
      } else {
        // Multiple pages — store in SystemConfig and pass token in URL
        // Also fetch the personal profile so it can be selected (e.g. personal pages/accounts)
        const meRes = await fetch(
          `https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${accessToken}`
        );
        const meData = await meRes.json();
        const personalProfile = meData.id
          ? [{
              id: meData.id,
              name: meData.name ?? "Mi perfil personal",
              accessToken: accessToken,
              picture: meData.picture?.data?.url ?? null,
              isPersonalProfile: true,
            }]
          : [];

        const selectionToken = crypto.randomUUID();
        const pagesForSelection = [
          ...personalProfile,
          ...pages.map((p: any) => ({
            id: p.id,
            name: p.name,
            accessToken: p.access_token ?? null,
            picture: p.picture?.data?.url ?? null,
          })),
        ];
        // Store userAccessToken at root so finalize-selection can exchange it for a page token
        await db.systemConfig.upsert({
          where: { key: `pending_oauth_${selectionToken}` },
          update: { value: JSON.stringify({ accessToken, userAccessToken: accessToken, clientId, network: networkKey, pages: pagesForSelection, expiresAt: Date.now() + 600000 }) },
          create: { key: `pending_oauth_${selectionToken}`, value: JSON.stringify({ accessToken, userAccessToken: accessToken, clientId, network: networkKey, pages: pagesForSelection, expiresAt: Date.now() + 600000 }) },
        });
        return NextResponse.redirect(
          `${REDIRECT_BASE}/admin/clientes/${clientId}/seleccionar-pagina?network=facebook&token=${selectionToken}`
        );
      }
    } else if (networkKey === "instagram") {
      // Get Facebook Pages first (paginated), then linked IG accounts
      const igFbPages: any[] = [];
      let igNextUrl: string | null =
        `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,picture&limit=100&access_token=${accessToken}`;
      while (igNextUrl) {
        // eslint-disable-next-line no-await-in-loop
        const igPagesFetch: Response = await fetch(igNextUrl);
        // eslint-disable-next-line no-await-in-loop
        const igPagesData: any = await igPagesFetch.json();
        igFbPages.push(...(igPagesData.data ?? []));
        igNextUrl = igPagesData.paging?.next ?? null;
      }

      // Build array of all pages that have an IG Business Account
      const igPages: Array<{
        pageId: string;
        pageName: string;
        pageAccessToken: string;
        pagePicture: string | null;
        igId: string;
        igUsername: string;
        igProfilePic: string | null;
      }> = [];

      for (const page of igFbPages) {
        const igRes = await fetch(
          `https://graph.facebook.com/v20.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        const igData = await igRes.json();

        if (igData.instagram_business_account) {
          const igId = igData.instagram_business_account.id;
          const profileRes = await fetch(
            `https://graph.facebook.com/v20.0/${igId}?fields=name,username,profile_picture_url&access_token=${page.access_token}`
          );
          const profileData = await profileRes.json();

          igPages.push({
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.access_token,
            pagePicture: page.picture?.data?.url ?? null,
            igId,
            igUsername: profileData.username ?? profileData.name ?? igId,
            igProfilePic: profileData.profile_picture_url ?? null,
          });
        }
      }

      if (igPages.length === 0) {
        throw new Error(
          "No se encontró una cuenta de Instagram Business vinculada a tu página de Facebook."
        );
      } else if (igPages.length === 1) {
        // Single IG account — auto-select
        const ig = igPages[0];
        pageId = ig.pageId;
        pageAccessToken = ig.pageAccessToken;
        accountId = ig.igId;
        accountName = ig.igUsername.startsWith("@") ? ig.igUsername : `@${ig.igUsername}`;
        profilePic = ig.igProfilePic ?? undefined;
      } else {
        // Multiple IG accounts — set cookie on redirect response
        const pagesForCookie = igPages.map((ig) => ({
          id: ig.pageId,
          name: ig.pageName,
          accessToken: ig.pageAccessToken,
          picture: ig.pagePicture,
          igId: ig.igId,
          igUsername: ig.igUsername,
          igProfilePic: ig.igProfilePic,
        }));
        const selectionToken = crypto.randomUUID();
        await db.systemConfig.upsert({
          where: { key: `pending_oauth_${selectionToken}` },
          update: { value: JSON.stringify({ accessToken, clientId, network: networkKey, pages: pagesForCookie, expiresAt: Date.now() + 600000 }) },
          create: { key: `pending_oauth_${selectionToken}`, value: JSON.stringify({ accessToken, clientId, network: networkKey, pages: pagesForCookie, expiresAt: Date.now() + 600000 }) },
        });
        return NextResponse.redirect(
          `${REDIRECT_BASE}/admin/clientes/${clientId}/seleccionar-pagina?network=instagram&token=${selectionToken}`
        );
      }
    } else if (networkKey === "linkedin") {
      // OpenID Connect userinfo endpoint
      const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meData = await meRes.json();
      const personSub = meData.sub ?? "";
      const personName = meData.name ?? [meData.given_name, meData.family_name].filter(Boolean).join(" ") ?? personSub;
      const personPic: string | undefined = meData.picture ?? undefined;

      // Try to fetch organization pages (requires r_organization_social scope)
      let orgPages: Array<{
        id: string;
        name: string;
        picture: string | null;
        type: "person" | "org";
        accountId: string;
      }> = [];

      try {
        const orgsRes = await fetch(
          "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const orgsData = await orgsRes.json();
        const orgElements: Array<{ organization: string }> = orgsData.elements ?? [];

        for (const el of orgElements) {
          const orgUrn = el.organization ?? "";
          const orgId = orgUrn.split(":").pop() ?? "";
          if (!orgId) continue;
          try {
            const orgRes = await fetch(
              `https://api.linkedin.com/v2/organizations/${orgId}?projection=(id,localizedName,logoV2(original~:playableStreams))`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const orgInfo = await orgRes.json();
            const logoElements = orgInfo?.logoV2?.["original~"]?.elements;
            const logoUrl: string | null =
              logoElements?.[logoElements.length - 1]?.identifiers?.[0]?.identifier ?? null;
            orgPages.push({
              id: orgId,
              name: orgInfo.localizedName ?? `Organización ${orgId}`,
              picture: logoUrl,
              type: "org",
              accountId: `urn:li:organization:${orgId}`,
            });
          } catch {
            // skip org if details fetch fails
          }
        }
      } catch {
        // scope not granted or API unavailable — continue with personal only
      }

      if (orgPages.length > 0) {
        // Build options list: personal profile first, then orgs
        const allOptions = [
          {
            id: personSub,
            name: personName,
            picture: personPic ?? null,
            type: "person" as const,
            accountId: `urn:li:person:${personSub}`,
          },
          ...orgPages,
        ];
        // Redirect to page selection UI
        const selectionToken = crypto.randomUUID();
        await db.systemConfig.upsert({
          where: { key: `pending_oauth_${selectionToken}` },
          update: { value: JSON.stringify({ accessToken, clientId, network: networkKey, pages: allOptions, expiresAt: Date.now() + 600000 }) },
          create: { key: `pending_oauth_${selectionToken}`, value: JSON.stringify({ accessToken, clientId, network: networkKey, pages: allOptions, expiresAt: Date.now() + 600000 }) },
        });
        return NextResponse.redirect(
          `${REDIRECT_BASE}/admin/clientes/${clientId}/seleccionar-pagina?network=linkedin&token=${selectionToken}`
        );
      }

      // No org pages found — connect personal profile only
      accountId = personSub ? `urn:li:person:${personSub}` : "";
      accountName = personName;
      profilePic = personPic;
    } else if (networkKey === "x") {
      const meRes = await fetch("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meData = await meRes.json();
      accountId = meData.data?.id ?? "";
      accountName = meData.data?.username ? `@${meData.data.username}` : accountId;
      profilePic = meData.data?.profile_image_url;
    } else if (networkKey === "tiktok") {
      const meRes = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,profile_deep_link",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const meData = await meRes.json();
      if (meData.error?.code !== "ok" && !meData.data?.user) {
        console.error("[tiktok callback] user/info failed:", JSON.stringify(meData.error));
        // Non-fatal: account can still be saved with empty profile data
      }
      accountId = meData.data?.user?.open_id ?? "";
      accountName = meData.data?.user?.display_name
        ? `@${meData.data.user.display_name}`
        : accountId;
      profilePic = meData.data?.user?.avatar_url ?? undefined;
    }

    // ── Step 3: Upsert ClientSocialNetwork ────────────────────────────────────
    // Use accountId as fallback for pageId to avoid ghost records with network name as pageId
    const pageIdForNetwork = pageId || accountId || networkEnum;
    await db.clientSocialNetwork.upsert({
      where: {
        clientId_network_pageId: {
          clientId,
          network: networkEnum as any,
          pageId: pageIdForNetwork,
        },
      },
      update: {
        accessToken: pageAccessToken ?? accessToken,
        refreshToken: refreshToken ?? null,
        tokenExpiresAt: tokenExpiresAt ?? null,
        accountId,
        pageId: pageIdForNetwork,
        accountName,
        profilePic: profilePic ?? null,
        isActive: true,
        assignedAt: new Date(),
        tokenScope: null,
      },
      create: {
        clientId,
        network: networkEnum as any,
        pageId: pageIdForNetwork,
        accessToken: pageAccessToken ?? accessToken,
        refreshToken: refreshToken ?? null,
        tokenExpiresAt: tokenExpiresAt ?? null,
        accountId,
        accountName,
        profilePic: profilePic ?? null,
        isActive: true,
      },
    });

    // ── Cache profile pic in Supabase Storage + update client logo ──────────
    if (profilePic) {
      const cachedPic = await cacheProfilePic(profilePic, clientId, networkKey);
      // Update the stored profilePic with the permanent Supabase URL
      await db.clientSocialNetwork.updateMany({
        where: { clientId, network: networkEnum as any, pageId: pageIdForNetwork },
        data: { profilePic: cachedPic },
      });
      await db.clientProfile.updateMany({
        where: { id: clientId },
        data: { logoUrl: cachedPic },
      });
    }

    // ── Redirect back to client page ──────────────────────────────────────────
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/clientes/${clientId}?tab=redes&connected=${networkKey}`
    );
  } catch (err: any) {
    const msg = encodeURIComponent(err?.message ?? "Error desconocido");
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/clientes/${clientId}?tab=redes&error=${msg}`
    );
  }
}
