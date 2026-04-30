"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatEur, formatDate } from "@/lib/utils";
import { Plus, Trash2, Receipt, Upload, CheckCircle, XCircle, Loader2, Filter } from "lucide-react";
import type { Depense, CategorieDepense } from "@/lib/types";

const CATEGORIES: { value: CategorieDepense; label: string; icon: string }[] = [
  { value: "materiel", label: "Matériel", icon: "🎥" },
  { value: "logiciels", label: "Logiciels", icon: "💻" },
  { value: "sous-traitants", label: "Sous-traitants", icon: "👥" },
  { value: "deplacements", label: "Déplacements", icon: "🚗" },
  { value: "formation", label: "Formation", icon: "📚" },
  { value: "communication", label: "Communication", icon: "📣" },
  { value: "bureau", label: "Bureau", icon: "🏠" },
  { value: "autre", label: "Autre", icon: "📦" },
];

export default function DepensesPage() {
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filterCat, setFilterCat] = useState("toutes");
  const [filterDeductible, setFilterDeductible] = useState("toutes");
  const [newDep, setNewDep] = useState({
    categorie: "materiel" as CategorieDepense,
    description: "",
    montant: "",
    date_depense: new Date().toISOString().split("T")[0],
    deductible: true,
  });
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("depenses").select("*").eq("user_id", user.id).order("date_depense", { ascending: false });
    if (data) setDepenses(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addDepense(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("depenses").insert({
      user_id: user.id,
      ...newDep,
      montant: parseFloat(newDep.montant),
    });
    setNewDep({ categorie: "materiel", description: "", montant: "", date_depense: new Date().toISOString().split("T")[0], deductible: true });
    setOpen(false);
    load();
  }

  async function deleteDepense(id: string) {
    await supabase.from("depenses").delete().eq("id", id);
    setDepenses(prev => prev.filter(d => d.id !== id));
  }

  const filtered = depenses.filter(d => {
    if (filterCat !== "toutes" && d.categorie !== filterCat) return false;
    if (filterDeductible === "deductible" && !d.deductible) return false;
    if (filterDeductible === "non-deductible" && d.deductible) return false;
    return true;
  });

  const totalDeductible = depenses.filter(d => d.deductible).reduce((s, d) => s + d.montant, 0);
  const totalNonDeductible = depenses.filter(d => !d.deductible).reduce((s, d) => s + d.montant, 0);
  const totalGeneral = depenses.reduce((s, d) => s + d.montant, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dépenses</h1>
          <p className="text-muted-foreground mt-1">Suis ce que tu dépenses et ce que tu peux déduire</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Ajouter une dépense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
            <form onSubmit={addDepense} className="space-y-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={newDep.description} onChange={(e) => setNewDep({ ...newDep, description: e.target.value })} placeholder="ex: Micro Blue Yeti" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={newDep.categorie} onValueChange={(v) => setNewDep({ ...newDep, categorie: v as CategorieDepense })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Montant (€)</Label>
                  <Input type="number" step="0.01" value={newDep.montant} onChange={(e) => setNewDep({ ...newDep, montant: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={newDep.date_depense} onChange={(e) => setNewDep({ ...newDep, date_depense: e.target.value })} required />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                <div>
                  <p className="text-sm font-medium">Déductible fiscalement</p>
                  <p className="text-xs text-muted-foreground">Cette dépense est liée à ton activité</p>
                </div>
                <Switch checked={newDep.deductible} onCheckedChange={(v) => setNewDep({ ...newDep, deductible: v })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit">Ajouter</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground mb-1">Total dépenses</p>
            <p className="text-xl font-bold">{formatEur(totalGeneral)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground mb-1">Déductibles</p>
            <p className="text-xl font-bold text-emerald-400">{formatEur(totalDeductible)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground mb-1">Non déductibles</p>
            <p className="text-xl font-bold text-muted-foreground">{formatEur(totalNonDeductible)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-48"><Filter className="w-3 h-3 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes les catégories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDeductible} onValueChange={setFilterDeductible}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes</SelectItem>
            <SelectItem value="deductible">Déductibles</SelectItem>
            <SelectItem value="non-deductible">Non déductibles</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste */}
      <Card>
        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucune dépense trouvée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(d => {
                const cat = CATEGORIES.find(c => c.value === d.categorie);
                return (
                  <div key={d.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat?.icon || "📦"}</span>
                      <div>
                        <p className="text-sm font-medium">{d.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatDate(d.date_depense)}</span>
                          <Badge variant="secondary" className="text-xs">{cat?.label}</Badge>
                          {d.deductible
                            ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3 h-3" />Déductible</span>
                            : <span className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="w-3 h-3" />Non déductible</span>
                          }
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatEur(d.montant)}</span>
                      <button onClick={() => deleteDepense(d.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
