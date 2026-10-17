// JEC'UP Coach : une seule priorité du jour, concrète et justifiée.
import type { Concept, MasteryState, PlannerEvent, Subject, Task } from "@/types";
import { daysBetween, plural } from "@/lib/utils";
import { atRisk, effectiveScore } from "./memoryAgent";

export interface Priority {
  title: string;
  reason: string;
  durationMin: number;
  /** route + paramètres pour le bouton « Commencer » */
  to: string;
  tone: "exam" | "memory" | "task" | "start" | "new";
}

interface CoachInput {
  subjects: Subject[];
  concepts: Concept[];
  mastery: Record<string, MasteryState>;
  events: PlannerEvent[];
  tasks: Task[];
  today: string;
  availableMin?: number;
}

export function dailyPriority({ subjects, concepts, mastery, events, tasks, today, availableMin }: CoachInput): Priority {
  if (!concepts.length) {
    return {
      title: "Importe ton premier cours",
      reason: "Photographie ou colle une leçon : je repère les notions importantes et je te prépare des révisions adaptées.",
      durationMin: 5,
      to: "/import",
      tone: "start",
    };
  }
  const subjectName = (id?: string) => subjects.find((s) => s.id === id)?.name ?? "";
  // élision : « d'Anglais », « d'Histoire-Géographie », mais « de SVT »
  const deSubject = (id?: string) => {
    const n = subjectName(id);
    return /^[aeiouyhéèêàâîôû]/i.test(n) ? `d'${n}` : `de ${n}`;
  };

  // 1. Évaluation proche avec des notions fragiles
  const exams = events
    .filter((e) => (e.kind === "controle" || e.kind === "examen") && e.date >= today && daysBetween(today, e.date) <= 14)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const exam of exams) {
    const own = concepts.filter((c) => c.subjectId === exam.subjectId);
    const weak = own
      .filter((c) => effectiveScore(mastery[c.id], today) < 60)
      .sort((a, b) => effectiveScore(mastery[a.id], today) - effectiveScore(mastery[b.id], today));
    if (!weak.length) continue;
    const d = daysBetween(today, exam.date);
    const when = d === 0 ? "aujourd'hui" : d === 1 ? "demain" : `dans ${d} jours`;
    const named = weak.filter((c) => mastery[c.id]?.attempts).slice(0, 1)[0] ?? weak[0];
    const state = mastery[named.id]?.attempts ? "reste fragile" : "n'a pas encore été révisé(e)";
    const duration = Math.min(availableMin ?? 25, d <= 2 ? 30 : 25);
    return {
      title: `${exam.title} ${when}`,
      reason: `Ton évaluation ${deSubject(exam.subjectId)} est ${when}. « ${named.label} » ${state}${weak.length > 1 ? ` (et ${plural(weak.length - 1, "autre notion", "autres notions")})` : ""}. Je te recommande une session de ${duration} minutes.`,
      durationMin: duration,
      to: `/quiz?subject=${exam.subjectId}&focus=weak&difficulty=${d <= 2 ? 3 : 2}`,
      tone: "exam",
    };
  }

  // 2. Tâche en retard ou pour demain
  const urgent = tasks
    .filter((t) => !t.done && t.due && daysBetween(today, t.due) <= 1)
    .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""))[0];
  if (urgent) {
    const late = urgent.due! < today;
    return {
      title: urgent.title,
      reason: late
        ? "Cette tâche est en retard. Pas de panique : environ " + urgent.estimatedMin + " minutes suffisent pour avancer."
        : `À rendre ${urgent.due === today ? "aujourd'hui" : "demain"}. Compte environ ${urgent.estimatedMin} minutes.`,
      durationMin: urgent.estimatedMin,
      to: "/taches",
      tone: "task",
    };
  }

  // 3. Notions qui risquent d'être oubliées
  const risky = atRisk(concepts.map((c) => c.id), mastery, today);
  if (risky.length) {
    const c = concepts.find((x) => x.id === risky[0])!;
    return {
      title: "Réviser ce que tu risques d'oublier",
      reason: `${plural(risky.length, "notion")} ${risky.length > 1 ? "commencent" : "commence"} à s'effacer, dont « ${c.label} » en ${subjectName(c.subjectId)}. Une session de 15 minutes suffit à les consolider.`,
      durationMin: 15,
      to: "/quiz?focus=risk",
      tone: "memory",
    };
  }

  // 4. Découvrir des notions nouvelles
  const fresh = concepts.filter((c) => !mastery[c.id]?.attempts);
  if (fresh.length) {
    const sid = fresh[0].subjectId;
    return {
      title: `Découvrir de nouvelles notions en ${subjectName(sid)}`,
      reason: `${plural(fresh.filter((c) => c.subjectId === sid).length, "notion")} de ce cours n'${fresh.length > 1 ? "ont" : "a"} jamais été testée(s). Commençons en douceur.`,
      durationMin: 15,
      to: `/quiz?subject=${sid}&focus=new&difficulty=1`,
      tone: "new",
    };
  }
  return {
    title: "Tout est à jour 🎉",
    reason: "Tes notions sont solides. Une petite session niveau examen pour garder le rythme ?",
    durationMin: 15,
    to: "/quiz?difficulty=4",
    tone: "memory",
  };
}
