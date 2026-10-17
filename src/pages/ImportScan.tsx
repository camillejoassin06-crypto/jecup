import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, Camera, CheckCircle2, ClipboardPaste, FileUp, Loader2, Trash2, Wand2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Label, PageHeader, Progress, Select, Textarea } from "@/components/ui/primitives";
import { extractFromFiles, type PageQuality } from "@/services/ocr";
import { classifyDiscipline } from "@/engine/classifier";
import { ingestDocument } from "@/engine/pipeline";
import { BASE_FOLDERS, DISCIPLINES } from "@/data/academic";
import { cn, uid } from "@/lib/utils";

type Mode = "photo" | "pdf" | "texte";
type Phase = "source" | "processing" | "review";

const SAMPLE = `# Les volcans
Volcan : relief formé par l'accumulation de matériaux issus de la remontée de magma.
Magma : roche en fusion située en profondeur.
Éruption effusive : éruption caractérisée par des coulées de lave fluide.
Éruption explosive : éruption violente avec projections de cendres et de blocs.
Éruption de la montagne Pelée en Martinique : 1902.`;

export default function ImportScan() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { subjects, addDocument, addSubject } = useStore();
  const [mode, setMode] = useState<Mode>("photo");
  const [phase, setPhase] = useState<Phase>("source");
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string>(params.get("subject") ?? "auto");
  const [folder, setFolder] = useState("Cours");
  const [progress, setProgress] = useState({ p: 0, label: "" });
  const [quality, setQuality] = useState<PageQuality[]>([]);
  const [error, setError] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const guess = useMemo(() => (text.length > 40 ? classifyDiscipline(title + "\n" + text) : null), [text, title]);
  const guessedSubject = guess ? subjects.find((s) => s.discipline === guess.discipline) : undefined;
  const target = subjectId === "auto" ? guessedSubject : subjects.find((s) => s.id === subjectId);
  const folders = target?.folders ?? BASE_FOLDERS;

  const runOcr = async (list: File[]) => {
    setError(null);
    setPhase("processing");
    try {
      const res = await extractFromFiles(list, (p, label) => setProgress({ p: p * 100, label }));
      setText(res.text);
      setQuality(res.quality);
      if (!title) setTitle(list[0]?.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ") ?? "");
      setPhase("review");
    } catch (e) {
      setError("Impossible de lire ce fichier. Essaie une photo plus nette, ou colle le texte directement. " + (e instanceof Error ? `(${e.message})` : ""));
      setPhase("source");
    }
  };

  const validate = () => {
    let subject = target;
    if (!subject) {
      // aucune matière correspondante : on la crée à partir de la classification
      const d = guess?.discipline ?? "generique";
      subject = {
        id: uid("s_"),
        name: DISCIPLINES[d].label,
        discipline: d,
        color: DISCIPLINES[d].color,
        weight: 3,
        folders: [...new Set([...BASE_FOLDERS, ...DISCIPLINES[d].folders])],
      };
      addSubject(subject);
    }
    const { document, concepts } = ingestDocument({
      title: title.trim() || "Cours sans titre",
      subjectId: subject.id,
      subjectDiscipline: subject.discipline,
      rawText: text,
      source: mode === "texte" ? "texte" : mode === "pdf" ? "pdf" : "photo",
      folder: subject.folders.includes(folder) ? folder : "Cours",
    });
    addDocument(document, concepts);
    navigate(`/cours/${document.id}?nouveau=1`);
  };

  return (
    <div>
      <PageHeader title="Scanner un cours" subtitle="Photo, PDF ou texte : je lis, j'analyse et je prépare tes révisions." />

      {phase === "source" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["photo", Camera, "Photos"],
                  ["pdf", FileUp, "PDF / fichier"],
                  ["texte", ClipboardPaste, "Coller du texte"],
                ] as const).map(([m, Icon, label]) => (
                  <button key={m} onClick={() => setMode(m)} className={cn("flex flex-col items-center gap-1 rounded-xl border p-3 text-sm font-semibold", mode === m ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
                    <Icon className="h-5 w-5" /> {label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === "photo" && (
                <>
                  <p className="text-sm text-muted-foreground">
                    <b>Mode scan continu :</b> photographie tes pages l'une après l'autre. Je détecte les pages floues et les doublons, et je les remets dans l'ordre.
                  </p>
                  <input ref={camRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { setFiles([...files, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} />
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {files.map((f, i) => (
                      <div key={i} className="group relative aspect-[3/4] overflow-hidden rounded-lg border bg-muted">
                        <img src={URL.createObjectURL(f)} alt={`Page ${i + 1}`} className="h-full w-full object-cover" />
                        <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white">{i + 1}</span>
                        <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100" aria-label="Retirer la page">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => camRef.current?.click()} className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary">
                      <Camera className="h-6 w-6" /> {files.length ? "Page suivante" : "Prendre une photo"}
                    </button>
                  </div>
                  <Button className="w-full" disabled={!files.length} onClick={() => runOcr(files)}>
                    <Wand2 /> Lire {files.length > 1 ? `les ${files.length} pages` : "la page"}
                  </Button>
                </>
              )}
              {mode === "pdf" && (
                <>
                  <input ref={fileRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); if (f.length) runOcr(f); }} />
                  <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-10 text-muted-foreground hover:border-primary hover:text-primary">
                    <FileUp className="h-8 w-8" />
                    <span className="font-semibold">Choisir un PDF ou un fichier texte</span>
                    <span className="text-xs">PDF de cours, diaporama exporté en PDF, PDF scanné (OCR automatique), .txt</span>
                  </button>
                  <p className="text-xs text-muted-foreground">Pour un document Word ou une présentation, exporte-le en PDF ou copie-colle son texte.</p>
                </>
              )}
              {mode === "texte" && (
                <>
                  <Textarea className="min-h-[260px] font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder={"Colle ici ta leçon ou tes notes.\n\nAstuce : les lignes « Notion : définition » et « 1789 : événement » sont très bien reconnues."} />
                  <div className="flex gap-2">
                    <Button className="flex-1" disabled={text.trim().length < 20} onClick={() => setPhase("review")}>Continuer</Button>
                    <Button variant="ghost" onClick={() => { setText(SAMPLE); setTitle("Les volcans"); }}>Exemple</Button>
                  </div>
                </>
              )}
              {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardHeader><CardTitle>Ce que je fais ensuite</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-muted-foreground">
                {["Je lis le texte (OCR)", "Tu corriges si besoin", "J'identifie la matière et le type de document", "Je repère les notions et je les classe (mémoriser, comprendre, appliquer, analyser)", "Je te propose la révision la plus adaptée"].map((s, i) => (
                  <li key={s} className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">{i + 1}</span>{s}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}

      {phase === "processing" && (
        <Card className="mx-auto max-w-lg p-8 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 font-semibold">{progress.label || "Lecture en cours…"}</p>
          <Progress value={progress.p} className="mt-4" />
          <p className="mt-3 text-xs text-muted-foreground">La première lecture télécharge le modèle de reconnaissance du français (quelques secondes).</p>
        </Card>
      )}

      {phase === "review" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Document original</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {quality.some((q) => q.blurry || q.duplicateOf) && (
                <div className="space-y-1 rounded-lg bg-warning/10 p-3 text-sm">
                  {quality.filter((q) => q.blurry).map((q) => <p key={q.name + "b"} className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> « {q.name} » semble floue : vérifie le texte détecté ou reprends la photo.</p>)}
                  {quality.filter((q) => q.duplicateOf).map((q) => <p key={q.name + "d"} className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> « {q.name} » ressemble à « {q.duplicateOf} » : doublon ignoré.</p>)}
                </div>
              )}
              {quality.length > 0 ? (
                <div className="grid max-h-[520px] grid-cols-2 gap-2 overflow-y-auto">
                  {quality.map((q) => (
                    <img key={q.name} src={q.previewUrl} alt={q.name} className={cn("rounded-lg border", q.duplicateOf && "opacity-40")} />
                  ))}
                </div>
              ) : (
                <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">{mode === "texte" ? text : files[0]?.name ?? "Fichier importé"}</pre>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Texte détecté</CardTitle>
              <p className="text-sm text-muted-foreground">Corrige les erreurs de lecture avant de valider : c'est ce texte que j'analyse.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea className="min-h-[260px] font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="title">Titre du cours</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. La Révolution française" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="subj">Matière</Label>
                  <Select id="subj" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                    <option value="auto">✨ Détecter automatiquement</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="folder">Dossier</Label>
                  <Select id="folder" value={folder} onChange={(e) => setFolder(e.target.value)}>
                    {folders.map((f) => <option key={f}>{f}</option>)}
                  </Select>
                </div>
              </div>
              {guess && (
                <div className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
                  <b>Matière probable :</b> {DISCIPLINES[guess.discipline].emoji} {DISCIPLINES[guess.discipline].label}{" "}
                  <Badge tone="muted">{Math.round(guess.confidence * 100)}% de confiance</Badge>
                  {subjectId === "auto" && !guessedSubject && <p className="mt-1 text-xs">Tu n'as pas encore cette matière : je la créerai.</p>}
                  {subjectId !== "auto" && target && target.discipline !== guess.discipline && guess.confidence > 0.7 && (
                    <p className="mt-1 text-xs">Ce texte ressemble plutôt à un cours de {DISCIPLINES[guess.discipline].label}. Vérifie la matière choisie.</p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setPhase("source")}>Retour</Button>
                <Button className="flex-1" size="lg" disabled={text.trim().length < 20} onClick={validate}>
                  <CheckCircle2 /> Valider mon cours
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
