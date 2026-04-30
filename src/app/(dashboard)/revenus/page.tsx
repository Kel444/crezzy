'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PlusCircle, X, TrendingUp, Euro, Calendar, Trash2 } from 'lucide-react'

interface Revenu {
  id: string
  mois: number
  annee: number
  montant_eur: number
  source: string
  description: string | null
}

const SOURCES = [
  { value: 'adsense', label: 'AdSense', dark: 'rgba(255,159,10,0.15)', text: '#FF9F0A' },
  { value: 'sponsoring', label: 'Sponsoring', dark: 'rgba(255,45,120,0.15)', text: '#FF2D78' },
  { value: 'membership', label: 'Memberships', dark: 'rgba(191,90,242,0.15)', text: '#BF5AF2' },
  { value: 'super-chat', label: 'Super Chats', dark: 'rgba(10,132,255,0.15)', text: '#0A84FF' },
  { value: 'merch', label: 'Merch', dark: 'rgba(48,209,88,0.15)', text: '#30D158' },
  { value: 'autre', label: 'Autre', dark: 'rgba(142,142,147,0.15)', text: '#8E8E93' },
]

const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const D = {
  card: '#1C1C1E', card2: '#2C2C2E', border: 'rgba(255,255,255,0.07)',
  text: '#F5F5F7', sub: '#8E8E93', muted: '#636366', pink: '#FF2D78',
}

function getSourceStyle(val: string) {
  return SOURCES.find(s => s.value === val) || SOURCES[SOURCES.length - 1]
}

function InputField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: D.card2, border: `1px solid ${D.border}`, borderRadius: 12,
  padding: '10px 14px', fontSize: 14, color: D.text, outline: 'none', boxSizing: 'border-box',
}

