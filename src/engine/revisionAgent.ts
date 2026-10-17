// JecUp Revision Agent : choisit les formats de révision adaptés à un cours.
import { DISCIPLINES } from "@/data/academic";
import type { BloomLevel, Concept, DisciplineId } from "@/types";

export interface RevisionRecommendation {
  message: string;
  formats: string[];
  startDifficulty: 1 | 2 | 3;
  durationMin: number;
}

export function recommendRevision(concepts: Concept[], discipline: DisciplineId): RevisionRecommendation {
  const profile = DISCIPLINES[discipline];
  const count = (pred: (c: Concept) => boolean) => concepts.filter(pred).length;
  const dates = count((c) => c.kind === "date" || c.kind === "evenement");
  const formulas = count((c) => c.kind === "formule");
  const rules = count((c) => ["theoreme", "propriete", "regle", "methode"].includes(c.kind));
  const vocab = count((c) => c.kind === "vocabulaire");
  const people = count((c) => c.kind === "personne" || c.kind === "oeuvre" || c.kind === "citation");
  const bloom = (b: BloomLevel) => count((c) => c.bloom.includes(b));
  const n = Math.max(1, concepts.length);

  if (!concepts.length) {
    return {
      message: "Je n'ai pas encore trouvé de notions dans ce cours. Vérifie le texte importé ou ajoute des définitions claires (« Notion : définition »).",
      formats: profile.formats,
      startDifficulty: 1,
      durationMin: 10,
    };
  }
  if (dates / n > 0.3) {
    return {
      message: `Ce cours contient beaucoup de dates (${dates}). Je te propose une frise chronologique puis un test de mémorisation.`,
      formats: ["Chronologie", "Questions de dates", "QCM"],
      startDifficulty: 2,
      durationMin: 15,
    };
  }
  if (formulas + rules >= 3 || bloom("appliquer") / n > 0.4) {
    return {
      message: `Ce chapitre contient ${formulas + rules} formules ou propriétés. Je te recommande des exercices progressifs avec la méthode affichée.`,
      formats: ["Formules à compléter", "Questions de méthode", "QCM"],
      startDifficulty: 1,
      durationMin: discipline === "maths" || discipline === "physique-chimie" ? 30 : 20,
    };
  }
  if (vocab / n > 0.4) {
    return {
      message: `Beaucoup de vocabulaire ici (${vocab} mots). Les flashcards et les textes à trous sont les plus efficaces.`,
      formats: ["Flashcards", "Textes à trous", "Associations"],
      startDifficulty: 2,
      durationMin: 15,
    };
  }
  if (people / n > 0.3) {
    return {
      message: `Ce cours cite plusieurs auteurs, œuvres ou personnages (${people}). Je te propose des associations puis un QCM.`,
      formats: ["Associations", "QCM", "Vrai ou faux"],
      startDifficulty: 2,
      durationMin: 15,
    };
  }
  return {
    message: `Ce cours est surtout composé de définitions et de notions à comprendre (${concepts.length}). Une session mixte QCM + vrai/faux est idéale pour commencer.`,
    formats: profile.formats.slice(0, 3),
    startDifficulty: 2,
    durationMin: 20,
  };
}
