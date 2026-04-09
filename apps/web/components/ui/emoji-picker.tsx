"use client";

import { useState, useRef, useEffect } from "react";

const EMOJI_CATEGORIES = [
  {
    label: "Frecuentes",
    emojis: ["⭐", "🔥", "💡", "✅", "❤️", "🎯", "💪", "🚀", "🌟", "🎉", "👏", "💬"],
  },
  {
    label: "Personas",
    emojis: ["😊", "😍", "🤔", "💪", "🧠", "👀", "🙌", "🤝", "👍", "🥳", "😎", "🤩"],
  },
  {
    label: "Naturaleza",
    emojis: ["🌿", "🌸", "🌻", "🌙", "☀️", "🌈", "💧", "🍃", "🌺", "🌊", "🍀", "🌱"],
  },
  {
    label: "Comida",
    emojis: ["🍕", "🍔", "🌮", "🍦", "☕", "🍫", "🥗", "🍓", "🥑", "🍰", "🧁", "🍷"],
  },
  {
    label: "Trabajo",
    emojis: ["💼", "📊", "📈", "🖥️", "📱", "📝", "✏️", "🔑", "📌", "🗓️", "📣", "💰"],
  },
  {
    label: "Objetos",
    emojis: ["🎨", "🎵", "🎬", "📸", "🏆", "🎁", "💎", "🔮", "🧲", "📚", "🔍", "💡"],
  },
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  placeholder?: string;
}

export function EmojiPicker({ value, onChange, placeholder = "emoji" }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-8 w-14 border rounded-md bg-background text-sm flex items-center justify-center hover:bg-muted transition-colors"
        title="Selector de emoji"
      >
        {value ? (
          <span className="text-lg leading-none">{value}</span>
        ) : (
          <span className="text-xs text-muted-foreground">{placeholder}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 bottom-10 z-50 w-72 rounded-xl border bg-popover shadow-xl p-2">
          {/* Category tabs */}
          <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setActiveCategory(i)}
                className={`text-[10px] px-2 py-1 rounded-md whitespace-nowrap flex-shrink-0 transition-colors ${
                  activeCategory === i
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="grid grid-cols-8 gap-0.5">
            {EMOJI_CATEGORIES[activeCategory]?.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onChange(emoji);
                  setOpen(false);
                }}
                className="w-8 h-8 rounded-md text-lg flex items-center justify-center hover:bg-muted transition-colors"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Clear button */}
          {value && (
            <div className="mt-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors w-full text-center"
              >
                Quitar emoji
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
