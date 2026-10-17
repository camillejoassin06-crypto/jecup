// JEC'UP Quiz Agent : génère des questions variées et une session adaptative.
import { DISCIPLINES } from "@/data/academic";
import type { Concept, DisciplineId, MasteryState, Question, QuestionType } from "@/types";
import { clamp, shuffle, uid } from "@/lib/utils";
import { answersMatch, normalize, truncate } from "./text";

type Difficulty = Question["difficulty"];

const short = (s: string, n = 140) => truncate(s.replace(/\s+/g, " "), n);

function pickDistractors(concept: Concept, pool: Concept[], n: number, field: "label" | "detail") {
  const same = pool.filter((c) => c.id !== concept.id && c.kind === concept.kind);
  const other = pool.filter((c) => c.id !== concept.id && c.kind !== concept.kind);
  const target = normalize(concept[field]);
  const values: string[] = [];
  for (const c of [...shuffle(same), ...shuffle(other)]) {
    const v = field === "detail" ? stripLabel(c.detail, c.label) : c.label;
    const nv = normalize(v);
    if (nv === target || values.some((x) => normalize(x) === nv)) continue;
    values.push(v);
    if (values.length >= n) break;
  }
  return values;
}

function yearDistractors(year: number, difficulty: Difficulty, n: number) {
  const spread = difficulty >= 4 ? [1, 2, 3, 5] : difficulty === 3 ? [3, 5, 10, 12] : [10, 20, 30, 50];
  const set = new Set<number>();
  for (const d of shuffle(spread)) {
    set.add(year + (Math.random() < 0.5 ? -d : d));
    if (set.size >= n) break;
  }
  return [...set].map(String);
}

function blankFormula(formula: string): { prompt: string; answer: string } | null {
  const [lhs, rhs] = formula.split("=").map((s) => s.trim());
  if (!lhs || !rhs) return null;
  const symbols = rhs.match(/[A-Za-zΔ][A-Za-z0-9_²³]*/g)?.filter((s) => s.length <= 4) ?? [];
  if (!symbols.length) return { prompt: `… = ${rhs}`, answer: lhs };
  const s = symbols[Math.floor(Math.random() * symbols.length)];
  return { prompt: `${lhs} = ${rhs.replace(s, "…")}`, answer: s };
}

function methodFor(concept: Concept, discipline: DisciplineId): string[] | undefined {
  const hint = DISCIPLINES[discipline].methodHint;
  if (concept.kind === "formule") {
    return [
      "Repère les grandeurs connues et celle que tu cherches.",
      `Rappelle la relation du cours : ${concept.detail}.`,
      "Vérifie les unités et convertis si nécessaire.",
      "Remplace par les valeurs puis calcule.",
      "Contrôle l'ordre de grandeur du résultat.",
    ];
  }
  if (["theoreme", "propriete", "regle", "methode"].includes(concept.kind)) {
    return [
      "Vérifie que les conditions d'application sont réunies.",
      `Énonce ce que dit le cours : ${short(concept.detail, 160)}`,
      "Applique-le aux données de l'exercice, étape par étape.",
      "Rédige une phrase de conclusion qui répond à la question.",
    ];
  }
  return hint ? [hint] : undefined;
}

/** Choisit le type de question selon la nature de la notion, la matière et la difficulté. */
function chooseType(concept: Concept, discipline: DisciplineId, difficulty: Difficulty, variant: number): QuestionType {
  const allowed = DISCIPLINES[discipline].questionTypes;
  if (concept.kind === "date" || concept.kind === "evenement") return difficulty >= 5 ? "trous" : "date";
  if (concept.kind === "formule") return difficulty >= 3 ? "trous" : "qcm";
  if (concept.kind === "vocabulaire") return difficulty >= 4 ? "trous" : variant % 2 ? "association" : "qcm";
  if (difficulty <= 1) return "vrai-faux";
  if (difficulty >= 5 && concept.label.length < 40) return "trous";
  const rotation: QuestionType[] = ["qcm", "association", "vrai-faux", "qcm"];
  const t = rotation[variant % rotation.length];
  return allowed.includes(t) ? t : "qcm";
}

