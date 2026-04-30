"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatEur, getMonthName, currentYear, currentMonth } from "@/lib/utils";
import { TrendingUp, TrendingDown, Euro, Calendar, AlertTriangle, Loader2 } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import type { Revenu, Depense } from "@/lib/types";

const PLAFOND_MICRO = 77700;
const TAUX_COTISATION_AE = 0.221; // 22.1% pour les services

export default function DashboardPage() {
  const [revenus, setRevenus] = useState<Revenu[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const [prenom, setPrenom] = useState("");
  const supabase = createClient();
  const annee = currentYear();
  const mois = currentMonth();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profil }, { data: revData }, { data: depData }] = await Promise.all([
        supabase.from("profiles").select("prenom").eq("user_id", user.id).single(),
        supabase.from("revenus").select("*").eq("user_id", user.id).eq("annee", annee),
        supabase.from("depenses").select("*").eq("user_id", user.id),
      ]);

      if (profil) setPrenom(profil.prenom);
      if (revData) setRevenus(revData);
      if (depData) setDepenses(depData);
      setLoading(false);
    }
    load();
  }, []);

  const revenusMoisCourant = revenus.filter(r => r.mois === mois).reduce((s, r) => s + r.montant_eur, 0);
  const revenusAnnee = revenus.reduce((s, r) => s + r.montant_eur, 0);
  const depensesDeductibles = depenses.filter(d => d.deductible).reduce((s, d) => s + d.montant, 0);
  const beneficeNet = revenusAnnee - depensesDeductibles;
  const cotisationsEstimees = revenusAnnee * TAUX_COTISATION_AE;
  const pctPlafond = Math.min((revenusAnnee / PLAFOND_MICRO) * 100, 100);

  // Données graphique mensuel
  const moisNoms = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const chartData = moisNoms.map((nom, i) => ({
    mois: nom,
    revenus: revenus.filter(r => r.mois === i + 1).reduce((s, r) => s + r.montant_eur, 0),
  }));

  // Prochaine échéance URSSAF
  const prochaineTrimestre = () => {
    const m = mois;
    if (m <= 1) return "31 janvier";
    if (m <= 4) return "30 avril";
    if (m <= 7) return "31 juillet";
    return "31 octobre";
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Bonjour {prenom} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Voilà où tu en es pour {getMonthName(mois)} {annee}
        </p>
      </div>

      {/* Alerte plafond */}
      {pctPlafond >= 80 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-400">Attention au plafond micro-entreprise</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tu as atteint {pctPlafond.toFixed(0)}% du plafond de {formatEur(PLAFOND_MICRO)}. 
              Au-delà, tu bascules automatiquement vers le régime réel.
            </p>
          </div>
        </div>
      )}

      {/* Cartes stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Revenus ce mois</span>
              <Euro className="w-4 h-4 text-muted-foreground" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatEur(revenusMoisCourant)}</div>
            <p className="text-xs text-muted-foreground mt-1">{getMonthName(mois)} {annee}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Total annuel</span>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatEur(revenusAnnee)}</div>
            <p className="text-xs text-muted-foreground mt-1">Cumul {annee}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Cotisations estimées</span>
              <TrendingDown className="w-4 h-4 text-muted-foreground" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{formatEur(cotisationsEstimees)}</div>
            <p className="text-xs text-muted-foreground mt-1">Taux AE services : 22,1%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Bénéfice net</span>
              <Euro className="w-4 h-4 text-muted-foreground" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${beneficeNet >= 0 ? "text-emerald-400" : "text-destructive"}`}>
              {formatEur(beneficeNet)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Après dépenses déductibles</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique + plafond */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Évolution des revenus {annee}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(263,70%,62%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(263,70%,62%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,28%,17%)" />
                <XAxis dataKey="mois" tick={{ fontSize: 12, fill: "hsl(215,20%,65%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(215,20%,65%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}€`} />
                <Tooltip
                  contentStyle={{ background: "hsl(224,71%,7%)", border: "1px solid hsl(215,28%,17%)", borderRadius: "8px" }}
                  formatter={(v: any) => [formatEur(Number(v)), "Revenus"]}
                />
                <Area type="monotone" dataKey="revenus" stroke="hsl(263,70%,62%)" fill="url(#colorRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Plafond micro-entreprise</CardTitle>
              <CardDescription>Services : {formatEur(PLAFOND_MICRO)} / an</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Atteint</span>
                <span className={pctPlafond >= 80 ? "text-amber-400 font-semibold" : "font-semibold"}>
                  {pctPlafond.toFixed(1)}%
                </span>
              </div>
              <Progress value={pctPlafond} className={pctPlafond >= 80 ? "[&>div]:bg-amber-400" : ""} />
              <p className="text-xs text-muted-foreground">
                {formatEur(revenusAnnee)} sur {formatEur(PLAFOND_MICRO)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Prochaine déclaration</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{prochaineTrimestre()}</p>
              <p className="text-xs text-muted-foreground mt-1">Déclaration trimestrielle URSSAF</p>
              <Badge variant="warning" className="mt-3">À venir</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
