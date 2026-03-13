export interface MockupMedia {
  url: string;
  type: "image" | "video";
}

export interface MockupProps {
  clientName: string;
  clientAvatar?: string;
  copy?: string;
  hashtags?: string;
  media?: MockupMedia[];
  scheduledAt?: Date;
  className?: string;
}
