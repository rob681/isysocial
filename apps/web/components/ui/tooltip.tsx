"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>;
}

const TooltipContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
});

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  return (
    <TooltipContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-flex">{children}</div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { setOpen, triggerRef } = React.useContext(TooltipContext);

  return (
    <div
      ref={triggerRef as any}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="inline-flex"
    >
      {children}
    </div>
  );
}

export function TooltipContent({
  children,
  className,
  side = "top",
}: {
  children: React.ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const { open, triggerRef } = React.useContext(TooltipContext);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const offsets = {
      top: { top: rect.top - 8, left: rect.left + rect.width / 2 },
      right: { top: rect.top + rect.height / 2, left: rect.right + 8 },
      bottom: { top: rect.bottom + 8, left: rect.left + rect.width / 2 },
      left: { top: rect.top + rect.height / 2, left: rect.left - 8 },
    };
    setPos(offsets[side]);
  }, [open, side]);

  if (!open) return null;

  const transforms = {
    top: "translate(-50%, -100%)",
    right: "translate(0, -50%)",
    bottom: "translate(-50%, 0)",
    left: "translate(-100%, -50%)",
  };

  return (
    <div
      className={cn(
        "fixed z-[9999]",
        "px-3 py-1.5 rounded-md shadow-lg",
        "bg-zinc-900 text-white text-xs",
        "border border-zinc-700",
        "pointer-events-none",
        className
      )}
      style={{
        top: pos.top,
        left: pos.left,
        transform: transforms[side],
      }}
    >
      {children}
    </div>
  );
}
