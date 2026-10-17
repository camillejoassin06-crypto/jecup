// JEC'UP Planner Agent : planning de révisions personnalisé et réorganisation sans culpabiliser.
import type { Concept, MasteryState, PlannerEvent, StudentProfile, Subject, Task } from "@/types";
import { addDays, daysBetween, uid } from "@/lib/utils";
import { effectiveScore } from "./memoryAgent";

export const SESSION_DURATIONS = {
  flashcards: 15,
  qcm: 20,
  revisionCiblee: 25,
  lecture: 30,
  exercices: 45,
  examBlanc: 40,
} as const;

interface PlanInput {
  profile: StudentProfile;
  subjects: Subject[];
  concepts: Concept[];
  mastery: Record<string, MasteryState>;
  events: PlannerEvent[];
  tasks: Task[];
  today: string;
  horizon?: number;
  /** matières dont une session a été manquée : légère priorité en plus */
  boost?: string[];
}

interface SubjectState {
  subject: Subject;
  priority: number;
  examIn?: number;
  focus: string[];
  hasFormulas: boolean;
  hasDates: boolean;
}

export function nextExamFor(subjectId: string, events: PlannerEvent[], today: string) {
  return events
    .filter((e) => e.subjectId === subjectId && (e.kind === "controle" || e.kind === "examen") && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

function subjectStates(input: PlanInput): SubjectState[] {
  const { subjects, concepts, mastery, events, today, boost = [] } = input;
  return subjects.map((subject) => {
    const own = concepts.filter((c) => c.subjectId === subject.id);
    const fragile = own.filter((c) => mastery[c.id]?.attempts && effectiveScore(mastery[c.id], today) < 50);
    const due = own.filter((c) => mastery[c.id]?.nextReview && mastery[c.id].nextReview! <= today);
    const fresh = own.filter((c) => !mastery[c.id]?.attempts);
    const exam = nextExamFor(subject.id, events, today);
    const examIn = exam ? daysBetween(today, exam.date) : undefined;
    const urgency = examIn !== undefined && examIn <= 21 ? 1 + 10 / (examIn + 1) : 1;
    const workload = own.length ? 1 + fragile.length * 0.3 + due.length * 0.2 + Math.min(fresh.length, 10) * 0.08 : 0.4;
    const priority = subject.weight * urgency * workload * (boost.includes(subject.id) ? 1.3 : 1);
    const focus = [...fragile, ...due, ...fresh]
      .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
      .slice(0, 6)
      .map((c) => c.id);
    return {
      subject,
      priority,
      examIn,
      focus,
      hasFormulas: own.some((c) => c.kind === "formule" || c.kind === "theoreme" || c.kind === "propriete"),
      hasDates: own.filter((c) => c.kind === "date" || c.kind === "evenement").length >= 3,
    };
  });
}

function chooseSession(st: SubjectState, capacity: number, dayIndexToExam?: number) {
  const name = st.subject.name;
  if (dayIndexToExam === 1 && capacity >= SESSION_DURATIONS.examBlanc)
    return { title: `${name} — test niveau examen`, durationMin: SESSION_DURATIONS.examBlanc };
  if (st.hasFormulas && ["maths", "physique-chimie"].includes(st.subject.discipline) && capacity >= SESSION_DURATIONS.exercices)
    return { title: `${name} — exercices progressifs`, durationMin: SESSION_DURATIONS.exercices };
  if (st.subject.discipline === "langues") return { title: `${name} — flashcards vocabulaire`, durationMin: SESSION_DURATIONS.flashcards };
  if (st.hasDates) return { title: `${name} — QCM dates & repères`, durationMin: SESSION_DURATIONS.qcm };
  if (st.focus.length && capacity >= SESSION_DURATIONS.revisionCiblee)
    return { title: `${name} — révision ciblée`, durationMin: SESSION_DURATIONS.revisionCiblee };
  return { title: `${name} — QCM`, durationMin: SESSION_DURATIONS.qcm };
}

/** Génère les sessions de révision des prochains jours en respectant les disponibilités. */
export function generatePlan(input: PlanInput): PlannerEvent[] {
  const { profile, events, tasks, today, horizon = 7 } = input;
  const states = subjectStates(input).filter((s) => s.priority > 0);
  if (!states.length) return [];
  const out: PlannerEvent[] = [];

  for (let i = 0; i < horizon; i++) {
    const date = addDays(today, i);
    const dow = new Date(date + "T12:00:00").getDay();
    let capacity = profile.availability[dow] ?? 0;
    const fixed = events.filter((e) => e.date === date && !e.generated && ["revision", "devoirs", "projet"].includes(e.kind));
    capacity -= fixed.reduce((t, e) => t + e.durationMin, 0);
    const homework = tasks.filter((t) => !t.done && t.due && (t.due === addDays(date, 1) || t.due === date));
    capacity -= homework.reduce((t, x) => t + Math.round(x.estimatedMin / (x.due === date ? 1 : 2)), 0);

    // la priorité « refroidit » une fois une matière placée pour varier les journées
    const local = states.map((s) => ({ ...s, p: s.priority }));
    let guard = 0;
    while (capacity >= SESSION_DURATIONS.flashcards && guard++ < 4) {
      local.sort((a, b) => b.p - a.p);
      const st = local[0];
      if (st.p < 0.3) break;
      const toExam = st.examIn !== undefined ? st.examIn - i : undefined;
      if (toExam !== undefined && toExam < 0) {
        st.p *= 0.3;
        continue;
      }
      const s = chooseSession(st, capacity, toExam);
      if (s.durationMin > capacity) {
        st.p *= 0.5;
        continue;
      }
      out.push({
        id: uid("ev_"),
        kind: "revision",
        title: s.title,
        subjectId: st.subject.id,
        date,
        durationMin: s.durationMin,
        status: "prevu",
        conceptIds: st.focus,
        generated: true,
      });
      capacity -= s.durationMin;
      st.p *= 0.45;
    }
  }
  return out;
}

/** Sessions prévues passées non réalisées. */
export function missedSessions(events: PlannerEvent[], today: string) {
  return events.filter((e) => e.kind === "revision" && e.status !== "fait" && e.date < today);
}
