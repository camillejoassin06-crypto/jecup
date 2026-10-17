// JecUp Tutor Agent : recherche dans les cours (RAG lexical BM25) et réponses sourcées.
import type { ChatSource, Concept, CourseDocument, DocChunk } from "@/types";
import { splitSentences, tokenize, truncate } from "./text";

export interface SearchHit {
  doc: CourseDocument;
  chunk: DocChunk;
  score: number;
}

/**
 * Recherche BM25 sur les morceaux de cours. Sert de recherche « dans le contenu » et de
 * récupération pour l'assistant ; une recherche par embeddings peut la remplacer côté serveur.
 */
export function searchChunks(query: string, docs: CourseDocument[], limit = 5): SearchHit[] {
  const q = [...new Set(tokenize(query))];
  if (!q.length) return [];
  const all = docs.flatMap((doc) => doc.chunks.map((chunk) => ({ doc, chunk, toks: tokenize(chunk.text + " " + chunk.section) })));
  const N = all.length || 1;
  const avgdl = all.reduce((t, x) => t + x.toks.length, 0) / N;
  const df = new Map<string, number>();
  for (const t of q) df.set(t, all.filter((x) => x.toks.includes(t)).length);
  const k1 = 1.4, b = 0.75;
  return all
    .map(({ doc, chunk, toks }) => {
      let score = 0;
      for (const t of q) {
        const f = toks.filter((x) => x === t || (t.length > 5 && x.startsWith(t.slice(0, -1)))).length;
        if (!f) continue;
        const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
        score += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * toks.length) / avgdl));
      }
      const titleBonus = q.filter((t) => tokenize(doc.title).includes(t)).length * 0.6;
      return { doc, chunk, score: score + (score > 0 ? titleBonus : 0) };
    })
    .filter((h) => h.score > 0.8)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export interface CourseAnswer {
  found: boolean;
  answer: string;
  sources: ChatSource[];
}

/** Mode « Mes cours » : n'utilise que les documents de l'élève, avec les sources. */
export function answerFromCourses(question: string, docs: CourseDocument[], concepts: Concept[]): CourseAnswer {
  const hits = searchChunks(question, docs, 4);
  const q = tokenize(question);
  if (!hits.length || hits[0].score < 1.5) {
    return { found: false, answer: "Cette information n'apparaît pas dans tes cours actuels.", sources: [] };
  }
  // notion exactement demandée ?
  const concept = concepts.find((c) => {
    const lt = tokenize(c.label);
    return lt.length && lt.every((t) => q.includes(t));
  });
  const sentences = hits
    .slice(0, 2)
    .flatMap((h) => splitSentences(h.chunk.text).map((s) => ({ s, h, score: tokenize(s).filter((t) => q.includes(t)).length })))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const parts: string[] = [];
  if (concept) parts.push(`**${concept.label}** — ${concept.detail}`);
  for (const x of sentences) if (!parts.some((p) => p.includes(x.s))) parts.push(x.s.replace(/^[-•*]\s*/, ""));
  const used = new Map<string, SearchHit>();
  for (const x of sentences) used.set(x.h.chunk.id, x.h);
  if (!used.size) used.set(hits[0].chunk.id, hits[0]);
  return {
    found: true,
    answer: `D'après tes cours :\n\n${parts.map((p) => `• ${p}`).join("\n")}`,
    sources: [...used.values()].map((h) => ({
      documentId: h.doc.id,
      chunkId: h.chunk.id,
      page: h.chunk.page,
      excerpt: truncate(h.chunk.text.replace(/\s+/g, " "), 220),
    })),
  };
}

/** Mode « Comprendre » sans IA générative : reformule à partir du cours. */
export function explainConcept(
  concept: Concept,
  doc: CourseDocument | undefined,
  style: "simple" | "detail" | "exemple" | "analogie",
): string {
  const chunk = doc?.chunks.find((c) => c.id === concept.chunkId);
  const sentences = chunk ? splitSentences(chunk.text) : [];
  if (style === "simple") {
    const first = splitSentences(concept.detail)[0] ?? concept.detail;
    const label = concept.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const core = first.replace(new RegExp(`^(l'|le |la |les )?${label}\\s*(est|désigne|:)?\\s*`, "i"), "");
    return `En une phrase : **${concept.label}**, c'est ${core.replace(/^./, (c) => c.toLowerCase())}`;
  }
  if (style === "detail") {
    return `**${concept.label}**\n\n${concept.detail}\n\nContexte dans ton cours (${chunk?.section ?? "section"}) :\n${sentences.slice(0, 4).map((s) => `• ${s}`).join("\n")}`;
  }
  if (style === "exemple") {
    const ex = doc?.chunks.flatMap((c) => splitSentences(c.text)).find((s) => /exemple|ex\s?:|par exemple|comme|illustr/i.test(s) && tokenize(s).some((t) => tokenize(concept.label).includes(t)));
    return ex
      ? `Exemple tiré de ton cours : ${ex}`
      : "Ton cours ne donne pas d'exemple pour cette notion. Active le fournisseur IA (Claude) pour obtenir un exemple général, clairement séparé de ton cours.";
  }
  return "Les analogies sont générées par le fournisseur IA (Claude). En mode local, je peux te montrer la définition, le contexte du cours ou un exemple s'il y en a un.";
}
