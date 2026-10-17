import { useState } from "react";
import { ArrowRight, Loader2, Mail, MailCheck } from "lucide-react";
import { supabase } from "@/services/supabase";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import AuthShell from "@/components/AuthShell";

/** Connexion par lien magique (Supabase Auth). Affichée uniquement si Supabase est configuré. */
export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
    setBusy(false);
    if (error) setError("Impossible d'envoyer le lien. Vérifie ton adresse e-mail et réessaie.");
    else setSent(true);
  };

  return (
    <AuthShell>
      {sent ? (
        <div className="text-center animate-in fade-in zoom-in-95">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-primary to-[hsl(var(--primary-2))] text-primary-foreground shadow-xl">
            <MailCheck className="h-9 w-9" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Vérifie ta boîte mail</h1>
          <p className="mt-3 text-muted-foreground">
            Un lien de connexion a été envoyé à <b className="text-foreground">{email}</b>. Ouvre-le sur cet appareil pour accéder à JecUp.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Rien reçu ? Regarde dans les spams ou{" "}
            <button className="font-semibold text-primary hover:underline" onClick={() => setSent(false)}>change d'adresse</button>.
          </p>
        </div>
      ) : (
        <div>
          <p className="font-brand text-xl text-[hsl(var(--brand-violet))]">Bienvenue !</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight">Connexion</h1>
          <p className="mt-2 text-muted-foreground">Pas de mot de passe à retenir : on t'envoie un lien de connexion par e-mail.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="toi@exemple.fr"
                  className="h-14 rounded-xl pl-11 text-base"
                />
              </div>
            </div>
            <Button type="submit" variant="brand" size="lg" className="h-14 w-full text-base" disabled={busy || !email}>
              {busy ? <Loader2 className="animate-spin" /> : <>Recevoir mon lien de connexion <ArrowRight /></>}
            </Button>
            {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          </form>
        </div>
      )}
    </AuthShell>
  );
}
