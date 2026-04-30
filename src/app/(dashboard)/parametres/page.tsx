'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, User, CreditCard, PlayCircle, CheckCircle } from 'lucide-react'

interface Profile {
  id: string
  nom: string | null
  prenom: string | null
  email: string | null
  siret: string | null
  adresse: string | null
  acre: boolean | null
  taux_imposition: number | null
  frequence_urssaf: string | null
  date_debut_activite: string | null
  youtube_api_key: string | null
  activite_type: string | null
}

const D = {
  card: '#1C1C1E', card2: '#2C2C2E', card3: '#3A3A3C', border: 'rgba(255,255,255,0.07)',
  text: '#F5F5F7', sub: '#8E8E93', muted: '#636366', pink: '#FF2D78',
  green: '#30D158', blue: '#0A84FF',
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: D.card2, border: `1px solid ${D.border}`, borderRadius: 12,
  padding: '10px 14px', fontSize: 14, color: D.text, outline: 'none', boxSizing: 'border-box',
}

export default function ParametresPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', siret: '', adresse: '',
    acre: false, taux_imposition: 22, frequence_urssaf: 'mensuel',
    date_debut_activite: '', youtube_api_key: '', activite_type: 'services',
  })

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    if (data) {
      setForm({
        nom: data.nom || '',
        prenom: data.prenom || '',
        email: data.email || user.email || '',
        siret: data.siret || '',
        adresse: data.adresse || '',
        acre: data.acre || false,
        taux_imposition: data.taux_imposition || 22,
        frequence_urssaf: data.frequence_urssaf || 'mensuel',
        date_debut_activite: data.date_debut_activite || '',
        youtube_api_key: data.youtube_api_key || '',
        activite_type: data.activite_type || 'services',
      })
    }
    setLoading(false)
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaving(false); return }

      const { error: updateError, data: updatedRows } = await supabase
        .from('profiles')
        .update({
          nom: form.nom || null,
          prenom: form.prenom || null,
          email: form.email || null,
          siret: form.siret || null,
          adresse: form.adresse || null,
          acre: form.acre,
          taux_imposition: Number(form.taux_imposition),
          frequence_urssaf: form.frequence_urssaf,
          date_debut_activite: form.date_debut_activite || null,
          youtube_api_key: form.youtube_api_key || null,
          activite_type: form.activite_type,
        })
        .eq('user_id', user.id)
        .select()

      if (updateError) {
        console.error('[Parametres] Update error:', updateError)
        alert('Erreur sauvegarde : ' + updateError.message)
        setSaving(false)
        return
      }

      // If no row matched, create the profile
      if (!updatedRows || updatedRows.length === 0) {
        console.warn('[Parametres] No row updated, creating profile...')
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            nom: form.nom || null,
            prenom: form.prenom || null,
            email: form.email || user.email || null,
            siret: form.siret || null,
            adresse: form.adresse || null,
            acre: form.acre,
            taux_imposition: Number(form.taux_imposition),
            frequence_urssaf: form.frequence_urssaf,
            date_debut_activite: form.date_debut_activite || null,
            youtube_api_key: form.youtube_api_key || null,
            activite_type: form.activite_type,
          })
        if (insertError) {
          console.error('[Parametres] Insert error:', insertError)
          alert('Erreur creation profil : ' + insertError.message)
          setSaving(false)
          return
        }
      }

      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await loadProfile()
    } catch (err) {
      console.error('[Parametres] Unexpected error:', err)
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${D.card2}`, borderTopColor: D.pink, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const tauxEffectif = form.acre ? (form.taux_imposition * 0.5) : form.taux_imposition

  return (
    <div style={{ maxWidth: 640 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input[type=range]{accent-color:${D.pink}}`}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: D.text, margin: 0 }}>Paramètres</h1>
        <p style={{ color: D.sub, fontSize: 14, marginTop: 4 }}>Profil et préférences fiscales</p>
      </div>

      <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Profil */}
        <div style={{ background: D.card, borderRadius: 18, border: `1px solid ${D.border}`, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#FF2D78,#FF6B9D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User style={{ width: 14, height: 14, color: '#fff' }} />
            </div>
            <h2 style={{ fontWeight: 700, fontSize: 15, color: D.text, margin: 0 }}>Profil</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Nom</label>
                <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} style={inputStyle} placeholder="Nom" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Prénom</label>
                <input value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} style={inputStyle} placeholder="Prénom" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} placeholder="votre@email.com" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>SIRET</label>
                <input value={form.siret} onChange={e => setForm({...form, siret: e.target.value})} style={inputStyle} placeholder="123 456 789 00012" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Type d'activité</label>
                <select value={form.activite_type} onChange={e => setForm({...form, activite_type: e.target.value})} style={inputStyle}>
                  <option value="services">Prestations de services</option>
                  <option value="vente">Vente de marchandises</option>
                  <option value="liberal">Profession libérale</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Adresse</label>
              <input value={form.adresse} onChange={e => setForm({...form, adresse: e.target.value})} style={inputStyle} placeholder="Adresse complète" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Date de début d'activité</label>
              <input type="date" value={form.date_debut_activite} onChange={e => setForm({...form, date_debut_activite: e.target.value})} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Fiscalité */}
        <div style={{ background: D.card, borderRadius: 18, border: `1px solid ${D.border}`, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#BF5AF2,#0A84FF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard style={{ width: 14, height: 14, color: '#fff' }} />
            </div>
            <h2 style={{ fontWeight: 700, fontSize: 15, color: D.text, margin: 0 }}>Fiscalité & Cotisations</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* ACRE toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: D.card2, borderRadius: 14, border: `1px solid ${D.border}` }}>
              <div>
                <p style={{ fontWeight: 600, color: D.text, fontSize: 14, margin: '0 0 3px' }}>Bénéficiaire de l'ACRE</p>
                <p style={{ fontSize: 12, color: D.muted, margin: 0 }}>Réduction de 50% sur tes cotisations la 1ère année</p>
              </div>
              <button type="button" onClick={() => setForm({...form, acre: !form.acre})}
                style={{ position: 'relative', width: 46, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: form.acre ? D.pink : D.card3, transition: 'background 0.2s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s', left: form.acre ? 24 : 2 }} />
              </button>
            </div>

            {/* Taux slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: D.sub }}>Taux de cotisations URSSAF</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: D.pink, background: 'rgba(255,45,120,0.12)', padding: '2px 10px', borderRadius: 980 }}>{form.taux_imposition}%</span>
                  {form.acre && <span style={{ fontSize: 12, color: D.green, background: 'rgba(48,209,88,0.12)', padding: '2px 10px', borderRadius: 980 }}>effectif : {tauxEffectif.toFixed(1)}%</span>}
                </div>
              </div>
              <input type="range" min="0" max="50" step="0.5" value={form.taux_imposition}
                onChange={e => setForm({...form, taux_imposition: parseFloat(e.target.value)})}
                style={{ width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: D.muted, marginTop: 4 }}>
                <span>0%</span><span style={{ color: D.pink }}>22% micro-services</span><span>50%</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
                {[{ label: 'Micro services', value: 22 }, { label: 'Micro vente', value: 12.3 }, { label: 'Libéral', value: 21.1 }].map(p => (
                  <button key={p.label} type="button"
                    onClick={() => setForm({...form, taux_imposition: p.value})}
                    style={{ padding: '8px 6px', borderRadius: 10, border: `1px solid ${form.taux_imposition === p.value ? D.pink : D.border}`, background: form.taux_imposition === p.value ? 'rgba(255,45,120,0.12)' : 'transparent', fontSize: 11, color: form.taux_imposition === p.value ? D.pink : D.sub, cursor: 'pointer', fontWeight: form.taux_imposition === p.value ? 600 : 400, transition: 'all 0.15s' }}>
                    {p.label}<br />{p.value}%
                  </button>
                ))}
              </div>
            </div>

            {/* Fréquence URSSAF */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 10 }}>Fréquence de paiement URSSAF</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { value: 'mensuel', label: 'Mensuel', desc: 'Paiement chaque mois' },
                  { value: 'trimestriel', label: 'Trimestriel', desc: 'Paiement tous les 3 mois' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm({...form, frequence_urssaf: opt.value})}
                    style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${form.frequence_urssaf === opt.value ? D.pink : D.border}`, background: form.frequence_urssaf === opt.value ? 'rgba(255,45,120,0.08)' : 'transparent', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: form.frequence_urssaf === opt.value ? D.pink : D.text, margin: '0 0 3px' }}>{opt.label}</p>
                    <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* YouTube */}
        <div style={{ background: D.card, borderRadius: 18, border: `1px solid ${D.border}`, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#FF3B30,#FF2D78)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlayCircle style={{ width: 14, height: 14, color: '#fff' }} />
            </div>
            <h2 style={{ fontWeight: 700, fontSize: 15, color: D.text, margin: 0 }}>YouTube API</h2>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Clé API YouTube Data v3</label>
            <input type="password" value={form.youtube_api_key} onChange={e => setForm({...form, youtube_api_key: e.target.value})}
              style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder="AIza..." />
            <p style={{ fontSize: 12, color: D.muted, marginTop: 8 }}>
              Obtiens une clé gratuite sur{' '}
              <a href="https://console.cloud.google.com" target="_blank" style={{ color: D.pink }}>Google Cloud Console</a>
            </p>
          </div>
        </div>

        <button type="submit" disabled={saving}
          style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: saved ? D.green : D.pink, fontSize: 15, fontWeight: 700, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.7 : 1, transition: 'background 0.3s' }}>
          {saved ? (
            <><CheckCircle style={{ width: 18, height: 18 }} />Enregistré !</>
          ) : saving ? (
            <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Enregistrement...</>
          ) : (
            <><Save style={{ width: 18, height: 18 }} />Enregistrer les paramètres</>
          )}
        </button>
      </form>
    </div>
  )
}
