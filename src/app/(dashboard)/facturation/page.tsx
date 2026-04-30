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
import { formatEur, formatDate } from "@/lib/utils";
import { Plus, Download, FileText, Loader2, CheckCircle, Clock, AlertCircle, Edit } from "lucide-react";
import type { Facture, StatutFacture, Profile } from "@/lib/types";

const STATUT_CONFIG: Record<StatutFacture, { label: string; variant: any; icon: any }> = {
  brouillon: { label: "Brouillon", variant: "secondary", icon: Edit },
  envoyee: { label: "Envoyée", variant: "default", icon: Clock },
  payee: { label: "Payée", variant: "success", icon: CheckCircle },
  "en-retard": { label: "En retard", variant: "destructive", icon: AlertCircle },
};

function generatePDF(facture: Facture, profile: Partial<Profile>) {
  // Import dynamique pour éviter les erreurs SSR
  import("jspdf").then(({ default: jsPDF }) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Fond sombre pour le header
    doc.setFillColor(30, 20, 60);
    doc.rect(0, 0, pageW, 45, "F");

    // Titre
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURE", 20, 20);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(facture.numero, 20, 30);
    doc.text(`Date : ${formatDate(facture.date_emission)}`, pageW - 20, 20, { align: "right" });
    doc.text(`Échéance : ${formatDate(facture.date_echeance)}`, pageW - 20, 30, { align: "right" });

    // Émetteur
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ÉMETTEUR", 20, 60);
    doc.setFont("helvetica", "normal");
    const nom = `${profile.prenom || ""} ${profile.nom || ""}`.trim() || "—";
    doc.text(nom, 20, 68);
    if (profile.adresse) doc.text(profile.adresse, 20, 75);
    if (profile.siret) doc.text(`SIRET : ${profile.siret}`, 20, 82);
    doc.text("Auto-entrepreneur", 20, 89);

    // Client
    doc.setFont("helvetica", "bold");
    doc.text("CLIENT", pageW / 2 + 10, 60);
    doc.setFont("helvetica", "normal");
    doc.text(facture.nom_client, pageW / 2 + 10, 68);
    if (facture.email_client) doc.text(facture.email_client, pageW / 2 + 10, 75);
    if (facture.adresse_client) {
      const lines = doc.splitTextToSize(facture.adresse_client, 80);
      doc.text(lines, pageW / 2 + 10, 82);
    }

    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 100, pageW - 20, 100);

    // Objet
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 20, 60);
    doc.text("Objet :", 20, 115);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(facture.objet, 20, 123);

    // Tableau montants
    const tableY = 140;
    doc.setFillColor(245, 245, 250);
    doc.rect(20, tableY - 7, pageW - 40, 10, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("Description", 25, tableY);
    doc.text("Montant HT", pageW - 60, tableY, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.text(facture.objet, 25, tableY + 12);
    doc.text(formatEur(facture.montant_ht), pageW - 60, tableY + 12, { align: "right" });

    // Totaux
    const totY = tableY + 35;
    doc.line(20, totY - 5, pageW - 20, totY - 5);
    doc.setFont("helvetica", "normal");
    doc.text("Montant HT", pageW - 90, totY);
    doc.text(formatEur(facture.montant_ht), pageW - 20, totY, { align: "right" });

    if (facture.tva_pct > 0) {
      doc.text(`TVA (${facture.tva_pct}%)`, pageW - 90, totY + 8);
      doc.text(formatEur(facture.montant_ttc - facture.montant_ht), pageW - 20, totY + 8, { align: "right" });
    } else {
      doc.setFontSize(8);
      doc.text("TVA non applicable – Art. 293B du CGI", pageW - 90, totY + 8);
      doc.setFontSize(10);
    }

    doc.setFillColor(30, 20, 60);
    doc.rect(pageW - 100, totY + 14, 80, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL TTC", pageW - 90, totY + 22);
    doc.text(formatEur(facture.montant_ttc), pageW - 20, totY + 22, { align: "right" });

    // Mentions légales
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const mentionsY = 250;
    doc.text("Conditions de paiement : " + (facture.conditions_paiement || "30 jours"), 20, mentionsY);
    doc.text("En cas de retard de paiement, des pénalités de 3 fois le taux légal seront appliquées.", 20, mentionsY + 6);
    doc.text("Une indemnité forfaitaire de recouvrement de 40€ sera due.", 20, mentionsY + 12);
    if (profile.siret) doc.text(`SIRET : ${profile.siret} — Auto-entrepreneur dispensé d'immatriculation au RCS`, 20, mentionsY + 18);

    doc.save(`${facture.numero}.pdf`);
  });
}

