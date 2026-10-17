// Profils de démonstration multi-niveaux (sélectionnables uniquement en mode démo).
import type {
  Attempt, Concept, CourseDocument, DisciplineId, EvalFormat, Goal, LevelId, MasteryState,
  PlannerEvent, StudentProfile, Subject, Task, Voie,
} from "@/types";
import { addDays, todayISO, uid } from "@/lib/utils";
import { ingestDocument } from "@/engine/pipeline";
import { emptyMastery, updateMastery } from "@/engine/memoryAgent";
import { generatePlan } from "@/engine/plannerAgent";
import { BASE_FOLDERS, DISCIPLINES } from "./academic";
import * as C from "./demoCourses";

export interface DemoProfileDef {
  key: string;
  firstName: string;
  level: LevelId;
  voie?: Voie;
  tagline: string;
  avatar: string;
  specialites: string[];
  goals: Goal[];
  evalFormats: EvalFormat[];
  subjects: { name: string; discipline: DisciplineId; weight: number }[];
  docs: { subject: string; title: string; text: string; folder?: string }[];
  exams: { subject: string; title: string; inDays: number; kind: "controle" | "examen"; format?: EvalFormat }[];
  tasks: { title: string; subject?: string; inDays: number; kind: Task["kind"]; min: number; done?: boolean }[];
  /** niveau moyen simulé de l'élève (0–1) */
  skill: number;
}

