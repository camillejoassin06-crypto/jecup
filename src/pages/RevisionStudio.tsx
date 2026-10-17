import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Play, Sparkles } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle, Chip, EmptyState, PageHeader } from "@/components/ui/primitives";
import { SubjectTag } from "@/components/bits";
import { recommendRevision } from "@/engine/revisionAgent";
import { DIFFICULTY_LABEL } from "@/engine/quizAgent";
import { atRisk } from "@/engine/memoryAgent";
import type { QuestionType } from "@/types";
import { cn } from "@/lib/utils";

const FORMATS: { id: string; label: string; types: QuestionType[]; hint: string }[] = [
  { id: "auto", label: "✨ Laisser JecUp choisir", types: [], hint: "Formats adaptés à chaque notion" },
  { id: "qcm", label: "QCM", types: ["qcm"], hint: "Choisir la bonne réponse" },
  { id: "vf", label: "Vrai ou faux", types: ["vrai-faux"], hint: "Rapide, idéal pour démarrer" },
  { id: "trous", label: "Texte à trous", types: ["trous"], hint: "Rappel actif, sans choix proposés" },
  { id: "assoc", label: "Associations", types: ["association"], hint: "Notion ↔ définition, auteur ↔ idée" },
  { id: "flash", label: "Flashcards", types: ["trous", "association"], hint: "Mot ↔ sens, à l'oral dans ta tête" },
  { id: "chrono", label: "Chronologie", types: ["date"], hint: "Frise puis questions de dates" },
  { id: "mix", label: "Session mixte", types: ["qcm", "vrai-faux", "trous", "association", "date"], hint: "Un peu de tout" },
];

export default function RevisionStudio() {
  const navigate = useNavigate();
  const { documents, concepts, subjects, mastery } = useStore();
  const [docId, setDocId] = useState<string | null>(documents[0]?.id ?? null);
  const [format, setFormat] = useState("auto");
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const doc = documents.find((d) => d.id === docId);
  const own = useMemo(() => concepts.filter((c) => c.documentId === docId), [concepts, docId]);
  const subject = subjects.find((s) => s.id === doc?.subjectId);
  const reco = doc ? recommendRevision(own, subject?.discipline ?? doc.discipline) : null;
  const dates = own.filter((c) => c.kind === "date" || c.kind === "evenement").sort((a, b) => Number(a.detail.match(/\d{3,4}/)?.[0] ?? 0) - Number(b.detail.match(/\d{3,4}/)?.[0] ?? 0));
  const risky = atRisk(concepts.map((c) => c.id), mastery);

  if (!documents.length) {
    return (
      <div>
        <PageHeader title="Revision Studio" />
        <EmptyState icon="✨" title="Importe d'abord un cours">
          <Button className="mt-2" onClick={() => navigate("/import")}>Scanner un cours</Button>
        </EmptyState>
      </div>
    );
  }

  const start = () => {
    const f = FORMATS.find((x) => x.id === format)!;
    const q = new URLSearchParams({ doc: docId! });
    q.set("difficulty", String(difficulty ?? reco?.startDifficulty ?? 2));
    if (f.types.length) q.set("types", f.types.join(","));
    navigate(`/quiz?${q}`);
  };

  return (
    <div>
      <PageHeader title="Revision Studio" subtitle="Choisis un cours : je te recommande le format le plus efficace." />
      {risky.length > 0 && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="flex items-center gap-2 text-sm"><Brain className="h-5 w-5 text-primary" /> <b>{risky.length} notions</b> risquent d'être oubliées.</p>
          <Button size="sm" variant="secondary" onClick={() => navigate("/quiz?focus=risk")}>Réviser ce que je risque d'oublier</Button>
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle>Mes cours</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {documents.map((d) => (
              <button key={d.id} onClick={() => setDocId(d.id)} className={cn("w-full rounded-lg p-2 text-left", d.id === docId ? "bg-primary/10" : "hover:bg-muted")}>
                <div className={cn("text-sm font-semibold", d.id === docId && "text-primary")}>{d.title}</div>
                <SubjectTag subject={subjects.find((s) => s.id === d.subjectId)} />
              </button>
            ))}
          </CardContent>
        </Card>

        {doc && reco && (
          <div className="space-y-6">
            <Card className="border-primary/30 bg-primary/5 p-5">
              <div className="flex gap-3">
                <Sparkles className="h-6 w-6 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">{reco.message}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Durée conseillée : {reco.durationMin} min · {own.length} notions</p>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>Format</CardTitle></CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {FORMATS.map((f) => (
                  <Chip key={f.id} active={format === f.id} onClick={() => setFormat(f.id)} disabled={f.id === "chrono" && dates.length < 2}>
                    <div className="font-semibold">{f.label}</div>
                    <div className="text-xs text-muted-foreground">{f.id === "chrono" && dates.length < 2 ? "Pas assez de dates dans ce cours" : f.hint}</div>
                  </Chip>
                ))}
              </CardContent>
            </Card>

            {format === "chrono" && dates.length >= 2 && (
              <Card>
                <CardHeader><CardTitle>Frise chronologique</CardTitle></CardHeader>
                <CardContent>
                  <ol className="relative ml-3 border-l-2 border-primary/30">
                    {dates.map((c) => (
                      <li key={c.id} className="mb-4 ml-5">
                        <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-primary" />
                        <div className="font-display font-bold text-primary">{c.detail}</div>
                        <div className="text-sm">{c.label}</div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Niveau de départ</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((d) => (
                  <Chip key={d} active={(difficulty ?? reco.startDifficulty) === d} onClick={() => setDifficulty(d)}>{DIFFICULTY_LABEL[d]}</Chip>
                ))}
                <p className="w-full text-xs text-muted-foreground">La difficulté s'adapte ensuite automatiquement à tes réponses.</p>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3">
              <Badge tone="muted">≈ {reco.durationMin} min</Badge>
              <Button size="lg" onClick={start} disabled={!own.length}><Play /> Commencer</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
