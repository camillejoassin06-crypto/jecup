import { useState } from "react";
import { Mail } from "lucide-react";
import { supabase } from "@/services/supabase";
import { Button } from "@/components/ui/button";
import { Card, Input, Label } from "@/components/ui/primitives";
import { Logo } from "@/components/Layout";

/** Connexion par lien magique (Supabase Auth). Affichée uniquement si Supabase est configuré. */
export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-sm p-8">
        <Logo />
        {sent ? (
          <p className="mt-6 text-sm">📬 Un lien de connexion a été envoyé à <b>{email}</b>. Ouvre-le sur cet appareil.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.fr" />
            </div>
            <Button type="submit" className="w-full"><Mail /> Recevoir mon lien de connexion</Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        )}
      </Card>
    </div>
  );
}
