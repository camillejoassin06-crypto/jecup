import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BookOpen, Play, Sparkles, Trash2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui/primitives";
import { MasteryBadge } from "@/components/bits";
import { BLOOM_LABEL, DISCIPLINES, DOC_TYPE_LABEL } from "@/data/academic";
import { recommendRevision } from "@/engine/revisionAgent";
import type { BloomLevel, ConceptKind } from "@/types";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<ConceptKind, string> = {
  definition: "Définition", date: "Date", formule: "Formule", personne: "Personne", oeuvre: "Œuvre",
  propriete: "Propriété", theoreme: "Théorème", methode: "Méthode", evenement: "Événement", vocabulaire: "Vocabulaire",
  regle: "Règle / loi", processus: "Processus", citation: "Citation du cours", concept: "Concept",
};

const BLOOM_STYLE: Record<BloomLevel, string> = {
  memoriser: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  comprendre: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  appliquer: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  analyser: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

export default function CourseView() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { documents, concepts, subjects, mastery, removeDocument } = useStore();
  const doc = documents.find((d) => d.id === id);
  const [tab, setTab] = useState<"analyse" | "texte">("analyse");
  const [bloomFilter, setBloomFilter] = useState<BloomLevel | null>(null);
  const own = useMemo(() => concepts.filter((c) => c.documentId === id), [concepts, id]);

  if (!doc) return <EmptyState icon="📄" title="Cours introuvable"><Link to="/matieres" className="text-primary">Retour</Link></EmptyState>;
  const subject = subjects.find((s) => s.id === doc.subjectId);
  const reco = recommendRevision(own, subject?.discipline ?? doc.discipline);
  const byBloom = (b: BloomLevel) => own.filter((c) => c.bloom.includes(b));
  const shown = bloomFilter ? byBloom(bloomFilter) : own;
  const fresh = params.get("nouveau") === "1";

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/matieres/${doc.subjectId}`} className="text-sm font-semibold text-muted-foreground hover:text-primary">← {subject?.name}</Link>
        <h1 className="mt-1 text-3xl font-extrabold">{doc.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{DISCIPLINES[doc.discipline].emoji} {DISCIPLINES[doc.discipline].label} · {Math.round(doc.disciplineConfidence * 100)}%</Badge>
          <Badge tone="muted">{DOC_TYPE_LABEL[doc.docType]}</Badge>
          <Badge tone="muted">Complexité {"●".repeat(doc.complexity)}{"○".repeat(3 - doc.complexity)}</Badge>
          <Badge tone="outline">📁 {doc.folder}</Badge>
          {doc.tags.map((t) => <Badge key={t} tone="outline">#{t}</Badge>)}
        </div>
      </div>

      {fresh && (
        <Card className="border-success/40 bg-success/10 p-4 text-sm">
          ✅ Cours analysé : <b>{own.length} notions</b> détectées dans {doc.sections.length || 1} section{doc.sections.length > 1 ? "s" : ""}. Ton planning a été mis à jour.
        </Card>
      )}

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <Sparkles className="h-8 w-8 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{reco.message}</p>
            <div className="mt-2 flex flex-wrap gap-1">{reco.formats.map((f) => <Badge key={f}>{f}</Badge>)}</div>
          </div>
          <Button size="lg" disabled={!own.length} onClick={() => navigate(`/quiz?doc=${doc.id}&difficulty=${reco.startDifficulty}`)}>
            <Play /> Laisser JecUp choisir
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2 border-b">
        {(["analyse", "texte"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-semibold", tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>
            {t === "analyse" ? "Analyse" : "Texte du cours"}
          </button>
        ))}
      </div>

      {tab === "analyse" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Résumé</CardTitle></CardHeader>
              <CardContent><p className="leading-relaxed">{doc.summary}</p></CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Notions importantes</CardTitle>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => setBloomFilter(null)} className={cn("rounded-full px-3 py-1 text-xs font-semibold", !bloomFilter ? "bg-foreground text-background" : "bg-muted")}>Toutes ({own.length})</button>
                  {(["memoriser", "comprendre", "appliquer", "analyser"] as BloomLevel[]).map((b) => (
                    <button key={b} onClick={() => setBloomFilter(b)} className={cn("rounded-full px-3 py-1 text-xs font-semibold", bloomFilter === b ? "ring-2 ring-foreground" : "", BLOOM_STYLE[b])}>
                      {BLOOM_LABEL[b]} ({byBloom(b).length})
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {shown.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune notion détectée. Les lignes du type « Notion : définition », « Date : événement » ou « Théorème : énoncé » sont les mieux reconnues.</p>
                )}
                {shown.map((c) => (
                  <div key={c.id} className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{c.label}</span>
                      <MasteryBadge state={mastery[c.id]} />
                    </div>
                    <p className={cn("mt-1 text-sm text-muted-foreground", c.kind === "formule" && "font-mono text-foreground")}>{c.detail}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge tone="outline">{KIND_LABEL[c.kind]}</Badge>
                      {c.bloom.map((b) => <span key={b} className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", BLOOM_STYLE[b])}>{BLOOM_LABEL[b]}</span>)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Structure</CardTitle></CardHeader>
              <CardContent>
                {doc.sections.length === 0 ? <p className="text-sm text-muted-foreground">Pas de titres détectés.</p> : (
                  <ul className="space-y-1 text-sm">
                    {doc.sections.map((s, i) => <li key={i} className={cn(s.level > 1 && "pl-4 text-muted-foreground")}>{s.level === 1 ? "▸" : "·"} {s.title}</li>)}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>À travailler</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="À mémoriser" n={byBloom("memoriser").length} />
                <Row label="À comprendre" n={byBloom("comprendre").length} />
                <Row label="À savoir appliquer" n={byBloom("appliquer").length} />
                <Row label="À analyser" n={byBloom("analyser").length} />
              </CardContent>
            </Card>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => navigate(`/assistant?doc=${doc.id}`)}><BookOpen /> Poser une question sur ce cours</Button>
              <Button variant="ghost" className="text-muted-foreground" onClick={() => { removeDocument(doc.id); navigate(`/matieres/${doc.subjectId}`); }}><Trash2 /> Supprimer ce cours</Button>
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-5">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{doc.rawText}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, n }: { label: string; n: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{n}</span>
    </div>
  );
}
