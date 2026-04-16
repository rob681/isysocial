"use client";

import type { SocialNetwork, PostType } from "@isysocial/shared";
import { FacebookPostMockup } from "./facebook-post";
import { InstagramFeedMockup } from "./instagram-feed";
import { InstagramStoryMockup } from "./instagram-story";
import { InstagramReelMockup } from "./instagram-reel";
import { LinkedInPostMockup } from "./linkedin-post";
import { TikTokMockup } from "./tiktok-post";
import { XPostMockup } from "./x-post";
import { MockupExpandable } from "./mockup-expandable";
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
  let mockup: React.ReactNode;

  // Instagram has 3 variants based on post type
  if (network === "INSTAGRAM") {
    if (postType === "STORY") {
      mockup = <InstagramStoryMockup {...mockupProps} />;
    } else if (postType === "REEL") {
      mockup = <InstagramReelMockup {...mockupProps} />;
    } else {
      mockup = <InstagramFeedMockup {...mockupProps} />;
    }
  } else if (network === "TIKTOK") {
    mockup = <TikTokMockup {...mockupProps} />;
  } else if (network === "LINKEDIN") {
    mockup = <LinkedInPostMockup {...mockupProps} />;
  } else if (network === "X") {
    mockup = <XPostMockup {...mockupProps} />;
  } else {
    // Facebook (default)
    mockup = <FacebookPostMockup {...mockupProps} />;
  }

  return <MockupExpandable>{mockup}</MockupExpandable>;
}
