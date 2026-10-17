// JecUp Academic Classifier : identifie la matière d'un document.
import { DISCIPLINES } from "@/data/academic";
import type { DisciplineId } from "@/types";
import { normalize } from "./text";

export interface Classification {
  discipline: DisciplineId;
  confidence: number;
  scores: { discipline: DisciplineId; score: number }[];
}

/**
 * Score par mots-clés pondérés par leur rareté. La matière du dossier choisi par l'élève
 * sert d'a priori : elle l'emporte sauf si le contenu pointe nettement ailleurs.
 */
export function classifyDiscipline(text: string, hint?: DisciplineId): Classification {
  const body = " " + normalize(text) + " ";
  const words = Math.max(50, body.split(" ").length);
  const scores = (Object.keys(DISCIPLINES) as DisciplineId[])
    .filter((d) => d !== "generique")
    .map((d) => {
      let score = 0;
      for (const kw of DISCIPLINES[d].keywords) {
        const k = normalize(kw);
        const re = new RegExp(`[^a-z0-9]${escapeRe(k)}`, "g");
        const hits = body.match(re)?.length ?? 0;
        if (hits) score += (1 + Math.log(hits)) * (k.includes(" ") ? 1.6 : 1);
      }
      return { discipline: d, score: (score * 100) / Math.sqrt(words) };
    })
    .sort((a, b) => b.score - a.score);

  if (hint && hint !== "generique") {
    const h = scores.find((s) => s.discipline === hint);
    if (h) h.score = h.score * 1.5 + 4;
    scores.sort((a, b) => b.score - a.score);
  }

  const [best, second] = scores;
  if (!best || best.score < 3) {
    return { discipline: hint ?? "generique", confidence: hint ? 0.6 : 0.3, scores };
  }
  const margin = second ? (best.score - second.score) / best.score : 1;
  const confidence = Math.min(0.98, 0.45 + margin * 0.5 + Math.min(best.score, 30) / 100);
  return { discipline: best.discipline, confidence: Math.round(confidence * 100) / 100, scores };
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
