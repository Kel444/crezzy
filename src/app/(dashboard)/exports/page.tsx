"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatEur, getMonthName, currentYear } from "@/lib/utils";
import { Download, FileText, Table, Loader2 } from "lucide-react";
import type { Revenu, Depense, Profile } from "@/lib/types";

const TAUX_COTISATION = 0.221;
const PLAFOND_MICRO = 77700;

export default function ExportsPage() {
  const [revenus, setRevenus] = useState<Revenu[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [annee, setAnnee] = useState(String(currentYear()));
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: r }, { data: d }, { data: p }] = await Promise.all([
        supabase.from("revenus").select("*, chaine:chaines(nom)").eq("user_id", user.id).eq("annee", parseInt(annee)),
        supabase.from("depenses").select("*").eq("user_id", user.id),
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      ]);
      if (r) setRevenus(r);
      if (d) setDepenses(d);
      if (p) setProfile(p);
      setLoading(false);
    }
    load();
  }, [annee]);

  function exportCSVRevenus() {
    const header = "Mois;Année;Chaîne;Source;Montant;Devise;Montant EUR;Description\n";
    const rows = revenus.map(r =>
      `${getMonthName(r.mois)};${r.annee};${(r as any).chaine?.nom || ""};${r.source};${r.montant};${r.devise};${r.montant_eur};${r.description || ""}`
    ).join("\n");
    const blob = new Blob(["﻿" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `revenus-${annee}.csv`; a.click();
  }

  function exportCSVDepenses() {
    const header = "Date;Description;Catégorie;Montant EUR;Déductible\n";
    const rows = depenses.map(d =>
      `${d.date_depense};${d.description};${d.categorie};${d.montant};${d.deductible ? "Oui" : "Non"}`
    ).join("\n");
    const blob = new Blob(["﻿" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `depenses-${annee}.csv`; a.click();
  }

  async function exportRapportPDF() {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    const totalRevenus = revenus.reduce((s, r) => s + r.montant_eur, 0);
    const depDeductibles = depenses.filter(d => d.deductible).reduce((s, d) => s + d.montant, 0);
    const benefice = totalRevenus - depDeductibles;
    const cotisations = totalRevenus * TAUX_COTISATION;
    const pctPlafond = (totalRevenus / PLAFOND_MICRO) * 100;

    // Header
    doc.setFillColor(30, 20, 60);
    doc.rect(0, 0, pageW, 50, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22); doc.setFont("helvetica", "bold");
    doc.text("RAPPORT ANNUEL", 20, 22);
    doc.setFontSize(13); doc.setFont("helvetica", "normal");
    doc.text(`${profile.prenom || ""} ${profile.nom || ""} — Exercice ${annee}`, 20, 34);
    doc.setFontSize(9);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")} via Crezzy`, 20, 44);

    // Résumé
    doc.setTextColor(30, 20, 60);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Résumé financier", 20, 68);

    const stats = [
      ["Revenus bruts", formatEur(totalRevenus)],
      ["Dépenses déductibles", formatEur(depDeductibles)],
      ["Bénéfice net", formatEur(benefice)],
      ["Cotisations URSSAF estimées (22,1%)", formatEur(cotisations)],
      ["Plafond micro-entreprise utilisé", `${pctPlafond.toFixed(1)}% sur ${formatEur(PLAFOND_MICRO)}`],
    ];

    let y = 80;
    stats.forEach(([label, val], i) => {
      if (i % 2 === 0) doc.setFillColor(248, 248, 252);
      else doc.setFillColor(255, 255, 255);
      doc.rect(20, y - 5, pageW - 40, 12, "F");
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
      doc.text(label, 25, y + 3);
      doc.setFont("helvetica", "bold"); doc.setTextColor(30, 20, 60);
      doc.text(val, pageW - 25, y + 3, { align: "right" });
      y += 12;
    });

    // Revenus par mois
    y += 15;
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 20, 60);
    doc.text("Revenus par mois", 20, y);
    y += 12;

    for (let m = 1; m <= 12; m++) {
      const montant = revenus.filter(r => r.mois === m).reduce((s, r) => s + r.montant_eur, 0);
      if (montant > 0) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFillColor(248, 248, 252); doc.rect(20, y - 5, pageW - 40, 10, "F");
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
        doc.text(getMonthName(m) + " " + annee, 25, y + 1);
        doc.setFont("helvetica", "bold");
        doc.text(formatEur(montant), pageW - 25, y + 1, { align: "right" });
        y += 10;
      }
    }

    // Dépenses
    if (y > 230) { doc.addPage(); y = 20; }
    y += 15;
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 20, 60);
    doc.text("Dépenses déductibles", 20, y);
    y += 12;

    depenses.filter(d => d.deductible).forEach(d => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFillColor(248, 248, 252); doc.rect(20, y - 5, pageW - 40, 10, "F");
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
      doc.text(d.description + " (" + d.date_depense + ")", 25, y + 1);
      doc.setFont("helvetica", "bold");
      doc.text(formatEur(d.montant), pageW - 25, y + 1, { align: "right" });
      y += 10;
    });

    // Mention
    doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(150, 150, 150);
    doc.text("Ce rapport est fourni à titre indicatif. Consultez un expert-comptable pour votre déclaration officielle.", 20, 285);

    doc.save(`rapport-annuel-${annee}.pdf`);
  }

  const totalRevenus = revenus.reduce((s, r) => s + r.montant_eur, 0);
  const depDeductibles = depenses.filter(d => d.deductible).reduce((s, d) => s + d.montant, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const annees = [currentYear(), currentYear() - 1, currentYear() - 2].map(String);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Exports & rapports</h1>
        <p className="text-muted-foreground mt-1">Télécharge tes données pour ta comptabilité</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Année :</span>
        <Select value={annee} onValueChange={setAnnee}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{annees.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Aperçu */}
      <Card>
        <CardHeader><CardTitle className="text-base">Aperçu {annee}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-muted-foreground">Revenus totaux</p><p className="text-lg font-bold">{formatEur(totalRevenus)}</p></div>
          <div><p className="text-xs text-muted-foreground">Dépenses déductibles</p><p className="text-lg font-bold">{formatEur(depDeductibles)}</p></div>
          <div><p className="text-xs text-muted-foreground">Bénéfice net</p><p className="text-lg font-bold text-emerald-400">{formatEur(totalRevenus - depDeductibles)}</p></div>
          <div><p className="text-xs text-muted-foreground">Cotisations estimées</p><p className="text-lg font-bold text-amber-400">{formatEur(totalRevenus * TAUX_COTISATION)}</p></div>
        </CardContent>
      </Card>

      {/* Exports */}
      <div className="space-y-3">
        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div className="flex items-center gap-3">
              <Table className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="font-medium">Export CSV — Revenus {annee}</p>
                <p className="text-sm text-muted-foreground">{revenus.length} lignes · Compatible Excel, Google Sheets</p>
              </div>
            </div>
            <Button variant="outline" onClick={exportCSVRevenus} disabled={revenus.length === 0}>
              <Download className="w-4 h-4 mr-2" />Télécharger
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div className="flex items-center gap-3">
              <Table className="w-8 h-8 text-blue-400" />
              <div>
                <p className="font-medium">Export CSV — Dépenses {annee}</p>
                <p className="text-sm text-muted-foreground">{depenses.length} lignes · Compatible Excel, Google Sheets</p>
              </div>
            </div>
            <Button variant="outline" onClick={exportCSVDepenses} disabled={depenses.length === 0}>
              <Download className="w-4 h-4 mr-2" />Télécharger
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">Rapport PDF annuel {annee}</p>
                <p className="text-sm text-muted-foreground">Récapitulatif complet · Prêt pour ton comptable</p>
              </div>
            </div>
            <Button onClick={exportRapportPDF} disabled={revenus.length === 0 && depenses.length === 0}>
              <Download className="w-4 h-4 mr-2" />Générer
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Les exports CSV utilisent le point-virgule comme séparateur, adapté aux logiciels français.
      </p>
    </div>
  );
}
