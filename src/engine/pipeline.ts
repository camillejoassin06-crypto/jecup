// Parcours central : importer → analyser → identifier la matière → détecter les notions.
import type { Concept, CourseDocument, DisciplineId } from "@/types";
import { uid } from "@/lib/utils";
import { classifyDiscipline } from "./classifier";
import { analyzeDocument } from "./documentAgent";
import { extractConcepts } from "./conceptAgent";

export interface IngestInput {
  title: string;
  subjectId: string;
  subjectDiscipline?: DisciplineId;
  rawText: string;
  source: CourseDocument["source"];
  folder?: string;
}

export function ingestDocument(input: IngestInput): { document: CourseDocument; concepts: Concept[] } {
  const id = uid("doc_");
  const analysis = analyzeDocument(input.rawText, input.title);
  const cls = classifyDiscipline(input.title + "\n" + input.rawText, input.subjectDiscipline);
  const document: CourseDocument = {
    id,
    subjectId: input.subjectId,
    title: input.title,
    folder: input.folder ?? "Cours",
    source: input.source,
    rawText: input.rawText,
    docType: analysis.docType,
    discipline: cls.discipline,
    disciplineConfidence: cls.confidence,
    complexity: analysis.complexity,
    summary: analysis.summary,
    sections: analysis.sections,
    chunks: analysis.chunks,
    tags: analysis.tags,
    favorite: false,
    createdAt: new Date().toISOString(),
  };
  // la matière du dossier fait foi pour le profil pédagogique ; la classification sert d'indice
  const discipline = input.subjectDiscipline && input.subjectDiscipline !== "generique" ? input.subjectDiscipline : cls.discipline;
  const concepts = extractConcepts(analysis.chunks, discipline, { documentId: id, subjectId: input.subjectId });
  return { document, concepts };
}
