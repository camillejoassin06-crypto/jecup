// Edge Function JEC'UP — services IA spécialisés (un prompt par agent, jamais un prompt unique).
// La clé ANTHROPIC_API_KEY reste côté serveur : `supabase secrets set ANTHROPIC_API_KEY=...`
import Anthropic from "npm:@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

const LEVEL_LABEL: Record<string, string> = {
  "6e": "6e", "5e": "5e", "4e": "4e", "3e": "3e (brevet)", "2nde": "Seconde", "1re": "Première", tle: "Terminale",
  cap: "CAP", "2nde-pro": "Seconde professionnelle", "1re-pro": "Première professionnelle", "tle-pro": "Terminale professionnelle",
};

const BASE = `Tu es le tuteur de JEC'UP, une application de révision pour collégiens et lycéens français.
Tu tutoies l'élève, avec un ton bienveillant, précis et jamais condescendant. Tu adaptes vocabulaire et profondeur à sa classe.
Tu es un outil d'étude : pas de conseil médical, juridique ou personnel ; tu ne prétends jamais attribuer une note officielle.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = Record<string, unknown> & { task: string; level?: string };

async function run(system: string, user: string, opts: { json?: Record<string, unknown>; effort?: "low" | "medium" } = {}) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: user }],
    output_config: {
      effort: opts.effort ?? "low",
      ...(opts.json ? { format: { type: "json_schema", schema: opts.json } } : {}),
    },
    // repli automatique sur un autre modèle si une requête est refusée par les filtres de sécurité
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  } as never);
  if (response.stop_reason === "refusal") throw new Error("refusal");
  const text = response.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  return opts.json ? JSON.parse(text) : text;
}

const level = (b: Body) => LEVEL_LABEL[b.level ?? ""] ?? "lycée";

async function handle(b: Body) {
  switch (b.task) {
    // Tutor Agent — mode « Mes cours » : uniquement à partir des extraits fournis
    case "answer_from_courses": {
      const excerpts = (b.excerpts as { id: string; title?: string; text?: string }[]) ?? [];
      const context = excerpts.map((e, i) => `<extrait n="${i + 1}" cours="${e.title ?? ""}">\n${e.text ?? ""}\n</extrait>`).join("\n");
      return run(
        `${BASE}\nMode « Mes cours » : réponds UNIQUEMENT avec les informations des extraits du cours de l'élève. ` +
          `N'ajoute aucune connaissance extérieure. Si les extraits ne permettent pas de répondre, mets found à false. ` +
          `Réponse courte (3 à 6 phrases ou puces), niveau ${level(b)}.`,
        `${context}\n\nQuestion de l'élève : ${b.question}`,
        { json: { type: "object", properties: { found: { type: "boolean" }, answer: { type: "string" } }, required: ["found", "answer"], additionalProperties: false } },
      );
    }
    // Explication générale, présentée séparément des cours
    case "general_explanation":
      return { text: await run(`${BASE}\nL'information n'est pas dans les cours de l'élève. Donne une explication générale courte (5 phrases max), niveau ${level(b)}, et invite-le à vérifier avec son cours ou son professeur.`, String(b.question)) };
    // Mode Comprendre
    case "explain": {
      const styles: Record<string, string> = {
        simple: "Explique en 2 ou 3 phrases très simples, sans jargon.",
        detail: "Explique en détail, étape par étape, en t'appuyant sur le contexte du cours.",
        exemple: "Donne un exemple concret et parlant pour un élève de cet âge. Précise s'il vient du cours ou non.",
        analogie: "Propose une analogie avec la vie quotidienne d'un ado, puis dis en une phrase où elle s'arrête.",
      };
      return {
        text: await run(
          `${BASE}\nMatière : ${b.discipline}. Niveau : ${level(b)}. ${styles[String(b.style)] ?? styles.simple}`,
          `Notion : ${b.label}\nDéfinition du cours : ${b.detail}\nContexte du cours :\n${b.context ?? "(aucun)"}`,
        ),
      };
    }
    // Method Agent — analyse d'une réponse rédigée
    case "review_answer":
      return {
        text: await run(
          `${BASE}\nAnalyse la réponse rédigée de l'élève (niveau ${level(b)}) : notions attendues présentes, structure, compréhension, éléments manquants. ` +
            `Termine par une piste d'amélioration concrète. Pas de note.`,
          `Question : ${b.question}\nÉléments attendus : ${b.expected}\nRéponse de l'élève : ${b.answer}`,
          { effort: "medium" },
        ),
      };
    default:
      throw new Error(`Tâche inconnue : ${b.task}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = (await req.json()) as Body;
    const data = await handle(body);
    return new Response(JSON.stringify(data), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    const status = e instanceof Anthropic.RateLimitError ? 429 : e instanceof Anthropic.APIError ? 502 : 400;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erreur" }), { status, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
