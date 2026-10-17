import { Check, Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import { useStore } from "@/store/useStore";
import { usePrefs } from "@/store/usePrefs";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, PageHeader, Progress } from "@/components/ui/primitives";
import { FONTS, RADII, TEXT_SIZES, THEMES, type ColorMode } from "@/lib/themes";
import { cn } from "@/lib/utils";

const MODES: { id: ColorMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Clair", icon: Sun },
  { id: "dark", label: "Sombre", icon: Moon },
  { id: "system", label: "Automatique", icon: Monitor },
];

export default function Settings() {
  const prefs = usePrefs();
  const { profile, updateProfile } = useStore();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        subtitle="Personnalise l'apparence de JEC'UP. Les changements s'appliquent tout de suite."
        actions={<Button variant="ghost" onClick={prefs.reset}><RotateCcw /> Apparence par défaut</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thème de couleur</CardTitle>
              <CardDescription>Chaque thème existe en version claire et sombre.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {THEMES.map((t) => {
                const active = prefs.theme === t.id;
                const [bg, card, main, second] = t.swatch;
                return (
                  <button
                    key={t.id}
                    onClick={() => prefs.set({ theme: t.id })}
                    aria-pressed={active}
                    className={cn("group relative rounded-xl border p-2 text-left transition", active ? "border-primary ring-2 ring-primary" : "hover:border-primary/50")}
                  >
                    {/* mini maquette du thème */}
                    <div className="flex h-20 gap-1.5 overflow-hidden rounded-lg p-1.5" style={{ background: bg }}>
                      <div className="w-1/4 rounded-md" style={{ background: card, border: "1px solid rgba(0,0,0,.08)" }}>
                        <div className="m-1 h-1.5 rounded" style={{ background: main }} />
                        <div className="m-1 h-1 w-2/3 rounded bg-black/10" />
                        <div className="m-1 h-1 w-1/2 rounded bg-black/10" />
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5">
                        <div className="h-9 rounded-md" style={{ background: `linear-gradient(135deg, ${main}, ${second})` }} />
                        <div className="flex flex-1 gap-1.5">
                          <div className="flex-1 rounded-md" style={{ background: card, border: "1px solid rgba(0,0,0,.08)" }} />
                          <div className="flex-1 rounded-md" style={{ background: card, border: "1px solid rgba(0,0,0,.08)" }} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between px-1">
                      <span className="font-semibold">{t.emoji} {t.label}</span>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="px-1 text-xs text-muted-foreground">{t.description}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Mode</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              {MODES.map(({ id, label, icon: Icon }) => (
                <Option key={id} active={prefs.mode === id} onClick={() => prefs.set({ mode: id })}>
                  <Icon className="mx-auto mb-1 h-5 w-5" />
                  {label}
                </Option>
              ))}
              <p className="col-span-3 text-xs text-muted-foreground">« Automatique » suit le réglage de ton téléphone ou de ton ordinateur.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Police d'écriture</CardTitle>
              <CardDescription>La police « Très lisible » distingue mieux les lettres qui se ressemblent (b/d, I/l/1) : elle peut aider en cas de dyslexie.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-3">
              {FONTS.map((f) => (
                <Option key={f.id} active={prefs.font === f.id} onClick={() => prefs.set({ font: f.id })}>
                  <span className="block text-xl font-bold" style={{ fontFamily: f.display }}>Aa Bb 123</span>
                  <span className="block text-sm" style={{ fontFamily: f.body }}>{f.label}</span>
                  <span className="block text-xs text-muted-foreground">{f.sample}</span>
                </Option>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Taille du texte</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-3 gap-2">
                {TEXT_SIZES.map((t) => (
                  <Option key={t.id} active={prefs.textSize === t.id} onClick={() => prefs.set({ textSize: t.id })}>
                    <span className="block font-bold" style={{ fontSize: `${t.scale}rem` }}>A</span>
                    <span className="text-xs">{t.label}</span>
                  </Option>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Coins</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-3 gap-2">
                {RADII.map((r) => (
                  <Option key={r.id} active={prefs.radius === r.id} onClick={() => prefs.set({ radius: r.id })}>
                    <span className="mx-auto mb-1 block h-6 w-8 border-2 border-current" style={{ borderRadius: r.value }} />
                    <span className="text-xs">{r.label}</span>
                  </Option>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Confort</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Toggle
                checked={prefs.reduceMotion}
                onChange={(v) => prefs.set({ reduceMotion: v })}
                label="Réduire les animations"
                hint="Supprime les transitions et mouvements à l'écran."
              />
              {profile && (
                <Toggle
                  checked={profile.learningMode}
                  onChange={(v) => updateProfile({ learningMode: v })}
                  label="Mode apprentissage"
                  hint="En sciences, propose la méthode étape par étape avant de répondre, sans donner la réponse."
                />
              )}
            </CardContent>
          </Card>

          {profile && (
            <Card>
              <CardHeader><CardTitle>Mon profil</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="fn">Prénom</Label>
                  <Input id="fn" value={profile.firstName} onChange={(e) => updateProfile({ firstName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="school">Établissement</Label>
                  <Input id="school" value={profile.school ?? ""} onChange={(e) => updateProfile({ school: e.target.value || undefined })} placeholder="Facultatif" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Aperçu en direct */}
        <div className="lg:sticky lg:top-6 lg:h-fit">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aperçu</p>
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary to-[hsl(var(--primary-2))] p-5 text-primary-foreground">
              <Badge className="bg-primary-foreground/20 text-primary-foreground">Ta priorité du jour</Badge>
              <p className="mt-2 font-display text-xl font-extrabold">Contrôle de SVT demain</p>
              <p className="text-sm text-primary-foreground/90">La mitose reste fragile. Session de 25 minutes.</p>
              <Button size="sm" className="mt-3 bg-primary-foreground text-primary hover:bg-primary-foreground/90">Commencer</Button>
            </div>
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Réplication de l'ADN</span>
                <Badge tone="warning">En progression · 58</Badge>
              </div>
              <Progress value={58} />
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-semibold">Que désigne « mitose » ?</p>
                <div className="mt-2 space-y-1.5">
                  <div className="rounded-md border border-success bg-success/10 px-2 py-1">Division en deux cellules identiques</div>
                  <div className="rounded-md border px-2 py-1 text-muted-foreground">Copie d'une molécule d'ADN</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm">Principal</Button>
                <Button size="sm" variant="secondary">Secondaire</Button>
                <Button size="sm" variant="outline">Contour</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Option({ active, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn("rounded-xl border p-3 text-center text-sm font-medium transition", active ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : "hover:bg-muted", className)}
      {...p}
    />
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-1 h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-primary" : "bg-muted-foreground/30")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}
