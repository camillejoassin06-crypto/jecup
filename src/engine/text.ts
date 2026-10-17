// Outils texte partagés par les agents du moteur.

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(
  (
    "le la les l un une des de du d et ou a à au aux en dans par pour sur avec sans sous ce cet cette ces " +
    "qui que quoi dont où ne pas plus est sont été être a ont avoir il elle ils elles on nous vous je tu me te se " +
    "son sa ses leur leurs mon ma mes ton ta tes notre nos votre vos y c s n qu lui eux comme mais donc or ni car " +
    "si tout tous toute toutes très bien aussi entre vers chez alors ainsi cela ça celui celle ceux the of and to in is " +
    "quel quelle quels quelles comment pourquoi quand est-ce parle cours dit faire fait peut"
  ).split(" "),
);

export function tokenize(s: string): string[] {
  return normalize(s)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

/** Racinisation très légère (pluriels, féminins courants). */
function stem(t: string) {
  if (t.length > 5 && t.endsWith("ements")) return t.slice(0, -1);
  if (t.length > 4 && (t.endsWith("s") || t.endsWith("x"))) t = t.slice(0, -1);
  if (t.length > 5 && t.endsWith("e")) t = t.slice(0, -1);
  return t;
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, "\n")
    .split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ý«"0-9])|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

export function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Compare une réponse saisie à la réponse attendue avec une tolérance aux fautes de frappe. */
export function answersMatch(given: string, expected: string) {
  const g = normalize(given).replace(/[.\s]+$/g, "").replace(/^(le|la|les|l'|un|une|the|to) /, "");
  const e = normalize(expected).replace(/[.\s]+$/g, "").replace(/^(le|la|les|l'|un|une|the|to) /, "");
  if (!g) return false;
  if (g === e) return true;
  const compact = (x: string) => x.replace(/[\s×*·]/g, "");
  if (compact(g) === compact(e)) return true;
  const tol = e.length <= 4 ? 0 : e.length <= 8 ? 1 : 2;
  return levenshtein(g, e) <= tol;
}

export function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
