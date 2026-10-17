import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileText, FolderPlus, Play, ScanLine, Star, Trash2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Input } from "@/components/ui/primitives";
import { MasteryBadge, Ring } from "@/components/bits";
import { BLOOM_LABEL, DISCIPLINES, DOC_TYPE_LABEL } from "@/data/academic";
import { subjectProgress } from "@/lib/stats";
import { cn, formatDay, todayISO } from "@/lib/utils";

export default function SubjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { subjects, documents, concepts, mastery, events, updateSubject, removeSubject, updateDocument } = useStore();
  const subject = subjects.find((s) => s.id === id);
  const [folder, setFolder] = useState<string>("Tous");
  const [newFolder, setNewFolder] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const docs = useMemo(() => documents.filter((d) => d.subjectId === id), [documents, id]);
  const own = useMemo(() => concepts.filter((c) => c.subjectId === id), [concepts, id]);

  if (!subject) return <EmptyState icon="🤔" title="Matière introuvable"><Link to="/matieres" className="text-primary">Retour aux matières</Link></EmptyState>;
  const profile = DISCIPLINES[subject.discipline];
  const p = subjectProgress(subject, concepts, mastery);
  const shown = folder === "Tous" ? docs : folder === "Favoris" ? docs.filter((d) => d.favorite) : docs.filter((d) => d.folder === folder);
  const exams = events.filter((e) => e.subjectId === id && (e.kind === "controle" || e.kind === "examen") && e.date >= todayISO());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl text-3xl" style={{ background: subject.color + "22" }}>{profile.emoji}</div>
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold">{subject.name}</h1>
          <p className="text-sm text-muted-foreground">
            Profil pédagogique : {profile.label} · je repère {profile.detects.slice(0, 3).join(", ").toLowerCase()}…
          </p>
        </div>
        <Ring value={p.avg} size={64} color={subject.color} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate(`/import?subject=${subject.id}`)}><ScanLine /> Ajouter un cours</Button>
        <Button variant="secondary" disabled={!own.length} onClick={() => navigate(`/quiz?subject=${subject.id}`)}><Play /> Réviser la matière</Button>
        <Button variant="outline" disabled={!p.fragile} onClick={() => navigate(`/quiz?subject=${subject.id}&focus=weak`)}>Révision ciblée ({p.fragile})</Button>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Importance</span>
          {[1, 2, 3, 4, 5].map((w) => (
            <button key={w} onClick={() => updateSubject(subject.id, { weight: w })} aria-label={`Importance ${w}`}>
              <Star className={cn("h-4 w-4", w <= subject.weight ? "fill-warning text-warning" : "text-muted-foreground")} />
            </button>
          ))}
        </div>
      </div>

      {exams.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {exams.map((e) => <Badge key={e.id} tone="danger">📝 {e.title} — {formatDay(e.date)}</Badge>)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit p-3">
          <div className="space-y-1">
            {["Tous", "Favoris", ...subject.folders].map((f) => {
              const n = f === "Tous" ? docs.length : f === "Favoris" ? docs.filter((d) => d.favorite).length : docs.filter((d) => d.folder === f).length;
              return (
                <button key={f} onClick={() => setFolder(f)} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm", folder === f ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted")}>
                  <span>{f === "Favoris" ? "⭐ " : "📁 "}{f}</span>
                  <span className="text-xs text-muted-foreground">{n}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-1 border-t pt-3">
            <Input className="h-8" placeholder="Nouveau dossier" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} />
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!newFolder.trim()} onClick={() => { updateSubject(subject.id, { folders: [...subject.folders, newFolder.trim()] }); setNewFolder(""); }} aria-label="Créer le dossier">
              <FolderPlus />
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          {shown.length === 0 ? (
            <EmptyState icon="📂" title="Aucun document ici">Scanne une leçon ou colle tes notes : je l'analyse et je la range automatiquement.</EmptyState>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {shown.map((d) => (
                <Card key={d.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/cours/${d.id}`} className="flex min-w-0 items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-semibold hover:text-primary">{d.title}</span>
                    </Link>
                    <button onClick={() => updateDocument(d.id, { favorite: !d.favorite })} aria-label="Favori">
                      <Star className={cn("h-4 w-4", d.favorite ? "fill-warning text-warning" : "text-muted-foreground")} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge tone="muted">{DOC_TYPE_LABEL[d.docType]}</Badge>
                    <Badge tone="outline">📁 {d.folder}</Badge>
                    <Badge tone="outline">{concepts.filter((c) => c.documentId === d.id).length} notions</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Notions de la matière ({own.length})</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {own.length === 0 && <p className="text-sm text-muted-foreground">Les notions apparaîtront après l'import d'un cours.</p>}
              {own.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="font-semibold">{c.label}</div>
                    <div className="text-xs text-muted-foreground">{c.bloom.map((b) => BLOOM_LABEL[b]).join(" + ")}</div>
                  </div>
                  <MasteryBadge state={mastery[c.id]} />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            {confirmDelete ? (
              <div className="flex items-center gap-2 text-sm">
                <span>Supprimer la matière et ses {docs.length} documents ?</span>
                <Button size="sm" variant="destructive" onClick={() => { removeSubject(subject.id); navigate("/matieres"); }}>Confirmer</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Annuler</Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setConfirmDelete(true)}><Trash2 /> Supprimer la matière</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
