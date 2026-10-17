import type { ReactNode } from "react";
import { BookOpenCheck, CalendarCheck2, GraduationCap, Lock, Sparkles } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Mise en page des écrans d'entrée (accueil, connexion, onboarding) :
 * panneau de marque à gauche, contenu à droite ; bandeau compact sur mobile.
 */
export default function AuthShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(420px,44%)_1fr]">
      <BrandPanel />
      <MobileBanner />
      <main className="relative flex min-h-[60vh] items-start justify-center overflow-hidden px-4 py-8 sm:px-8 lg:min-h-screen lg:items-center lg:py-12">
        {/* halos décoratifs discrets */}
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[hsl(var(--primary-2))] opacity-[0.07] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-primary opacity-[0.07] blur-3xl" />
        <div className={cn("relative w-full animate-in fade-in slide-in-from-bottom-3 duration-500", wide ? "max-w-2xl" : "max-w-lg")}>
          {children}
          <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Tes cours restent privés et stockés sur ton appareil.
          </p>
        </div>
      </main>
    </div>
  );
}

const BRAND_GRADIENT =
  "bg-[linear-gradient(140deg,hsl(226_100%_18%)_0%,hsl(229_85%_34%)_45%,hsl(266_85%_45%)_80%,hsl(276_84%_55%)_100%)]";

function BrandPanel() {
  return (
    <aside className={cn("relative hidden overflow-hidden text-white lg:flex lg:min-h-screen lg:flex-col", BRAND_GRADIENT)}>
      {/* trame de points + halos lumineux */}
      <div aria-hidden className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" />
      <div aria-hidden className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-[hsl(276_84%_60%)] opacity-40 blur-3xl" />
      <div aria-hidden className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[hsl(205_90%_55%)] opacity-25 blur-3xl" />

      {/* icônes flottantes */}
      <Floating className="left-[12%] top-[14%]" delay="0s"><GraduationCap className="h-6 w-6" /></Floating>
      <Floating className="right-[14%] top-[22%]" delay="1.2s"><Sparkles className="h-5 w-5" /></Floating>
      <Floating className="bottom-[9%] right-[10%]" delay="2.1s"><span className="text-xl">💡</span></Floating>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-10 py-12 text-center">
        <div className="relative">
          <div aria-hidden className="absolute -inset-6 rounded-full bg-white/25 blur-2xl" />
          <div aria-hidden className="absolute -inset-3 animate-[spin_24s_linear_infinite] rounded-full border-2 border-dashed border-white/30" />
          <img
            src={BRAND.logo}
            alt="JecUp by Jeca Solutions — Apprends, révise, réussis !"
            width={260}
            height={260}
            className="relative h-[clamp(180px,22vw,260px)] w-[clamp(180px,22vw,260px)] rounded-full bg-white object-contain shadow-2xl ring-4 ring-white/70"
          />
        </div>

        <p className="mt-10 font-brand text-[clamp(1.75rem,2.6vw,2.4rem)] leading-tight drop-shadow-sm">{BRAND.tagline}</p>
        <p className="mt-3 max-w-sm text-base text-white/80">
          Le copilote de révision qui transforme tes cours en plan de réussite, de la 6e à la Terminale.
        </p>

        <ul className="mt-8 grid w-full max-w-sm gap-2.5 text-left text-sm">
          {[
            [BookOpenCheck, "Tes cours analysés en quelques secondes"],
            [Sparkles, "Des questions qui s'adaptent à ton niveau"],
            [CalendarCheck2, "Un planning qui suit tes contrôles"],
          ].map(([Icon, text]) => {
            const I = Icon as typeof Sparkles;
            return (
              <li key={text as string} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm ring-1 ring-white/15">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/20"><I className="h-4 w-4" /></span>
                {text as string}
              </li>
            );
          })}
        </ul>

        {/* aperçu de l'application */}
        <div className="pointer-events-none mt-8 w-full max-w-sm rotate-[-2deg] rounded-2xl bg-white/95 p-4 text-left text-[hsl(226_55%_14%)] shadow-2xl">
          <div className="flex items-center gap-3">
            <PreviewRing value={72} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(266_70%_45%)]">Ta priorité du jour</p>
              <p className="truncate font-bold">Contrôle de SVT demain</p>
              <p className="text-xs text-slate-500">La mitose reste fragile · 25 min</p>
            </div>
          </div>
        </div>
      </div>

      <p className="relative z-10 pb-6 text-center text-xs font-medium tracking-wide text-white/60">JecUp by {BRAND.company}</p>
    </aside>
  );
}

function MobileBanner() {
  return (
    <div className={cn("relative overflow-hidden px-6 pb-8 pt-8 text-center text-white lg:hidden", BRAND_GRADIENT)}>
      <div aria-hidden className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" />
      <img src={BRAND.logo} alt="JecUp by Jeca Solutions" width={128} height={128} className="relative mx-auto h-32 w-32 rounded-full bg-white object-contain shadow-xl ring-4 ring-white/60" />
      <p className="relative mt-4 font-brand text-2xl">{BRAND.tagline}</p>
    </div>
  );
}

function Floating({ children, className, delay }: { children: ReactNode; className: string; delay: string }) {
  return (
    <div
      aria-hidden
      className={cn("absolute z-0 grid h-12 w-12 animate-float place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md", className)}
      style={{ animationDelay: delay }}
    >
      {children}
    </div>
  );
}

function PreviewRing({ value }: { value: number }) {
  const r = 20, c = 2 * Math.PI * r;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0 -rotate-90">
      <circle cx="26" cy="26" r={r} stroke="#e8eaf6" strokeWidth="6" fill="none" />
      <circle cx="26" cy="26" r={r} stroke="url(#g)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0e2fb4" />
          <stop offset="1" stopColor="#8319eb" />
        </linearGradient>
      </defs>
    </svg>
  );
}
