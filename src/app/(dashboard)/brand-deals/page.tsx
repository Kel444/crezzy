'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PlusCircle, X, Handshake, TrendingUp, Euro, Clock } from 'lucide-react'

interface BrandDeal {
  id: string
  marque: string
  contact_nom: string | null
  contact_email: string | null
  montant: number | null
  statut: string
  plateforme: string | null
  date_contact: string | null
  date_livraison: string | null
  notes: string | null
}

const D = {
  card: 'rgba(255,255,255,0.055)', card2: 'rgba(255,255,255,0.09)', border: 'rgba(255,255,255,0.12)',
  text: '#F5F5F7', sub: '#8E8E93', muted: '#636366', pink: '#FF2D78',
  green: '#30D158', blue: '#0A84FF', orange: '#FF9F0A', red: '#FF3B30', purple: '#BF5AF2',
}

const STATUTS = [
  { value: 'prospection', label: 'Prospection', bg: 'rgba(142,142,147,0.15)', color: '#8E8E93' },
  { value: 'negociation', label: 'Negociation', bg: 'rgba(10,132,255,0.15)', color: '#0A84FF' },
  { value: 'contrat', label: 'Contrat signé', bg: 'rgba(255,214,10,0.15)', color: '#FFD60A' },
  { value: 'facture', label: 'Facture envoyée', bg: 'rgba(255,159,10,0.15)', color: '#FF9F0A' },
  { value: 'paye', label: 'Payé', bg: 'rgba(48,209,88,0.15)', color: '#30D158' },
  { value: 'annule', label: 'Annulé', bg: 'rgba(255,59,48,0.15)', color: '#FF3B30' },
]

const PLATEFORMES = ['YouTube', 'Instagram', 'TikTok', 'Podcast', 'Newsletter', 'Autre']

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: `1px solid ${D.border}`, borderRadius: 12,
  padding: '10px 14px', fontSize: 14, color: D.text, outline: 'none', boxSizing: 'border-box',
}

