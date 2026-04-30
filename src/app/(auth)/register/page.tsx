"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [statutJuridique, setStatutJuridique] = useState("");
  const [regimeFiscal, setRegimeFiscal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    setLoading(true);
    setError("");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nom, prenom, statut_juridique: statutJuridique, regime_fiscal: regimeFiscal },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        user_id: data.user.id,
        email,
        nom,
        prenom,
        statut_juridique: statutJuridique || "auto-entrepreneur",
        regime_fiscal: regimeFiscal || "micro-entreprise",
      });
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center p-8">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold mb-2">Compte créé !</h2>
          <p className="text-muted-foreground mb-6">Vérifie ton email pour confirmer ton compte, puis connecte-toi.</p>
          <Button onClick={() => router.push("/login")} className="w-full">Aller à la connexion</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">Crezzy</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{step === 1 ? "Crée ton compte" : "Ton statut professionnel"}</CardTitle>
            <CardDescription>
              {step === 1 ? "Étape 1 sur 2 — tes informations de base" : "Étape 2 sur 2 — pour adapter les calculs"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="prenom">Prénom</Label>
                      <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom</Label>
                      <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
                    <p className="text-xs text-muted-foreground">8 caractères minimum</p>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label>Statut juridique</Label>
                    <Select value={statutJuridique} onValueChange={setStatutJuridique}>
                      <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto-entrepreneur">Auto-entrepreneur</SelectItem>
                        <SelectItem value="sasu">SASU</SelectItem>
                        <SelectItem value="eurl">EURL</SelectItem>
                        <SelectItem value="ei">Entreprise individuelle</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Régime fiscal</Label>
                    <Select value={regimeFiscal} onValueChange={setRegimeFiscal}>
                      <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="micro-entreprise">Micro-entreprise</SelectItem>
                        <SelectItem value="versement-liberatoire">Versement libératoire</SelectItem>
                        <SelectItem value="reel-simplifie">Réel simplifié</SelectItem>
                        <SelectItem value="is">IS (sociétés)</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
                    Ces informations permettent à Crezzy de calculer tes cotisations correctement. Tu pourras les modifier plus tard dans ton profil.
                  </p>
                </>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</> :
                  step === 1 ? "Continuer →" : "Créer mon compte"}
              </Button>
              {step === 2 && (
                <Button type="button" variant="ghost" className="w-full" onClick={() => setStep(1)}>← Retour</Button>
              )}
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Déjà un compte ?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">Se connecter</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
