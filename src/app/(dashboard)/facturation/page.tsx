'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PlusCircle, FileText, Download, Trash2, X } from 'lucide-react'
import jsPDF from 'jspdf'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  siret: string | null
  adresse: string | null
}

interface Facture {
  id: string
  numero: string
  client_nom: string
  client_email: string | null
  client_adresse: string | null
  date_emission: string
  date_echeance: string | null
  montant_ht: number
  taux_tva: number
  statut: string
  description: string | null
  deleted_at: string | null
}

const D = {
  card: 'rgba(255,255,255,0.055)', card2: 'rgba(255,255,255,0.09)', border: 'rgba(255,255,255,0.12)',
  text: '#F5F5F7', sub: '#8E8E93', muted: '#636366', pink: '#FF2D78',
  green: '#30D158', blue: '#0A84FF', orange: '#FF9F0A', red: '#FF3B30',
}

const STATUT_STYLES: Record<string, { bg: string, color: string, label: string }> = {
  brouillon: { bg: 'rgba(142,142,147,0.15)', color: '#8E8E93', label: 'Brouillon' },
  envoyee:   { bg: 'rgba(10,132,255,0.15)', color: '#0A84FF', label: 'Envoyée' },
  payee:     { bg: 'rgba(48,209,88,0.15)', color: '#30D158', label: 'Payée' },
  en_retard: { bg: 'rgba(255,59,48,0.15)', color: '#FF3B30', label: 'En retard' },
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: `1px solid ${D.border}`, borderRadius: 12,
  padding: '10px 14px', fontSize: 14, color: D.text, outline: 'none', boxSizing: 'border-box',
}

