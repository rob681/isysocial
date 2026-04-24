"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ClientLogoProps {
  src?: string | null;
  name: string;
  className?: string;
  /** Tailwind size classes — default is w-7 h-7. Example: "w-9 h-9" */
  size?: string;
  /** Extra classes for the initials fallback (to tune font size etc.) */
  fallbackClassName?: string;
}

function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Client avatar with automatic fallback to initials.
 *
 * The underlying <img> has `onError` handling — if the image fails to
 * load (404, network error, expired URL), we fall back to an initials
 * badge. This guards against third-party CDN URLs (Meta, LinkedIn, etc.)
 * that used to expire and leave the UI with broken-image icons.
 */
export function ClientLogo({
  src,
  name,
  className,
  size = "w-7 h-7",
  fallbackClassName,
}: ClientLogoProps) {
  const [failed, setFailed] = React.useState(false);

  // Reset error state when src changes (e.g. after an avatar refresh).
  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  const showFallback = !src || failed;

  if (showFallback) {
    return (
      <div
        className={cn(
          size,
          "rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0",
          fallbackClassName,
          className
        )}
        aria-label={name}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn(size, "rounded-full object-cover flex-shrink-0", className)}
    />
  );
}
