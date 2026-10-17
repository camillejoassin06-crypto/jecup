import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Play } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Progress } from "@/components/ui/primitives";
import { MasteryBadge, SubjectDot } from "@/components/bits";
import { atRisk, effectiveScore, memoryBuckets, type MemoryBucket } from "@/engine/memoryAgent";
import { cn, relativeDay, todayISO } from "@/lib/utils";

const TABS: { id: MemoryBucket; label: string; emoji: string; hint: string }[] = [
  { id: "aujourdhui", label: "À revoir aujourd'hui", emoji: "📅", hint: "C'est le bon moment pour les consolider." },
  { id: "fragiles", label: "Notions fragiles", emoji: "🌱", hint: "Encore des erreurs : on les retravaille en douceur." },
  { id: "oubliees", label: "Probablement oubliées", emoji: "💭", hint: "Pas revues depuis longtemps : un rappel s'impose." },
  { id: "acquises", label: "Notions acquises", emoji: "✅", hint: "Solides pour l'instant. Je te les reproposerai plus tard." },
  { id: "nouvelles", label: "Jamais testées", emoji: "✨", hint: "À découvrir." },
];

export default function Memory() {
  const navigate = useNavigate();
  const { concepts, mastery, subjects, subjects: subs } = useStore();
  const [tab, setTab] = useState<MemoryBucket>("aujourdhui");
  const today = todayISO();
  const buckets = useMemo(() => memoryBuckets(concepts.map((c) => c.id), mastery, today), [concepts, mastery, today]);
  const risky = atRisk(concepts.map((c) => c.id), mastery, today);
  const list = buckets[tab].map((id) => concepts.find((c) => c.id === id)!).filter(Boolean);
  const globalAvg = concepts.length ? Math.round(concepts.reduce((t, c) => t + effectiveScore(mastery[c.id], today), 0) / concepts.length) : 0;

  if (!concepts.length) {
    return (
      <div>
        <PageHeader title="Ma mémoire" />
        <EmptyState icon="🧠" title="Ta mémoire est encore vide">Importe un cours et fais un premier test : je suivrai ensuite chaque notion.</EmptyState>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Ma mémoire"
        subtitle={`Maîtrise moyenne : ${globalAvg}/100 · ${concepts.length} notions suivies`}
        actions={
          <Button size="lg" disabled={!risky.length} onClick={() => navigate("/quiz?focus=risk")}>
            <Brain /> Réviser ce que je risque d'oublier {risky.length ? `(${risky.length})` : ""}
          </Button>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("rounded-2xl border p-3 text-left transition", tab === t.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-muted")}>
            <div className="text-xl">{t.emoji}</div>
            <div className="mt-1 font-display text-2xl font-extrabold">{buckets[t.id].length}</div>
            <div className="text-xs font-semibold text-muted-foreground">{t.label}</div>
          </button>
        ))}
      </div>
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{TABS.find((t) => t.id === tab)!.hint}</p>
          {list.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => navigate(`/quiz?concepts=${list.slice(0, 12).map((c) => c.id).join(",")}&difficulty=${tab === "acquises" ? 4 : 2}`)}>
              <Play /> Réviser cette liste
            </Button>
          )}
        </div>
        {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Rien dans cette catégorie.</p>}
        <div className="divide-y">
          {list.map((c) => {
            const s = mastery[c.id];
            const sub = subjects.find((x) => x.id === c.subjectId) ?? subs[0];
            return (
              <div key={c.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[1fr_160px_auto]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-semibold"><SubjectDot subject={sub} /> <span className="truncate">{c.label}</span></div>
                  <div className="text-xs text-muted-foreground">
                    {s?.attempts ? `${s.correct}/${s.attempts} réussites · prochaine révision ${s.nextReview ? relativeDay(s.nextReview, today) : "—"}` : "Jamais testée"}
                  </div>
                </div>
                <Progress value={effectiveScore(s, today)} className="hidden sm:block" barClassName={effectiveScore(s, today) < 40 ? "bg-destructive" : effectiveScore(s, today) < 65 ? "bg-warning" : "bg-success"} />
                <MasteryBadge state={s} />
              </div>
            );
          })}
        </div>
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">
        Le score de maîtrise combine tes résultats, tes erreurs répétées, ton temps de réponse, tes réussites espacées dans le temps et ta capacité à réussir des questions d'application. Une seule bonne réponse ne suffit jamais à « maîtriser » une notion.
      </p>
    </div>
  );
}
