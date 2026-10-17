// JecUp Concept Agent : extrait les notions d'un cours et les classe (Bloom).
import { DEFAULT_BLOOM, DISCIPLINES } from "@/data/academic";
import type { BloomLevel, Concept, ConceptKind, DisciplineId, DocChunk } from "@/types";
import { uid } from "@/lib/utils";
import { capitalize, normalize, splitSentences } from "./text";

export interface RawConcept {
  label: string;
  detail: string;
  kind: ConceptKind;
  excerpt: string;
}

const YEAR = /\b(1[0-9]{3}|20[0-4][0-9]|[1-9][0-9]{2})\b/;
const YEAR_STRICT = /\b(1[0-9]{3}|20[0-4][0-9])\b/;

const NOT_A_CONCEPT = /^(exemples?|ex|remarques?|rq|attention|rappel|nb|n\.b\.|note|exercice \d*|exercices?|question \d*|réponse|reponse|correction|conclusion|introduction|sommaire|objectifs?|consigne|document \d*|doc \d*|source|vocabulary|grammar)\.?$/i;

/** Lignes de code (cours d'informatique) : ne pas les confondre avec des formules. */
const CODE_LINE = /^(def|for|while|if|elif|else|return|print|import|from|class)\s|^[a-z_][a-z0-9_]*(\[[^\]]*\])?\s*(,\s*[a-z_][\w[\]]*)*\s*[+\-*/]?=\s*[^=]/i;

// \b ne fonctionne pas après une lettre accentuée : on utilise une anticipation explicite
const END = "(?=[\\s:(]|$)";
const KIND_PREFIX: [RegExp, ConceptKind][] = [
  [new RegExp(`^(théorème|theoreme)${END}`, "i"), "theoreme"],
  [new RegExp(`^(propriété|propriete)${END}`, "i"), "propriete"],
  [new RegExp(`^(méthode|methode)${END}`, "i"), "methode"],
  [new RegExp(`^(règle|regle)${END}`, "i"), "regle"],
  [new RegExp(`^(loi)${END}`, "i"), "regle"],
  [new RegExp(`^(définition|definition)${END}`, "i"), "definition"],
  [new RegExp(`^(formule)${END}`, "i"), "formule"],
];

