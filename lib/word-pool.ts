import type { Word } from "./types";

/**
 * Built-in English→Russian seed pool. 100 common vocabulary words so the
 * Gatekeeper always has something to draw from. Exported here so it can be
 * used as a *fallback* when the user's bank doesn't have 10 entries yet —
 * the user is never stuck waiting to type 10 words by hand.
 */
export const SEED_WORDS: Omit<Word, "id" | "createdAt" | "userAdded">[] = [
  { en: "aberration", ru: "отклонение от нормы" },
  { en: "abhor", ru: "ненавидеть" },
  { en: "acquiesce", ru: "согласиться" },
  { en: "alacrity", ru: "готовность, энергичность" },
  { en: "amiable", ru: "дружелюбный" },
  { en: "appease", ru: "успокоить" },
  { en: "arcane", ru: "тайный, сложный" },
  { en: "avarice", ru: "жадность" },
  { en: "brazen", ru: "наглый" },
  { en: "brusque", ru: "резкий" },
  { en: "cajole", ru: "уговаривать лестью" },
  { en: "callous", ru: "бесчувственный" },
  { en: "candor", ru: "откровенность" },
  { en: "chide", ru: "ругать" },
  { en: "circumspect", ru: "осторожный" },
  { en: "clandestine", ru: "тайный" },
  { en: "coerce", ru: "принуждать" },
  { en: "coherent", ru: "связный" },
  { en: "complacency", ru: "самодовольство" },
  { en: "confidant", ru: "доверенное лицо" },
  { en: "connive", ru: "тайно сговориться" },
  { en: "cumulative", ru: "накопительный" },
  { en: "debase", ru: "унижать, ухудшать" },
  { en: "decry", ru: "осуждать" },
  { en: "deferential", ru: "почтительный" },
  { en: "demure", ru: "скромный" },
  { en: "deride", ru: "высмеивать" },
  { en: "despot", ru: "тиран" },
  { en: "diligent", ru: "усердный" },
  { en: "elated", ru: "очень радостный" },
  { en: "eloquent", ru: "красноречивый" },
  { en: "embezzle", ru: "присваивать деньги" },
  { en: "empathy", ru: "эмпатия" },
  { en: "enmity", ru: "вражда" },
  { en: "erudite", ru: "образованный" },
  { en: "extol", ru: "восхвалять" },
  { en: "fabricate", ru: "выдумывать" },
  { en: "feral", ru: "дикий" },
  { en: "flabbergasted", ru: "ошеломлённый" },
  { en: "forsake", ru: "покидать" },
  { en: "oblivious", ru: "не замечающий" },
  { en: "obsequious", ru: "подхалимский" },
  { en: "obtuse", ru: "тупой, непонятливый" },
  { en: "panacea", ru: "панацея" },
  { en: "parody", ru: "пародия" },
  { en: "penchant", ru: "склонность" },
  { en: "perusal", ru: "внимательное чтение" },
  { en: "plethora", ru: "избыток" },
  { en: "predilection", ru: "предпочтение" },
  { en: "quaint", ru: "старомодный, милый" },
  { en: "rash", ru: "опрометчивый" },
  { en: "refurbish", ru: "обновлять" },
  { en: "repudiate", ru: "отвергать" },
  { en: "rife", ru: "широко распространённый" },
  { en: "salient", ru: "важный, заметный" },
  { en: "serendipity", ru: "счастливая случайность" },
  { en: "staid", ru: "серьёзный, сдержанный" },
  { en: "superfluous", ru: "лишний" },
  { en: "sycophant", ru: "подхалим" },
  { en: "taciturn", ru: "молчаливый" },
  { en: "truculent", ru: "агрессивный" },
  { en: "umbrage", ru: "обида" },
  { en: "venerable", ru: "почтенный" },
  { en: "vex", ru: "раздражать" },
  { en: "vociferous", ru: "шумный, крикливый" },
  { en: "wanton", ru: "безрассудный" },
  { en: "zenith", ru: "вершина" },
  { en: "inveterate", ru: "закоренелый" },
  { en: "jubilant", ru: "ликующий" },
  { en: "knell", ru: "похоронный звон" },
  { en: "lithe", ru: "гибкий" },
  { en: "lurid", ru: "шокирующий" },
  { en: "maverick", ru: "независимый человек" },
  { en: "meticulous", ru: "педантичный" },
  { en: "modicum", ru: "небольшое количество" },
  { en: "morose", ru: "угрюмый" },
  { en: "myriad", ru: "множество" },
  { en: "nadir", ru: "низшая точка" },
  { en: "nominal", ru: "номинальный" },
  { en: "novice", ru: "новичок" },
  { en: "nuance", ru: "оттенок значения" },
  { en: "fractious", ru: "раздражительный" },
  { en: "furtive", ru: "скрытный" },
  { en: "gluttony", ru: "обжорство" },
  { en: "gratuitous", ru: "неоправданный" },
  { en: "haughty", ru: "высокомерный" },
  { en: "hypocrisy", ru: "лицемерие" },
  { en: "impeccable", ru: "безупречный" },
  { en: "impertinent", ru: "дерзкий" },
  { en: "implacable", ru: "непреклонный" },
  { en: "impudent", ru: "нахальный" },
  { en: "incisive", ru: "проницательный" },
  { en: "indolent", ru: "ленивый" },
  { en: "inept", ru: "неумелый" },
  { en: "infamy", ru: "дурная слава" },
  { en: "inhibit", ru: "сдерживать" },
  { en: "innate", ru: "врождённый" },
  { en: "insatiable", ru: "ненасытный" },
  { en: "insular", ru: "ограниченный, замкнутый" },
  { en: "intrepid", ru: "бесстрашный" },
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
