"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Sparkles, Languages, BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flashcard } from "@/components/flashcard";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Word } from "@/lib/types";

type Phase = "flashcards" | "quiz" | "done";
type Direction = "en-to-ru" | "ru-to-en";

interface QuizQuestion {
  prompt: string;
  correct: string;
  options: string[]; // multiple-choice option labels
  direction: Direction;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuiz(words: Word[]): QuizQuestion[] {
  return words.map((w) => {
    const direction: Direction = Math.random() < 0.5 ? "en-to-ru" : "ru-to-en";
    const prompt = direction === "en-to-ru" ? w.en : w.ru;
    const correct = direction === "en-to-ru" ? w.ru : w.en;
    const correctKey = normalizeAnswer(correct);

    // Distractors: pull from other words' answers, de-duplicated against the
    // correct answer and against each other. If the bank is too small to
    // produce 3 unique options, we render fewer buttons instead of repeating.
    const pool = words.filter((x) => x.id !== w.id);
    const seen = new Set<string>([correctKey]);
    const distractors: string[] = [];
    for (const x of shuffle(pool)) {
      const candidate = direction === "en-to-ru" ? x.ru : x.en;
      const key = normalizeAnswer(candidate);
      if (key.length === 0 || seen.has(key)) continue;
      seen.add(key);
      distractors.push(candidate);
      if (distractors.length === 3) break;
    }

    return {
      prompt,
      correct,
      options: shuffle([correct, ...distractors]),
      direction,
    };
  });
}

/**
 * Lowercase, trim, collapse whitespace, strip surrounding punctuation.
 * Used as the comparison key for typed answers and to dedupe distractors.
 */
function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'()\[\]]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Check whether the user's typed answer is acceptable. Strategy:
 *  1. Normalize both sides.
 *  2. Exact match → accept.
 *  3. For multi-variant answers (Russian with comma / slash / "или"), split
 *     on those separators and accept if any variant matches exactly.
 *  4. Reject everything else — substring fuzz was too generous in v1.
 */
function isTypedCorrect(expected: string, got: string): boolean {
  const e = normalizeAnswer(expected);
  const g = normalizeAnswer(got);
  if (!g) return false;
  if (e === g) return true;
  const variants = e
    .split(/[,\/]| или | or /)
    .map((v) => v.trim())
    .filter(Boolean);
  return variants.some((v) => v === g);
}

interface GatekeeperProps {
  words: Word[];
  onPass: (correct: number, total: number) => void;
  /** Optional CTA for the empty state — e.g. jump to the Vocabulary tab. */
  onJumpToWords?: () => void;
  /** Switches the app from the Gatekeeper screen to the Dashboard. */
  onOpenDashboard?: () => void;
}

export function Gatekeeper({ words, onPass, onJumpToWords, onOpenDashboard }: GatekeeperProps) {
  const [phase, setPhase] = useState<Phase>("flashcards");
  const [cardIndex, setCardIndex] = useState(0);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [typed, setTyped] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [doneInfo, setDoneInfo] = useState<{
    correct: number;
    total: number;
  } | null>(null);

  const total = words.length;
  const current = words[cardIndex];

  const flashcardProgress = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((cardIndex / total) * 100);
  }, [cardIndex, total]);

  const quizProgress = useMemo(() => {
    if (quiz.length === 0) return 0;
    return Math.round(((qIndex) / quiz.length) * 100);
  }, [qIndex, quiz.length]);

  const nextFlashcard = useCallback(() => {
    if (cardIndex + 1 >= total) {
      setQuiz(buildQuiz(words));
      setPhase("quiz");
      return;
    }
    setCardIndex((i) => i + 1);
  }, [cardIndex, total, words]);

  const submitMCQ = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    if (option === quiz[qIndex].correct) setCorrectCount((c) => c + 1);
  };

  const nextQuestion = () => {
    if (qIndex + 1 >= quiz.length) {
      const correct = correctCount;
      setDoneInfo({ correct, total: quiz.length });
      setPhase("done");
      return;
    }
    setQIndex((i) => i + 1);
    setSelected(null);
    setAnswered(false);
    setTyped("");
  };

  const submitTyped = () => {
    if (answered) return;
    setAnswered(true);
    if (isTypedCorrect(quiz[qIndex].correct, typed)) {
      setCorrectCount((c) => c + 1);
    }
  };

  if (words.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <Languages className="h-8 w-8 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No words in your bank</h2>
        <p className="text-sm text-muted-foreground">
          Add at least one English word to start the Gatekeeper. We&apos;ll
          auto-translate it to Russian for you as you type.
        </p>
        {onJumpToWords && (
          <Button onClick={onJumpToWords} className="mt-2">
            <BookOpenCheck className="h-4 w-4" />
            Open Vocabulary
          </Button>
        )}
      </div>
    );
  }

  // ----- Phase: Flashcards -----------------------------------------------
  if (phase === "flashcards") {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-2 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Gatekeeper · Morning Ritual
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Study {total} words before unlocking today
          </h1>
          <p className="text-sm text-muted-foreground">
            Flip each card, listen to the pronunciation, then take a quick quiz.
          </p>
        </header>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Card {Math.min(cardIndex + 1, total)} / {total}
            </span>
            <span>{flashcardProgress}%</span>
          </div>
          <Progress value={flashcardProgress} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Flashcard front={current.en} back={current.ru} />
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => setCardIndex((i) => Math.max(0, i - 1))}
            disabled={cardIndex === 0}
          >
            Previous
          </Button>
          <Button onClick={nextFlashcard}>
            {cardIndex + 1 >= total ? "Start the quiz" : "Next card"}
          </Button>
        </div>
      </div>
    );
  }

  // ----- Phase: Quiz ------------------------------------------------------
  if (phase === "quiz" && quiz[qIndex]) {
    const q = quiz[qIndex];
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-2 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <BookOpenCheck className="h-3.5 w-3.5" />
            Quiz
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Translate the words
          </h1>
        </header>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Question {qIndex + 1} / {quiz.length}
            </span>
            <span>Score: {correctCount}</span>
          </div>
          <Progress value={quizProgress} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {q.direction === "en-to-ru" ? "English → Russian" : "Russian → English"}
          </span>
          <div className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {q.prompt}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {q.options.map((opt) => {
            const isCorrect = opt === q.correct;
            const isPicked = selected === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => submitMCQ(opt)}
                disabled={answered}
                className={cn(
                  "group flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all",
                  "border-border bg-card hover:bg-accent",
                  answered && isCorrect && "border-emerald-500/60 bg-emerald-500/10",
                  answered && isPicked && !isCorrect && "border-rose-500/60 bg-rose-500/10",
                  answered && "cursor-default",
                )}
              >
                <span>{opt}</span>
                {answered && isCorrect && <Check className="h-4 w-4 text-emerald-500" />}
                {answered && isPicked && !isCorrect && (
                  <X className="h-4 w-4 text-rose-500" />
                )}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Or type it yourself
          </p>
          <div className="mt-2 flex gap-2">
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type your answer…"
              onKeyDown={(e) => {
                if (e.key === "Enter") submitTyped();
              }}
              disabled={answered}
            />
            <Button onClick={submitTyped} disabled={answered || !typed.trim()}>
              Check
            </Button>
          </div>
          {answered && (
            <p
              className={cn(
                "mt-2 text-xs",
                isTypedCorrect(q.correct, typed)
                  ? "text-emerald-500"
                  : "text-rose-400",
              )}
            >
              Correct answer: {q.correct}
            </p>
          )}
        </div>

        {answered && (
          <div className="flex justify-end">
            <Button onClick={nextQuestion}>
              {qIndex + 1 >= quiz.length ? "See results" : "Next question"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ----- Phase: Done ------------------------------------------------------
  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
        <Check className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">You&apos;re in</h2>
      {doneInfo && (
        <p className="text-sm text-muted-foreground">
          You scored {doneInfo.correct} / {doneInfo.total}. Your dashboard is
          unlocked for the rest of the day.
        </p>
      )}
      <Button
        onClick={() => {
          // Record the pass first so the streak / lastTestDate are persisted,
          // then switch the view to the Dashboard. Wrapping the two together
          // (instead of relying on `hasPassedToday` to flip the view
          // implicitly) is the only reason this button does anything visible
          // now that the Gatekeeper is the default screen.
          onPass(doneInfo?.correct ?? 0, doneInfo?.total ?? 0);
          onOpenDashboard?.();
        }}
      >
        Open dashboard
      </Button>
    </div>
  );
}
