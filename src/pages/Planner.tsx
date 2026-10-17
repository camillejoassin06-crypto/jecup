import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, Play, Plus, RefreshCw, Trash2, Wand2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Label, PageHeader, Select } from "@/components/ui/primitives";
import { SubjectDot } from "@/components/bits";
import { missedSessions, SESSION_DURATIONS } from "@/engine/plannerAgent";
import type { EventKind, PlannerEvent } from "@/types";
import { addDays, cn, dayName, formatDay, todayISO, weekStart } from "@/lib/utils";

const KIND_LABEL: Record<EventKind, string> = {
  cours: "Cours", controle: "Contrôle / interro", examen: "Examen (brevet, bac blanc…)", revision: "Révision",
  devoirs: "Devoirs", projet: "Projet", activite: "Activité / sport", rdv: "Rendez-vous",
};
const KIND_STYLE: Partial<Record<EventKind, string>> = {
  controle: "border-l-destructive bg-destructive/5",
  examen: "border-l-destructive bg-destructive/10",
  revision: "border-l-primary bg-primary/5",
  devoirs: "border-l-warning bg-warning/5",
};
const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default function Planner() {
  const navigate = useNavigate();
  const { events, subjects, profile, addEvent, updateEvent, removeEvent, replan, updateProfile } = useStore();
  const today = todayISO();
  const [anchor, setAnchor] = useState(weekStart(today));
  const [form, setForm] = useState({ kind: "controle" as EventKind, title: "", subjectId: "", date: today, start: "", durationMin: 55 });
  const [notice, setNotice] = useState<string | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  const missed = missedSessions(events, today).filter((e) => e.status === "prevu");
  const sub = (id?: string) => subjects.find((s) => s.id === id);

  const byDay = useMemo(() => {
    const m = new Map<string, PlannerEvent[]>();
    for (const e of events) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    for (const [k, v] of m) m.set(k, v.sort((a, b) => (a.start ?? "99").localeCompare(b.start ?? "99")));
    return m;
  }, [events]);

  const adapt = () => {
    const n = replan();
    setNotice(`Planning recalculé : ${n} session${n > 1 ? "s" : ""} de révision sur les 7 prochains jours.`);
  };

  return (
    <div>
      <PageHeader
        title="Planning"
        subtitle="Tes cours, contrôles et révisions. Je place les révisions selon tes évaluations, ta maîtrise et ton temps libre."
        actions={<Button onClick={adapt}><Wand2 /> Adapter mon planning</Button>}
      />

      {missed.length > 0 && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-warning/40 bg-warning/10 p-4">
          <p className="text-sm"><b>{missed.length > 1 ? `${missed.length} sessions n'ont pas été réalisées.` : "Cette session n'a pas été réalisée."}</b> Je peux adapter le reste de ta semaine.</p>
          <Button size="sm" variant="outline" onClick={adapt}><RefreshCw /> Adapter mon planning</Button>
        </Card>
      )}
      {notice && <p className="mb-4 rounded-lg bg-success/10 p-3 text-sm text-success-foreground">{notice}</p>}

      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setAnchor(addDays(anchor, -7))}><ChevronLeft /> Semaine précédente</Button>
        <span className="text-sm font-semibold">Semaine du {formatDay(anchor, { weekday: false })}</span>
        <Button variant="ghost" size="sm" onClick={() => setAnchor(addDays(anchor, 7))}>Semaine suivante <ChevronRight /></Button>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="grid min-w-[900px] grid-cols-7 gap-2">
          {days.map((d) => {
            const list = byDay.get(d) ?? [];
            const dow = new Date(d + "T12:00:00").getDay();
            const planned = list.filter((e) => e.kind === "revision").reduce((t, e) => t + e.durationMin, 0);
            return (
              <div key={d} className={cn("flex min-h-[280px] flex-col rounded-2xl border bg-card p-2", d === today && "ring-2 ring-primary")}>
                <div className="mb-2 px-1">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">{dayName(d)}</div>
                  <div className="font-display text-lg font-bold">{formatDay(d, { weekday: false })}</div>
                  <div className="text-[11px] text-muted-foreground">{planned} / {profile!.availability[dow]} min de révision</div>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  {list.map((e) => (
                    <div key={e.id} className={cn("group rounded-lg border border-l-4 p-2 text-xs", KIND_STYLE[e.kind] ?? "border-l-muted-foreground", e.status === "fait" && "opacity-60", e.status === "manque" && "border-dashed opacity-50")}>
                      <div className="flex items-start gap-1">
                        <SubjectDot subject={sub(e.subjectId)} className="mt-1" />
                        <span className={cn("flex-1 font-semibold leading-tight", e.status === "fait" && "line-through")}>{e.title}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-muted-foreground">
                        <span>{e.start ? `${e.start} · ` : ""}{e.durationMin} min</span>
                        {e.status === "manque" && <span>non réalisée</span>}
                      </div>
                      <div className="mt-1 hidden gap-1 group-hover:flex">
                        {e.kind === "revision" && e.status === "prevu" && (
                          <button className="rounded bg-primary px-1.5 py-0.5 text-primary-foreground" onClick={() => navigate(`/quiz?subject=${e.subjectId}&event=${e.id}${e.conceptIds?.length ? `&concepts=${e.conceptIds.join(",")}` : ""}`)} aria-label="Lancer">
                            <Play className="h-3 w-3" />
                          </button>
                        )}
                        {e.status !== "fait" && (
                          <button className="rounded bg-success px-1.5 py-0.5 text-white" onClick={() => updateEvent(e.id, { status: "fait" })} aria-label="Marquer comme fait"><Check className="h-3 w-3" /></button>
                        )}
                        <button className="rounded bg-muted px-1.5 py-0.5" onClick={() => removeEvent(e.id)} aria-label="Supprimer"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Ajouter au planning</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                addEvent({ ...form, subjectId: form.subjectId || undefined, start: form.start || undefined, title: form.title || KIND_LABEL[form.kind], status: "prevu" });
                setForm({ ...form, title: "" });
                if (form.kind === "controle" || form.kind === "examen") adapt();
              }}
            >
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as EventKind })}>
                  {(Object.keys(KIND_LABEL) as EventKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Matière</Label>
                <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                  <option value="">—</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Intitulé</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex. Contrôle sur la Révolution" />
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Heure</Label>
                  <Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Durée</Label>
                  <Input type="number" min={5} step={5} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} />
                </div>
              </div>
              <Button type="submit" className="sm:col-span-2"><Plus /> Ajouter</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mes disponibilités</CardTitle>
            <p className="text-sm text-muted-foreground">Minutes de révision possibles par jour, en plus des devoirs.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-7 gap-2">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <div key={d} className="space-y-1 text-center">
                  <div className="text-xs font-semibold text-muted-foreground">{DAY_LABELS[d]}</div>
                  <Input
                    type="number" min={0} step={15} className="px-1 text-center"
                    value={profile!.availability[d]}
                    onChange={(e) => updateProfile({ availability: profile!.availability.map((v, i) => (i === d ? Number(e.target.value) : v)) })}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
              Durées types :
              <Badge tone="muted">Flashcards {SESSION_DURATIONS.flashcards} min</Badge>
              <Badge tone="muted">QCM {SESSION_DURATIONS.qcm} min</Badge>
              <Badge tone="muted">Révision ciblée {SESSION_DURATIONS.revisionCiblee} min</Badge>
              <Badge tone="muted">Lecture {SESSION_DURATIONS.lecture} min</Badge>
              <Badge tone="muted">Exercices {SESSION_DURATIONS.exercices} min</Badge>
            </div>
            <Button variant="outline" onClick={adapt}><Wand2 /> Recalculer avec ces disponibilités</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
