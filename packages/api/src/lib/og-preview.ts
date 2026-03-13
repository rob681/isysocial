/**
 * Fetches Open Graph metadata from a URL for the Ideas section.
 */
export interface OGData {
  title: string | null;
  description: string | null;
  image: string | null;
}

export async function fetchOGData(url: string): Promise<OGData> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Isysocial/1.0; +https://isysocial.com)",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return { title: null, description: null, image: null };

    const html = await response.text();

    const getMetaTag = (property: string): string | null => {
      // Match og: tags and name= tags
      const ogMatch = html.match(
        new RegExp(
          `<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`,
          "i"
        )
      );
      if (ogMatch) return ogMatch[1];

      const nameMatch = html.match(
        new RegExp(
          `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
          "i"
        )
      );
      return nameMatch ? nameMatch[1] : null;
    };

    const getTitleTag = (): string | null => {
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return match ? match[1].trim() : null;
    };

    return {
      title: getMetaTag("title") || getTitleTag(),
      description: getMetaTag("description"),
      image: getMetaTag("image"),
    };
  } catch {
    return { title: null, description: null, image: null };
  }
}
