"use client";

import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// ─── Sheet Root ───────────────────────────────
interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, close]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 animate-in fade-in-0"
        onClick={close}
        aria-hidden="true"
      />
      {children}
    </>
  );
}

// ─── SheetContent ─────────────────────────────
interface SheetContentProps {
  children: React.ReactNode;
  side?: "left" | "right";
  className?: string;
}

export function SheetContent({ children, side = "right", className }: SheetContentProps) {
  return (
    <div
      className={cn(
        "fixed inset-y-0 z-50 bg-card border shadow-xl transition-transform duration-300 ease-in-out",
        side === "left"
          ? "left-0 border-r slide-in-from-left"
          : "right-0 border-l slide-in-from-right",
        className
      )}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}

// ─── SheetHeader ──────────────────────────────
interface SheetHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SheetHeader({ children, className }: SheetHeaderProps) {
  return (
    <div className={cn("px-6 pt-6 pb-4 border-b", className)}>
      {children}
    </div>
  );
}

// ─── SheetTitle ───────────────────────────────
interface SheetTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function SheetTitle({ children, className }: SheetTitleProps) {
  return (
    <h2 className={cn("text-lg font-semibold", className)}>
      {children}
    </h2>
  );
}

// ─── SheetClose ───────────────────────────────
interface SheetCloseProps {
  onClose?: () => void;
  className?: string;
}

export function SheetClose({ onClose, className }: SheetCloseProps) {
  return (
    <button
      onClick={onClose}
      className={cn(
        "absolute top-4 right-4 z-10 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        className
      )}
      aria-label="Cerrar"
    >
      <X className="h-5 w-5" />
    </button>
  );
}
