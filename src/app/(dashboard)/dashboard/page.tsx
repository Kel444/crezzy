'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, Euro, Calendar, AlertTriangle, Wallet, CheckCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const PLAFOND_MICRO = 77700

function formatEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

const MOIS_NOMS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function DashboardPage() {
  const supabase = createClient()
  const [revenus, setRevenus] = useState<any[]>([])
  const [depenses, setDepenses] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const annee = new Date().getFullYear()
  const mois = new Date().getMonth() + 1

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: prof }, { data: revData }, { data: depData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('revenus').select('*').eq('user_id', user.id).eq('annee', annee),
        supabase.from('depenses').select('*').eq('user_id', user.id),
      ])
      if (prof) setProfile(prof)
      if (revData) setRevenus(revData)
      if (depData) setDepenses(depData)
      setLoading(false)
    }
    load()
  }, [])

  const tauxBrut = profile?.taux_imposition ?? 22
  const acre = profile?.acre ?? false
  const tauxEffectif = acre ? tauxBrut * 0.5 : tauxBrut
  const frequence = profile?.frequence_urssaf || 'mensuel'

  const revenusMoisCourant = revenus.filter(r => r.mois === mois).reduce((s: number, r: any) => s + r.montant_eur, 0)
  const revenusAnnee = revenus.reduce((s: number, r: any) => s + r.montant_eur, 0)
  const depensesDeductibles = depenses.filter((d: any) => d.deductible).reduce((s: number, d: any) => s + d.montant, 0)
  const beneficeNet = revenusAnnee - depensesDeductibles
  const cotisations = revenusAnnee * (tauxEffectif / 100)
  const pctPlafond = Math.min((revenusAnnee / PLAFOND_MICRO) * 100, 100)

  const chartData = MOIS_NOMS.map((nom, i) => ({
    mois: nom,
    revenus: revenus.filter((r: any) => r.mois === i + 1).reduce((s: number, r: any) => s + r.montant_eur, 0),
  }))

  function prochainEcheance() {
    if (frequence === 'mensuel') {
      const last = new Date(annee, mois, 0)
      return last.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    }
    if (mois <= 1) return '31 janvier'
    if (mois <= 4) return '30 avril'
    if (mois <= 7) return '31 juillet'
    return '31 octobre'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
    </div>
  )

  const prenom = profile?.full_name?.split(' ')[0] || ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour{prenom ? ` ${prenom}` : ''} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {MOIS_NOMS[mois - 1]} {annee} — voilà où tu en es
        </p>
      </div>

      {pctPlafond >= 80 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700">Plafond micro-entreprise bientôt atteint</p>
            <p className="text-sm text-amber-500 mt-0.5">{pctPlafond.toFixed(0)}% du plafond de {formatEur(PLAFOND_MICRO)} atteint.</p>
          </div>
        </div>
      )}

      {acre && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-green-50 border border-green-100">
          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-sm text-green-700 font-medium">ACRE active — cotisations à {tauxEffectif.toFixed(1)}% (au lieu de {tauxBrut}%)</p>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: `Revenus ${MOIS_NOMS[mois-1]}`, value: formatEur(revenusMoisCourant), sub: 'ce mois', icon: Euro, iconColor: 'text-pink-400', bg: 'bg-pink-50', text: 'text-pink-700' },
          { label: 'Total annuel', value: formatEur(revenusAnnee), sub: `cumul ${annee}`, icon: TrendingUp, iconColor: 'text-rose-400', bg: 'bg-rose-50', text: 'text-rose-700' },
          { label: 'Cotisations', value: formatEur(cotisations), sub: `taux ${tauxEffectif.toFixed(1)}%`, icon: TrendingDown, iconColor: 'text-orange-400', bg: 'bg-orange-50', text: 'text-orange-700' },
          { label: 'Bénéfice net', value: formatEur(beneficeNet), sub: 'après dépenses', icon: Wallet, iconColor: beneficeNet >= 0 ? 'text-emerald-400' : 'text-red-400', bg: beneficeNet >= 0 ? 'bg-emerald-50' : 'bg-red-50', text: beneficeNet >= 0 ? 'text-emerald-700' : 'text-red-600' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-400">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.iconColor}`} />
            </div>
            <p className={`text-xl font-bold ${s.text}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Graphique */}
        <div className="gradient-card rounded-2xl p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-800 mb-4 text-sm">Revenus {annee}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f472b6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#d1a0b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#d1a0b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip
                contentStyle={{ background: 'white', border: '1px solid #fce7f3', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 20px rgba(236,72,153,0.08)' }}
                formatter={(v: any) => [formatEur(Number(v)), 'Revenus']}
              />
              <Area type="monotone" dataKey="revenus" stroke="#ec4899" fill="url(#pinkGrad)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plafond + URSSAF */}
        <div className="space-y-4">
          <div className="gradient-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Plafond micro-entreprise</h3>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400 text-xs">Atteint</span>
              <span className={`font-bold text-sm ${pctPlafond >= 80 ? 'text-amber-500' : 'text-pink-600'}`}>{pctPlafond.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-pink-100 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${pctPlafond >= 80 ? 'bg-amber-400' : 'gradient-primary'}`}
                style={{ width: `${pctPlafond}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{formatEur(revenusAnnee)} / {formatEur(PLAFOND_MICRO)}</p>
          </div>

          <div className="gradient-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-pink-400" />
              <h3 className="text-sm font-semibold text-gray-700">Prochaine URSSAF</h3>
            </div>
            <p className="text-xl font-bold text-pink-600">{prochainEcheance()}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-medium capitalize">{frequence}</span>
              <span className="text-xs text-gray-400">{formatEur(cotisations)} à prévoir</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
