import { Link, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { ArrowRight, CalendarClock, CheckCircle2, Clock, FileText, Flame, Play, RefreshCw, Target } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Badge, Progress } from "@/components/ui/primitives";
import { Ring, SubjectDot, SubjectTag } from "@/components/bits";
import { Mascot } from "@/components/Layout";
import { dailyPriority } from "@/engine/coach";
import { memoryBuckets } from "@/engine/memoryAgent";
import { missedSessions } from "@/engine/plannerAgent";
import { subjectProgress, weeklyStats } from "@/lib/stats";
import { daysBetween, formatDay, relativeDay, todayISO } from "@/lib/utils";
import { DOC_TYPE_LABEL, levelInfo } from "@/data/academic";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, subjects, concepts, mastery, events, tasks, attempts, documents, replan, updateTask } = useStore();
  const today = todayISO();

  const priority = useMemo(
    () => dailyPriority({ subjects, concepts, mastery, events, tasks, today, availableMin: profile?.availability[new Date().getDay()] }),
    [subjects, concepts, mastery, events, tasks, today, profile],
  );
  const stats = useMemo(() => weeklyStats(attempts, today), [attempts, today]);
  const buckets = useMemo(() => memoryBuckets(concepts.map((c) => c.id), mastery, today), [concepts, mastery, today]);
  const missed = missedSessions(events, today).filter((e) => e.status === "prevu");
  const upcomingExams = events
    .filter((e) => (e.kind === "controle" || e.kind === "examen") && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const todayEvents = events.filter((e) => e.date === today).sort((a, b) => (a.start ?? "99").localeCompare(b.start ?? "99"));
  const urgentTasks = tasks
    .filter((t) => !t.done && t.due && daysBetween(today, t.due) <= 2)
    .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""))
    .slice(0, 4);
  const sub = (id?: string) => subjects.find((s) => s.id === id);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Bonjour" : hour < 18 ? "Salut" : "Bonsoir";
  const toReview = new Set([...buckets.aujourdhui, ...buckets.oubliees]).size;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-muted-foreground">{formatDay(today)} · {levelInfo(profile!.level).label}</p>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{hello} {profile!.firstName} 👋</h1>
      </div>

      {missed.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-warning/40 bg-warning/10 p-4">
          <p className="text-sm">
            <b>{missed.length > 1 ? `${missed.length} sessions n'ont pas été réalisées.` : "Cette session n'a pas été réalisée."}</b>{" "}
            Ce n'est pas grave : je peux adapter le reste de ta semaine.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => replan()}
          >
            <RefreshCw /> Adapter mon planning
          </Button>
        </Card>
      )}

      {/* Priorité du jour */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-[hsl(var(--primary-2))] p-6 text-primary-foreground shadow-lg sm:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary-foreground/10" />
        <div className="absolute -bottom-16 right-20 h-40 w-40 rounded-full bg-primary-foreground/5" />
        <Mascot size={112} className="absolute right-8 top-1/2 hidden -translate-y-1/2 from-primary-foreground/60 to-primary-foreground/30 p-1 md:block" />
        <div className="relative max-w-2xl md:pr-36">
          <Badge className="bg-primary-foreground/20 text-primary-foreground"><Target className="h-3 w-3" /> Ta priorité du jour</Badge>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{priority.title}</h2>
          <p className="mt-2 text-primary-foreground/90">{priority.reason}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90" onClick={() => navigate(priority.to)}>
              <Play className="fill-current" /> Commencer
            </Button>
            <span className="flex items-center gap-1 text-sm text-primary-foreground/80"><Clock className="h-4 w-4" /> {priority.durationMin} min</span>
          </div>
        </div>
      </Card>

      {/* Indicateurs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<CalendarClock className="text-primary" />} label="Prochaine évaluation"
          value={upcomingExams[0] ? relativeDay(upcomingExams[0].date, today) : "—"}
          hint={upcomingExams[0]?.title} />
        <Stat icon={<CheckCircle2 className="text-success" />} label="Taux de réussite" value={stats.rate !== null ? `${stats.rate}%` : "—"} hint="7 derniers jours" />
        <Stat icon={<RefreshCw className="text-warning" />} label="Notions à revoir" value={String(toReview)} hint={`${buckets.fragiles.length} fragiles`} to="/memoire" />
        <Stat icon={<Flame className="text-destructive" />} label="Temps de révision" value={`${stats.minutes} min`} hint={`${stats.questions} questions cette semaine`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Planning du jour</CardTitle>
            <Link to="/planning" className="text-sm font-semibold text-primary">Voir la semaine</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayEvents.length === 0 && <p className="text-sm text-muted-foreground">Rien de prévu aujourd'hui. Profites-en pour souffler… ou avancer un peu !</p>}
            {todayEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border p-3">
                <SubjectDot subject={sub(e.subjectId)} className="h-3 w-3" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{e.start ? `${e.start} · ` : ""}{e.durationMin} min</div>
                </div>
                {e.kind === "revision" && e.status !== "fait" && (
                  <Button size="sm" onClick={() => navigate(`/quiz?subject=${e.subjectId}&event=${e.id}${e.conceptIds?.length ? `&concepts=${e.conceptIds.join(",")}` : ""}`)}>
                    <Play /> Lancer
                  </Button>
                )}
                {e.status === "fait" && <Badge tone="success">Fait</Badge>}
                {(e.kind === "controle" || e.kind === "examen") && <Badge tone="danger">Évaluation</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Tâches urgentes</CardTitle>
            <Link to="/taches" className="text-sm font-semibold text-primary">Tout voir</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {urgentTasks.length === 0 && <p className="text-sm text-muted-foreground">Aucune tâche urgente.</p>}
            {urgentTasks.map((t) => (
              <label key={t.id} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={t.done} onChange={() => updateTask(t.id, { done: !t.done })} />
                <div className="min-w-0">
                  <div className="font-semibold leading-tight">{t.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className={t.due! < today ? "font-semibold text-destructive" : "text-muted-foreground"}>{relativeDay(t.due!, today)}</span>
                    <SubjectTag subject={sub(t.subjectId)} />
                  </div>
                </div>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Progression par matière</CardTitle>
            <Link to="/matieres" className="text-sm font-semibold text-primary">Matières</Link>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {subjects.map((s) => {
              const p = subjectProgress(s, concepts, mastery, today);
              return (
                <Link key={s.id} to={`/matieres/${s.id}`} className="flex items-center gap-3 rounded-xl border p-3 transition hover:border-primary/40">
                  <Ring value={p.avg} size={48} stroke={5} color={s.color} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.count ? `${p.count} notions · ${p.fragile} fragile${p.fragile > 1 ? "s" : ""}` : "Aucun cours importé"}
                    </div>
                    <Progress value={p.count ? (p.studied / p.count) * 100 : 0} className="mt-2 h-1.5" barClassName="opacity-70" />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Prochaines évaluations</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {upcomingExams.length === 0 && <p className="text-sm text-muted-foreground">Ajoute tes contrôles dans le planning pour que je priorise tes révisions.</p>}
              {upcomingExams.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2"><SubjectDot subject={sub(e.subjectId)} /><span className="truncate">{e.title}</span></span>
                  <Badge tone={daysBetween(today, e.date) <= 3 ? "danger" : "muted"}>{relativeDay(e.date, today)}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Documents récents</CardTitle>
              <Link to="/import" className="text-sm font-semibold text-primary">Scanner</Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {documents.length === 0 && (
                <Button variant="outline" className="w-full" onClick={() => navigate("/import")}>Importer un cours <ArrowRight /></Button>
              )}
              {documents.slice(0, 4).map((d) => (
                <Link key={d.id} to={`/cours/${d.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{sub(d.subjectId)?.name} · {DOC_TYPE_LABEL[d.docType]}</div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, hint, to }: { icon: React.ReactNode; label: string; value: string; hint?: string; to?: string }) {
  const body = (
    <Card className="h-full p-4 transition hover:shadow-md">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}{label}</div>
      <div className="mt-2 font-display text-2xl font-extrabold">{value}</div>
      {hint && <div className="truncate text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}