export default function BrandDealsPage() {
  const supabase = createClient()
  const [deals, setDeals] = useState<BrandDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterStatut, setFilterStatut] = useState('all')
  const [form, setForm] = useState({
    marque: '', contact_nom: '', contact_email: '', montant: '',
    statut: 'prospection', plateforme: 'YouTube',
    date_contact: new Date().toISOString().split('T')[0], date_livraison: '', notes: '',
  })

  useEffect(() => { loadDeals() }, [])

  async function loadDeals() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('brand_deals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setDeals(data)
    setLoading(false)
  }

  async function createDeal(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('brand_deals').insert({
      user_id: user.id, marque: form.marque,
      contact_nom: form.contact_nom || null, contact_email: form.contact_email || null,
      montant: form.montant ? parseFloat(form.montant) : null,
      statut: form.statut, plateforme: form.plateforme,
      date_contact: form.date_contact || null, date_livraison: form.date_livraison || null, notes: form.notes || null,
    })
    if (!error) {
      setShowForm(false)
      setForm({ marque: '', contact_nom: '', contact_email: '', montant: '', statut: 'prospection', plateforme: 'YouTube', date_contact: new Date().toISOString().split('T')[0], date_livraison: '', notes: '' })
      loadDeals()
    }
  }

  async function updateStatut(id: string, statut: string) {
    await supabase.from('brand_deals').update({ statut }).eq('id', id)
    loadDeals()
  }

  const filtered = filterStatut === 'all' ? deals : deals.filter(d => d.statut === filterStatut)
  const totalPipeline = deals.filter(d => d.statut !== 'annule' && d.montant).reduce((s, d) => s + (d.montant || 0), 0)
  const totalPaye = deals.filter(d => d.statut === 'paye' && d.montant).reduce((s, d) => s + (d.montant || 0), 0)
  const enCours = deals.filter(d => !['paye', 'annule'].includes(d.statut)).length
  const getStatut = (val: string) => STATUTS.find(s => s.value === val) || STATUTS[0]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${D.card2}`, borderTopColor: D.pink, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .deal-card:hover{background:rgba(255,255,255,0.02)}`}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: D.text, margin: 0 }}>Brand Deals</h1>
          <p style={{ color: D.sub, fontSize: 14, marginTop: 4 }}>Du premier contact au paiement</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 980, background: D.pink, color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          <PlusCircle style={{ width: 15, height: 15 }} />Nouveau deal
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {[
          { label: 'Pipeline total', value: `${totalPipeline.toFixed(0)} €`, icon: TrendingUp, color: D.pink, bg: 'rgba(255,45,120,0.1)' },
          { label: 'Encaissé', value: `${totalPaye.toFixed(0)} €`, icon: Euro, color: D.green, bg: 'rgba(48,209,88,0.1)' },
          { label: 'En cours', value: `${enCours} deal${enCours > 1 ? 's' : ''}`, icon: Clock, color: D.blue, bg: 'rgba(10,132,255,0.1)' },
        ].map(s => (
          <div key={s.label} style={{ background: D.card, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 18, border: `1px solid ${D.border}`, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon style={{ width: 14, height: 14, color: s.color }} />
              </div>
              <p style={{ fontSize: 11, fontWeight: 600, color: D.sub, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{s.label}</p>
            </div>
            <p style={{ fontSize: 24, fontWeight: 700, color: s.color, margin: 0, letterSpacing: '-0.03em' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: D.card, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 18, border: `1px solid ${D.border}`, padding: '16px 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: D.sub, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Pipeline</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {STATUTS.filter(s => s.value !== 'annule').map(s => {
            const count = deals.filter(d => d.statut === s.value).length
            const isActive = filterStatut === s.value
            return (
              <button key={s.value}
                onClick={() => setFilterStatut(isActive ? 'all' : s.value)}
                style={{ flex: 1, padding: '10px 8px', borderRadius: 12, textAlign: 'center', background: isActive ? s.bg : D.card2, border: `1px solid ${isActive ? s.color : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: s.color, margin: '0 0 2px' }}>{count}</p>
                <p style={{ fontSize: 10, color: D.sub, margin: 0, lineHeight: 1.2 }}>{s.label}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ background: D.card, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 18, border: `1px solid ${D.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px' }}>
            <Handshake style={{ width: 36, height: 36, color: D.muted, marginBottom: 12 }} />
            <p style={{ color: D.sub, fontSize: 15, fontWeight: 500, margin: '0 0 4px' }}>Aucun brand deal pour l'instant</p>
            <p style={{ color: D.muted, fontSize: 13, margin: 0 }}>Ajoute ton premier partenariat ci-dessus</p>
          </div>
        ) : filtered.map(deal => {
          const st = getStatut(deal.statut)
          return (
            <div key={deal.id} className="deal-card" style={{ background: D.card, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 16, border: `1px solid ${D.border}`, padding: '16px 20px', transition: 'background 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    <h3 style={{ fontWeight: 700, color: D.text, fontSize: 15, margin: 0 }}>{deal.marque}</h3>
                    {deal.plateforme && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 980, background: 'rgba(255,45,120,0.12)', color: D.pink }}>{deal.plateforme}</span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 980, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  {deal.contact_nom && <p style={{ fontSize: 13, color: D.sub, margin: '0 0 4px' }}>{deal.contact_nom}{deal.contact_email && ` — ${deal.contact_email}`}</p>}
                  {deal.notes && <p style={{ fontSize: 13, color: D.muted, margin: '0 0 6px', fontStyle: 'italic' }}>{deal.notes}</p>}
                  <div style={{ display: 'flex', gap: 16 }}>
                    {deal.date_contact && <span style={{ fontSize: 11, color: D.muted }}>Contact : {new Date(deal.date_contact).toLocaleDateString('fr-FR')}</span>}
                    {deal.date_livraison && <span style={{ fontSize: 11, color: D.muted }}>Livraison : {new Date(deal.date_livraison).toLocaleDateString('fr-FR')}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  {deal.montant && <p style={{ fontSize: 18, fontWeight: 700, color: D.pink, margin: 0 }}>{deal.montant.toFixed(0)} €</p>}
                  <select value={deal.statut} onChange={e => updateStatut(deal.id, e.target.value)}
                    style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 980, border: `1px solid ${D.border}`, background: D.card2, color: D.text, cursor: 'pointer', outline: 'none' }}>
                    {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: D.card, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${D.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${D.border}` }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>Nouveau brand deal</h2>
              <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: D.muted, display: 'flex' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <form onSubmit={createDeal} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Marque *</label>
                <input required value={form.marque} onChange={e => setForm({...form, marque: e.target.value})} style={inputStyle} placeholder="Nom de la marque" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Contact</label>
                  <input value={form.contact_nom} onChange={e => setForm({...form, contact_nom: e.target.value})} style={inputStyle} placeholder="Nom" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Email</label>
                  <input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} style={inputStyle} placeholder="contact@marque.com" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Montant (€)</label>
                  <input type="number" min="0" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} style={inputStyle} placeholder="0" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Plateforme</label>
                  <select value={form.plateforme} onChange={e => setForm({...form, plateforme: e.target.value})} style={inputStyle}>
                    {PLATEFORMES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Date de contact</label>
                  <input type="date" value={form.date_contact} onChange={e => setForm({...form, date_contact: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Date de livraison</label>
                  <input type="date" value={form.date_livraison} onChange={e => setForm({...form, date_livraison: e.target.value})} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Statut</label>
                <select value={form.statut} onChange={e => setForm({...form, statut: e.target.value})} style={inputStyle}>
                  {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  rows={2} style={{ ...inputStyle, resize: 'none' }}
                  placeholder="Conditions, briefing..." />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: `1px solid ${D.border}`, background: 'transparent', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: D.sub }}>
                  Annuler
                </button>
                <button type="submit"
                  style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', background: D.pink, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff' }}>
                  Ajouter le deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
