"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  ariaLabel?: string;
}

export function AnimatedCheckbox({
  checked,
  onToggle,
  ariaLabel,
}: AnimatedCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel ?? "Toggle task"}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
        checked
          ? "border-emerald-500/70 bg-emerald-500/20"
          : "border-border bg-secondary/40 hover:border-foreground/30",
      )}
    >
      <AnimatePresence>
        {checked && (
          <motion.span
            initial={{ scale: 0, rotate: -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: 90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 24 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Check className="h-4 w-4 text-emerald-500" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