export function generateQuestion(
  concept: Concept,
  pool: Concept[],
  discipline: DisciplineId,
  difficulty: Difficulty,
  variant = 0,
  allowedTypes?: QuestionType[],
): Question {
  let type = chooseType(concept, discipline, difficulty, variant);
  if (allowedTypes?.length && !allowedTypes.includes(type)) {
    const isDate = concept.kind === "date" || concept.kind === "evenement";
    const compatible = allowedTypes.filter((t) => t !== "date" || isDate);
    type = compatible.length ? compatible[variant % compatible.length] : type;
  }
  const nChoices = difficulty <= 2 ? 3 : 4;
  const base = {
    id: uid("q_"),
    conceptId: concept.id,
    difficulty,
    variant,
    explanation: `D'après ton cours : « ${short(concept.sourceExcerpt, 220)} »`,
    method: methodFor(concept, discipline),
  };

  if (type === "date") {
    const year = Number(concept.detail.match(/\d{3,4}/)?.[0]);
    if (year) {
      const answer = String(year);
      const prompt = variant % 2
        ? `Quelle date associes-tu à : « ${short(concept.label)} » ?`
        : `En quelle année : ${short(concept.label)} ?`;
      return { ...base, type, prompt, answer, choices: shuffle([answer, ...yearDistractors(year, difficulty, nChoices - 1)]) };
    }
  }

  if (type === "trous") {
    if (concept.kind === "formule") {
      const b = blankFormula(concept.detail.includes("=") ? concept.detail : concept.label);
      if (b) return { ...base, type, prompt: `Complète la formule : ${b.prompt}`, answer: b.answer };
    }
    if (concept.kind === "date" || concept.kind === "evenement") {
      const year = concept.detail.match(/\d{3,4}/)?.[0];
      if (year) return { ...base, type, prompt: `Sans aide : en quelle année — ${short(concept.label)} ?`, answer: year };
    }
    if (concept.kind === "vocabulaire") {
      return { ...base, type, prompt: `Traduis ou donne le sens de : « ${concept.label} »`, answer: concept.detail };
    }
    const masked = maskLabel(concept);
    if (masked) return { ...base, type, prompt: `Complète : ${masked}`, answer: concept.label };
  }

  if (type === "vrai-faux") {
    const truthy = Math.random() < 0.5;
    const wrong = pickDistractors(concept, pool, 1, "detail")[0];
    const shown = truthy || !wrong ? stripLabel(concept.detail, concept.label) : wrong;
    return {
      ...base,
      type,
      prompt: `Vrai ou faux ? « ${concept.label} » : ${short(shown, 200)}`,
      answer: truthy || !wrong ? "Vrai" : "Faux",
      choices: ["Vrai", "Faux"],
    };
  }

  // association (notion → détail) et QCM (détail → notion), en alternant le sens selon la variante
  const reverse = type === "association" ? false : variant % 2 === 1 || difficulty >= 4;
  if (!reverse) {
    const distract = pickDistractors(concept, pool, nChoices - 1, "detail");
    if (distract.length >= 1) {
      const prompt =
        concept.kind === "personne" || concept.kind === "oeuvre"
          ? `Qu'associes-tu à « ${concept.label} » ?`
          : concept.kind === "vocabulaire"
            ? `Que signifie « ${concept.label} » ?`
            : `Que désigne « ${concept.label} » ?`;
      return {
        ...base,
        type: type === "association" ? "association" : "qcm",
        prompt,
        answer: short(stripLabel(concept.detail, concept.label), 160),
        choices: shuffle([stripLabel(concept.detail, concept.label), ...distract].map((d) => short(d, 160))),
      };
    }
  }
  const distract = pickDistractors(concept, pool, nChoices - 1, "label");
  return {
    ...base,
    type: "qcm",
    prompt: `Quelle notion correspond à : « ${short(stripLabel(concept.detail, concept.label), 200)} » ?`,
    answer: concept.label,
    choices: shuffle([concept.label, ...distract]),
  };
}