export const DEMO_PROFILES: DemoProfileDef[] = [
  {
    key: "lea", firstName: "Léa", level: "3e", avatar: "🦊",
    tagline: "3e · prépare le brevet",
    specialites: [], goals: ["brevet", "organiser"], evalFormats: ["questions-cours", "exercices", "analyse-documents"],
    subjects: [
      { name: "Histoire-Géographie", discipline: "histoire-geo", weight: 4 },
      { name: "Mathématiques", discipline: "maths", weight: 5 },
      { name: "Français", discipline: "francais", weight: 5 },
      { name: "SVT", discipline: "svt", weight: 3 },
      { name: "Anglais", discipline: "langues", weight: 3 },
    ],
    docs: [
      { subject: "Histoire-Géographie", title: "La Première Guerre mondiale", text: C.COURSE_WW1, folder: "Histoire" },
      { subject: "Mathématiques", title: "Théorème de Pythagore et trigonométrie", text: C.COURSE_PYTHAGORE, folder: "Leçons" },
    ],
    exams: [
      { subject: "Histoire-Géographie", title: "Brevet blanc d'histoire", inDays: 9, kind: "examen", format: "questions-cours" },
      { subject: "Mathématiques", title: "Contrôle Pythagore", inDays: 3, kind: "controle", format: "exercices" },
    ],
    tasks: [
      { title: "Exercices 12 à 15 page 182", subject: "Mathématiques", inDays: 1, kind: "devoirs", min: 40 },
      { title: "Apprendre les repères chronologiques", subject: "Histoire-Géographie", inDays: 4, kind: "révision", min: 25 },
      { title: "Lire le chapitre 3 du roman", subject: "Français", inDays: 6, kind: "lecture", min: 45 },
      { title: "Fiche de vocabulaire unit 2", subject: "Anglais", inDays: -1, kind: "révision", min: 20, done: true },
    ],
    skill: 0.62,
  },
  {
    key: "emma", firstName: "Emma", level: "2nde", avatar: "🐧",
    tagline: "Seconde · veut améliorer sa moyenne",
    specialites: [], goals: ["moyenne", "memoriser"], evalFormats: ["qcm", "questions-cours", "analyse-documents"],
    subjects: [
      { name: "SES", discipline: "ses", weight: 3 },
      { name: "Anglais", discipline: "langues", weight: 3 },
      { name: "Mathématiques", discipline: "maths", weight: 5 },
      { name: "Physique-Chimie", discipline: "physique-chimie", weight: 4 },
      { name: "Français", discipline: "francais", weight: 4 },
    ],
    docs: [
      { subject: "SES", title: "Le marché concurrentiel", text: C.COURSE_MARCHE, folder: "Économie" },
      { subject: "Anglais", title: "Unit 3 — Travelling abroad", text: C.COURSE_ENGLISH, folder: "Vocabulaire" },
    ],
    exams: [
      { subject: "SES", title: "Interro SES", inDays: 5, kind: "controle", format: "qcm" },
      { subject: "Anglais", title: "Test de vocabulaire", inDays: 2, kind: "controle", format: "qcm" },
    ],
    tasks: [
      { title: "Fiche sur l'offre et la demande", subject: "SES", inDays: 3, kind: "révision", min: 30 },
      { title: "Exposé sur un pays anglophone", subject: "Anglais", inDays: 8, kind: "exposé", min: 90 },
    ],
    skill: 0.55,
  },
  {
    key: "lucas", firstName: "Lucas", level: "1re", voie: "generale", avatar: "🦉",
    tagline: "Première · spés SVT, Maths, Physique-Chimie",
    specialites: ["SVT", "Mathématiques", "Physique-Chimie"], goals: ["bac", "comprendre"], evalFormats: ["exercices", "questions-cours", "problemes"],
    subjects: [
      { name: "SVT", discipline: "svt", weight: 5 },
      { name: "Mathématiques", discipline: "maths", weight: 5 },
      { name: "Physique-Chimie", discipline: "physique-chimie", weight: 5 },
      { name: "Français", discipline: "francais", weight: 4 },
      { name: "Histoire-Géographie", discipline: "histoire-geo", weight: 3 },
    ],
    docs: [
      { subject: "SVT", title: "Réplication de l'ADN et mitose", text: C.COURSE_ADN, folder: "Chapitres" },
      { subject: "Mathématiques", title: "Dérivation", text: C.COURSE_DERIVATION, folder: "Leçons" },
    ],
    exams: [
      { subject: "SVT", title: "DS de SVT", inDays: 6, kind: "controle", format: "questions-cours" },
      { subject: "Mathématiques", title: "DS dérivation", inDays: 11, kind: "controle", format: "exercices" },
    ],
    tasks: [
      { title: "Schéma bilan de la mitose", subject: "SVT", inDays: 2, kind: "devoirs", min: 30 },
      { title: "DM de maths : étude de fonction", subject: "Mathématiques", inDays: 4, kind: "devoirs", min: 60 },
    ],
    skill: 0.58,
  },
  {
    key: "ines", firstName: "Inès", level: "tle", voie: "generale", avatar: "🐱",
    tagline: "Terminale · spés HGGSP et SES",
    specialites: ["HGGSP", "SES"], goals: ["bac", "orientation"], evalFormats: ["dissertation", "analyse-documents", "oral"],
    subjects: [
      { name: "Philosophie", discipline: "philosophie", weight: 4 },
      { name: "Histoire-Géographie", discipline: "histoire-geo", weight: 3 },
      { name: "HGGSP", discipline: "hggsp", weight: 5 },
      { name: "SES", discipline: "ses", weight: 5 },
      { name: "Anglais", discipline: "langues", weight: 3 },
    ],
    docs: [
      { subject: "Philosophie", title: "La conscience", text: C.COURSE_CONSCIENCE, folder: "Notions" },
      { subject: "Histoire-Géographie", title: "La guerre froide", text: C.COURSE_GUERRE_FROIDE, folder: "Histoire" },
    ],
    exams: [
      { subject: "Philosophie", title: "Bac blanc de philosophie", inDays: 12, kind: "examen", format: "dissertation" },
      { subject: "Histoire-Géographie", title: "Contrôle guerre froide", inDays: 4, kind: "controle", format: "questions-cours" },
    ],
    tasks: [
      { title: "Préparer le Grand oral : choisir mes 2 questions", subject: "HGGSP", inDays: 10, kind: "exposé", min: 60 },
      { title: "Vœux Parcoursup : comparer 3 formations", inDays: 7, kind: "autre", min: 45 },
      { title: "Plan de dissertation sur la conscience", subject: "Philosophie", inDays: 5, kind: "devoirs", min: 50 },
    ],
    skill: 0.66,
  },
  {
    key: "thomas", firstName: "Thomas", level: "1re", voie: "generale", avatar: "🐼",
    tagline: "Première · spés NSI, Maths, SES",
    specialites: ["NSI", "Mathématiques", "SES"], goals: ["moyenne", "organiser"], evalFormats: ["exercices", "qcm", "tp"],
    subjects: [
      { name: "NSI", discipline: "informatique", weight: 5 },
      { name: "Mathématiques", discipline: "maths", weight: 5 },
      { name: "SES", discipline: "ses", weight: 4 },
      { name: "Français", discipline: "francais", weight: 4 },
    ],
    docs: [
      { subject: "NSI", title: "Algorithmes de tri", text: C.COURSE_TRIS, folder: "Algorithmes" },
      { subject: "NSI", title: "Représentation des entiers en binaire", text: C.COURSE_BINAIRE, folder: "Cours" },
    ],
    exams: [
      { subject: "NSI", title: "Évaluation algorithmes de tri", inDays: 4, kind: "controle", format: "qcm" },
    ],
    tasks: [
      { title: "Projet Python : jeu du pendu", subject: "NSI", inDays: 9, kind: "projet", min: 120 },
      { title: "Commentaire de texte à rédiger", subject: "Français", inDays: -1, kind: "devoirs", min: 60 },
    ],
    skill: 0.5,
  },
];

