// JEC'UP Document Agent : structure, découpage, résumé, type et complexité d'un cours.
import type { DocChunk, DocType } from "@/types";
import { uid } from "@/lib/utils";
import { normalize, splitSentences, tokenize } from "./text";

export interface DocumentAnalysis {
  sections: { title: string; level: number }[];
  chunks: DocChunk[];
  summary: string;
  docType: DocType;
  complexity: 1 | 2 | 3;
  tags: string[];
}

const PAGE_MARK = /^-{2,}\s*page\s*(\d+)\s*-{2,}$/i;

export function detectHeading(line: string): number | null {
  const l = line.trim();
  if (!l || l.length > 90) return null;
  if (/^#{1,3}\s/.test(l)) return l.match(/^#+/)![0].length;
  if (/^(chapitre|partie|thème|theme|séquence|leçon|lecon|unit|unité)\b/i.test(l)) return 1;
  if (/^(I{1,3}|IV|V|VI{0,3}|IX|X)[.)\-–]\s+\S/.test(l)) return 1;
  if (/^[A-H][.)]\s+\S/.test(l) && l.length < 70) return 2;
  if (/^\d+[.)]\s+[A-ZÀ-Ý]/.test(l) && l.length < 60 && !/[.;]$/.test(l)) return 2;
  if (l.length < 60 && l === l.toUpperCase() && /[A-ZÀ-Ý]{4}/.test(l)) return 1;
  return null;
}

export const cleanHeading = (l: string) =>
  l.replace(/^#+\s*/, "").replace(/^(I{1,3}|IV|V|VI{0,3}|IX|X|[A-H]|\d+)[.)\-–]\s+/, "").trim();

export function analyzeDocument(rawText: string, title: string): DocumentAnalysis {
  const lines = rawText.replace(/\r/g, "").split("\n");
  const sections: { title: string; level: number }[] = [];
  const chunks: DocChunk[] = [];
  let page = 1;
  let section = title;
  let buf: string[] = [];

  const flush = () => {
    const text = buf.join("\n").trim();
    buf = [];
    if (!text) return;
    // découpe les longs blocs en morceaux d'environ 700 caractères sur des frontières de phrase
    let piece = "";
    for (const s of splitSentences(text)) {
      if (piece.length + s.length > 700 && piece) {
        chunks.push({ id: uid("ch_"), index: chunks.length, page, section, text: piece.trim() });
        piece = "";
      }
      piece += (piece ? "\n" : "") + s;
    }
    if (piece.trim()) chunks.push({ id: uid("ch_"), index: chunks.length, page, section, text: piece.trim() });
  };

  for (const line of lines) {
    const pm = line.trim().match(PAGE_MARK);
    if (pm) {
      flush();
      page = Number(pm[1]);
      continue;
    }
    const h = detectHeading(line);
    if (h) {
      flush();
      section = cleanHeading(line);
      sections.push({ title: section, level: h });
      continue;
    }
    buf.push(line);
  }
  flush();

  return {
    sections,
    chunks,
    summary: summarize(rawText, sections),
    docType: detectDocType(rawText, title),
    complexity: estimateComplexity(rawText),
    tags: extractTags(rawText),
  };
}

/** Résumé extractif : phrases les plus représentatives, dans l'ordre du cours. */
export function summarize(text: string, sections: { title: string }[] = [], max = 4) {
  const sentences = splitSentences(text).filter(
    (s) => s.length > 40 && s.length < 320 && !detectHeading(s) && !PAGE_MARK.test(s),
  );
  if (!sentences.length) return "Document court : pas assez de texte pour un résumé.";
  const freq = new Map<string, number>();
  for (const t of tokenize(text)) freq.set(t, (freq.get(t) ?? 0) + 1);
  const scored = sentences.map((s, i) => {
    const toks = tokenize(s);
    const score =
      toks.reduce((acc, t) => acc + Math.log(1 + (freq.get(t) ?? 0)), 0) / Math.max(4, toks.length) +
      (/(est|sont|désigne|appelle|correspond|permet|signifie)/i.test(s) ? 0.4 : 0) +
      (i < 3 ? 0.3 : 0);
    return { s, i, score };
  });
  const top = scored.sort((a, b) => b.score - a.score).slice(0, max).sort((a, b) => a.i - b.i);
  const intro = sections.length ? `Ce cours aborde : ${sections.slice(0, 4).map((s) => s.title).join(", ")}. ` : "";
  return intro + top.map((t) => t.s.replace(/^[-•*]\s*/, "")).join(" ");
}

export function detectDocType(text: string, title: string): DocType {
  const t = normalize(title + " " + text.slice(0, 3000));
  const lines = text.split("\n").filter((l) => l.trim());
  const shortLines = lines.filter((l) => l.trim().length < 50).length / Math.max(1, lines.length);
  const exerciseHits = (t.match(/\bexercice|\bcalcule|\bjustifie|\bdemontre|\bresous|\bdetermine/g) ?? []).length;
  if (/\b(controle|devoir surveille|\bds\b|interrogation|bareme|\/20)\b/.test(t)) return "controle";
  if (/\b(tp|travaux pratiques|protocole|activite experimentale|materiel)\b/.test(t)) return "td-tp";
  if (exerciseHits >= 3) return "exercices";
  if (/\b(fiche|a retenir|l'essentiel|resume|memo)\b/.test(t)) return "fiche";
  if (shortLines > 0.75 && lines.length > 12) return "diaporama";
  if (/\b(manuel|doc(ument)? \d|page \d+ du manuel)\b/.test(t)) return "manuel";
  const lowercaseStarts = lines.filter((l) => /^[a-zà-ÿ]/.test(l.trim())).length / Math.max(1, lines.length);
  if (lowercaseStarts > 0.4) return "notes";
  return "cours";
}

export function estimateComplexity(text: string): 1 | 2 | 3 {
  const sentences = splitSentences(text);
  const words = text.split(/\s+/).filter(Boolean);
  const avgLen = words.length / Math.max(1, sentences.length);
  const longWords = words.filter((w) => w.length > 10).length / Math.max(1, words.length);
  const symbols = (text.match(/[=∑∫√≤≥→∀∃]/g) ?? []).length / Math.max(1, sentences.length);
  const score = avgLen / 12 + longWords * 8 + symbols;
  return score < 1.6 ? 1 : score < 2.4 ? 2 : 3;
}

function extractTags(text: string) {
  const freq = new Map<string, number>();
  const display = new Map<string, string>();
  for (const raw of text.split(/[^A-Za-zÀ-ÿ0-9'-]+/)) {
    if (raw.length < 5) continue;
    const [t] = tokenize(raw);
    if (!t) continue;
    freq.set(t, (freq.get(t) ?? 0) + 1);
    if (!display.has(t)) display.set(t, raw.toLowerCase());
  }
  return [...freq.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([t]) => display.get(t)!);
}
