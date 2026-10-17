import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, Brain, Compass, Lightbulb, Send, Trash2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/Layout";
import { Badge, Card, Input, PageHeader } from "@/components/ui/primitives";
import { getAI, type ExplainStyle } from "@/services/ai/provider";
import { searchChunks } from "@/engine/tutorAgent";
import { dailyPriority } from "@/engine/coach";
import { atRisk, effectiveScore } from "@/engine/memoryAgent";
import { checkAnswer, generateQuestion } from "@/engine/quizAgent";
import { tokenize } from "@/engine/text";
import type { AssistantMode, Concept, Question } from "@/types";
import { cn, daysBetween, todayISO } from "@/lib/utils";

const MODES: { id: AssistantMode; label: string; icon: typeof BookOpen; hint: string }[] = [
  { id: "mes-cours", label: "Mes cours", icon: BookOpen, hint: "Je réponds uniquement à partir de tes documents, avec les sources." },
  { id: "comprendre", label: "Comprendre", icon: Lightbulb, hint: "Je t'explique une notion à ton niveau." },
  { id: "reviser", label: "Réviser", icon: Brain, hint: "Je te pose des questions et j'adapte les suivantes." },
  { id: "coach", label: "Coach", icon: Compass, hint: "Je regarde ton planning, tes évaluations et tes progrès pour te proposer une action." },
];