export default function FacturationPage() {
  const supabase = createClient()
  const [factures, setFactures] = useState<Facture[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({
    client_nom: '', client_email: '', client_adresse: '',
    date_emission: new Date().toISOString().split('T')[0],
    date_echeance: '', montant_ht: '', taux_tva: '0',
    statut: 'brouillon', description: '',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: prof }, { data: facts }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('factures').select('*').eq('user_id', user.id).is('deleted_at', null).order('date_emission', { ascending: false }),
    ])
    if (prof) setProfile(prof)
    if (facts) setFactures(facts)
    setLoading(false)
  }

  async function createFacture(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const last = factures[0]?.numero
    const nextNum = last
      ? `FAC-${String(parseInt(last.split('-')[1] || '0') + 1).padStart(4, '0')}`
      : 'FAC-0001'
    const { error } = await supabase.from('factures').insert({
      user_id: user.id, numero: nextNum,
      client_nom: form.client_nom, client_email: form.client_email || null,
      client_adresse: form.client_adresse || null, date_emission: form.date_emission,
      date_echeance: form.date_echeance || null, montant_ht: parseFloat(form.montant_ht),
      taux_tva: parseFloat(form.taux_tva), statut: form.statut, description: form.description || null,
    })
    if (!error) {
      setShowForm(false)
      setForm({ client_nom: '', client_email: '', client_adresse: '', date_emission: new Date().toISOString().split('T')[0], date_echeance: '', montant_ht: '', taux_tva: '0', statut: 'brouillon', description: '' })
      loadData()
    }
  }

  async function updateStatut(id: string, statut: string) {
    await supabase.from('factures').update({ statut }).eq('id', id)
    loadData()
  }

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    await supabase.from('factures').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId)
    setDeleteId(null)
    setDeleting(false)
    loadData()
  }

  function generatePDF(facture: Facture) {
    const doc = new jsPDF()
    const montantTva = facture.montant_ht * (facture.taux_tva / 100)
    const montantTtc = facture.montant_ht + montantTva
    doc.setFillColor(255, 45, 120)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURE', 14, 20)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(facture.numero, 14, 29)
    doc.setTextColor(60, 60, 80)
    doc.setFontSize(10)
    if (profile?.full_name) { doc.setFont('helvetica', 'bold'); doc.text(profile.full_name, 14, 50); doc.setFont('helvetica', 'normal') }
    if (profile?.siret) doc.text(`SIRET : ${profile.siret}`, 14, 56)
    if (profile?.adresse) doc.text(profile.adresse, 14, 62)
    if (profile?.email) doc.text(profile.email, 14, 68)
    doc.setFont('helvetica', 'bold'); doc.text('Facturé à :', 130, 50); doc.setFont('helvetica', 'normal')
    doc.text(facture.client_nom, 130, 56)
    if (facture.client_adresse) doc.text(facture.client_adresse, 130, 62)
    if (facture.client_email) doc.text(facture.client_email, 130, 68)
    doc.setFillColor(245, 240, 255); doc.rect(14, 78, 182, 18, 'F')
    doc.setFont('helvetica', 'bold'); doc.text(`Date d'émission : ${facture.date_emission}`, 18, 87)
    if (facture.date_echeance) doc.text(`Échéance : ${facture.date_echeance}`, 120, 87)
    doc.setFillColor(255, 45, 120); doc.rect(14, 105, 182, 10, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold')
    doc.text('Description', 18, 112); doc.text('Montant HT', 155, 112)
    doc.setFillColor(250, 248, 255); doc.rect(14, 115, 182, 14, 'F')
    doc.setTextColor(60, 60, 80); doc.setFont('helvetica', 'normal')
    doc.text(facture.description || 'Prestation de services', 18, 124)
    doc.text(`${facture.montant_ht.toFixed(2)} €`, 155, 124)
    doc.setFontSize(10)
    doc.text(`Montant HT :`, 130, 145); doc.text(`${facture.montant_ht.toFixed(2)} €`, 175, 145)
    doc.text(`TVA (${facture.taux_tva}%) :`, 130, 153); doc.text(`${montantTva.toFixed(2)} €`, 175, 153)
    doc.setFillColor(255, 45, 120); doc.rect(128, 158, 68, 12, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold')
    doc.text('TOTAL TTC :', 132, 166); doc.text(`${montantTtc.toFixed(2)} €`, 175, 166)
    doc.setTextColor(150, 150, 180); doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text('Généré avec Crezzy — crezzy.vercel.app', 14, 285)
    doc.save(`${facture.numero}.pdf`)
  }

  const totalHt = factures.reduce((s, f) => s + f.montant_ht, 0)
  const totalPayees = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + f.montant_ht, 0)
  const totalEnAttente = factures.filter(f => f.statut === 'envoyee').reduce((s, f) => s + f.montant_ht, 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${D.card2}`, borderTopColor: D.pink, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .fac-row:hover{background:rgba(255,255,255,0.02)}`}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: D.text, margin: 0 }}>Facturation</h1>
          <p style={{ color: D.sub, fontSize: 14, marginTop: 4 }}>Gérez vos factures clients</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 980, background: D.pink, color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          <PlusCircle style={{ width: 15, height: 15 }} />Nouvelle facture
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {[
          { label: 'Total facturé', value: totalHt, color: D.pink, bg: 'rgba(255,45,120,0.1)' },
          { label: 'Encaissé', value: totalPayees, color: D.green, bg: 'rgba(48,209,88,0.1)' },
          { label: 'En attente', value: totalEnAttente, color: D.blue, bg: 'rgba(10,132,255,0.1)' },
        ].map(s => (
          <div key={s.label} style={{ background: D.card, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 18, border: `1px solid ${D.border}`, padding: '18px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: D.sub, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: s.color, margin: 0, letterSpacing: '-0.03em' }}>{s.value.toFixed(2)} €</p>
          </div>
        ))}
      </div>

      <div style={{ background: D.card, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 18, border: `1px solid ${D.border}`, overflow: 'hidden' }}>
        {factures.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px' }}>
            <FileText style={{ width: 36, height: 36, color: D.muted, marginBottom: 12 }} />
            <p style={{ color: D.sub, fontSize: 15, fontWeight: 500, margin: '0 0 4px' }}>Aucune facture pour l'instant</p>
            <p style={{ color: D.muted, fontSize: 13, margin: 0 }}>Crée ta première facture ci-dessus</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${D.border}`, background: 'rgba(255,255,255,0.02)' }}>
                {['Numéro', 'Client', 'Date', 'Montant HT', 'Statut', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: D.muted, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 16px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {factures.map(f => {
                const st = STATUT_STYLES[f.statut] || STATUT_STYLES.brouillon
                return (
                  <tr key={f.id} className="fac-row" style={{ borderBottom: `1px solid ${D.border}`, transition: 'background 0.15s' }}>
                    <td style={{ padding: '13px 16px', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: D.pink }}>{f.numero}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <p style={{ fontWeight: 600, color: D.text, fontSize: 13, margin: '0 0 2px' }}>{f.client_nom}</p>
                      {f.client_email && <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>{f.client_email}</p>}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: D.sub }}>{new Date(f.date_emission).toLocaleDateString('fr-FR')}</td>
                    <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 700, color: D.text }}>{f.montant_ht.toFixed(2)} €</td>
                    <td style={{ padding: '13px 16px' }}>
                      <select value={f.statut} onChange={e => updateStatut(f.id, e.target.value)}
                        style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 980, border: 'none', background: st.bg, color: st.color, cursor: 'pointer', outline: 'none' }}>
                        {Object.entries(STATUT_STYLES).map(([v, s]) => (
                          <option key={v} value={v}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => generatePDF(f)}
                          style={{ padding: 6, borderRadius: 8, background: 'rgba(10,132,255,0.12)', border: 'none', cursor: 'pointer', color: D.blue, display: 'flex' }}>
                          <Download style={{ width: 14, height: 14 }} />
                        </button>
                        <button onClick={() => setDeleteId(f.id)}
                          style={{ padding: 6, borderRadius: 8, background: 'rgba(255,59,48,0.12)', border: 'none', cursor: 'pointer', color: D.red, display: 'flex' }}>
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: D.card, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${D.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${D.border}` }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>Nouvelle facture</h2>
              <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: D.muted, display: 'flex' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <form onSubmit={createFacture} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Client *</label>
                <input required value={form.client_nom} onChange={e => setForm({...form, client_nom: e.target.value})} style={inputStyle} placeholder="Nom du client" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Email client</label>
                  <input type="email" value={form.client_email} onChange={e => setForm({...form, client_email: e.target.value})} style={inputStyle} placeholder="client@email.com" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Date d'émission *</label>
                  <input required type="date" value={form.date_emission} onChange={e => setForm({...form, date_emission: e.target.value})} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Adresse client</label>
                <input value={form.client_adresse} onChange={e => setForm({...form, client_adresse: e.target.value})} style={inputStyle} placeholder="Adresse complète" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Montant HT (€) *</label>
                  <input required type="number" step="0.01" min="0" value={form.montant_ht} onChange={e => setForm({...form, montant_ht: e.target.value})} style={inputStyle} placeholder="0.00" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>TVA</label>
                  <select value={form.taux_tva} onChange={e => setForm({...form, taux_tva: e.target.value})} style={inputStyle}>
                    <option value="0">0% (micro)</option>
                    <option value="20">20%</option>
                    <option value="10">10%</option>
                    <option value="5.5">5.5%</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Date d'échéance</label>
                  <input type="date" value={form.date_echeance} onChange={e => setForm({...form, date_echeance: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Statut</label>
                  <select value={form.statut} onChange={e => setForm({...form, statut: e.target.value})} style={inputStyle}>
                    {Object.entries(STATUT_STYLES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={2} style={{ ...inputStyle, resize: 'none' }} placeholder="Description de la prestation..." />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: `1px solid ${D.border}`, background: 'transparent', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: D.sub }}>
                  Annuler
                </button>
                <button type="submit"
                  style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', background: D.pink, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff' }}>
                  Créer la facture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'rgba(12,8,22,0.93)', backdropFilter: 'blur(48px)', WebkitBackdropFilter: 'blur(48px)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, border: `1px solid ${D.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,59,48,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 style={{ width: 22, height: 22, color: D.red }} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: '0 0 8px' }}>Supprimer la facture ?</h2>
            <p style={{ fontSize: 13, color: D.sub, margin: '0 0 24px' }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} disabled={deleting}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: `1px solid ${D.border}`, background: 'transparent', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: D.sub }}>
                Annuler
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', background: D.red, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff', opacity: deleting ? 0.6 : 1 }}>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
