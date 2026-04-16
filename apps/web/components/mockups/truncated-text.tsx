"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface TruncatedTextProps {
  text: string;
  maxChars?: number;
  /** Tailwind class for the expand/collapse button text color */
  accentColor?: string;
  className?: string;
}

/**
 * Renders text with a "ver más / ver menos" toggle when text exceeds maxChars.
 * Used inside social network mockups for long copy.
 */
export function TruncatedText({
  text,
  maxChars = 160,
  accentColor = "text-blue-600 dark:text-blue-400",
  className,
}: TruncatedTextProps) {
  const [expanded, setExpanded] = useState(false);

  const shouldTruncate = text.length > maxChars;
  const displayText =
    !expanded && shouldTruncate ? text.slice(0, maxChars).trimEnd() + "…" : text;

  return (
    <span className={className}>
      {displayText}
      {shouldTruncate && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className={cn("ml-1 text-sm font-medium hover:underline", accentColor)}
        >
          {expanded ? "ver menos" : "ver más"}
        </button>
      )}
    </span>
  );
}