export default function Assistant() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const store = useStore();
  const { chat, addChat, clearChat, documents, concepts, subjects, mastery, events, tasks, profile, recordAttempt } = store;
  const [mode, setMode] = useState<AssistantMode>("mes-cours");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState<Concept | null>(null);
  const [pending, setPending] = useState<Question | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const docFilter = params.get("doc");
  const scopeDocs = docFilter ? documents.filter((d) => d.id === docFilter) : documents;
  const ai = getAI();
  const messages = chat.filter((m) => m.mode === mode);
  const today = todayISO();

  // fait défiler uniquement la zone de discussion, jamais la page entière
  useEffect(() => {
    const box = endRef.current?.parentElement;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);

  const findConcept = (q: string) => {
    const qt = tokenize(q);
    return concepts
      .map((c) => ({ c, s: tokenize(c.label).filter((t) => qt.includes(t)).length / Math.max(1, tokenize(c.label).length) }))
      .filter((x) => x.s > 0.5)
      .sort((a, b) => b.s - a.s)[0]?.c;
  };

  const askRevision = () => {
    const ids = atRisk(concepts.map((c) => c.id), mastery, today);
    const pool = ids.length ? ids : concepts.map((c) => c.id).sort((a, b) => effectiveScore(mastery[a]) - effectiveScore(mastery[b]));
    const c = concepts.find((x) => x.id === pool[Math.floor(Math.random() * Math.min(3, pool.length))]);
    if (!c) return addChat({ role: "assistant", mode: "reviser", content: "Importe un cours pour que je puisse t'interroger." });
    const disc = subjects.find((s) => s.id === c.subjectId)?.discipline ?? "generique";
    const level = mastery[c.id]?.score ?? 0;
    const q = generateQuestion(c, concepts.filter((x) => x.subjectId === c.subjectId), disc, level < 40 ? 2 : level < 70 ? 3 : 4, mastery[c.id]?.attempts ?? 0);
    setPending(q);
    addChat({ role: "assistant", mode: "reviser", content: q.prompt + (q.choices ? "\n\n" + q.choices.map((x, i) => `${String.fromCharCode(65 + i)}. ${x}`).join("\n") : "") });
  };

  const coachAdvice = () => {
    const dow = new Date().getDay();
    const free = profile!.availability[dow] - events.filter((e) => e.date === today && e.kind === "revision" && e.status === "fait").reduce((t, e) => t + e.durationMin, 0);
    const p = dailyPriority({ subjects, concepts, mastery, events, tasks, today, availableMin: Math.max(15, free) });
    const exams = events.filter((e) => (e.kind === "controle" || e.kind === "examen") && e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const weekAttempts = store.attempts.filter((a) => daysBetween(a.at.slice(0, 10), today) <= 6);
    const rate = weekAttempts.length ? Math.round((weekAttempts.filter((a) => a.correct).length / weekAttempts.length) * 100) : null;
    const lines = [
      `Tu as environ **${Math.max(0, free)} minutes** disponibles aujourd'hui.`,
      exams[0] ? `Ta prochaine évaluation : **${exams[0].title}** dans ${daysBetween(today, exams[0].date)} jour(s).` : "Aucune évaluation n'est prévue : ajoute-les dans le planning pour que je priorise mieux.",
      rate !== null ? `Cette semaine : ${weekAttempts.length} questions, ${rate} % de réussite.` : "Tu n'as pas encore révisé cette semaine : on commence doucement ?",
      "",
      `👉 **${p.title}** — ${p.reason}`,
    ];
    addChat({ role: "assistant", mode: "coach", content: lines.join("\n") });
    return p;
  };

  const send = async (text = input) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    addChat({ role: "user", mode, content: q });
    setBusy(true);
    try {
      if (mode === "mes-cours") {
        const res = await ai.answerFromCourses(q, scopeDocs, concepts, profile!.level);
        const general = res.found ? undefined : (await ai.generalExplanation(q, profile!.level)) ?? undefined;
        addChat({
          role: "assistant",
          mode,
          content: res.answer,
          sources: res.sources,
          general: res.found ? undefined : general ?? "Pour obtenir une explication générale (hors de tes cours), active le fournisseur IA Claude dans la configuration.",
        });
      } else if (mode === "comprendre") {
        const c = findConcept(q);
        if (!c) {
          const hits = searchChunks(q, scopeDocs, 1);
          addChat({
            role: "assistant",
            mode,
            content: hits.length
              ? `Je n'ai pas trouvé cette notion exacte, mais ton cours « ${hits[0].doc.title} » en parle :\n\n${hits[0].chunk.text.slice(0, 500)}`
              : "Cette notion n'apparaît pas dans tes cours actuels. Essaie avec le nom exact d'une notion, ou importe le cours correspondant.",
          });
        } else {
          setFocus(c);
          const text2 = await ai.explain(c, documents.find((d) => d.id === c.documentId), "simple", profile!.level, subjects.find((s) => s.id === c.subjectId)?.discipline ?? "generique");
          addChat({ role: "assistant", mode, content: text2 });
        }
      } else if (mode === "reviser") {
        if (pending) {
          let given = q;
          const letter = q.trim().toUpperCase().match(/^([A-D])\.?$/);
          if (letter && pending.choices) given = pending.choices[letter[1].charCodeAt(0) - 65] ?? q;
          const ok = checkAnswer(pending, given);
          recordAttempt({ questionId: pending.id, conceptId: pending.conceptId, correct: ok, difficulty: pending.difficulty, responseMs: 15000 });
          addChat({ role: "assistant", mode, content: `${ok ? "✅ Exact !" : `❌ La réponse attendue était : **${pending.answer}**.`}\n\n${pending.explanation}` });
          setPending(null);
          setTimeout(askRevision, 400);
        } else askRevision();
      } else {
        coachAdvice();
      }
    } finally {
      setBusy(false);
    }
  };

  const explainFocus = async (style: ExplainStyle, label: string) => {
    if (!focus) return;
    addChat({ role: "user", mode, content: label });
    setBusy(true);
    const text = await ai.explain(focus, documents.find((d) => d.id === focus.documentId), style, profile!.level, subjects.find((s) => s.id === focus.subjectId)?.discipline ?? "generique");
    addChat({ role: "assistant", mode, content: text });
    setBusy(false);
  };

  const suggestions = useMemo(() => {
    const defs = concepts.filter((c) => c.kind === "definition" && c.label.split(" ").length <= 4);
    if (mode === "mes-cours") return defs.slice(0, 3).map((c) => `C'est quoi « ${c.label} » ?`);
    if (mode === "comprendre") return defs.filter((c) => c.bloom.includes("comprendre")).slice(-3).map((c) => c.label);
    if (mode === "reviser") return ["Interroge-moi"];
    return ["Que dois-je faire maintenant ?"];
  }, [mode, concepts]);

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col lg:h-[calc(100vh-5rem)]">
      <PageHeader title="Assistant JecUp" actions={messages.length > 0 && <Button variant="ghost" size="sm" onClick={clearChat}><Trash2 /> Effacer</Button>} />
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setMode(id); setPending(null); }} className={cn("flex items-center justify-center gap-2 rounded-xl border p-2.5 text-sm font-semibold", mode === id ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-muted")}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        {MODES.find((m) => m.id === mode)!.hint}
        {docFilter && mode === "mes-cours" && <> Limité au cours <b>{scopeDocs[0]?.title}</b>. <Link to="/assistant" className="text-primary">Tous mes cours</Link></>}
      </p>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
              <Mascot size={72} />
              <p className="font-brand text-xl text-[hsl(var(--brand-violet))]">Salut ! On révise ensemble ?</p>
              <p>Commence par une question, ou essaie :</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border bg-card px-3 py-1.5 text-foreground hover:border-primary">{s}</button>)}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex items-end gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && <Mascot size={32} className="mb-1" />}
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                <RichText text={m.content} />
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-border/60 pt-2">
                    <p className="text-xs font-semibold text-muted-foreground">Sources</p>
                    {m.sources.map((s) => {
                      const d = documents.find((x) => x.id === s.documentId);
                      return (
                        <Link key={s.chunkId} to={`/cours/${s.documentId}`} className="block rounded-lg bg-card p-2 text-xs hover:ring-1 hover:ring-primary">
                          <span className="font-semibold">{d?.title ?? "Document supprimé"}</span> · p. {s.page}
                          <span className="mt-0.5 block text-muted-foreground">« {s.excerpt} »</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
                {m.general && (
                  <div className="mt-3 rounded-lg border border-dashed bg-card p-2 text-xs">
                    <Badge tone="warning" className="mb-1">Explication générale — hors de tes cours</Badge>
                    <RichText text={m.general} />
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mascot size={24} /> JecUp réfléchit…</div>}
          <div ref={endRef} />
        </div>

        {mode === "comprendre" && focus && (
          <div className="flex flex-wrap gap-2 border-t px-4 py-2">
            <span className="self-center text-xs text-muted-foreground">« {focus.label} » :</span>
            <Button size="sm" variant="outline" onClick={() => explainFocus("simple", "Plus simple")}>Plus simple</Button>
            <Button size="sm" variant="outline" onClick={() => explainFocus("detail", "Plus détaillé")}>Plus détaillé</Button>
            <Button size="sm" variant="outline" onClick={() => explainFocus("exemple", "Donne-moi un exemple")}>Donne-moi un exemple</Button>
            <Button size="sm" variant="outline" onClick={() => explainFocus("analogie", "Fais une analogie")}>Fais une analogie</Button>
          </div>
        )}
        {mode === "coach" && messages.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button size="sm" onClick={() => navigate(dailyPriority({ subjects, concepts, mastery, events, tasks, today }).to)}>Lancer l'action proposée</Button>
          </div>
        )}
        <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "reviser" ? (pending ? "Ta réponse (ou A, B, C…)" : "Écris « go » pour commencer") : mode === "comprendre" ? "Quelle notion veux-tu comprendre ?" : "Pose ta question"}
          />
          <Button type="submit" disabled={busy || !input.trim()} aria-label="Envoyer"><Send /></Button>
        </form>
      </Card>
    </div>
  );
}

/** Rendu minimal : **gras** et retours à la ligne. */
function RichText({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-line leading-relaxed">
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>,
      )}
    </div>
  );
}
