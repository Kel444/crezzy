"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatEur, getMonthName, currentYear, currentMonth } from "@/lib/utils";
import { Plus, PlayCircle, Trash2, TrendingUp, Loader2, Euro } from "lucide-react";
import type { Chaine, Revenu, SourceRevenu } from "@/lib/types";

const SOURCES: { value: SourceRevenu; label: string }[] = [
  { value: "adsense", label: "AdSense" },
  { value: "membership", label: "Memberships" },
  { value: "super-chat", label: "Super Chats" },
  { value: "sponsoring", label: "Sponsoring" },
  { value: "merch", label: "Merch" },
  { value: "autre", label: "Autre" },
];

const USD_EUR = 0.92; // Taux fixe indicatif

export default function ChainesPage() {
  const [chaines, setChaines] = useState<Chaine[]>([]);
  const [revenus, setRevenus] = useState<Revenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChaine, setOpenChaine] = useState(false);
  const [openRevenu, setOpenRevenu] = useState(false);
  const [selectedChaine, setSelectedChaine] = useState<string>("");
  const [newChaine, setNewChaine] = useState({ nom: "", url: "", devise: "EUR" });
  const [newRevenu, setNewRevenu] = useState({ chaine_id: "", source: "adsense" as SourceRevenu, montant: "", devise: "EUR", mois: currentMonth(), annee: currentYear(), description: "" });
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from("chaines").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("revenus").select("*, chaine:chaines(nom)").eq("user_id", user.id).order("annee", { ascending: false }).order("mois", { ascending: false }),
    ]);
    if (c) { setChaines(c); if (c.length > 0 && !selectedChaine) setSelectedChaine(c[0].id); }
    if (r) setRevenus(r);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addChaine(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("chaines").insert({ ...newChaine, user_id: user.id });
    setNewChaine({ nom: "", url: "", devise: "EUR" });
    setOpenChaine(false);
    load();
  }

  async function addRevenu(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const montant = parseFloat(newRevenu.montant);
    const montant_eur = newRevenu.devise === "USD" ? montant * USD_EUR : montant;
    await supabase.from("revenus").insert({
      user_id: user.id,
      chaine_id: newRevenu.chaine_id || chaines[0]?.id,
      source: newRevenu.source,
      montant,
      devise: newRevenu.devise,
      montant_eur,
      mois: newRevenu.mois,
      annee: newRevenu.annee,
      description: newRevenu.description,
    });
    setOpenRevenu(false);
    load();
  }

  async function deleteRevenu(id: string) {
    await supabase.from("revenus").delete().eq("id", id);
    setRevenus(prev => prev.filter(r => r.id !== id));
  }

  const revenusDeLaChaine = revenus.filter(r => r.chaine_id === selectedChaine);
  const totalChaine = revenusDeLaChaine.reduce((s, r) => s + r.montant_eur, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes chaînes YouTube</h1>
          <p className="text-muted-foreground mt-1">Suis tes revenus chaîne par chaîne</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openRevenu} onOpenChange={setOpenRevenu}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="w-4 h-4 mr-2" />Ajouter un revenu</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau revenu</DialogTitle></DialogHeader>
              <form onSubmit={addRevenu} className="space-y-4">
                <div className="space-y-2">
                  <Label>Chaîne</Label>
                  <Select value={newRevenu.chaine_id || chaines[0]?.id} onValueChange={(v) => setNewRevenu({ ...newRevenu, chaine_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{chaines.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select value={newRevenu.source} onValueChange={(v) => setNewRevenu({ ...newRevenu, source: v as SourceRevenu })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Devise</Label>
                    <Select value={newRevenu.devise} onValueChange={(v) => setNewRevenu({ ...newRevenu, devise: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR €</SelectItem>
                        <SelectItem value="USD">USD $ (converti auto)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Montant {newRevenu.devise === "USD" && <span className="text-muted-foreground">(≈ {parseFloat(newRevenu.montant || "0") * USD_EUR} EUR)</span>}</Label>
                  <Input type="number" step="0.01" value={newRevenu.montant} onChange={(e) => setNewRevenu({ ...newRevenu, montant: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Mois</Label>
                    <Select value={String(newRevenu.mois)} onValueChange={(v) => setNewRevenu({ ...newRevenu, mois: parseInt(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i+1} value={String(i+1)}>{getMonthName(i+1)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Année</Label>
                    <Input type="number" value={newRevenu.annee} onChange={(e) => setNewRevenu({ ...newRevenu, annee: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description (optionnel)</Label>
                  <Input value={newRevenu.description} onChange={(e) => setNewRevenu({ ...newRevenu, description: e.target.value })} placeholder="ex: Sponsoring Nike mars" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpenRevenu(false)}>Annuler</Button>
                  <Button type="submit">Ajouter</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={openChaine} onOpenChange={setOpenChaine}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Nouvelle chaîne</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ajouter une chaîne</DialogTitle></DialogHeader>
              <form onSubmit={addChaine} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom de la chaîne</Label>
                  <Input value={newChaine.nom} onChange={(e) => setNewChaine({ ...newChaine, nom: e.target.value })} placeholder="Ma chaîne gaming" required />
                </div>
                <div className="space-y-2">
                  <Label>URL YouTube (optionnel)</Label>
                  <Input value={newChaine.url} onChange={(e) => setNewChaine({ ...newChaine, url: e.target.value })} placeholder="https://youtube.com/@machaîne" />
                </div>
                <div className="space-y-2">
                  <Label>Devise principale</Label>
                  <Select value={newChaine.devise} onValueChange={(v) => setNewChaine({ ...newChaine, devise: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR €</SelectItem>
                      <SelectItem value="USD">USD $</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpenChaine(false)}>Annuler</Button>
                  <Button type="submit">Créer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {chaines.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <PlayCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Aucune chaîne ajoutée</h3>
            <p className="text-muted-foreground mb-4">Commence par ajouter ta première chaîne YouTube</p>
            <Button onClick={() => setOpenChaine(true)}><Plus className="w-4 h-4 mr-2" />Ajouter ma première chaîne</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Liste des chaînes */}
          <div className="space-y-2">
            {chaines.map(chaine => {
              const total = revenus.filter(r => r.chaine_id === chaine.id).reduce((s, r) => s + r.montant_eur, 0);
              return (
                <button
                  key={chaine.id}
                  onClick={() => setSelectedChaine(chaine.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${selectedChaine === chaine.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <PlayCircle className="w-4 h-4 text-red-500" />
                    <span className="font-medium text-sm">{chaine.nom}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatEur(total)} cette année</p>
                </button>
              );
            })}
          </div>

          {/* Détail chaîne sélectionnée */}
          <div className="lg:col-span-3 space-y-4">
            {selectedChaine && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{chaines.find(c => c.id === selectedChaine)?.nom}</h2>
                    <p className="text-sm text-muted-foreground">Total annuel : <span className="text-foreground font-semibold">{formatEur(totalChaine)}</span></p>
                  </div>
                </div>

                {/* Tableau des revenus */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Historique des revenus</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {revenusDeLaChaine.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Aucun revenu enregistré pour cette chaîne</p>
                    ) : (
                      <div className="space-y-2">
                        {revenusDeLaChaine.map(r => (
                          <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary">{SOURCES.find(s => s.value === r.source)?.label || r.source}</Badge>
                              <div>
                                <p className="text-sm font-medium">{r.description || SOURCES.find(s => s.value === r.source)?.label}</p>
                                <p className="text-xs text-muted-foreground">{getMonthName(r.mois)} {r.annee}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-semibold">{formatEur(r.montant_eur)}</p>
                                {r.devise === "USD" && <p className="text-xs text-muted-foreground">${r.montant}</p>}
                              </div>
                              <button onClick={() => deleteRevenu(r.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
