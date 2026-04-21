import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function timeAgo(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return "hace un momento";
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)} días`;
  return formatDate(date);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

const TIMEZONE_SHORT_LABELS: Record<string, string> = {
  "America/Mexico_City": "CDMX",
  "America/Monterrey": "MTY",
  "America/Cancun": "CUN",
  "America/Bogota": "BOG",
  "America/Lima": "LIM",
  "America/Santiago": "SCL",
  "America/Argentina/Buenos_Aires": "BUE",
  "America/Sao_Paulo": "SAO",
  "America/New_York": "NYC",
  "America/Chicago": "CHI",
  "America/Denver": "DEN",
  "America/Los_Angeles": "LAX",
  "Europe/Madrid": "MAD",
  "Europe/London": "LON",
};

/** Returns a short city code for a timezone, e.g. "CDMX" for America/Mexico_City */
export function getTimezoneShortLabel(tz: string): string {
  return TIMEZONE_SHORT_LABELS[tz] ?? tz.split("/").pop()?.replace("_", " ") ?? tz;
}

// ─── Local-timezone date helpers ──────────────────────────────────────────────
// `Date#toISOString()` and `Date#getUTCHours()` always return UTC, which breaks
// day/hour buckets for calendars running in a different server timezone (e.g.
// Vercel runs UTC; a post at 11:00 Mexico local shows in the 17:00 UTC bucket).
// These helpers use the browser's local `Date` methods so grouping matches
// the user's perceived date/hour.

/** Returns `YYYY-MM-DD` in the browser's local timezone. */
export function localYMD(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns the hour (0-23) in the browser's local timezone, or null if invalid. */
export function localHour(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours();
}
