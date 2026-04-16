"use client";

// ─── StorageImage ─────────────────────────────────────────────────────────────
// <img> wrapper that falls back to a signed URL if the public Supabase URL
// returns an error (e.g. when the bucket is not set to public).
//
// Usage:
//   <StorageImage src={publicUrl} storagePath={storagePath} alt="..." className="..." />

import { useState } from "react";

interface StorageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  /** Optional: "bucket/path/file.ext" — used to generate signed URL fallback */
  storagePath?: string;
  fallback?: React.ReactNode;
}

export function StorageImage({
  src,
  storagePath,
  fallback,
  onError,
  ...props
}: StorageImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [triedSigned, setTriedSigned] = useState(false);
  const [errored, setErrored] = useState(false);

  const handleError = async (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (triedSigned || !storagePath) {
      setErrored(true);
      onError?.(e);
      return;
    }

    setTriedSigned(true);
    try {
      const res = await fetch(
        `/api/files/signed-url?path=${encodeURIComponent(storagePath)}`
      );
      if (res.ok) {
        const { url } = await res.json();
        setCurrentSrc(url);
        return;
      }
    } catch {
      // ignore
    }
    setErrored(true);
    onError?.(e);
  };

  if (errored && fallback) {
    return <>{fallback}</>;
  }

  return <img {...props} src={currentSrc} onError={handleError} />;
}
