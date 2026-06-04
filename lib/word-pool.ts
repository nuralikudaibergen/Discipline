import type { Word } from "./types";

/**
 * Built-in English→Russian seed pool. ~50 common vocabulary words so the
 * Gatekeeper always has something to draw from. Exported here so it can be
 * used as a *fallback* when the user's bank doesn't have 10 entries yet —
 * the user is never stuck waiting to type 10 words by hand.
 */
export const SEED_WORDS: Omit<Word, "id" | "createdAt" | "userAdded">[] = [
  { en: "serendipity", ru: "счастливая случайность" },
  { en: "ephemeral", ru: "мимолётный" },
  { en: "resilient", ru: "стойкий, устойчивый" },
  { en: "meticulous", ru: "скрупулёзный" },
  { en: "eloquent", ru: "красноречивый" },
  { en: "ambivalent", ru: "противоречивый" },
  { en: "pristine", ru: "безупречный" },
  { en: "nuance", ru: "нюанс" },
  { en: "candid", ru: "искренний" },
  { en: "diligent", ru: "усердный" },
  { en: "vivid", ru: "яркий" },
  { en: "arduous", ru: "трудный, тяжёлый" },
  { en: "lucid", ru: "ясный, понятный" },
  { en: "obsolete", ru: "устаревший" },
  { en: "profound", ru: "глубокий" },
  { en: "subtle", ru: "тонкий, неуловимый" },
  { en: "tenacious", ru: "упорный" },
  { en: "ubiquitous", ru: "повсеместный" },
  { en: "whimsical", ru: "причудливый" },
  { en: "zealous", ru: "ревностный" },
  { en: "audacious", ru: "дерзкий, смелый" },
  { en: "benevolent", ru: "благожелательный" },
  { en: "cogent", ru: "убедительный, веский" },
  { en: "debilitate", ru: "ослаблять" },
  { en: "ebullient", ru: "кипучий, жизнерадостный" },
  { en: "fastidious", ru: "придирчивый, щепетильный" },
  { en: "gregarious", ru: "общительный" },
  { en: "hackneyed", ru: "избитый, банальный" },
  { en: "imbibe", ru: "впитывать, усваивать" },
  { en: "juxtapose", ru: "сопоставлять" },
  { en: "kaleidoscopic", ru: "калейдоскопический" },
  { en: "languid", ru: "вялый, томный" },
  { en: "magnanimous", ru: "великодушный" },
  { en: "nonchalant", ru: "беспечный, невозмутимый" },
  { en: "obfuscate", ru: "затуманивать, затемнять" },
  { en: "pernicious", ru: "пагубный, вредный" },
  { en: "quixotic", ru: "донкихотский" },
  { en: "rancor", ru: "злоба, враждебность" },
  { en: "sagacious", ru: "мудрый, прозорливый" },
  { en: "truculent", ru: "свирепый, задиристый" },
  { en: "unfettered", ru: "раскрепощённый" },
  { en: "venerable", ru: "почтенный" },
  { en: "winsome", ru: "обаятельный, привлекательный" },
  { en: "xenial", ru: "гостеприимный" },
  { en: "yarn", ru: "рассказ, байка" },
  { en: "zestful", ru: "полный энтузиазма" },
  { en: "astute", ru: "проницательный" },
  { en: "brisk", ru: "бодрый, оживлённый" },
  { en: "candidly", ru: "откровенно" },
  { en: "dwindle", ru: "уменьшаться, сокращаться" },
  { en: "elucidate", ru: "разъяснять" },
];

/** Fisher–Yates in place. Returns the same array for chaining. */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick `n` words for today's Gatekeeper, drawing from the user's bank only.
 * Seed words are no longer mixed in — the user controls what they study.
 *
 * If the user has fewer than `n` words, we return whatever they have. The
 * Gatekeeper component renders an inline empty-state when the bank is
 * empty, so we don't have to special-case "0 words" here.
 */
export function pickDailyWords(userBank: Word[], n = 10): Word[] {
  const userPool = userBank
    .filter((w) => w.en && w.ru)
    .map((w) => ({
      id: w.id ?? `legacy-${w.en.toLowerCase()}`,
      en: w.en,
      ru: w.ru,
      createdAt: w.createdAt ?? 0,
      userAdded: true,
    }));

  const result: Word[] = [];
  const seen = new Set<string>();
  for (const w of shuffle([...userPool])) {
    if (result.length >= n) break;
    const key = w.en.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(w);
  }
  return result;
}
