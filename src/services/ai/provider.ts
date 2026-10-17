// Abstraction fournisseur IA : chaque agent est un appel séparé, jamais un prompt unique.
import type { Concept, CourseDocument, DisciplineId, LevelId } from "@/types";
import { supabase } from "@/services/supabase";
import { answerFromCourses, explainConcept, type CourseAnswer } from "@/engine/tutorAgent";

export type ExplainStyle = "simple" | "detail" | "exemple" | "analogie";

export interface AIProvider {
  readonly name: "heuristic" | "claude";
  /** LISEA/JEC'UP Tutor — mode Mes cours : uniquement les documents de l'élève */
  answerFromCourses(question: string, docs: CourseDocument[], concepts: Concept[], level: LevelId): Promise<CourseAnswer>;
  /** Explication générale, toujours présentée séparément des cours */
  generalExplanation(question: string, level: LevelId): Promise<string | null>;
  /** Mode Comprendre */
  explain(concept: Concept, doc: CourseDocument | undefined, style: ExplainStyle, level: LevelId, discipline: DisciplineId): Promise<string>;
  /** Analyse d'une réponse rédigée (questions ouvertes) */
  reviewAnswer?(question: string, expected: string, answer: string, level: LevelId): Promise<string>;
}

class HeuristicProvider implements AIProvider {
  readonly name = "heuristic" as const;
  async answerFromCourses(q: string, docs: CourseDocument[], concepts: Concept[]) {
    return answerFromCourses(q, docs, concepts);
  }
  async generalExplanation() {
    return null;
  }
  async explain(concept: Concept, doc: CourseDocument | undefined, style: ExplainStyle) {
    return explainConcept(concept, doc, style);
  }
}

/**
 * Fournisseur Claude : passe par la Edge Function Supabase `jecup-ai` (la clé API reste côté serveur).
 * En cas d'erreur, on retombe sur le moteur local pour ne jamais bloquer l'élève.
 */
class ClaudeProvider implements AIProvider {
  readonly name = "claude" as const;
  private local = new HeuristicProvider();

  private async call<T>(task: string, payload: Record<string, unknown>): Promise<T> {
    if (!supabase) throw new Error("Supabase non configuré");
    const { data, error } = await supabase.functions.invoke("jecup-ai", { body: { task, ...payload } });
    if (error) throw error;
    return data as T;
  }

  async answerFromCourses(q: string, docs: CourseDocument[], concepts: Concept[], level: LevelId) {
    // récupération locale (BM25) puis rédaction par Claude uniquement à partir des extraits
    const retrieved = answerFromCourses(q, docs, concepts);
    if (!retrieved.found) return retrieved;
    try {
      const res = await this.call<{ answer: string; found: boolean }>("answer_from_courses", {
        question: q,
        level,
        excerpts: retrieved.sources.map((s) => ({
          id: s.chunkId,
          title: docs.find((d) => d.id === s.documentId)?.title,
          text: docs.find((d) => d.id === s.documentId)?.chunks.find((c) => c.id === s.chunkId)?.text,
        })),
      });
      return res.found
        ? { ...retrieved, answer: res.answer }
        : { found: false, answer: "Cette information n'apparaît pas dans tes cours actuels.", sources: [] };
    } catch {
      return retrieved;
    }
  }

  async generalExplanation(q: string, level: LevelId) {
    try {
      const res = await this.call<{ text: string }>("general_explanation", { question: q, level });
      return res.text;
    } catch {
      return null;
    }
  }

  async explain(concept: Concept, doc: CourseDocument | undefined, style: ExplainStyle, level: LevelId, discipline: DisciplineId) {
    try {
      const chunk = doc?.chunks.find((c) => c.id === concept.chunkId)?.text;
      const res = await this.call<{ text: string }>("explain", {
        style, level, discipline, label: concept.label, detail: concept.detail, context: chunk,
      });
      return res.text;
    } catch {
      return this.local.explain(concept, doc, style);
    }
  }

  async reviewAnswer(question: string, expected: string, answer: string, level: LevelId) {
    const res = await this.call<{ text: string }>("review_answer", { question, expected, answer, level });
    return res.text;
  }
}

let instance: AIProvider | null = null;
export function getAI(): AIProvider {
  if (!instance) {
    const wanted = import.meta.env.VITE_AI_PROVIDER as string | undefined;
    instance = wanted === "claude" && supabase ? new ClaudeProvider() : new HeuristicProvider();
  }
  return instance;
}
