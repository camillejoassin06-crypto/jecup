import { useMemo, useState } from "react";
import { CalendarPlus, Check, Clock, ListOrdered, Plus, Trash2, Wand2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, Input, PageHeader, Select } from "@/components/ui/primitives";
import { SubjectTag } from "@/components/bits";
import { parseTask, type ParsedTask } from "@/engine/taskParser";
import { nextExamFor } from "@/engine/plannerAgent";
import { addDays, cn, daysBetween, formatDay, relativeDay, todayISO, weekStart } from "@/lib/utils";
import type { Task, TaskKind } from "@/types";

const KINDS: TaskKind[] = ["devoirs", "exposé", "révision", "lecture", "exercices", "projet", "autre"];

export default function Tasks() {
  const { tasks, subjects, events, addTask, updateTask, removeTask, addEvent, replan } = useStore();
  const today = todayISO();
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<ParsedTask | null>(null);
  const [ordered, setOrdered] = useState<string[] | null>(null);
  const sub = (id?: string) => subjects.find((s) => s.id === id);

  const groups = useMemo(() => {
    const endOfWeek = addDays(weekStart(today), 6);
    const open = tasks.filter((t) => !t.done);
    return [
      { id: "retard", label: "En retard", items: open.filter((t) => t.due && t.due < today) },
      { id: "auj", label: "Aujourd'hui", items: open.filter((t) => t.due === today) },
      { id: "semaine", label: "Cette semaine", items: open.filter((t) => t.due && t.due > today && t.due <= endOfWeek) },
      { id: "avenir", label: "À venir", items: open.filter((t) => !t.due || t.due > endOfWeek) },
      { id: "faites", label: "Terminées", items: tasks.filter((t) => t.done) },
    ];
  }, [tasks, today]);

  const analyze = () => {
    if (!input.trim()) return;
    setPreview(parseTask(input, subjects, today));
  };

  const confirm = (withExam: boolean) => {
    if (!preview) return;
    addTask({ title: preview.title, subjectId: preview.subjectId, due: preview.due, kind: preview.kind, estimatedMin: preview.estimatedMin });
    if (withExam && preview.exam?.date) {
      addEvent({ kind: "controle", title: preview.exam.title, subjectId: preview.subjectId, date: preview.exam.date, durationMin: 55, status: "prevu" });
      replan();
    }
    setPreview(null);
    setInput("");
  };

  /** Ordre proposé : urgence, importance de la matière, évaluation proche, durée. */
  const organize = () => {
    const open = tasks.filter((t) => !t.done);
    const score = (t: Task) => {
      const d = t.due ? daysBetween(today, t.due) : 14;
      const urgency = d < 0 ? 12 : 10 / (d + 1);
      const weight = sub(t.subjectId)?.weight ?? 3;
      const exam = t.subjectId ? nextExamFor(t.subjectId, events, today) : undefined;
      const examBoost = exam ? 4 / (daysBetween(today, exam.date) + 1) : 0;
      const quickWin = t.estimatedMin <= 20 ? 0.6 : 0;
      return urgency * 2 + weight * 0.6 + examBoost * 2 + quickWin;
    };
    setOrdered(open.sort((a, b) => score(b) - score(a)).map((t) => t.id));
  };

  return (
    <div>
      <PageHeader title="Tâches" subtitle="Écris comme tu parles, je m'occupe du reste." actions={<Button variant="secondary" onClick={organize}><ListOrdered /> Organiser mes tâches</Button>} />

      <Card className="mb-6 p-4">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); analyze(); }}>
          <Input value={input} onChange={(e) => { setInput(e.target.value); setPreview(null); }} placeholder="Ex. « Finir mon exposé de SVT jeudi » ou « contrôle de maths vendredi »" />
          <Button type="submit" disabled={!input.trim()}><Wand2 /> Analyser</Button>
        </form>
        {preview && (
          <div className="mt-4 rounded-xl border bg-muted/50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Aperçu avant validation</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Input className="lg:col-span-2" value={preview.title} onChange={(e) => setPreview({ ...preview, title: e.target.value })} aria-label="Action" />
              <Select value={preview.subjectId ?? ""} onChange={(e) => setPreview({ ...preview, subjectId: e.target.value || undefined })} aria-label="Matière">
                <option value="">Sans matière</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Input type="date" value={preview.due ?? ""} onChange={(e) => setPreview({ ...preview, due: e.target.value || undefined })} aria-label="Date" />
              <div className="flex gap-2">
                <Select value={preview.kind} onChange={(e) => setPreview({ ...preview, kind: e.target.value as TaskKind })} aria-label="Type">
                  {KINDS.map((k) => <option key={k}>{k}</option>)}
                </Select>
                <Input type="number" min={5} step={5} className="w-20" value={preview.estimatedMin} onChange={(e) => setPreview({ ...preview, estimatedMin: Number(e.target.value) })} aria-label="Durée (min)" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button onClick={() => confirm(false)}><Check /> Ajouter la tâche</Button>
              {preview.exam && (
                <Button variant="secondary" onClick={() => confirm(true)} disabled={!preview.exam.date}>
                  <CalendarPlus /> Ajouter aussi le contrôle au planning
                </Button>
              )}
              {preview.exam && <span className="text-xs text-muted-foreground">J'ai détecté une évaluation : je peux planifier tes révisions avant.</span>}
            </div>
          </div>
        )}
      </Card>

      {ordered && ordered.length > 0 && (
        <Card className="mb-6 border-primary/30 bg-primary/5 p-4">
          <p className="mb-2 font-semibold">Ordre conseillé</p>
          <ol className="space-y-1 text-sm">
            {ordered.map((id, i) => {
              const t = tasks.find((x) => x.id === id);
              if (!t) return null;
              return (
                <li key={id} className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                  <span className="font-medium">{t.title}</span>
                  <span className="text-muted-foreground">· {t.due ? relativeDay(t.due, today) : "sans date"} · {t.estimatedMin} min</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">Basé sur l'urgence, l'importance de la matière, tes évaluations proches et la durée.</p>
        </Card>
      )}

      <div className="space-y-6">
        {groups.map((g) =>
          g.items.length === 0 ? null : (
            <div key={g.id}>
              <h2 className={cn("mb-2 text-sm font-bold uppercase tracking-wide", g.id === "retard" ? "text-destructive" : "text-muted-foreground")}>
                {g.label} <span className="font-normal">({g.items.length})</span>
              </h2>
              <Card>
                <CardContent className="divide-y p-0">
                  {g.items.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={t.done} onChange={() => updateTask(t.id, { done: !t.done })} aria-label="Terminée" />
                      <div className="min-w-0 flex-1">
                        <div className={cn("font-medium", t.done && "text-muted-foreground line-through")}>{t.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {t.due && <span>{formatDay(t.due)}</span>}
                          <SubjectTag subject={sub(t.subjectId)} />
                          <Badge tone="muted">{t.kind}</Badge>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.estimatedMin} min</span>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeTask(t.id)} aria-label="Supprimer"><Trash2 /></Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ),
        )}
        {tasks.length === 0 && (
          <p className="text-center text-sm text-muted-foreground"><Plus className="mr-1 inline h-4 w-4" />Ajoute ta première tâche ci-dessus.</p>
        )}
      </div>
    </div>
  );
}
