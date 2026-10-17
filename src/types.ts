// Modèle de domaine JecUp (collège / lycée)

export type Cycle = "college" | "lycee";

export type LevelId =
  | "6e" | "5e" | "4e" | "3e"
  | "2nde" | "1re" | "tle"
  | "cap" | "2nde-pro" | "1re-pro" | "tle-pro";

export type Voie = "generale" | "technologique" | "professionnelle";

export type DisciplineId =
  | "francais" | "maths" | "histoire-geo" | "emc" | "svt" | "physique-chimie"
  | "langues" | "ses" | "philosophie" | "informatique" | "technologie"
  | "hggsp" | "hlp" | "eps" | "arts" | "generique";

/** Taxonomie simplifiée de Bloom utilisée pour classer chaque notion. */
export type BloomLevel = "memoriser" | "comprendre" | "appliquer" | "analyser";

export type ConceptKind =
  | "definition" | "date" | "formule" | "personne" | "oeuvre" | "propriete"
  | "theoreme" | "methode" | "evenement" | "vocabulaire" | "regle" | "processus"
  | "citation" | "concept";

export type DocType =
  | "cours" | "exercices" | "fiche" | "diaporama" | "controle" | "notes" | "manuel" | "td-tp";

export type EvalFormat =
  | "qcm" | "questions-cours" | "exercices" | "redaction" | "dissertation" | "commentaire"
  | "oral" | "problemes" | "tp" | "analyse-documents" | "croquis" | "mixte";

export type Goal =
  | "brevet" | "bac" | "moyenne" | "comprendre" | "organiser" | "retard" | "memoriser" | "orientation";

export interface StudentProfile {
  id: string;
  firstName: string;
  country: string;
  school?: string;
  level: LevelId;
  voie?: Voie;
  serieTechno?: string;
  specialites: string[];
  evalFormats: EvalFormat[];
  goals: Goal[];
  /** minutes disponibles par jour (0 = dimanche) */
  availability: number[];
  learningMode: boolean;
  isDemo?: boolean;
  demoKey?: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  discipline: DisciplineId;
  color: string;
  /** coefficient / importance ressentie (1–5) */
  weight: number;
  folders: string[];
}

export interface DocChunk {
  id: string;
  index: number;
  page: number;
  section: string;
  text: string;
}

export interface CourseDocument {
  id: string;
  subjectId: string;
  title: string;
  folder: string;
  source: "texte" | "pdf" | "photo" | "demo";
  rawText: string;
  docType: DocType;
  discipline: DisciplineId;
  disciplineConfidence: number;
  complexity: 1 | 2 | 3;
  summary: string;
  sections: { title: string; level: number }[];
  chunks: DocChunk[];
  tags: string[];
  favorite: boolean;
  createdAt: string;
}

export interface Concept {
  id: string;
  documentId: string;
  subjectId: string;
  label: string;
  /** définition, valeur, explication courte, issue du cours */
  detail: string;
  kind: ConceptKind;
  bloom: BloomLevel[];
  chunkId: string;
  /** extrait source exact */
  sourceExcerpt: string;
}

export type QuestionType = "qcm" | "vrai-faux" | "trous" | "date" | "association";

export interface Question {
  id: string;
  conceptId: string;
  type: QuestionType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prompt: string;
  choices?: string[];
  answer: string;
  explanation: string;
  method?: string[];
  variant: number;
}

export interface Attempt {
  id: string;
  questionId: string;
  conceptId: string;
  correct: boolean;
  difficulty: number;
  responseMs: number;
  at: string;
}

export type MasteryLevel = "non-decouverte" | "fragile" | "en-progression" | "acquise" | "maitrisee";

export interface MasteryState {
  conceptId: string;
  score: number;
  attempts: number;
  correct: number;
  streak: number;
  lapses: number;
  /** jours avant prochaine révision */
  interval: number;
  ease: number;
  lastReviewed?: string;
  nextReview?: string;
}

export type EventKind = "cours" | "controle" | "examen" | "revision" | "devoirs" | "projet" | "activite" | "rdv";

export interface PlannerEvent {
  id: string;
  kind: EventKind;
  title: string;
  subjectId?: string;
  date: string; // ISO yyyy-mm-dd
  start?: string; // HH:mm
  durationMin: number;
  status: "prevu" | "fait" | "manque";
  conceptIds?: string[];
  generated?: boolean;
  /** pour les examens : type d'évaluation */
  examFormat?: EvalFormat;
}

export type TaskKind = "devoirs" | "exposé" | "révision" | "lecture" | "exercices" | "projet" | "autre";

export interface Task {
  id: string;
  title: string;
  subjectId?: string;
  due?: string;
  kind: TaskKind;
  estimatedMin: number;
  done: boolean;
  createdAt: string;
}

export interface ChatSource {
  documentId: string;
  chunkId: string;
  page: number;
  excerpt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: AssistantMode;
  sources?: ChatSource[];
  general?: string;
  at: string;
}

export type AssistantMode = "mes-cours" | "comprendre" | "reviser" | "coach";
