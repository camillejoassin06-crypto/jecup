import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const uid = (prefix = "") =>
  prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Date du jour au format yyyy-mm-dd (heure locale). */
export function todayISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

export function daysBetween(fromISO: string, toISO: string) {
  const a = new Date(fromISO + "T12:00:00").getTime();
  const b = new Date(toISO + "T12:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
}

const DAY_NAMES = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function formatDay(iso: string, opts: { weekday?: boolean } = { weekday: true }) {
  const d = new Date(iso + "T12:00:00");
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return opts.weekday ? `${DAY_NAMES[d.getDay()]} ${base}` : base;
}

export function relativeDay(iso: string, today = todayISO()) {
  const n = daysBetween(today, iso);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  if (n > 1 && n < 7) return DAY_NAMES[new Date(iso + "T12:00:00").getDay()];
  if (n < 0) return `il y a ${-n} j`;
  return `dans ${n} j`;
}

export function weekStart(iso: string) {
  const d = new Date(iso + "T12:00:00");
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  return addDays(iso, -dow);
}

export const dayName = (iso: string) => DAY_NAMES[new Date(iso + "T12:00:00").getDay()];

export function shuffle<T>(arr: T[], seed?: number): T[] {
  const a = [...arr];
  let s = seed ?? Math.floor(Math.random() * 1e9);
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const plural = (n: number, word: string, pluralWord = word + "s") => `${n} ${n > 1 ? pluralWord : word}`;
