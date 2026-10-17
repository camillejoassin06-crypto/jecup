import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Brain, CalendarDays, CheckSquare, FolderOpen, Home, LogOut, MessageCircle, Moon, ScanLine, Sparkles, Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { levelInfo } from "@/data/academic";
import { DEMO_PROFILES } from "@/data/demo";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const NAV = [
  { to: "/", label: "Mon espace", icon: Home, end: true },
  { to: "/matieres", label: "Matières", icon: FolderOpen },
  { to: "/import", label: "Scanner un cours", icon: ScanLine },
  { to: "/reviser", label: "Réviser", icon: Sparkles },
  { to: "/memoire", label: "Ma mémoire", icon: Brain },
  { to: "/planning", label: "Planning", icon: CalendarDays },
  { to: "/taches", label: "Tâches", icon: CheckSquare },
  { to: "/assistant", label: "Assistant", icon: MessageCircle },
];

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("jecup-theme");
      return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("jecup-theme", dark ? "dark" : "light");
    } catch {
      /* stockage indisponible */
    }
  }, [dark]);
  return [dark, setDark] as const;
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-foreground shadow-sm">
        J
      </div>
      <div className="leading-none">
        <div className="font-display text-lg font-extrabold">JEC'UP</div>
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Comprendre · Réviser · Progresser</div>
      </div>
    </div>
  );
}

export default function Layout() {
  const profile = useStore((s) => s.profile);
  const reset = useStore((s) => s.reset);
  const loadDemo = useStore((s) => s.loadDemo);
  const navigate = useNavigate();
  const [dark, setDark] = useDarkMode();
  if (!profile) return null;
  const demo = profile.isDemo ? DEMO_PROFILES.find((d) => d.key === profile.demoKey) : undefined;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r bg-card/60 p-4 lg:flex">
        <Logo />
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-xl bg-muted p-3 text-sm">
            <div className="font-semibold">{profile.firstName}</div>
            <div className="text-muted-foreground">
              {levelInfo(profile.level).label}
              {profile.specialites.length ? ` · ${profile.specialites.slice(0, 2).join(", ")}` : ""}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} aria-label="Changer de thème">
              {dark ? <Sun /> : <Moon />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start text-muted-foreground"
              onClick={() => {
                reset();
                navigate("/bienvenue");
              }}
            >
              <LogOut /> {profile.isDemo ? "Quitter la démo" : "Réinitialiser"}
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col pb-20 lg:pb-0">
        {demo && (
          <div className="flex flex-wrap items-center justify-center gap-2 border-b bg-accent px-4 py-2 text-center text-sm text-accent-foreground">
            <span>
              Mode démo : <b>{demo.avatar} {demo.firstName}</b> — {demo.tagline}.
            </span>
            <span className="flex gap-1">
              {DEMO_PROFILES.filter((d) => d.key !== demo.key).map((d) => (
                <button key={d.key} className="rounded-full bg-card/70 px-2 py-0.5 text-xs font-semibold hover:bg-card" onClick={() => { loadDemo(d.key); navigate("/"); }}>
                  {d.avatar} {d.firstName}
                </button>
              ))}
            </span>
          </div>
        )}
        <header className="flex items-center justify-between border-b px-4 py-3 lg:hidden">
          <Logo />
          <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} aria-label="Changer de thème">
            {dark ? <Sun /> : <Moon />}
          </Button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {[NAV[0], NAV[2], NAV[3], NAV[5], NAV[7]].map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}
          >
            <Icon className="h-5 w-5" />
            {label.split(" ")[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