/** Retire la notion de sa propre définition pour ne pas donner la réponse. */
function stripLabel(detail: string, label: string) {
  if (!label) return detail;
  const re = new RegExp(escapeRe(label), "i");
  const out = detail.replace(re, "…").replace(/^…\s*(désigne|est|sont|correspond à)\s*/i, "");
  return out.length > 6 ? out : detail;
}

function maskLabel(c: Concept) {
  if (c.kind !== "definition" && c.kind !== "concept" && c.kind !== "processus") return null;
  const re = new RegExp(escapeRe(c.label), "i");
  if (!re.test(c.detail) || c.detail.length < 20) {
    return `« ${short(c.detail, 200)} » — c'est la définition de : ……`;
  }
  return short(c.detail.replace(re, "……"), 220);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function checkAnswer(q: Question, given: string) {
  if (q.choices) return normalize(given) === normalize(q.answer);
  return answersMatch(given, q.answer);
}

// ───────────── Session adaptative ─────────────

export interface QuizSession {
  conceptIds: string[];
  difficulty: Difficulty;
  asked: number;
  max: number;
  /** notions ratées à reproposer avec une autre formulation */
  retry: { conceptId: string; after: number }[];
  history: { conceptId: string; correct: boolean; difficulty: number }[];
  variants: Record<string, number>;
  streakOk: number;
  streakKo: number;
  feedback?: string;
}

export function startSession(conceptIds: string[], difficulty: Difficulty = 2, max = 10): QuizSession {
  return {
    conceptIds,
    difficulty,
    asked: 0,
    max: Math.min(max, Math.max(5, conceptIds.length * 2)),
    retry: [],
    history: [],
    variants: {},
    streakOk: 0,
    streakKo: 0,
  };
}

/** Sélectionne la prochaine notion : d'abord les erreurs à retravailler, puis les plus fragiles. */
export function nextConceptId(s: QuizSession, mastery: Record<string, MasteryState>): string | null {
  if (s.asked >= s.max || !s.conceptIds.length) return null;
  const due = s.retry.find((r) => r.after <= s.asked);
  if (due) return due.conceptId;
  const askedCount = (id: string) => s.history.filter((h) => h.conceptId === id).length;
  const last = s.history[s.history.length - 1]?.conceptId;
  const ranked = [...s.conceptIds]
    .filter((id) => id !== last || s.conceptIds.length === 1)
    .sort((a, b) => askedCount(a) - askedCount(b) || (mastery[a]?.score ?? 0) - (mastery[b]?.score ?? 0) || Math.random() - 0.5);
  return ranked[0] ?? null;
}

export function applyResult(s: QuizSession, conceptId: string, correct: boolean): QuizSession {
  const next: QuizSession = { ...s, asked: s.asked + 1, history: [...s.history, { conceptId, correct, difficulty: s.difficulty }] };
  next.variants = { ...s.variants, [conceptId]: (s.variants[conceptId] ?? 0) + 1 };
  next.retry = s.retry.filter((r) => r.conceptId !== conceptId);
  next.feedback = undefined;
  if (correct) {
    next.streakOk = s.streakOk + 1;
    next.streakKo = 0;
    if (next.streakOk >= 2) {
      next.difficulty = clamp(s.difficulty + 1, 1, 5) as Difficulty;
      next.streakOk = 0;
      if (next.difficulty > s.difficulty) next.feedback = "Tu enchaînes : on monte d'un niveau.";
    }
  } else {
    next.streakKo = s.streakKo + 1;
    next.streakOk = 0;
    next.retry = [...next.retry, { conceptId, after: next.asked + 2 }];
    if (next.streakKo >= 2) {
      next.difficulty = 1;
      next.feedback = "On revient aux bases un moment, puis on remonte.";
    } else {
      next.difficulty = clamp(s.difficulty - 1, 1, 5) as Difficulty;
    }
    // laisse la place pour reproposer la notion ratée
    if (next.max - next.asked < 2 && next.max < 14) next.max += 1;
  }
  return next;
}

export const DIFFICULTY_LABEL: Record<number, string> = {
  1: "Découverte",
  2: "Révision",
  3: "Intermédiaire",
  4: "Difficile",
  5: "Niveau examen",
};
