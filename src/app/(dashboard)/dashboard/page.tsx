'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, Euro, Calendar, AlertTriangle, Wallet, CheckCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const PLAFOND_MICRO = 77700

function formatEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function getMonthName(m: number) {
  return ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'][m - 1]
}

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
  const cotisationsEstimees = revenusAnnee * (tauxEffectif / 100)
  const pctPlafond = Math.min((revenusAnnee / PLAFOND_MICRO) * 100, 100)

  const moisNoms = ['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec']
  const chartData = moisNoms.map((nom, i) => ({
    mois: nom,
    revenus: revenus.filter((r: any) => r.mois === i + 1).reduce((s: number, r: any) => s + r.montant_eur, 0),
  }))

  function prochainEcheance() {
    if (frequence === 'mensuel') {
      const d = new Date(annee, mois, 0) // dernier jour du mois courant
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    }
    if (mois <= 1) return '31 janvier'
    if (mois <= 4) return '30 avril'
    if (mois <= 7) return '31 juillet'
    return '31 octobre'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour{profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Voila ou tu en es pour {getMonthName(mois)} {annee}
        </p>
      </div>

      {pctPlafond >= 80 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700">Attention au plafond micro-entreprise</p>
            <p className="text-sm text-amber-600 mt-0.5">
              Tu as atteint {pctPlafond.toFixed(0)}% du plafond de {formatEur(PLAFOND_MICRO)}.
            </p>
          </div>
        </div>
      )}

      {acre && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-green-50 border border-green-200">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <p className="text-sm text-green-700 font-medium">
            ACRE active — cotisations reduites a {tauxEffectif.toFixed(1)}% (au lieu de {tauxBrut}%)
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: `Revenus ${getMonthName(mois)}`, value: formatEur(revenusMoisCourant), sub: `Ce mois`, icon: Euro, color: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'Total annuel', value: formatEur(revenusAnnee), sub: `Cumul ${annee}`, icon: TrendingUp, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Cotisations estimees', value: formatEur(cotisationsEstimees), sub: `Taux : ${tauxEffectif.toFixed(1)}%${acre ? ' (ACRE)' : ''}`, icon: TrendingDown, color: 'text-orange-700', bg: 'bg-orange-50' },
          { label: 'Benefice net', value: formatEur(beneficeNet), sub: 'Apres depenses deductibles', icon: Wallet, color: beneficeNet >= 0 ? 'text-green-700' : 'text-red-600', bg: beneficeNet >= 0 ? 'bg-green-50' : 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color} opacity-60`} />
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="gradient-card rounded-2xl p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-800 mb-4">Evolution des revenus {annee}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip
                contentStyle={{ background: 'white', border: '1px solid #e9d5ff', borderRadius: '12px', fontSize: '12px' }}
                formatter={(v: any) => [formatEur(Number(v)), 'Revenus']}
              />
              <Area type="monotone" dataKey="revenus" stroke="#a855f7" fill="url(#revGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="gradient-card rounded-2xl p-5">
            <h3 className="font-semibold text-gray-800 text-sm mb-3">Plafond micro-entreprise</h3>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Atteint</span>
              <span className={`font-bold ${pctPlafond >= 80 ? 'text-amber-500' : 'text-purple-700'}`}>
                {pctPlafond.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-purple-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${pctPlafond >= 80 ? 'bg-amber-400' : 'bg-purple-500'}`}
                style={{ width: `${pctPlafond}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">{formatEur(revenusAnnee)} / {formatEur(PLAFOND_MICRO)}</p>
          </div>

          <div className="gradient-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <h3 className="font-semibold text-gray-800 text-sm">Prochaine declaration URSSAF</h3>
            </div>
            <p className="text-xl font-bold text-purple-700">{prochainEcheance()}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium capitalize">
                {frequence}
              </span>
              <span className="text-xs text-gray-400">{formatEur(cotisationsEstimees)} a prevoir</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