export default function FacturationPage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filterStatut, setFilterStatut] = useState("toutes");
  const [form, setForm] = useState({
    nom_client: "", email_client: "", adresse_client: "",
    objet: "", montant_ht: "", tva_pct: "0",
    date_emission: new Date().toISOString().split("T")[0],
    date_echeance: "", conditions_paiement: "30 jours",
    notes: "",
  });
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: f }, { data: p }] = await Promise.all([
      supabase.from("factures").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    ]);
    if (f) setFactures(f);
    if (p) setProfile(p);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function generateNumero(userId: string): Promise<string> {
    const year = new Date().getFullYear();
    const { count } = await supabase.from("factures").select("id", { count: "exact" }).eq("user_id", userId);
    const n = String((count || 0) + 1).padStart(3, "0");
    return `FAC-${year}-${n}`;
  }

  async function addFacture(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const numero = await generateNumero(user.id);
    const ht = parseFloat(form.montant_ht);
    const tva = parseFloat(form.tva_pct);
    const ttc = ht * (1 + tva / 100);
    await supabase.from("factures").insert({
      user_id: user.id, numero,
      nom_client: form.nom_client, email_client: form.email_client,
      adresse_client: form.adresse_client, objet: form.objet,
      montant_ht: ht, tva_pct: tva, montant_ttc: ttc,
      statut: "brouillon", date_emission: form.date_emission,
      date_echeance: form.date_echeance, conditions_paiement: form.conditions_paiement,
      notes: form.notes,
    });
    setOpen(false);
    load();
  }

  async function updateStatut(id: string, statut: StatutFacture) {
    const updates: any = { statut };
    if (statut === "payee") updates.date_paiement = new Date().toISOString().split("T")[0];
    await supabase.from("factures").update(updates).eq("id", id);
    setFactures(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }

  const filtered = factures.filter(f => filterStatut === "toutes" || f.statut === filterStatut);
  const totalPaye = factures.filter(f => f.statut === "payee").reduce((s, f) => s + f.montant_ttc, 0);
  const totalEnAttente = factures.filter(f => f.statut === "envoyee" || f.statut === "en-retard").reduce((s, f) => s + f.montant_ttc, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturation</h1>
          <p className="text-muted-foreground mt-1">Génère et suis tes factures sponsors</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouvelle facture</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Créer une facture</DialogTitle></DialogHeader>
            <form onSubmit={addFacture} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label>Nom du client / sponsor *</Label>
                  <Input value={form.nom_client} onChange={(e) => setForm({ ...form, nom_client: e.target.value })} placeholder="Nike France" required />
                </div>
                <div className="space-y-2">
                  <Label>Email client</Label>
                  <Input type="email" value={form.email_client} onChange={(e) => setForm({ ...form, email_client: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Adresse client</Label>
                  <Input value={form.adresse_client} onChange={(e) => setForm({ ...form, adresse_client: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Objet / prestation *</Label>
                <Input value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })} placeholder="Intégration sponsorisée YouTube — Avril 2024" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Montant HT (€) *</Label>
                  <Input type="number" step="0.01" value={form.montant_ht} onChange={(e) => setForm({ ...form, montant_ht: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>TVA (%)</Label>
                  <Select value={form.tva_pct} onValueChange={(v) => setForm({ ...form, tva_pct: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% (Auto-entrepreneur)</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.montant_ht && (
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  Total TTC : <span className="font-semibold text-foreground">{formatEur(parseFloat(form.montant_ht) * (1 + parseFloat(form.tva_pct) / 100))}</span>
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date d'émission</Label>
                  <Input type="date" value={form.date_emission} onChange={(e) => setForm({ ...form, date_emission: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Date d'échéance *</Label>
                  <Input type="date" value={form.date_echeance} onChange={(e) => setForm({ ...form, date_echeance: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Conditions de paiement</Label>
                <Input value={form.conditions_paiement} onChange={(e) => setForm({ ...form, conditions_paiement: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit">Créer la facture</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground mb-1">Total facturé</p><p className="text-xl font-bold">{formatEur(factures.reduce((s, f) => s + f.montant_ttc, 0))}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground mb-1">Encaissé</p><p className="text-xl font-bold text-emerald-400">{formatEur(totalPaye)}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground mb-1">En attente</p><p className="text-xl font-bold text-amber-400">{formatEur(totalEnAttente)}</p></CardContent></Card>
      </div>

      {/* Filtres */}
      <Select value={filterStatut} onValueChange={setFilterStatut}>
        <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="toutes">Toutes les factures</SelectItem>
          <SelectItem value="brouillon">Brouillons</SelectItem>
          <SelectItem value="envoyee">Envoyées</SelectItem>
          <SelectItem value="payee">Payées</SelectItem>
          <SelectItem value="en-retard">En retard</SelectItem>
        </SelectContent>
      </Select>

      {/* Liste */}
      <Card>
        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucune facture trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(f => {
                const cfg = STATUT_CONFIG[f.statut];
                const Icon = cfg.icon;
                return (
                  <div key={f.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{f.numero}</span>
                          <Badge variant={cfg.variant} className="text-xs">
                            <Icon className="w-3 h-3 mr-1" />{cfg.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{f.nom_client} — {f.objet}</p>
                        <p className="text-xs text-muted-foreground">Émise le {formatDate(f.date_emission)} · Échéance {formatDate(f.date_echeance)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">{formatEur(f.montant_ttc)}</span>
                      <Select value={f.statut} onValueChange={(v) => updateStatut(f.id, v as StatutFacture)}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brouillon">Brouillon</SelectItem>
                          <SelectItem value="envoyee">Envoyée</SelectItem>
                          <SelectItem value="payee">Payée</SelectItem>
                          <SelectItem value="en-retard">En retard</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => generatePDF(f, profile)}>
                        <Download className="w-3 h-3 mr-1" />PDF
                      </Button>
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