const PALETTE_FALLBACK = ["#1c7ed6", "#e8590c", "#2f9e44", "#a61e4d", "#7048e8", "#0b7285"];

export interface AppData {
  profile: StudentProfile;
  subjects: Subject[];
  documents: CourseDocument[];
  concepts: Concept[];
  attempts: Attempt[];
  mastery: Record<string, MasteryState>;
  events: PlannerEvent[];
  tasks: Task[];
}

/** Générateur pseudo-aléatoire déterministe pour des démos reproductibles. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function buildDemo(key: string, today = todayISO()): AppData {
  const def = DEMO_PROFILES.find((p) => p.key === key) ?? DEMO_PROFILES[0];
  const rand = rng(key.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 97);

  const profile: StudentProfile = {
    id: uid("p_"),
    firstName: def.firstName,
    country: "France",
    level: def.level,
    voie: def.voie,
    specialites: def.specialites,
    evalFormats: def.evalFormats,
    goals: def.goals,
    availability: [90, 45, 60, 90, 45, 60, 120],
    learningMode: true,
    isDemo: true,
    demoKey: def.key,
    createdAt: new Date().toISOString(),
  };

  const subjects: Subject[] = def.subjects.map((s, i) => ({
    id: uid("s_"),
    name: s.name,
    discipline: s.discipline,
    color: DISCIPLINES[s.discipline]?.color ?? PALETTE_FALLBACK[i % PALETTE_FALLBACK.length],
    weight: s.weight,
    folders: [...new Set([...BASE_FOLDERS, ...DISCIPLINES[s.discipline].folders])],
  }));
  const sid = (name?: string) => subjects.find((s) => s.name === name)?.id;

  const documents: CourseDocument[] = [];
  const concepts: Concept[] = [];
  def.docs.forEach((d, i) => {
    const subject = subjects.find((s) => s.name === d.subject)!;
    const { document, concepts: cs } = ingestDocument({
      title: d.title,
      subjectId: subject.id,
      subjectDiscipline: subject.discipline,
      rawText: d.text,
      source: "demo",
      folder: d.folder,
    });
    document.createdAt = new Date(Date.now() - (i + 2) * 86_400_000).toISOString();
    documents.push(document);
    concepts.push(...cs);
  });

  // historique de révision simulé : chaque notion a une « facilité » propre
  const attempts: Attempt[] = [];
  const mastery: Record<string, MasteryState> = {};
  concepts.forEach((c, idx) => {
    if (idx % 6 === 5) return; // quelques notions jamais révisées
    const ease = Math.min(0.95, Math.max(0.15, def.skill + (rand() - 0.5) * 0.7));
    const sessions = 2 + Math.floor(rand() * 3);
    let state = emptyMastery(c.id);
    let day = -9 + Math.floor(rand() * 3);
    for (let k = 0; k < sessions && day < 0; k++) {
      const correct = rand() < ease + k * 0.05;
      const at = new Date(addDays(today, day) + "T18:" + String(10 + k).padStart(2, "0") + ":00").toISOString();
      const a: Attempt = {
        id: uid("a_"),
        questionId: uid("q_"),
        conceptId: c.id,
        correct,
        difficulty: 2 + Math.floor(rand() * 2),
        responseMs: 5000 + Math.floor(rand() * 20000),
        at,
      };
      state = updateMastery(state, a, attempts);
      attempts.push(a);
      day += 1 + Math.floor(rand() * 3);
    }
    mastery[c.id] = state;
  });

  const events: PlannerEvent[] = def.exams.map((e) => ({
    id: uid("ev_"),
    kind: e.kind,
    title: e.title,
    subjectId: sid(e.subject),
    date: addDays(today, e.inDays),
    start: "08:00",
    durationMin: e.kind === "examen" ? 120 : 55,
    status: "prevu",
    examFormat: e.format,
  }));
  // une session d'hier non réalisée, pour montrer la réorganisation bienveillante
  events.push({
    id: uid("ev_"),
    kind: "revision",
    title: `${subjects[0].name} — révision ciblée`,
    subjectId: subjects[0].id,
    date: addDays(today, -1),
    durationMin: 25,
    status: "prevu",
    generated: true,
  });

  const tasks: Task[] = def.tasks.map((t) => ({
    id: uid("t_"),
    title: t.title,
    subjectId: sid(t.subject),
    due: addDays(today, t.inDays),
    kind: t.kind,
    estimatedMin: t.min,
    done: !!t.done,
    createdAt: new Date().toISOString(),
  }));

  events.push(...generatePlan({ profile, subjects, concepts, mastery, events, tasks, today }));
  return { profile, subjects, documents, concepts, attempts, mastery, events, tasks };
}
