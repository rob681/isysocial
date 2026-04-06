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

  // Parse insights metrics
  if (insightsData?.data) {
    for (const entry of insightsData.data) {
      const value = entry.values?.[0]?.value ?? 0;
      switch (entry.name) {
        case "impressions":
          result.impressions = value;
          break;
        case "reach":
          result.reach = value;
          break;
        case "saved":
          result.saved = value;
          break;
        case "shares":
          result.shares = value;
          break;
        case "plays":
          result.plays = value;
          break;
      }
    }
  }

  // Parse likes and comments from media fields
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
  followerCount: number;
  dates: string[];
}

/**
 * Fetch daily account-level insights for an Instagram Business/Creator account.
 * Returns time-series arrays for reach and impressions, plus current follower count.
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
    followerCount: 0,
    dates: [],
  };

  const [insightsData, accountData] = await Promise.all([
    metaGet<MetaInsightsResponse>(
      `${META_API_BASE}/${igUserId}/insights?metric=reach,impressions&period=day&since=${toUnix(since)}&until=${toUnix(until)}&access_token=${accessToken}`
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
    followerCount: accountData?.followers_count ?? 0,
    dates: [],
  };

  // Parse time-series data from insights
  if (insightsData?.data) {
    // Extract dates from the first metric that has values
    const firstMetric = insightsData.data[0];
    if (firstMetric?.values) {
      result.dates = firstMetric.values.map((v) =>
        v.end_time ? v.end_time.slice(0, 10) : ""
      );
    }

    for (const entry of insightsData.data) {
      const values = entry.values?.map((v) => v.value ?? 0) ?? [];
      switch (entry.name) {
        case "reach":
          result.reach = values;
          break;
        case "impressions":
          result.impressions = values;
          break;
      }
    }
  }

  console.log(
    `[meta-insights] IG account ${igUserId}: ${result.dates.length} days, followers=${result.followerCount}`
  );
  return result;
}

// ── Facebook Page Insights ───────────────────────────────────────────────────

export interface FacebookPageInsights {
  views: number[];
  engagedUsers: number[];
  postEngagements: number[];
  impressions: number[];
  dates: string[];
}

/**
 * Fetch daily page-level insights for a Facebook Page.
 * Returns time-series arrays for views, engaged users, post engagements, and impressions.
 */
export async function fetchFacebookPageInsights(
  pageId: string,
  accessToken: string,
  since: Date,
  until: Date
): Promise<FacebookPageInsights> {
  const defaults: FacebookPageInsights = {
    views: [],
    engagedUsers: [],
    postEngagements: [],
    impressions: [],
    dates: [],
  };

  const insightsData = await metaGet<MetaInsightsResponse>(
    `${META_API_BASE}/${pageId}/insights?metric=page_views_total,page_engaged_users,page_post_engagements,page_impressions&period=day&since=${toUnix(since)}&until=${toUnix(until)}&access_token=${accessToken}`
  );

  if (!insightsData?.data) {
    console.warn(`[meta-insights] Failed to fetch page insights for FB page ${pageId}`);
    return defaults;
  }

  const result: FacebookPageInsights = {
    views: [],
    engagedUsers: [],
    postEngagements: [],
    impressions: [],
    dates: [],
  };

  // Extract dates from the first metric that has values
  const firstMetric = insightsData.data[0];
  if (firstMetric?.values) {
    result.dates = firstMetric.values.map((v) =>
      v.end_time ? v.end_time.slice(0, 10) : ""
    );
  }

  // Parse each metric's time-series values
  for (const entry of insightsData.data) {
    const values = entry.values?.map((v) => v.value ?? 0) ?? [];
    switch (entry.name) {
      case "page_views_total":
        result.views = values;
        break;
      case "page_engaged_users":
        result.engagedUsers = values;
        break;
      case "page_post_engagements":
        result.postEngagements = values;
        break;
      case "page_impressions":
        result.impressions = values;
        break;
    }
  }

  console.log(
    `[meta-insights] FB page ${pageId}: ${result.dates.length} days of data`
  );
  return result;
}
