import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Brain, CalendarDays, Camera, PlayCircle, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, Input, Label, Select } from "@/components/ui/primitives";
import AuthShell from "@/components/AuthShell";
import {
  BASE_FOLDERS, DISCIPLINES, EVAL_FORMATS, GOALS, LEVELS, SERIES_TECHNO, SPECIALITES, VOIES,
  defaultSubjects, isPro, levelInfo, needsVoie,
} from "@/data/academic";
import { DEMO_PROFILES } from "@/data/demo";
import { classifyDiscipline } from "@/engine/classifier";
import { useStore } from "@/store/useStore";
import type { Cycle, DisciplineId, EvalFormat, Goal, LevelId, StudentProfile, Subject, Voie } from "@/types";
import { cn, relativeDay, todayISO, uid } from "@/lib/utils";

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default function Onboarding() {
  const navigate = useNavigate();
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const loadDemo = useStore((s) => s.loadDemo);
  const existing = useStore((s) => s.profile);
  const signedIn = useStore((s) => s.signedIn);
  const signIn = useStore((s) => s.signIn);
  const resetAll = useStore((s) => s.reset);
  const storeConcepts = useStore((s) => s.concepts);
  const storeMastery = useStore((s) => s.mastery);
  const storeEvents = useStore((s) => s.events);
  const [step, setStep] = useState(0);
  const [showDemo, setShowDemo] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [country, setCountry] = useState("France");
  const [school, setSchool] = useState("");
  const [cycle, setCycle] = useState<Cycle>("college");
  const [level, setLevel] = useState<LevelId | null>(null);
  const [voie, setVoie] = useState<Voie | undefined>();
  const [serie, setSerie] = useState<string>("");
  const [specialites, setSpecialites] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<{ name: string; discipline: DisciplineId; on: boolean }[]>([]);
  const [custom, setCustom] = useState("");
  const [evalFormats, setEvalFormats] = useState<EvalFormat[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [availability, setAvailability] = useState<number[]>([60, 45, 45, 60, 45, 45, 90]);

  // lien de démo partageable : /bienvenue?demo=lea&next=/memoire
  const [params] = useSearchParams();
  useEffect(() => {
    const key = params.get("demo");
    if (key && DEMO_PROFILES.some((d) => d.key === key)) {
      loadDemo(key);
      const next = params.get("next");
      navigate(next && next.startsWith("/") ? next : "/", { replace: true });
    }
  }, [params, loadDemo, navigate]);

  // déjà connecté : pas besoin de repasser par l'accueil
  useEffect(() => {
    if (existing && signedIn && !params.get("demo")) navigate("/", { replace: true });
  }, [existing, signedIn, params, navigate]);

  const maxSpecs = level === "tle" ? 2 : 3;
  const steps = ["Bienvenue", "Toi", "Ta classe", "Tes matières", "Tes évaluations", "Ton objectif", "Ton temps"];

  const prepareSubjects = () => {
    if (!level) return;
    const base = defaultSubjects(level, voie);
    const specs = SPECIALITES.filter((s) => specialites.includes(s.name));
    const all = [...base, ...specs].filter((s, i, arr) => arr.findIndex((x) => x.name === s.name) === i);
    setSubjects(all.map((s) => ({ ...s, on: true })));
  };

  const canNext = useMemo(() => {
    switch (step) {
      case 1: return firstName.trim().length > 0;
      case 2: return !!level && (!needsVoie(level) || (!!voie && (voie !== "generale" || specialites.length === maxSpecs) && (voie !== "technologique" || !!serie)));
      case 3: return subjects.some((s) => s.on);
      case 4: return evalFormats.length > 0;
      case 5: return goals.length > 0;
      default: return true;
    }
  }, [step, firstName, level, voie, specialites, maxSpecs, serie, subjects, evalFormats, goals]);

  const next = () => {
    if (step === 2) prepareSubjects();
    if (step < steps.length - 1) setStep(step + 1);
    else finish();
  };

  const finish = () => {
    const profile: StudentProfile = {
      id: uid("p_"),
      firstName: firstName.trim(),
      country,
      school: school.trim() || undefined,
      level: level!,
      voie: needsVoie(level!) ? voie : isPro(level!) ? "professionnelle" : undefined,
      serieTechno: voie === "technologique" ? serie : undefined,
      specialites,
      evalFormats,
      goals,
      availability,
      learningMode: true,
      createdAt: new Date().toISOString(),
    };
    const subs: Subject[] = subjects
      .filter((s) => s.on)
      .map((s) => ({
        id: uid("s_"),
        name: s.name,
        discipline: s.discipline,
        color: DISCIPLINES[s.discipline].color,
        weight: specialites.includes(s.name) ? 5 : 3,
        folders: [...new Set([...BASE_FOLDERS, ...DISCIPLINES[s.discipline].folders])],
      }));
    completeOnboarding(profile, subs);
    navigate("/");
  };

  const addCustom = () => {
    const name = custom.trim();
    if (!name) return;
    // la matière est devinée à partir de son nom (ex. « Latin » → générique, « Espagnol » → langues)
    const guess = classifyDiscipline(name).discipline;
    setSubjects([...subjects, { name, discipline: guess, on: true }]);
    setCustom("");
  };

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void, max?: number) => {
    if (arr.includes(v)) set(arr.filter((x) => x !== v));
    else if (!max || arr.length < max) set([...arr, v]);
  };

  // profil enregistré sur cet appareil, élève déconnecté
  if (existing && !signedIn && !showDemo && step === 0) {
    const mastered = storeConcepts.filter((c) => (storeMastery[c.id]?.score ?? 0) >= 65).length;
    const nextExam = storeEvents
      .filter((e) => (e.kind === "controle" || e.kind === "examen") && e.date >= todayISO())
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    return (
      <Shell>
        <div className="text-center">
          <div className="relative mx-auto w-fit">
            <div aria-hidden className="absolute -inset-3 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--primary-2))] opacity-30 blur-xl" />
            <div className="relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-primary to-[hsl(var(--primary-2))] font-display text-4xl font-extrabold text-primary-foreground shadow-xl ring-4 ring-card">
              {existing.firstName.charAt(0).toUpperCase()}
            </div>
          </div>
          <p className="mt-6 font-brand text-xl text-[hsl(var(--brand-violet))]">Content de te revoir !</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight">Bon retour, {existing.firstName}</h1>
          <p className="mt-2 text-muted-foreground">
            {levelInfo(existing.level).label}
            {existing.specialites.length ? ` · ${existing.specialites.join(", ")}` : ""}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <MiniStat value={String(storeConcepts.length)} label="notions suivies" />
          <MiniStat value={String(mastered)} label="acquises" />
          <MiniStat value={nextExam ? relativeDay(nextExam.date) : "—"} label="prochain contrôle" />
        </div>

        <Button variant="brand" size="lg" className="mt-8 h-14 w-full text-base" onClick={() => { signIn(); navigate("/"); }}>
          Me reconnecter <ArrowRight />
        </Button>

        {!confirmNew ? (
          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            <button className="font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => setConfirmNew(true)}>
              Ce n'est pas moi
            </button>
            <button className="font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => setShowDemo(true)}>
              Essayer la démo
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm animate-in fade-in zoom-in-95">
            <p>
              Créer un nouveau profil <b>effacera les cours et la progression de {existing.firstName}</b> sur cet appareil.
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Button variant="destructive" size="sm" onClick={() => { resetAll(); setConfirmNew(false); setStep(1); }}>
                Effacer et créer un profil
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmNew(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </Shell>
    );
  }

  if (showDemo) {
    return (
      <Shell wide>
        <button onClick={() => setShowDemo(false)} className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <p className="font-brand text-xl text-[hsl(var(--brand-violet))]">Visite guidée</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight">Choisis un élève</h1>
        <p className="mt-2 text-muted-foreground">Découvre comment JecUp s'adapte au niveau, aux matières et aux évaluations de chacun.</p>
        {existing && !existing.isDemo && (
          <p className="mt-4 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
            La progression de {existing.firstName} est mise de côté pendant la démo : elle revient quand tu la quittes.
          </p>
        )}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {DEMO_PROFILES.map((d, i) => (
            <button
              key={d.key}
              onClick={() => { loadDemo(d.key); navigate("/"); }}
              className="group flex items-start gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-secondary to-accent text-3xl transition-transform group-hover:scale-110">
                {d.avatar}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold">{d.firstName}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">{levelInfo(d.level).label}</span>
                </span>
                <span className="block text-sm text-muted-foreground">{d.tagline.split("·").slice(1).join("·").trim() || d.tagline}</span>
                <span className="mt-2 flex flex-wrap gap-1">
                  {d.docs.map((doc) => (
                    <span key={doc.title} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{doc.title}</span>
                  ))}
                </span>
              </span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  return (
    <Shell wide={step > 0}>
      {step > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-primary">{steps[step]}</span>
            <span className="text-xs font-semibold text-muted-foreground">Étape {step} sur {steps.length - 1}</span>
          </div>
          <div className="flex gap-1.5">
            {steps.slice(1).map((s, i) => (
              <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < step ? "bg-gradient-to-r from-primary to-[hsl(var(--primary-2))]" : "bg-muted")} />
            ))}
          </div>
        </div>
      )}

      {step === 0 && (
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Gratuit · sans inscription · de la 6e à la Terminale
          </span>
          <h1 className="mt-5 text-[clamp(2.25rem,5vw,3.25rem)] font-extrabold leading-[1.05] tracking-tight">
            Tes cours deviennent{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(var(--primary-2))] bg-clip-text text-transparent">ton plan de réussite.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Photographie une leçon : JecUp repère l'essentiel, te teste au bon niveau et organise tes révisions jusqu'au contrôle, au brevet ou au bac.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button variant="brand" size="lg" className="h-14 w-full text-base sm:flex-1" onClick={() => setStep(1)}>
              Créer mon profil <ArrowRight />
            </Button>
            <Button variant="outline" size="lg" className="h-14 w-full text-base sm:flex-1" onClick={() => setShowDemo(true)}>
              <PlayCircle /> Essayer la démo
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3">
            {([
              [Camera, "Scanner", "Photo, PDF ou texte"],
              [Brain, "Comprendre", "Les notions clés repérées"],
              [Target, "Se tester", "Un niveau qui s'adapte"],
              [CalendarDays, "S'organiser", "Un planning qui suit tes contrôles"],
            ] as const).map(([Icon, title, hint]) => (
              <div key={title} className="flex items-start gap-3 rounded-2xl border bg-card/80 p-3.5 shadow-sm backdrop-blur">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-[hsl(var(--primary-2)/0.15)] text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold">{title}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-2xl font-extrabold">Salut ! Comment tu t'appelles ?</h2>
          <div className="space-y-2">
            <Label htmlFor="fn">Prénom</Label>
            <Input id="fn" autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ton prénom" onKeyDown={(e) => e.key === "Enter" && canNext && next()} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <Select id="country" value={country} onChange={(e) => setCountry(e.target.value)}>
                {["France", "Belgique", "Suisse", "Luxembourg", "Maroc", "Tunisie", "Sénégal", "Côte d'Ivoire", "Canada", "Lycée français à l'étranger", "Autre"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school">Établissement <span className="font-normal text-muted-foreground">(facultatif)</span></Label>
              <Input id="school" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Collège / lycée" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tu es au…</Label>
            <div className="grid grid-cols-2 gap-2">
              <Chip active={cycle === "college"} onClick={() => { setCycle("college"); setLevel(null); }}>🏫 Collège</Chip>
              <Chip active={cycle === "lycee"} onClick={() => { setCycle("lycee"); setLevel(null); }}>🎓 Lycée</Chip>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-extrabold">En quelle classe es-tu, {firstName} ?</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LEVELS.filter((l) => l.cycle === cycle).map((l) => (
              <Chip key={l.id} active={level === l.id} onClick={() => { setLevel(l.id); setSpecialites([]); setVoie(isPro(l.id) ? "professionnelle" : undefined); }}>
                <div className="font-bold">{l.label}</div>
                {l.exam && <div className="text-xs text-muted-foreground">{l.exam}</div>}
              </Chip>
            ))}
          </div>
          {level && needsVoie(level) && (
            <div className="space-y-2">
              <Label>Ta voie</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {VOIES.map((v) => (
                  <Chip key={v.id} active={voie === v.id} onClick={() => { setVoie(v.id); setSpecialites([]); }}>{v.label}</Chip>
                ))}
              </div>
            </div>
          )}
          {level && needsVoie(level) && voie === "technologique" && (
            <div className="space-y-2">
              <Label>Ta série</Label>
              <div className="flex flex-wrap gap-2">
                {SERIES_TECHNO.map((s) => <Chip key={s} active={serie === s} onClick={() => setSerie(s)}>{s}</Chip>)}
              </div>
            </div>
          )}
          {level && needsVoie(level) && voie === "generale" && (
            <div className="space-y-2">
              <Label>
                Tes spécialités <span className="font-normal text-muted-foreground">({specialites.length}/{maxSpecs})</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {SPECIALITES.map((s) => (
                  <Chip key={s.name} active={specialites.includes(s.name)} onClick={() => toggle(specialites, s.name, setSpecialites, maxSpecs)}>
                    {DISCIPLINES[s.discipline].emoji} {s.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-2xl font-extrabold">Quelles matières étudies-tu ?</h2>
          <p className="text-muted-foreground">J'ai présélectionné les matières de ta classe. Décoche celles que tu ne veux pas suivre ici, ajoute les autres.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {subjects.map((s, i) => (
              <Chip key={s.name} active={s.on} onClick={() => setSubjects(subjects.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}>
                <span className="mr-2">{DISCIPLINES[s.discipline].emoji}</span>
                {s.name}
                {specialites.includes(s.name) && <span className="ml-2 text-xs text-muted-foreground">spécialité</span>}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ajouter une matière (Latin, Option cinéma…)" onKeyDown={(e) => e.key === "Enter" && addCustom()} />
            <Button variant="outline" onClick={addCustom}><Plus /> Ajouter</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <h2 className="text-2xl font-extrabold">Comment es-tu principalement évalué(e) ?</h2>
          <p className="text-muted-foreground">Plusieurs choix possibles : j'adapte les entraînements à ces formats.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {EVAL_FORMATS.map((f) => (
              <Chip key={f.id} active={evalFormats.includes(f.id)} onClick={() => toggle(evalFormats, f.id, setEvalFormats)}>{f.label}</Chip>
            ))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <h2 className="text-2xl font-extrabold">Quel est ton objectif principal ?</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {GOALS.filter((g) => !(g.id === "brevet" && cycle === "lycee") && !(g.id === "bac" && cycle === "college")).map((g) => (
              <Chip key={g.id} active={goals.includes(g.id)} onClick={() => toggle(goals, g.id, setGoals, 3)}>
                <span className="mr-2">{g.emoji}</span>{g.label}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-5">
          <h2 className="text-2xl font-extrabold">Combien de temps peux-tu réviser chaque jour ?</h2>
          <p className="text-muted-foreground">En dehors des devoirs déjà prévus. Tu pourras le modifier à tout moment dans le planning.</p>
          <div className="grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <div key={d} className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">{DAYS[d]}</span>
                <div className="flex flex-col gap-1">
                  {[0, 30, 45, 60, 90, 120].map((m) => (
                    <button
                      key={m}
                      onClick={() => setAvailability(availability.map((v, i) => (i === d ? m : v)))}
                      className={cn(
                        "w-12 rounded-md border px-1 py-1 text-xs font-semibold",
                        availability[d] === m ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                      )}
                    >
                      {m === 0 ? "—" : m < 60 ? `${m}′` : `${m / 60}h${m % 60 ? "30" : ""}`}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Total : <b>{Math.round(availability.reduce((a, b) => a + b, 0) / 6) / 10} h</b> par semaine.
          </p>
        </div>
      )}

      {step > 0 && (
        <div className="mt-10 flex justify-between">
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            <ArrowLeft /> Retour
          </Button>
          <Button variant="brand" size="lg" onClick={next} disabled={!canNext}>
            {step === steps.length - 1 ? "C'est parti !" : "Continuer"} <ArrowRight />
          </Button>
        </div>
      )}
    </Shell>
  );
}

const Shell = AuthShell;

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border bg-card p-3 text-center shadow-sm">
      <div className="font-display text-2xl font-extrabold">{value}</div>
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
