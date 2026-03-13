"use client";

import type { SocialNetwork, PostType } from "@isysocial/shared";
import { FacebookPostMockup } from "./facebook-post";
import { InstagramFeedMockup } from "./instagram-feed";
import { InstagramStoryMockup } from "./instagram-story";
import { InstagramReelMockup } from "./instagram-reel";
import { LinkedInPostMockup } from "./linkedin-post";
import { TikTokMockup } from "./tiktok-post";
import { XPostMockup } from "./x-post";
import type { MockupProps } from "./types";

interface MockupRendererProps extends MockupProps {
  network: SocialNetwork;
  postType: PostType;
}

export function MockupRenderer({
  network,
  postType,
  ...mockupProps
}: MockupRendererProps) {
  // Instagram has 3 variants based on post type
  if (network === "INSTAGRAM") {
    if (postType === "STORY") {
      return <InstagramStoryMockup {...mockupProps} />;
    }
    if (postType === "REEL") {
      return <InstagramReelMockup {...mockupProps} />;
    }
    return <InstagramFeedMockup {...mockupProps} />;
  }

  // TikTok always uses vertical format
  if (network === "TIKTOK") {
    return <TikTokMockup {...mockupProps} />;
  }

  // LinkedIn
  if (network === "LINKEDIN") {
    return <LinkedInPostMockup {...mockupProps} />;
  }

  // X (Twitter)
  if (network === "X") {
    return <XPostMockup {...mockupProps} />;
  }

  // Facebook (default)
  return <FacebookPostMockup {...mockupProps} />;
}
