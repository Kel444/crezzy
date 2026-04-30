"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { User, Building, Loader2, CheckCircle } from "lucide-react";
import type { Profile } from "@/lib/types";

export default function ProfilPage() {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (data) setProfile(data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").upsert({ ...profile, user_id: user.id, email: user.email });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-muted-foreground mt-1">Tes informations personnelles et ton statut professionnel</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Informations personnelles</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input value={profile.prenom || ""} onChange={(e) => setProfile({ ...profile, prenom: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={profile.nom || ""} onChange={(e) => setProfile({ ...profile, nom: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input value={profile.adresse || ""} onChange={(e) => setProfile({ ...profile, adresse: e.target.value })} placeholder="123 rue de la Paix, 75001 Paris" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Statut professionnel</CardTitle>
            </div>
            <CardDescription>Ces informations servent à calculer tes cotisations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>SIRET</Label>
              <Input value={profile.siret || ""} onChange={(e) => setProfile({ ...profile, siret: e.target.value })} placeholder="123 456 789 00010" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Statut juridique</Label>
                <Select value={profile.statut_juridique || ""} onValueChange={(v) => setProfile({ ...profile, statut_juridique: v as any })}>
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
                <Select value={profile.regime_fiscal || ""} onValueChange={(v) => setProfile({ ...profile, regime_fiscal: v as any })}>
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
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde...</> :
           saved ? <><CheckCircle className="w-4 h-4" /> Sauvegardé !</> :
           "Sauvegarder les modifications"}
        </Button>
      </form>
    </div>
  );
}
