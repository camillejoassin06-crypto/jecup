// JecUp Memory Agent : Mastery Score (0–100) et répétition espacée adaptative.
import type { Attempt, MasteryLevel, MasteryState } from "@/types";
import { addDays, clamp, daysBetween, todayISO } from "@/lib/utils";

export const emptyMastery = (conceptId: string): MasteryState => ({
  conceptId,
  score: 0,
  attempts: 0,
  correct: 0,
  streak: 0,
  lapses: 0,
  interval: 0,
  ease: 2.3,
});

/**
 * Met à jour l'état de maîtrise après une réponse.
 * Le score combine : réussite récente, réussite différée (après ≥1 jour), capacité à réussir
 * des questions difficiles (application), erreurs répétées, temps de réponse, volume de révisions.
 */
export function updateMastery(prev: MasteryState, attempt: Attempt, history: Attempt[]): MasteryState {
  const today = attempt.at.slice(0, 10);
  const s: MasteryState = { ...prev, attempts: prev.attempts + 1 };
  const delayed = prev.lastReviewed ? daysBetween(prev.lastReviewed.slice(0, 10), today) >= 1 : false;

  if (attempt.correct) {
    s.correct = prev.correct + 1;
    s.streak = prev.streak + 1;
    // ne programme un intervalle long que si la réussite est différée
    const base = s.streak === 1 ? 1 : s.streak === 2 ? 3 : Math.round(Math.max(prev.interval, 1) * prev.ease);
    s.interval = delayed || s.streak <= 2 ? base : Math.max(prev.interval, 1);
    const speedBonus = attempt.responseMs < 8000 ? 0.05 : attempt.responseMs > 30000 ? -0.05 : 0;
    s.ease = clamp(prev.ease + 0.05 + (attempt.difficulty - 3) * 0.03 + speedBonus, 1.3, 3);
  } else {
    s.streak = 0;
    s.lapses = prev.lapses + (prev.correct > 0 ? 1 : 0);
    s.interval = 1;
    s.ease = clamp(prev.ease - 0.2, 1.3, 3);
  }
  s.lastReviewed = attempt.at;
  s.nextReview = addDays(today, Math.max(1, s.interval));
  s.score = computeScore(s, [...history, attempt]);
  return s;
}

export function computeScore(s: MasteryState, history: Attempt[]): number {
  const own = history.filter((a) => a.conceptId === s.conceptId).sort((a, b) => a.at.localeCompare(b.at));
  if (!own.length) return 0;
  // réussite pondérée : les réponses récentes comptent plus
  let w = 0, acc = 0;
  own.forEach((a, i) => {
    const weight = Math.pow(1.5, i);
    w += weight;
    acc += a.correct ? weight : 0;
  });
  const accuracy = acc / w;
  const days = new Set(own.filter((a) => a.correct).map((a) => a.at.slice(0, 10))).size;
  const delayedSuccess = Math.min(1, (days - 1) / 2); // réussites sur plusieurs jours
  const hardCorrect = own.filter((a) => a.correct && a.difficulty >= 3).length;
  const application = Math.min(1, hardCorrect / 2);
  const correctOnes = own.filter((a) => a.correct);
  const avgMs = correctOnes.reduce((t, a) => t + a.responseMs, 0) / Math.max(1, correctOnes.length);
  const speed = correctOnes.length ? clamp(1 - (avgMs - 6000) / 30000, 0, 1) : 0;
  const volume = Math.min(1, own.length / 6);

  let score =
    accuracy * 45 + Math.max(0, delayedSuccess) * 22 + application * 15 + volume * 10 + speed * 8 - s.lapses * 6;

  // garde-fous : jamais « maîtrisée » après une seule bonne réponse ou sans réussite différée
  if (s.correct <= 1) score = Math.min(score, 45);
  if (days < 2) score = Math.min(score, 72);
  if (!own[own.length - 1].correct) score = Math.min(score, 50);
  return Math.round(clamp(score, 0, 100));
}

/** Estimation de rétention : décroît quand la date de révision est dépassée. */
export function retention(s: MasteryState, today = todayISO()) {
  if (!s.lastReviewed || !s.attempts) return 0;
  const elapsed = daysBetween(s.lastReviewed.slice(0, 10), today);
  const stability = Math.max(1, s.interval) * 1.4;
  return Math.exp(-Math.max(0, elapsed - s.interval * 0.5) / stability);
}

export function effectiveScore(s: MasteryState | undefined, today = todayISO()) {
  if (!s || !s.attempts) return 0;
  return Math.round(s.score * (0.55 + 0.45 * retention(s, today)));
}

export function masteryLevel(score: number, attempts: number): MasteryLevel {
  if (!attempts) return "non-decouverte";
  if (score < 40) return "fragile";
  if (score < 65) return "en-progression";
  if (score < 85) return "acquise";
  return "maitrisee";
}

export const MASTERY_LABEL: Record<MasteryLevel, string> = {
  "non-decouverte": "Non découverte",
  fragile: "Fragile",
  "en-progression": "En progression",
  acquise: "Acquise",
  maitrisee: "Maîtrisée",
};

export const MASTERY_COLOR: Record<MasteryLevel, string> = {
  "non-decouverte": "bg-muted text-muted-foreground",
  fragile: "bg-destructive/15 text-destructive",
  "en-progression": "bg-warning/20 text-warning-foreground",
  acquise: "bg-primary/15 text-primary",
  maitrisee: "bg-success/20 text-success-foreground",
};

export type MemoryBucket = "aujourdhui" | "fragiles" | "acquises" | "oubliees" | "nouvelles";

/** Range chaque notion dans les catégories de « Ma mémoire ». */
export function memoryBuckets(conceptIds: string[], mastery: Record<string, MasteryState>, today = todayISO()) {
  const out: Record<MemoryBucket, string[]> = { aujourdhui: [], fragiles: [], acquises: [], oubliees: [], nouvelles: [] };
  for (const id of conceptIds) {
    const s = mastery[id];
    if (!s || !s.attempts) {
      out.nouvelles.push(id);
      continue;
    }
    const overdue = s.nextReview ? daysBetween(s.nextReview, today) : 0;
    const eff = effectiveScore(s, today);
    if (overdue > Math.max(2, s.interval)) out.oubliees.push(id);
    else if (overdue >= 0) out.aujourdhui.push(id);
    if (eff < 50) out.fragiles.push(id);
    else if (eff >= 65 && overdue < 0) out.acquises.push(id);
  }
  return out;
}

/** Notions à réviser en priorité (risque d'oubli décroissant). */
export function atRisk(conceptIds: string[], mastery: Record<string, MasteryState>, today = todayISO()) {
  return conceptIds
    .filter((id) => mastery[id]?.attempts)
    .map((id) => ({ id, r: retention(mastery[id], today), eff: effectiveScore(mastery[id], today) }))
    .filter((x) => x.r < 0.85 || x.eff < 50)
    .sort((a, b) => a.r + a.eff / 200 - (b.r + b.eff / 200))
    .map((x) => x.id);
}
