"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Search,
  Loader2,
  Languages,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { translateEnToRu, type TranslateResult } from "@/lib/translate";
import { cn } from "@/lib/utils";
import type { Word } from "@/lib/types";

interface VocabularyPanelProps {
  words: Word[];
  onAdd: (en: string, ru: string) => void;
  onRemove: (id: string) => void;
}

const REASON_MESSAGE: Record<Exclude<TranslateResult, { ok: true }>["reason"], string> = {
  empty: "Translator returned an empty result.",
  http: "Translator service responded with an error.",
  network: "Couldn't reach the translator — check your connection.",
};

export function VocabularyPanel({
  words,
  onAdd,
  onRemove,
}: VocabularyPanelProps) {
  const [en, setEn] = useState("");
  const [ru, setRu] = useState("");
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailed, setLastFailed] = useState<string>("");
  const [query, setQuery] = useState("");
  const lastTranslated = useRef<string>("");
  // Bumped on every keystroke so in-flight translations can be discarded.
  const translateToken = useRef(0);

  // Clean up any pending translation when the component unmounts.
  useEffect(() => {
    return () => {
      // Bump the token so any in-flight translation result is dropped.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      translateToken.current++;
    };
  }, []);

  // Filtered list
  const filtered = words.filter(
    (w) =>
      w.en.toLowerCase().includes(query.toLowerCase()) ||
      w.ru.toLowerCase().includes(query.toLowerCase()),
  );

  async function translateAndAdd() {
    const cleaned = en.trim();
    if (!cleaned) return;
    setError(null);
    let translation = ru.trim();
    let pending = false;
    if (!translation) {
      setTranslating(true);
      const result = await translateEnToRu(cleaned);
      setTranslating(false);
      if (result.ok) {
        translation = result.text;
      } else {
        // Save the word with a placeholder so the user doesn't lose their
        // typing — but flag the failure so they can retry.
        translation = "(translation pending)";
        pending = true;
        setLastFailed(cleaned);
        setError(REASON_MESSAGE[result.reason]);
      }
    }
    onAdd(cleaned, translation);
    setEn("");
    setRu("");
    lastTranslated.current = "";
    if (pending) {
      // Re-focus the field on the next paint so the user can paste the
      // translation manually if they prefer.
    }
  }

  async function autoTranslate(value: string) {
    setEn(value);
    setError(null);
    const cleaned = value.trim();
    if (!cleaned || cleaned === lastTranslated.current) return;
    if (ru.trim()) return; // user already typed a translation; don't override
    const token = ++translateToken.current;
    setTranslating(true);
    try {
      const result = await translateEnToRu(cleaned);
      // Drop the result if a newer keystroke (or unmount) has fired since.
      if (token !== translateToken.current) return;
      lastTranslated.current = cleaned;
      if (result.ok) {
        setRu(result.text);
      } else {
        setLastFailed(cleaned);
        setError(REASON_MESSAGE[result.reason]);
      }
    } finally {
      if (token === translateToken.current) setTranslating(false);
    }
  }

  async function retryLast() {
    if (!lastFailed) return;
    const token = ++translateToken.current;
    setTranslating(true);
    setError(null);
    try {
      const result = await translateEnToRu(lastFailed);
      if (token !== translateToken.current) return;
      if (result.ok) {
        setRu(result.text);
        setEn(lastFailed);
        setLastFailed("");
        lastTranslated.current = lastFailed;
      } else {
        setError(REASON_MESSAGE[result.reason]);
      }
    } finally {
      if (token === translateToken.current) setTranslating(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Vocabulary bank
        </h1>
        <p className="text-sm text-muted-foreground">
          Add English words. We&apos;ll auto-translate them to Russian.
        </p>
      </header>

      {/* Add new word */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Languages className="h-3.5 w-3.5" />
            New word
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">English</label>
              <Input
                value={en}
                onChange={(e) => autoTranslate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") translateAndAdd();
                }}
                placeholder="e.g. curious"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Russian</label>
              <div className="relative">
                <Input
                  value={ru}
                  onChange={(e) => setRu(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") translateAndAdd();
                  }}
                  placeholder={
                    translating ? "Translating…" : "auto / type to override"
                  }
                  disabled={translating}
                />
                {translating && (
                  <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="flex items-end">
              <Button
                onClick={translateAndAdd}
                disabled={!en.trim() || translating}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="flex-1">
                <p>{error}</p>
                <p className="mt-0.5 text-rose-400/80">
                  The word will be saved as <em>(translation pending)</em> so
                  you don&apos;t lose it — you can fix the Russian field any
                  time.
                </p>
              </div>
              {lastFailed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={retryLast}
                  disabled={translating}
                  className="shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Translation uses the free MyMemory API. If a request fails, the
            word is saved with a placeholder — you can edit it any time.
          </p>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search words…"
          className="pl-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Word list */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              {words.length === 0
                ? "No words yet. Add one above to get started."
                : "No words match your search."}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {filtered.map((w) => (
                  <motion.li
                    key={w.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="group flex items-center gap-3 px-5 py-3.5"
                  >
                    <span className="text-sm font-medium">{w.en}</span>
                    <span className="text-muted-foreground">—</span>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        w.ru === "(translation pending)"
                          ? "italic text-muted-foreground"
                          : "text-foreground/90",
                      )}
                    >
                      {w.ru}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(w.id)}
                      className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                      aria-label="Delete word"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground">
        {words.length} {words.length === 1 ? "word" : "words"} in your bank
      </div>
    </div>
  );
}
