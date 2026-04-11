// ─── Debug: Facebook Pages API Analysis ───────────────────────────────────
// Test endpoint to diagnose Facebook OAuth page fetching issues
// Usage: GET /api/debug/facebook-pages?token=<access_token>&clientId=<client_id>

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Only allow admins
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { error: "Missing token parameter. Use: ?token=<access_token>" },
      { status: 400 }
    );
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    token: token.substring(0, 10) + "...",
    me: null,
    meAccounts: { total: 0, pages: [], error: null },
    meBusinesses: { total: 0, businesses: [], error: null },
    allPages: [],
    summary: {
      personalPages: 0,
      businessPages: 0,
      pagesWithToken: 0,
      pagesWithoutToken: 0,
      totalUnique: 0,
    },
  };

  try {
    // 1. Get /me info
    console.log("[debug] Fetching /me...");
    const meRes: Response = await fetch(
      `https://graph.facebook.com/v20.0/me?fields=id,name,email&access_token=${token}`
    );
    const meData: any = await meRes.json();
    results.me = meData;
    console.log("[debug] /me response:", meData);

    if (meData.error) {
      console.error("[debug] /me returned error:", meData.error);
      return NextResponse.json(results, { status: 200 });
    }

    // 2. Get /me/accounts (personal pages)
    console.log("[debug] Fetching /me/accounts...");
    const allPersonalPages: any[] = [];
    let accountsUrl: string | null =
      `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,picture,access_token,category,category_list&limit=100&access_token=${token}`;
    let accountsPageCount = 0;

    while (accountsUrl && accountsPageCount < 10) {
      // Limit to 10 pages to avoid infinite loops
      console.log("[debug] Fetching accounts page...");
      const accountRes: Response = await fetch(accountsUrl);
      const accountData: any = await accountRes.json();
      const pages = accountData.data ?? [];

      console.log(`[debug] /me/accounts page ${accountsPageCount + 1}: ${pages.length} pages`);

      for (const page of pages) {
        allPersonalPages.push({
          id: page.id,
          name: page.name,
          hasToken: !!page.access_token,
          category: page.category ?? page.category_list?.[0],
        });
      }

      accountsPageCount++;
      accountsUrl = accountData.paging?.next ?? null;
    }

    results.meAccounts.total = allPersonalPages.length;
    results.meAccounts.pages = allPersonalPages;
    results.summary.personalPages = allPersonalPages.length;
    results.summary.pagesWithToken += allPersonalPages.filter((p) => p.hasToken).length;
    results.summary.pagesWithoutToken += allPersonalPages.filter((p) => !p.hasToken).length;

    console.log(`[debug] /me/accounts total: ${allPersonalPages.length}`);

    // 3. Get /me/businesses
    console.log("[debug] Fetching /me/businesses...");
    try {
      const businessesRes: Response = await fetch(
        `https://graph.facebook.com/v20.0/me/businesses?fields=id,name&limit=100&access_token=${token}`
      );
      const businessesData: any = await businessesRes.json();

      if (businessesData.error) {
        console.error("[debug] /me/businesses returned error:", businessesData.error);
        results.meBusinesses.error = businessesData.error;
      } else {
        const businesses = businessesData.data ?? [];
        console.log(`[debug] /me/businesses returned ${businesses.length} businesses`);

        for (const business of businesses) {
          const businessInfo = {
            id: business.id,
            name: business.name,
            pageCount: 0,
            pages: [] as any[],
            error: null as string | null,
          };

          try {
            let pageUrl: string | null =
              `https://graph.facebook.com/v20.0/${business.id}/owned_pages?fields=id,name,picture,access_token,category,category_list&limit=100&access_token=${token}`;

            let pageCount = 0;
            while (pageUrl && pageCount < 10) {
              console.log(`[debug] Fetching pages for business ${business.id}, page ${pageCount + 1}...`);
              const pageRes: Response = await fetch(pageUrl);
              const pageData: any = await pageRes.json();

              if (pageData.error) {
                console.error(
                  `[debug] Error fetching pages for ${business.id}:`,
                  pageData.error
                );
                businessInfo.error = pageData.error;
                break;
              }

              const pages = pageData.data ?? [];
              console.log(
                `[debug] Business ${business.id} page ${pageCount + 1}: ${pages.length} pages`
              );

              for (const page of pages) {
                const isDuplicate = allPersonalPages.some((p) => p.id === page.id);
                if (!isDuplicate) {
                  businessInfo.pages.push({
                    id: page.id,
                    name: page.name,
                    hasToken: !!page.access_token,
                    category: page.category ?? page.category_list?.[0],
                  });
                  results.summary.businessPages++;
                  results.summary.pagesWithToken += page.access_token ? 1 : 0;
                  results.summary.pagesWithoutToken += page.access_token ? 0 : 1;
                }
              }

              pageCount++;
              pageUrl = pageData.paging?.next ?? null;
            }

            businessInfo.pageCount = businessInfo.pages.length;
            results.meBusinesses.businesses.push(businessInfo);
          } catch (err) {
            businessInfo.error = String(err);
            results.meBusinesses.businesses.push(businessInfo);
          }
        }

        results.meBusinesses.total = (results.meBusinesses.businesses as any[]).reduce(
          (sum: number, b: any) => sum + (b.pageCount ?? 0),
          0
        );
      }
    } catch (err) {
      console.error("[debug] Error fetching businesses:", err);
      results.meBusinesses.error = String(err);
    }

    // 4. Combine all pages
    const allPages = [
      ...allPersonalPages,
      ...(results.meBusinesses.businesses as any[]).flatMap((b: any) => b.pages ?? []),
    ];
    results.allPages = allPages;
    results.summary.totalUnique = allPages.length;

    console.log(`[debug] FINAL: ${allPages.length} total unique pages`);
    console.log(`[debug] With token: ${results.summary.pagesWithToken}`);
    console.log(`[debug] Without token: ${results.summary.pagesWithoutToken}`);

    return NextResponse.json(results, { status: 200 });
  } catch (err: any) {
    console.error("[debug] Error:", err);
    results.error = err.message;
    return NextResponse.json(results, { status: 200 });
  }
}
