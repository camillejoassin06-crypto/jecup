import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Chip, Input, Label, Progress, Select } from "@/components/ui/primitives";
import { Logo } from "@/components/Layout";
import { BRAND } from "@/lib/brand";
import {
  BASE_FOLDERS, DISCIPLINES, EVAL_FORMATS, GOALS, LEVELS, SERIES_TECHNO, SPECIALITES, VOIES,
  defaultSubjects, isPro, needsVoie,
} from "@/data/academic";
import { DEMO_PROFILES } from "@/data/demo";
import { classifyDiscipline } from "@/engine/classifier";
import { useStore } from "@/store/useStore";
import type { Cycle, DisciplineId, EvalFormat, Goal, LevelId, StudentProfile, Subject, Voie } from "@/types";
import { cn, uid } from "@/lib/utils";

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default function Onboarding() {
  const navigate = useNavigate();
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const loadDemo = useStore((s) => s.loadDemo);
  const [step, setStep] = useState(0);
  const [showDemo, setShowDemo] = useState(false);

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

  if (showDemo) {
    return (
      <Shell>
        <h1 className="text-3xl font-extrabold">Mode démo</h1>
        <p className="mt-1 text-muted-foreground">Choisis un profil : JecUp s'adapte au niveau, aux matières et aux évaluations de chacun.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {DEMO_PROFILES.map((d) => (
            <button
              key={d.key}
              onClick={() => {
                loadDemo(d.key);
                navigate("/");
              }}
              className="flex items-start gap-3 rounded-2xl border bg-card p-4 text-left transition hover:border-primary hover:shadow-md"
            >
              <span className="text-3xl">{d.avatar}</span>
              <span>
                <span className="block font-display text-lg font-bold">{d.firstName}</span>
                <span className="block text-sm text-muted-foreground">{d.tagline}</span>
                <span className="mt-2 flex flex-wrap gap-1">
                  {d.docs.map((doc) => (
                    <span key={doc.title} className="rounded-full bg-muted px-2 py-0.5 text-xs">{doc.title}</span>
                  ))}
                </span>
              </span>
            </button>
          ))}
        </div>
        <Button variant="ghost" className="mt-6" onClick={() => setShowDemo(false)}>
          <ArrowLeft /> Retour
        </Button>
      </Shell>
    );
  }

  return (
    <Shell wide={step === 0}>
      {step > 0 && (
        <div className="mb-6 flex justify-center"><Logo /></div>
      )}
      {step > 0 && (
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs font-semibold text-muted-foreground">
            <span>{steps[step]}</span>
            <span>{step}/{steps.length - 1}</span>
          </div>
          <Progress value={(step / (steps.length - 1)) * 100} />
        </div>
      )}

      {step === 0 && (
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,300px)_1fr]">
          <div className="relative mx-auto w-full max-w-[300px]">
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--primary-2))] opacity-30 blur-2xl" />
            <img
              src={BRAND.logo}
              alt="JecUp by Jeca Solutions — Apprends, révise, réussis !"
              width={300}
              height={300}
              className="relative aspect-square w-full rounded-full bg-white object-cover shadow-xl ring-4 ring-card"
            />
          </div>
          <div className="text-center md:text-left">
            <p className="font-brand text-2xl text-[hsl(var(--brand-violet))]">{BRAND.tagline}</p>
            <h1 className="mt-2 text-4xl font-extrabold leading-tight sm:text-5xl">
              Tes cours deviennent <span className="bg-gradient-to-r from-primary to-[hsl(var(--primary-2))] bg-clip-text text-transparent">ton plan de réussite</span>.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Photographie une leçon : JecUp repère l'essentiel, te teste au bon niveau, mesure ce que tu maîtrises
              et organise tes révisions jusqu'au contrôle, au brevet ou au bac.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
              <Button size="lg" onClick={() => setStep(1)}>
                Créer mon profil <ArrowRight />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setShowDemo(true)}>
                Essayer la démo
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-left text-sm sm:grid-cols-4 md:col-span-2">
            {[
              ["📸", "Scanner", "Photo, PDF ou texte"],
              ["🧠", "Comprendre", "Les notions clés repérées"],
              ["🎯", "Se tester", "Au bon niveau, qui s'adapte"],
              ["📅", "S'organiser", "Un planning qui suit tes contrôles"],
            ].map(([icon, title, hint]) => (
              <div key={title} className="rounded-xl border bg-card p-3">
                <div className="text-xl">{icon}</div>
                <div className="mt-1 font-semibold">{title}</div>
                <div className="text-xs text-muted-foreground">{hint}</div>
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
          <Button onClick={next} disabled={!canNext}>
            {step === steps.length - 1 ? "C'est parti !" : "Continuer"} <ArrowRight />
          </Button>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,hsl(var(--secondary)),transparent_60%)] px-4 py-10">
      <Card className={cn("mx-auto p-6 sm:p-10", wide ? "max-w-4xl" : "max-w-2xl")}>{children}</Card>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Tes cours restent privés : ils sont stockés sur ton appareil (ou dans ton espace sécurisé si la synchronisation est activée).
        <br />
        JecUp by {BRAND.company}
      </p>
    </div>
  );
}
