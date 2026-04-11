/**
 * Meta Graph API v20.0 — Instagram & Facebook Insights
 *
 * Fetches analytics data from the Meta Graph API for Instagram media,
 * Instagram accounts, and Facebook pages.
 */

const META_API_BASE = "https://graph.facebook.com/v20.0";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function metaGet<T>(url: string): Promise<T | null> {
  try {
    console.log(`[meta-insights] GET ${url.replace(/access_token=[^&]+/, "access_token=***")}`);
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      console.warn(`[meta-insights] HTTP ${res.status}: ${body}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn("[meta-insights] Network error:", err);
    return null;
  }
}

function toUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface MetaInsightValue {
  value: number;
  end_time?: string;
}

interface MetaInsightEntry {
  name: string;
  period: string;
  values: MetaInsightValue[];
  title: string;
  description: string;
  id: string;
}

interface MetaInsightsResponse {
  data: MetaInsightEntry[];
}

interface MetaMediaFieldsResponse {
  like_count?: number;
  comments_count?: number;
  id: string;
}

interface MetaAccountFieldsResponse {
  followers_count?: number;
  id: string;
}

// ── Instagram Media Insights ─────────────────────────────────────────────────

export interface InstagramMediaInsights {
  impressions: number;
  reach: number;
  saved: number;
  shares: number;
  plays: number;
  likes: number;
  comments: number;
}

/**
 * Fetch insights for a single Instagram media object (post, reel, story).
 * Returns all zeros if the API call fails (expired token, missing permissions, etc.).
 */
export async function fetchInstagramMediaInsights(
  mediaId: string,
  accessToken: string
): Promise<InstagramMediaInsights> {
  const defaults: InstagramMediaInsights = {
    impressions: 0,
    reach: 0,
    saved: 0,
    shares: 0,
    plays: 0,
    likes: 0,
    comments: 0,
  };

  const [insightsData, mediaData] = await Promise.all([
    metaGet<MetaInsightsResponse>(
      `${META_API_BASE}/${mediaId}/insights?metric=impressions,reach,saved,shares,plays&access_token=${accessToken}`
    ),
    metaGet<MetaMediaFieldsResponse>(
      `${META_API_BASE}/${mediaId}?fields=like_count,comments_count&access_token=${accessToken}`
    ),
  ]);

  if (!insightsData && !mediaData) {
    console.warn(`[meta-insights] Failed to fetch any data for media ${mediaId}`);
    return defaults;
  }

  const result = { ...defaults };

  if (insightsData?.data) {
    for (const entry of insightsData.data) {
      const value = entry.values?.[0]?.value ?? 0;
      switch (entry.name) {
        case "impressions": result.impressions = value; break;
        case "reach": result.reach = value; break;
        case "saved": result.saved = value; break;
        case "shares": result.shares = value; break;
        case "plays": result.plays = value; break;
      }
    }
  }

  if (mediaData) {
    result.likes = mediaData.like_count ?? 0;
    result.comments = mediaData.comments_count ?? 0;
  }

  console.log(`[meta-insights] Media ${mediaId}: reach=${result.reach}, impressions=${result.impressions}, likes=${result.likes}`);
  return result;
}

// ── Instagram Account Insights ───────────────────────────────────────────────

export interface InstagramAccountInsights {
  reach: number[];
  impressions: number[];
  profileViews: number[];
  websiteClicks: number[];
  followerCount: number;
  dates: string[];
}

/**
 * Fetch daily account-level insights for an Instagram Business/Creator account.
 * Includes reach, impressions, profile views, website clicks, and current follower count.
 */
export async function fetchInstagramAccountInsights(
  igUserId: string,
  accessToken: string,
  since: Date,
  until: Date
): Promise<InstagramAccountInsights> {
  const defaults: InstagramAccountInsights = {
    reach: [],
    impressions: [],
    profileViews: [],
    websiteClicks: [],
    followerCount: 0,
    dates: [],
  };

  const [insightsData, accountData] = await Promise.all([
    metaGet<MetaInsightsResponse>(
      `${META_API_BASE}/${igUserId}/insights?metric=reach,impressions,profile_views,website_clicks&period=day&since=${toUnix(since)}&until=${toUnix(until)}&access_token=${accessToken}`
    ),
    metaGet<MetaAccountFieldsResponse>(
      `${META_API_BASE}/${igUserId}?fields=followers_count&access_token=${accessToken}`
    ),
  ]);

  if (!insightsData && !accountData) {
    console.warn(`[meta-insights] Failed to fetch account insights for IG user ${igUserId}`);
    return defaults;
  }

  const result: InstagramAccountInsights = {
    reach: [],
    impressions: [],
    profileViews: [],
    websiteClicks: [],
    followerCount: accountData?.followers_count ?? 0,
    dates: [],
  };

  if (insightsData?.data) {
    const firstMetric = insightsData.data[0];
    if (firstMetric?.values) {
      result.dates = firstMetric.values.map((v) =>
        v.end_time ? v.end_time.slice(0, 10) : ""
      );
    }

    for (const entry of insightsData.data) {
      const values = entry.values?.map((v) => v.value ?? 0) ?? [];
      switch (entry.name) {
        case "reach": result.reach = values; break;
        case "impressions": result.impressions = values; break;
        case "profile_views": result.profileViews = values; break;
        case "website_clicks": result.websiteClicks = values; break;
      }
    }
  }

  console.log(
    `[meta-insights] IG account ${igUserId}: ${result.dates.length} days, followers=${result.followerCount}, profileViews=${result.profileViews.reduce((a, b) => a + b, 0)}`
  );
  return result;
}

// ── Facebook Page Insights ───────────────────────────────────────────────────

export interface FacebookPageInsights {
  reach: number[];           // page_impressions_unique — unique people reached
  impressions: number[];     // page_impressions — total impressions
  postEngagements: number[]; // page_post_engagements
  engagedUsers: number[];    // page_engaged_users
  fanAdds: number[];         // page_fan_adds — new likes per day
  videoViews: number[];      // page_video_views
  fanCount: number;          // current total fans (lifetime)
  dates: string[];
}

/**
 * Fetch daily page-level insights for a Facebook Page.
 * Uses page_impressions_unique for reach (replaces deprecated page_views_total).
 * Also fetches current fan count from page fields.
 */
export async function fetchFacebookPageInsights(
  pageId: string,
  accessToken: string,
  since: Date,
  until: Date
): Promise<FacebookPageInsights> {
  const defaults: FacebookPageInsights = {
    reach: [],
    impressions: [],
    postEngagements: [],
    engagedUsers: [],
    fanAdds: [],
    videoViews: [],
    fanCount: 0,
    dates: [],
  };

  const metrics = [
    "page_impressions",
    "page_impressions_unique",
    "page_post_engagements",
    "page_engaged_users",
    "page_fan_adds",
    "page_video_views",
  ].join(",");

  const [insightsData, pageData] = await Promise.all([
    metaGet<MetaInsightsResponse>(
      `${META_API_BASE}/${pageId}/insights?metric=${metrics}&period=day&since=${toUnix(since)}&until=${toUnix(until)}&access_token=${accessToken}`
    ),
    metaGet<{ fan_count?: number; id: string }>(
      `${META_API_BASE}/${pageId}?fields=fan_count&access_token=${accessToken}`
    ),
  ]);

  const fanCount = pageData?.fan_count ?? 0;

  if (!insightsData?.data) {
    console.warn(`[meta-insights] Failed to fetch page insights for FB page ${pageId}`);
    return { ...defaults, fanCount };
  }

  const result: FacebookPageInsights = { ...defaults, fanCount };

  const firstMetric = insightsData.data[0];
  if (firstMetric?.values) {
    result.dates = firstMetric.values.map((v) =>
      v.end_time ? v.end_time.slice(0, 10) : ""
    );
  }

  for (const entry of insightsData.data) {
    const values = entry.values?.map((v) => v.value ?? 0) ?? [];
    switch (entry.name) {
      case "page_impressions": result.impressions = values; break;
      case "page_impressions_unique": result.reach = values; break;
      case "page_post_engagements": result.postEngagements = values; break;
      case "page_engaged_users": result.engagedUsers = values; break;
      case "page_fan_adds": result.fanAdds = values; break;
      case "page_video_views": result.videoViews = values; break;
    }
  }

  console.log(
    `[meta-insights] FB page ${pageId}: ${result.dates.length} days, fans=${result.fanCount}, reach=${result.reach.reduce((a, b) => a + b, 0)}`
  );
  return result;
}

// ── Facebook Post Insights ───────────────────────────────────────────────────

export interface FacebookPostInsights {
  impressions: number;
  reach: number;
  engagedUsers: number;
  clicks: number;
  reactions: number;
  comments: number;
  shares: number;
}

/**
 * Fetch insights for a single Facebook post.
 */
export async function fetchFacebookPostInsights(
  postId: string,
  accessToken: string
): Promise<FacebookPostInsights> {
  const defaults: FacebookPostInsights = {
    impressions: 0, reach: 0, engagedUsers: 0,
    clicks: 0, reactions: 0, comments: 0, shares: 0,
  };

  const metrics = "post_impressions,post_impressions_unique,post_engaged_users,post_clicks";

  const [insightsData, postData] = await Promise.all([
    metaGet<MetaInsightsResponse>(
      `${META_API_BASE}/${postId}/insights?metric=${metrics}&access_token=${accessToken}`
    ),
    metaGet<{ likes?: { summary?: { total_count?: number } }; comments?: { summary?: { total_count?: number } }; shares?: { count?: number }; id: string }>(
      `${META_API_BASE}/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${accessToken}`
    ),
  ]);

  const result = { ...defaults };

  if (insightsData?.data) {
    for (const entry of insightsData.data) {
      const value = entry.values?.[0]?.value ?? 0;
      switch (entry.name) {
        case "post_impressions": result.impressions = value; break;
        case "post_impressions_unique": result.reach = value; break;
        case "post_engaged_users": result.engagedUsers = value; break;
        case "post_clicks": result.clicks = value; break;
      }
    }
  }

  if (postData) {
    result.reactions = postData.likes?.summary?.total_count ?? 0;
    result.comments = postData.comments?.summary?.total_count ?? 0;
    result.shares = postData.shares?.count ?? 0;
  }

  return result;
}
