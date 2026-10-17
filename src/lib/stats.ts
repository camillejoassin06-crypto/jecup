import type { Attempt, Concept, MasteryState, Subject } from "@/types";
import { addDays, todayISO } from "./utils";
import { effectiveScore } from "@/engine/memoryAgent";

export function subjectProgress(subject: Subject, concepts: Concept[], mastery: Record<string, MasteryState>, today = todayISO()) {
  const own = concepts.filter((c) => c.subjectId === subject.id);
  if (!own.length) return { count: 0, avg: 0, fragile: 0, studied: 0 };
  const scores = own.map((c) => effectiveScore(mastery[c.id], today));
  return {
    count: own.length,
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / own.length),
    fragile: own.filter((c) => mastery[c.id]?.attempts && effectiveScore(mastery[c.id], today) < 50).length,
    studied: own.filter((c) => mastery[c.id]?.attempts).length,
  };
}

export function weeklyStats(attempts: Attempt[], today = todayISO()) {
  const from = addDays(today, -6);
  const week = attempts.filter((a) => a.at.slice(0, 10) >= from);
  const minutes = Math.round(week.reduce((t, a) => t + Math.min(a.responseMs, 90_000) + 15_000, 0) / 60000);
  const rate = week.length ? Math.round((week.filter((a) => a.correct).length / week.length) * 100) : null;
  const allRate = attempts.length ? Math.round((attempts.filter((a) => a.correct).length / attempts.length) * 100) : null;
  const perDay = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(from, i);
    return { date: d, count: week.filter((a) => a.at.slice(0, 10) === d).length };
  });
  return { minutes, rate: rate ?? allRate, questions: week.length, perDay };
}