/** Une étiquette qui ressemble à une phrase (sujet + verbe) n'est pas une notion. */
const SENTENCE_LABEL = /^(les|le|la|l'|des|il|elle|ils|elles|on|nous|ce|cette|en)\s/i;

/** Analyse une ligne et renvoie une notion si un motif connu est reconnu. */
export function matchLine(line: string, discipline: DisciplineId): RawConcept | null {
  const l = line.replace(/^[-•*▪►]\s*/, "").trim();
  if (l.length < 4 || l.length > 400) return null;

  // « Théorème de Pythagore : … », « Propriété : … », « Loi d'Ohm : … »
  for (const [re, kind] of KIND_PREFIX) {
    if (re.test(l)) {
      const m = l.match(/^([^:]{3,70}?)\s*[:–—]\s*(.{6,})$/);
      if (m) {
        const label = m[1].trim();
        const detail = m[2].trim();
        const isFormula = /[=]/.test(detail) && /[A-Za-z]/.test(detail) && detail.length < 80;
        return { label, detail, kind: isFormula && kind !== "theoreme" && kind !== "propriete" ? "formule" : kind, excerpt: l };
      }
    }
  }

  // Citation : « … » (Auteur)
  const cit = l.match(/^[«"“](.{10,250}?)[»"”]\s*[(—–-]\s*([A-ZÀ-Ý][^)]{2,60})\)?\.?$/);
  if (cit) return { label: cit[2].trim(), detail: `« ${cit[1].trim()} »`, kind: "citation", excerpt: l };

  // Personne avec dates : Victor Hugo (1802-1885) : …
  const pers = l.match(/^([A-ZÀ-Ý][\p{L}'.-]+(?:\s+(?:de |d'|von |van )?[A-ZÀ-Ý][\p{L}'.-]+){0,3})\s*\((\d{3,4})\s*[-–]\s*(\d{3,4})\)\s*[:,–—-]?\s*(.*)$/u);
  if (pers) {
    return {
      label: pers[1],
      detail: `(${pers[2]}–${pers[3]})${pers[4] ? " " + pers[4].trim() : ""}`,
      kind: "personne",
      excerpt: l,
    };
  }

  // Œuvre : Auteur — Titre (année)  ou  Titre, Auteur (année)
  const oeuvre = l.match(/^([A-ZÀ-Ý][\p{L}' .-]{2,40})\s*[—–]\s*([^:]{3,80}?)\s*\((\d{4})\)$/u);
  if (oeuvre) return { label: oeuvre[2].trim(), detail: `${oeuvre[1].trim()} (${oeuvre[3]})`, kind: "oeuvre", excerpt: l };

  // Clé : valeur (définitions, vocabulaire, formules, dates)
  const kv = l.match(/^([^:=]{2,70}?)\s*(?::|=|→|->|–|—)\s+(.{2,})$/);
  if (kv) {
    let label = kv[1].trim().replace(/^(le|la|les|l'|un|une)\s+/i, (m) => m);
    const detail = kv[2].trim();
    const sep = l.slice(kv[1].length).trim()[0];
    // formule de type "U = R × I"
    if (sep === "=" && label.length <= 12 && /[A-Za-zΔ]/.test(label)) {
      return { label: `${label} = ${detail}`, detail: `${label} = ${detail}`, kind: "formule", excerpt: l };
    }
    if (NOT_A_CONCEPT.test(label)) return null;
    const formulaInDetail = /^[A-Za-zΔ_'()\/0-9]{1,10}\s*=\s*[^=]{1,60}$/.test(detail);
    if (formulaInDetail) return { label, detail, kind: "formule", excerpt: l };
    // date : "1789 : prise de la Bastille" ou "Prise de la Bastille : 14 juillet 1789"
    if (/^(\d{1,2}\s+\p{L}+\s+)?\d{3,4}(\s*[-–]\s*\d{3,4})?$/u.test(label)) {
      return { label: capitalize(detail.replace(/\.$/, "")), detail: label, kind: "date", excerpt: l };
    }
    if (/^(\d{1,2}\s+\p{L}+\s+)?(1[0-9]{3}|20[0-4][0-9])(\s*[-–]\s*\d{3,4})?\.?$/u.test(detail)) {
      return { label: capitalize(label), detail: detail.replace(/\.$/, ""), kind: "date", excerpt: l };
    }
    const wordsLabel = label.split(/\s+/).length;
    const vocab = discipline === "langues" && detail.split(/\s+/).length <= 5 && wordsLabel <= 4;
    if (!vocab && wordsLabel > 3 && SENTENCE_LABEL.test(label)) return null;
    if (wordsLabel <= 7 && detail.length >= 2) {
      return { label: label.replace(/\s+\(.*\)$/, ""), detail, kind: vocab ? "vocabulaire" : "definition", excerpt: l };
    }
  }

  // Phrases définitoires : « On appelle X … », « X désigne … », « X est un/une … »
  const appelle = l.match(/^on (?:appelle|nomme)\s+(.{3,60}?)\s+(?:l'|le |la |les |un |une |des |ce |tout |toute )?(.{8,})$/i);
  if (appelle && /^on (appelle|nomme)/i.test(l)) {
    return { label: appelle[1].trim(), detail: capitalize(l), kind: "definition", excerpt: l };
  }
  const des = l.match(/^((?:l'|le |la |les |un |une )?[\p{L}' -]{3,50}?)\s+(désigne|correspond à|signifie|se définit comme|consiste à|est l'ensemble|est le processus|est la|est le|est un|est une|sont des)\s+(.{8,})$/iu);
  if (des && des[1].split(/\s+/).length <= 6 && !/^(il|elle|ce|cela|c'|on|ils|elles|cette|ceci)\b/i.test(des[1])) {
    const kind: ConceptKind = /processus|étape/i.test(des[3]) ? "processus" : "definition";
    return { label: des[1].trim().replace(/^(l'|le |la |les |un |une )/i, ""), detail: l, kind, excerpt: l };
  }

  // Événement daté dans une phrase : « En 1789, … » / « Le 11 novembre 1918, … »
  const ev = l.match(/^(?:en|le|dès|depuis|à partir de)\s+((?:\d{1,2}(?:er)?\s+\p{L}+\s+)?(1[0-9]{3}|20[0-4][0-9]))\s*,\s*(.{10,})$/iu);
  if (ev) return { label: capitalize(ev[3].replace(/\.$/, "")), detail: ev[1], kind: "date", excerpt: l };

  if (DISCIPLINES[discipline].questionTypes.includes("date") && YEAR_STRICT.test(l) && l.length < 160 && /^[A-ZÀ-Ý]/.test(l)) {
    const y = l.match(YEAR_STRICT)![0];
    const label = l.replace(new RegExp(`\\s*(en|le|du|de)?\\s*(\\d{1,2}\\s+\\p{L}+\\s+)?${y}`, "u"), "").replace(/[ ,.]+$/, "");
    if (label.length > 12 && label.length < 130) return { label, detail: y, kind: "evenement", excerpt: l };
  }
  return null;
}

/** Extrait, déduplique et classe les notions d'un ensemble de morceaux de cours. */
export function extractConcepts(
  chunks: DocChunk[],
  discipline: DisciplineId,
  ids: { documentId: string; subjectId: string },
  max = 45,
): Concept[] {
  const seen = new Set<string>();
  const out: Concept[] = [];
  for (const chunk of chunks) {
    const lines = chunk.text.split("\n").flatMap((l) => (l.length > 220 ? splitSentences(l) : [l]));
    for (const line of lines) {
      if (discipline === "informatique" && CODE_LINE.test(line.trim())) continue;
      const raw = matchLine(line, discipline);
      if (!raw) continue;
      const key = normalize(raw.label).slice(0, 60);
      if (seen.has(key) || key.length < 2) continue;
      seen.add(key);
      out.push({
        id: uid("c_"),
        documentId: ids.documentId,
        subjectId: ids.subjectId,
        label: raw.label,
        detail: raw.detail,
        kind: raw.kind,
        bloom: bloomFor(raw.kind, discipline),
        chunkId: chunk.id,
        sourceExcerpt: raw.excerpt,
      });
      if (out.length >= max) return out;
    }
  }
  return out;
}

export function bloomFor(kind: ConceptKind, discipline: DisciplineId): BloomLevel[] {
  return DISCIPLINES[discipline].bloomOverrides?.[kind] ?? DEFAULT_BLOOM[kind];
}

export { YEAR };
