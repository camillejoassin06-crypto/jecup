// JEC'UP Tasks : saisie naturelle → tâche structurée (action, matière, date, type, durée).
import type { Subject, TaskKind } from "@/types";
import { addDays, todayISO } from "@/lib/utils";
import { capitalize, normalize } from "./text";

export interface ParsedTask {
  title: string;
  subjectId?: string;
  due?: string;
  kind: TaskKind;
  estimatedMin: number;
  /** une évaluation a été détectée : proposer de l'ajouter au planning */
  exam?: { title: string; date?: string };
}

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

const SUBJECT_ALIASES: [RegExp, string[]][] = [
  [/\b(maths?|mathematiques?)\b/, ["math"]],
  [/\b(francais|fr)\b/, ["francais"]],
  [/\b(histoire|geo|geographie|hg|histoire-geo)\b/, ["histoire", "geo"]],
  [/\b(svt|bio|biologie)\b/, ["svt", "science"]],
  [/\b(physique|chimie|pc|physique-chimie)\b/, ["physique"]],
  [/\b(anglais|english)\b/, ["anglais", "llcer anglais"]],
  [/\b(espagnol|allemand|italien|lv2)\b/, ["lv2", "espagnol", "allemand", "italien"]],
  [/\b(philo|philosophie)\b/, ["philo"]],
  [/\b(ses|eco|economie)\b/, ["ses"]],
  [/\b(nsi|snt|info|informatique)\b/, ["nsi", "snt"]],
  [/\b(techno|technologie)\b/, ["techno"]],
  [/\b(emc)\b/, ["emc"]],
  [/\b(hggsp)\b/, ["hggsp"]],
];

const KINDS: [RegExp, TaskKind, number][] = [
  [/\b(expose|presentation|oral|grand oral)\b/, "exposé", 90],
  [/\b(dm|devoir maison|devoirs?|faire les exercices|exos?|exercices?)\b/, "devoirs", 45],
  [/\b(reviser|revision|apprendre|reciter|lecon)\b/, "révision", 30],
  [/\b(lire|lecture|livre|roman|chapitre)\b/, "lecture", 40],
  [/\b(projet|tpe|maquette|chef-d'oeuvre)\b/, "projet", 120],
];

export function parseDate(text: string, today = todayISO()): string | undefined {
  const t = normalize(text);
  if (/\b(aujourd'hui|ce soir|tout a l'heure)\b/.test(t)) return today;
  if (/\bapres-demain\b|\bapres demain\b/.test(t)) return addDays(today, 2);
  if (/\bdemain\b/.test(t)) return addDays(today, 1);
  const dans = t.match(/\bdans (\d+) jours?\b/);
  if (dans) return addDays(today, Number(dans[1]));
  if (/\bsemaine prochaine\b/.test(t)) return addDays(today, 7);
  const dow = new Date(today + "T12:00:00").getDay();
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(t)) {
      let diff = (i - dow + 7) % 7;
      if (diff === 0) diff = 7;
      return addDays(today, diff);
    }
  }
  const year = Number(today.slice(0, 4));
  const numeric = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (numeric) return buildDate(Number(numeric[1]), Number(numeric[2]), numeric[3] ? Number(numeric[3]) : undefined, today, year);
  const written = t.match(new RegExp(`\\b(?:le )?(\\d{1,2})(?:er)? (${MONTHS.join("|")})\\b`));
  if (written) return buildDate(Number(written[1]), MONTHS.indexOf(written[2]) + 1, undefined, today, year);
  const dayOnly = t.match(/\ble (\d{1,2})\b/);
  if (dayOnly) {
    const d = Number(dayOnly[1]);
    const m = Number(today.slice(5, 7));
    let iso = buildDate(d, m, undefined, today, year, false);
    if (iso && iso < today) iso = buildDate(d, m === 12 ? 1 : m + 1, m === 12 ? year + 1 : year, today, year, false);
    return iso;
  }
  return undefined;
}

function buildDate(d: number, m: number, y: number | undefined, today: string, year: number, roll = true) {
  if (d < 1 || d > 31 || m < 1 || m > 12) return undefined;
  let yy = y ? (y < 100 ? 2000 + y : y) : year;
  let iso = `${yy}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  if (!y && roll && iso < today) {
    yy += 1;
    iso = `${yy}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return iso;
}

export function matchSubject(text: string, subjects: Subject[]): Subject | undefined {
  const t = normalize(text);
  for (const s of subjects) {
    const n = normalize(s.name);
    if (n.length > 2 && t.includes(n)) return s;
  }
  for (const [re, keys] of SUBJECT_ALIASES) {
    if (!re.test(t)) continue;
    const found = subjects.find((s) => keys.some((k) => normalize(s.name).includes(k)));
    if (found) return found;
  }
  return undefined;
}

export function parseTask(input: string, subjects: Subject[], today = todayISO()): ParsedTask {
  const t = normalize(input);
  const subject = matchSubject(input, subjects);
  const due = parseDate(input, today);
  let kind: TaskKind = "autre";
  let estimatedMin = 30;
  for (const [re, k, min] of KINDS) {
    if (re.test(t)) {
      kind = k;
      estimatedMin = min;
      break;
    }
  }
  const pages = t.match(/(\d+)\s*pages?/);
  if (pages && kind === "lecture") estimatedMin = Math.min(180, Number(pages[1]) * 3);
  const exos = t.match(/(\d+)\s*(exos?|exercices?)/);
  if (exos) estimatedMin = Math.min(150, Number(exos[1]) * 12);

  // nettoyage du titre : on retire les indications de date
  const title = capitalize(
    input
      .replace(/\b(pour )?(aujourd'hui|ce soir|demain|après-demain|apres-demain|la semaine prochaine|semaine prochaine)\b/gi, "")
      .replace(/\b(pour |avant )?(le )?(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)( prochain)?\b/gi, "")
      .replace(/\b(pour )?le \d{1,2}(er)?( \p{L}+)?\b/giu, "")
      .replace(/\bdans \d+ jours?\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );

  let exam: ParsedTask["exam"];
  if (/\b(controle|interro|interrogation|ds|devoir surveille|evaluation|bac blanc|brevet blanc|partiel|examen)\b/.test(t)) {
    kind = "révision";
    exam = { title: title || "Contrôle", date: due };
  }
  return { title: title || capitalize(input.trim()), subjectId: subject?.id, due, kind, estimatedMin, exam };
}
