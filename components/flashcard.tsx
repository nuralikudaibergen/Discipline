"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Volume2 } from "lucide-react";

interface FlashcardProps {
  front: string;
  back: string;
  className?: string;
}

export function Flashcard({ front, back, className }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);

  function speak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(front);
      u.lang = "en-US";
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={cn("perspective h-56 w-full sm:h-64", className)}
      onClick={() => setFlipped((v) => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFlipped((v) => !v);
        }
      }}
      aria-label="Flip card"
    >
      <div
        className={cn(
          "preserve-3d relative h-full w-full transition-transform duration-700",
          flipped && "rotate-y-180",
        )}
      >
        {/* FRONT */}
        <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/40 p-6 text-center shadow-lg">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            English
          </span>
          <span className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {front}
          </span>
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                speak();
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-3 py-1 transition-colors hover:bg-accent"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Listen
            </button>
            <span>· Click to flip</span>
          </div>
        </div>

        {/* BACK */}
        <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-primary/15 to-accent/30 p-6 text-center shadow-lg">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Russian
          </span>
          <span className="mt-3 text-2xl font-semibold sm:text-3xl">{back}</span>
          <span className="mt-6 text-xs text-muted-foreground">
            Click to flip back
          </span>
        </div>
      </div>
    </div>
  );
}