export default function RevenusPage() {
  const supabase = createClient()
  const [revenus, setRevenus] = useState<Revenu[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterAnnee, setFilterAnnee] = useState(new Date().getFullYear())

  const [form, setForm] = useState({
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
    montant_eur: '',
    source: 'adsense',
    description: '',
  })

  useEffect(() => { loadRevenus() }, [filterAnnee])

  async function loadRevenus() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('revenus')
      .select('*')
      .eq('user_id', user.id)
      .eq('annee', filterAnnee)
      .order('mois', { ascending: false })
    if (data) setRevenus(data)
    setLoading(false)
  }

  async function getOrCreateChaine(userId: string): Promise<string> {
    // Try to get existing channel
    const { data: existing } = await supabase
      .from('chaines')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .single()
    if (existing) return existing.id
    // Create a default channel
    const { data: created, error } = await supabase
      .from('chaines')
      .insert({ user_id: userId, nom: 'Principale', devise: 'EUR' })
      .select('id')
      .single()
    if (error || !created) throw new Error('Impossible de créer la chaîne : ' + error?.message)
    return created.id
  }

  async function addRevenu(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaving(false); return }

      const chaineId = await getOrCreateChaine(user.id)

      const { error } = await supabase.from('revenus').insert({
        user_id: user.id,
        chaine_id: chaineId,
        mois: form.mois,
        annee: form.annee,
        montant_eur: parseFloat(form.montant_eur),
        montant: parseFloat(form.montant_eur),
        source: form.source,
        description: form.description || null,
      })

      if (error) {
        alert('Erreur : ' + error.message)
        setSaving(false)
        return
      }

      setShowForm(false)
      setForm({ mois: new Date().getMonth() + 1, annee: new Date().getFullYear(), montant_eur: '', source: 'adsense', description: '' })
      loadRevenus()
    } catch (err: any) {
      alert('Erreur : ' + err.message)
    }
    setSaving(false)
  }

  async function deleteRevenu(id: string) {
    await supabase.from('revenus').delete().eq('id', id)
    loadRevenus()
  }

  const totalAnnee = revenus.reduce((s, r) => s + r.montant_eur, 0)
  const bySource = SOURCES.map(s => ({
    ...s,
    total: revenus.filter(r => r.source === s.value).reduce((sum, r) => sum + r.montant_eur, 0)
  })).filter(s => s.total > 0)

  const byMois = Array.from({ length: 12 }, (_, i) => ({
    mois: i + 1,
    label: MOIS[i],
    total: revenus.filter(r => r.mois === i + 1).reduce((s, r) => s + r.montant_eur, 0),
    items: revenus.filter(r => r.mois === i + 1),
  })).filter(m => m.total > 0).reverse()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${D.card2}`, borderTopColor: D.pink, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .rev-row:hover{background:rgba(255,255,255,0.03)} .del-btn{opacity:0} .rev-row:hover .del-btn{opacity:1}`}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: D.text, margin: 0 }}>Revenus</h1>
          <p style={{ color: D.sub, fontSize: 14, marginTop: 4 }}>Toutes tes rentrées d'argent en un coup d'œil</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select value={filterAnnee} onChange={e => setFilterAnnee(parseInt(e.target.value))}
            style={{ background: D.card2, border: `1px solid ${D.border}`, borderRadius: 12, padding: '8px 14px', fontSize: 13, color: D.text, outline: 'none', cursor: 'pointer' }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowForm(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 980, background: D.pink, color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            <PlusCircle style={{ width: 15, height: 15 }} />Ajouter
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: D.card, borderRadius: 18, border: `1px solid ${D.border}`, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Euro style={{ width: 14, height: 14, color: D.pink }} />
            <p style={{ fontSize: 11, fontWeight: 600, color: D.sub, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Total {filterAnnee}</p>
          </div>
          <p style={{ fontSize: 34, fontWeight: 700, color: D.text, margin: 0, letterSpacing: '-0.04em' }}>
            {totalAnnee.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </p>
        </div>
        <div style={{ background: D.card, borderRadius: 18, border: `1px solid ${D.border}`, padding: '20px 24px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: D.sub, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px' }}>Répartition</p>
          {bySource.length === 0 ? (
            <p style={{ fontSize: 13, color: D.muted }}>Aucun revenu saisi</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bySource.map(s => (
                <div key={s.value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 980, background: s.dark, color: s.text }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>
                    {s.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {byMois.length === 0 ? (
        <div style={{ background: D.card, borderRadius: 18, border: `1px solid ${D.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px' }}>
          <TrendingUp style={{ width: 36, height: 36, color: D.muted, marginBottom: 12 }} />
          <p style={{ fontWeight: 600, color: D.sub, fontSize: 15, margin: '0 0 4px' }}>Aucun revenu pour {filterAnnee}</p>
          <p style={{ fontSize: 13, color: D.muted, margin: 0 }}>Ajoute ta première rentrée ci-dessus</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {byMois.map(m => (
            <div key={m.mois} style={{ background: D.card, borderRadius: 18, border: `1px solid ${D.border}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar style={{ width: 14, height: 14, color: D.pink }} />
                  <span style={{ fontWeight: 700, color: D.text, fontSize: 14 }}>{m.label} {filterAnnee}</span>
                </div>
                <span style={{ fontWeight: 700, color: D.pink, fontSize: 15 }}>
                  {m.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                </span>
              </div>
              {m.items.map(r => {
                const src = getSourceStyle(r.source)
                return (
                  <div key={r.id} className="rev-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${D.border}`, transition: 'background 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 980, background: src.dark, color: src.text }}>{src.label}</span>
                      {r.description && <span style={{ fontSize: 13, color: D.sub }}>{r.description}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, color: D.text, fontSize: 15 }}>{r.montant_eur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                      <button className="del-btn" onClick={() => deleteRevenu(r.id)}
                        style={{ padding: '5px', borderRadius: 8, background: 'rgba(255,59,48,0.12)', border: 'none', cursor: 'pointer', color: '#FF3B30', transition: 'opacity 0.15s', display: 'flex' }}>
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: D.card, borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, border: `1px solid ${D.border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>Ajouter un revenu</h2>
              <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: D.muted, display: 'flex' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <form onSubmit={addRevenu} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <InputField label="Mois">
                  <select value={form.mois} onChange={e => setForm({...form, mois: parseInt(e.target.value)})} style={inputStyle}>
                    {MOIS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </InputField>
                <InputField label="Année">
                  <input type="number" value={form.annee} onChange={e => setForm({...form, annee: parseInt(e.target.value)})} style={inputStyle} />
                </InputField>
              </div>
              <InputField label="Source">
                <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} style={inputStyle}>
                  {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </InputField>
              <InputField label="Montant (€) *">
                <input required type="number" step="0.01" min="0" value={form.montant_eur}
                  onChange={e => setForm({...form, montant_eur: e.target.value})}
                  style={inputStyle} placeholder="0.00" />
              </InputField>
              <InputField label="Description">
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  style={inputStyle} placeholder="ex : Sponsoring Nike, AdSense mars..." />
              </InputField>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => { setShowForm(false); setSaving(false) }}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: `1px solid ${D.border}`, background: 'transparent', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: D.sub }}>
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', background: D.pink, fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', color: '#fff', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Ajout...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
