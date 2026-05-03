'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Euro, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const PLAFOND = 77700
const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const G: React.CSSProperties = {
  background: 'rgba(255,255,255,0.055)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 18,
}

function eur(n: number) {
  return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n)
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
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: p }, { data: r }, { data: d }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('revenus').select('*').eq('user_id', user.id).eq('annee', annee),
        supabase.from('depenses').select('*').eq('user_id', user.id),
      ])
      if (p) setProfile(p)
      if (r) setRevenus(r)
      if (d) setDepenses(d)
      setLoading(false)
    })()
  }, [])

  const taux = profile?.acre ? (profile.taux_imposition ?? 22) * 0.5 : (profile?.taux_imposition ?? 22)
  const freq = profile?.frequence_urssaf || 'mensuel'
  const revMois = revenus.filter(r => r.mois === mois).reduce((s, r) => s + r.montant_eur, 0)
  const revAnnee = revenus.reduce((s, r) => s + r.montant_eur, 0)
  const depDed = depenses.filter(d => d.deductible).reduce((s, d) => s + d.montant, 0)
  const cotis = revAnnee * (taux / 100)
  const pct = Math.min((revAnnee / PLAFOND) * 100, 100)

  const chartData = MOIS.map((m, i) => ({
    m,
    v: revenus.filter(r => r.mois === i + 1).reduce((s, r) => s + r.montant_eur, 0)
  }))

  function echeance() {
    if (freq === 'mensuel') return new Date(annee, mois, 0).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})
    if (mois <= 1) return '31 janvier'; if (mois <= 4) return '30 avril'
    if (mois <= 7) return '31 juillet'; return '31 octobre'
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div style={{ width:32, height:32, border:'3px solid rgba(255,255,255,0.1)', borderTopColor:'#FF2D78', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const prenom = profile?.nom || ''
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div>
        <h1 style={{ fontSize:28, fontWeight:700, letterSpacing:'-0.03em', color:'#F5F5F7', margin:0 }}>
          Bonjour{prenom ? ` ${prenom}` : ''} 👋
        </h1>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, marginTop:6 }}>{MOIS[mois-1]} {annee}</p>
      </div>

      {pct >= 80 && (
        <div style={{ display:'flex', gap:12, padding:'14px 18px', borderRadius:14, background:'rgba(255,149,0,0.08)', border:'1px solid rgba(255,149,0,0.22)', backdropFilter:'blur(12px)' }}>
          <AlertTriangle style={{ width:18, height:18, color:'#FF9500', flexShrink:0, marginTop:1 }} />
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:'#FF9500', margin:0 }}>Plafond micro-entreprise bientôt atteint</p>
            <p style={{ fontSize:13, color:'rgba(255,149,0,0.7)', margin:'2px 0 0' }}>{pct.toFixed(0)}% des {eur(PLAFOND)} atteints</p>
          </div>
        </div>
      )}

      {profile?.acre && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:12, background:'rgba(48,209,88,0.07)', border:'1px solid rgba(48,209,88,0.18)', backdropFilter:'blur(12px)' }}>
          <CheckCircle style={{ width:16, height:16, color:'#30D158' }} />
          <p style={{ fontSize:13, color:'#30D158', margin:0, fontWeight:500 }}>ACRE active — cotisations réduites à {taux.toFixed(1)}%</p>
        </div>
      )}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14 }}>
        {[
          { label:`Revenus ${MOIS[mois-1]}`, val:eur(revMois), sub:'ce mois', color:'#FF2D78' },
          { label:`Total ${annee}`, val:eur(revAnnee), sub:'annuel', color:'#0A84FF' },
          { label:'Cotisations', val:eur(cotis), sub:`taux ${taux.toFixed(1)}%`, color:'#FF9F0A' },
          { label:'Bénéfice net', val:eur(revAnnee - depDed), sub:'après dépenses', color: revAnnee - depDed >= 0 ? '#30D158' : '#FF3B30' },
        ].map(s => (
          <div key={s.label} style={{ ...G, borderRadius:16, padding:'20px 20px 18px' }}>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', fontWeight:500, margin:'0 0 10px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{s.label}</p>
            <p style={{ fontSize:24, fontWeight:700, letterSpacing:'-0.03em', color:s.color, margin:0 }}>{s.val}</p>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', margin:'5px 0 0' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
        {/* Chart */}
        <div style={{ ...G, padding:'24px' }}>
          <p style={{ fontSize:14, fontWeight:600, color:'#F5F5F7', letterSpacing:'-0.01em', margin:'0 0 20px' }}>Revenus {annee}</p>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={chartData} margin={{ left:-10, right:4 }}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF2D78" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#FF2D78" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="m" tick={{ fontSize:11, fill:'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip contentStyle={{ background:'rgba(12,8,22,0.9)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, fontSize:12 }} formatter={(v: any) => [eur(Number(v)), 'Revenus']} />
              <Area type="monotone" dataKey="v" stroke="#FF2D78" strokeWidth={2} fill="url(#g)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Plafond */}
          <div style={{ ...G, padding:20 }}>
            <p style={{ fontSize:13, fontWeight:600, color:'#F5F5F7', margin:'0 0 12px' }}>Plafond micro-entreprise</p>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>Atteint</span>
              <span style={{ fontSize:13, fontWeight:700, color: pct >= 80 ? '#FF9F0A' : '#FF2D78' }}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:3, background: pct >= 80 ? '#FF9F0A' : 'linear-gradient(90deg,#FF6B9D,#FF2D78)', width:`${pct}%`, transition:'width 0.5s ease' }} />
            </div>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', margin:'8px 0 0' }}>{eur(revAnnee)} / {eur(PLAFOND)}</p>
          </div>

          {/* URSSAF */}
          <div style={{ ...G, padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <Calendar style={{ width:14, height:14, color:'#FF2D78' }} />
              <p style={{ fontSize:13, fontWeight:600, color:'#F5F5F7', margin:0 }}>Prochaine URSSAF</p>
            </div>
            <p style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.02em', color:'#F5F5F7', margin:0 }}>{echeance()}</p>
            <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:11, background:'rgba(255,45,120,0.12)', color:'#FF2D78', padding:'3px 10px', borderRadius:980, fontWeight:500 }}>{freq}</span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{eur(cotis)} à prévoir</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
