import { describe, expect, it } from "vitest";
import { ingestDocument } from "./pipeline";
import { classifyDiscipline } from "./classifier";
import { generateQuestion, checkAnswer, startSession, applyResult } from "./quizAgent";
import { emptyMastery, updateMastery, masteryLevel } from "./memoryAgent";
import { parseTask, parseDate } from "./taskParser";
import { answerFromCourses } from "./tutorAgent";
import { buildDemo, DEMO_PROFILES } from "@/data/demo";
import * as C from "@/data/demoCourses";
import type { Subject } from "@/types";

const ingest = (text: string, d: Parameters<typeof ingestDocument>[0]["subjectDiscipline"], title = "Cours") =>
  ingestDocument({ title, subjectId: "s1", subjectDiscipline: d, rawText: text, source: "texte" });

describe("classifier", () => {
  it("reconnaît la matière sans indice", () => {
    expect(classifyDiscipline(C.COURSE_WW1).discipline).toBe("histoire-geo");
    expect(classifyDiscipline(C.COURSE_PYTHAGORE).discipline).toBe("maths");
    expect(classifyDiscipline(C.COURSE_ADN).discipline).toBe("svt");
    expect(classifyDiscipline(C.COURSE_MARCHE).discipline).toBe("ses");
    expect(classifyDiscipline(C.COURSE_CONSCIENCE).discipline).toBe("philosophie");
    expect(classifyDiscipline(C.COURSE_TRIS).discipline).toBe("informatique");
  });
});

describe("concept agent", () => {
  it("extrait dates et définitions en histoire", () => {
    const { concepts, document } = ingest(C.COURSE_WW1, "histoire-geo");
    const labels = concepts.map((c) => `${c.kind}|${c.label}|${c.detail}`);
    console.log(labels.join("\n"));
    expect(document.sections.length).toBeGreaterThanOrEqual(4);
    expect(concepts.find((c) => c.label === "Armistice")?.kind).toBe("definition");
    expect(concepts.find((c) => /Verdun/.test(c.label))?.detail).toBe("1916");
    expect(concepts.find((c) => /armistice/i.test(c.label) && c.kind === "date")?.detail).toMatch(/1918/);
  });

  it("extrait formules et théorèmes en maths", () => {
    const { concepts } = ingest(C.COURSE_DERIVATION, "maths");
    console.log(concepts.map((c) => `${c.kind}|${c.label}|${c.detail}|${c.bloom}`).join("\n"));
    expect(concepts.filter((c) => c.kind === "formule").length).toBeGreaterThanOrEqual(5);
    expect(concepts.every((c) => !/^exemple/i.test(c.label))).toBe(true);
  });

  it("vocabulaire en langues, auteurs en philo, pas de code en NSI", () => {
    const en = ingest(C.COURSE_ENGLISH, "langues").concepts;
    expect(en.filter((c) => c.kind === "vocabulaire").length).toBeGreaterThanOrEqual(8);
    const philo = ingest(C.COURSE_CONSCIENCE, "philosophie").concepts;
    console.log(philo.map((c) => `${c.kind}|${c.label}|${c.detail}`).join("\n"));
    expect(philo.filter((c) => c.kind === "personne").length).toBe(5);
    expect(philo.filter((c) => c.kind === "citation").length).toBe(2);
    const nsi = ingest(C.COURSE_TRIS, "informatique").concepts;
    console.log(nsi.map((c) => `${c.kind}|${c.label}`).join("\n"));
    expect(nsi.some((c) => /imin/.test(c.label))).toBe(false);
  });
});

describe("quiz agent", () => {
  it("génère des questions valides pour toutes les notions démo", () => {
    for (const p of DEMO_PROFILES) {
      for (const d of p.docs) {
        const disc = p.subjects.find((s) => s.name === d.subject)!.discipline;
        const { concepts } = ingest(d.text, disc);
        for (const c of concepts) {
          for (const diff of [1, 2, 3, 4, 5] as const) {
            for (const v of [0, 1, 2]) {
              const q = generateQuestion(c, concepts, disc, diff, v);
              expect(q.prompt.length).toBeGreaterThan(5);
              expect(q.answer.length).toBeGreaterThan(0);
              if (q.choices) {
                expect(q.choices.map((x) => x.toLowerCase())).toContain(q.answer.toLowerCase());
                expect(new Set(q.choices).size).toBe(q.choices.length);
              }
              expect(checkAnswer(q, q.answer)).toBe(true);
            }
          }
        }
      }
    }
  });

  it("adapte la difficulté", () => {
    let s = startSession(["a", "b", "c"], 2);
    s = applyResult(s, "a", true);
    s = applyResult(s, "b", true);
    expect(s.difficulty).toBe(3);
    s = applyResult(s, "c", false);
    s = applyResult(s, "a", false);
    expect(s.difficulty).toBe(1);
    expect(s.retry.length).toBeGreaterThan(0);
  });
});

describe("memory agent", () => {
  it("ne déclare jamais maîtrisé après une seule bonne réponse", () => {
    const a = { id: "1", questionId: "q", conceptId: "c", correct: true, difficulty: 5, responseMs: 3000, at: new Date().toISOString() };
    const s = updateMastery(emptyMastery("c"), a, []);
    expect(masteryLevel(s.score, s.attempts)).not.toBe("maitrisee");
    expect(s.score).toBeLessThanOrEqual(45);
  });
});

describe("tasks", () => {
  const subjects: Subject[] = [
    { id: "svt", name: "SVT", discipline: "svt", color: "", weight: 3, folders: [] },
    { id: "m", name: "Mathématiques", discipline: "maths", color: "", weight: 3, folders: [] },
  ];
  it("comprend une saisie naturelle", () => {
    const t = parseTask("Finir mon exposé de SVT jeudi", subjects, "2026-10-17"); // samedi
    expect(t.subjectId).toBe("svt");
    expect(t.kind).toBe("exposé");
    expect(t.due).toBe("2026-10-22");
    expect(t.title).toBe("Finir mon exposé de SVT");
    const c = parseTask("contrôle de maths demain", subjects, "2026-10-17");
    expect(c.exam).toBeTruthy();
    expect(c.subjectId).toBe("m");
    expect(parseDate("pour le 3 novembre", "2026-10-17")).toBe("2026-11-03");
  });
});

describe("tutor", () => {
  it("répond depuis les cours avec sources, ou signale l'absence", () => {
    const { document, concepts } = ingest(C.COURSE_ADN, "svt", "ADN");
    const r = answerFromCourses("C'est quoi la réplication semi-conservative ?", [document], concepts);
    expect(r.found).toBe(true);
    expect(r.sources.length).toBeGreaterThan(0);
    const none = answerFromCourses("Qui a gagné la coupe du monde de football ?", [document], concepts);
    expect(none.found).toBe(false);
    expect(none.answer).toBe("Cette information n'apparaît pas dans tes cours actuels.");
  });
});

describe("demo", () => {
  it("construit chaque profil", () => {
    for (const p of DEMO_PROFILES) {
      const d = buildDemo(p.key, "2026-10-17");
      expect(d.concepts.length).toBeGreaterThan(8);
      expect(d.events.some((e) => e.generated && e.date >= "2026-10-17")).toBe(true);
    }
  });
});
