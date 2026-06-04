/**
 * Translate EN → RU. Free, no-key endpoint from MyMemory.
 * Docs: https://mymemory.translated.net/doc/spec.php
 *
 * We rate-limit calls (300ms) to be polite. The result is reported as a
 * tagged union so the UI can distinguish "translation came back empty / same
 * as input" from "network failed" — both used to silently store the source
 * word as a "translation", which corrupted the user's bank.
 */
const ENDPOINT = "https://api.mymemory.translated.net/get";
const cache = new Map<string, string>();
let lastCall = 0;

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type TranslateResult =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "network" | "http" };

export async function translateEnToRu(text: string): Promise<TranslateResult> {
  const cleaned = text.trim().toLowerCase();
  if (!cleaned) return { ok: false, reason: "empty" };

  if (cache.has(cleaned)) {
    const cached = cache.get(cleaned)!;
    return { ok: true, text: cached };
  }

  // simple client-side throttle
  const now = Date.now();
  const delta = now - lastCall;
  if (delta < 300) await wait(300 - delta);
  lastCall = Date.now();

  try {
    const url = `${ENDPOINT}?q=${encodeURIComponent(cleaned)}&langpair=en|ru`;
    const res = await fetch(url);
    if (!res.ok) return { ok: false, reason: "http" };
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
    };
    const translated = data?.responseData?.translatedText?.trim();
    if (!translated) return { ok: false, reason: "empty" };
    cache.set(cleaned, translated);
    return { ok: true, text: translated };
  } catch {
    return { ok: false, reason: "network" };
  }
}
