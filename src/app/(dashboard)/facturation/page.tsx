'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PlusCircle, FileText, Download, Trash2, X, ChevronDown } from 'lucide-react'
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

const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  payee: 'Payée',
  en_retard: 'En retard',
}

const STATUT_COLORS: Record<string, string> = {
  brouillon: 'bg-gray-100 text-gray-600',
  envoyee: 'bg-blue-100 text-blue-700',
  payee: 'bg-green-100 text-green-700',
  en_retard: 'bg-red-100 text-red-700',
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
    client_nom: '',
    client_email: '',
    client_adresse: '',
    date_emission: new Date().toISOString().split('T')[0],
    date_echeance: '',
    montant_ht: '',
    taux_tva: '0',
    statut: 'brouillon',
    description: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: prof }, { data: facts }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
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
      user_id: user.id,
      numero: nextNum,
      client_nom: form.client_nom,
      client_email: form.client_email || null,
      client_adresse: form.client_adresse || null,
      date_emission: form.date_emission,
      date_echeance: form.date_echeance || null,
      montant_ht: parseFloat(form.montant_ht),
      taux_tva: parseFloat(form.taux_tva),
      statut: form.statut,
      description: form.description || null,
    })

    if (!error) {
      setShowForm(false)
      setForm({
        client_nom: '', client_email: '', client_adresse: '',
        date_emission: new Date().toISOString().split('T')[0],
        date_echeance: '', montant_ht: '', taux_tva: '0',
        statut: 'brouillon', description: '',
      })
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

    // Header gradient-like purple bar
    doc.setFillColor(168, 85, 247)
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

    // Emetteur info
    if (profile?.full_name) {
      doc.setFont('helvetica', 'bold')
      doc.text(profile.full_name, 14, 50)
      doc.setFont('helvetica', 'normal')
    }
    if (profile?.siret) doc.text(`SIRET : ${profile.siret}`, 14, 56)
    if (profile?.adresse) doc.text(profile.adresse, 14, 62)
    if (profile?.email) doc.text(profile.email, 14, 68)

    // Client info
    doc.setFont('helvetica', 'bold')
    doc.text('Facturé à :', 130, 50)
    doc.setFont('helvetica', 'normal')
    doc.text(facture.client_nom, 130, 56)
    if (facture.client_adresse) doc.text(facture.client_adresse, 130, 62)
    if (facture.client_email) doc.text(facture.client_email, 130, 68)

    // Dates
    doc.setFillColor(245, 240, 255)
    doc.rect(14, 78, 182, 18, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text(`Date d'émission : ${facture.date_emission}`, 18, 87)
    if (facture.date_echeance) doc.text(`Échéance : ${facture.date_echeance}`, 120, 87)

    // Table header
    doc.setFillColor(168, 85, 247)
    doc.rect(14, 105, 182, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('Description', 18, 112)
    doc.text('Montant HT', 155, 112)

    // Table row
    doc.setFillColor(250, 248, 255)
    doc.rect(14, 115, 182, 14, 'F')
    doc.setTextColor(60, 60, 80)
    doc.setFont('helvetica', 'normal')
    doc.text(facture.description || 'Prestation de services', 18, 124)
    doc.text(`${facture.montant_ht.toFixed(2)} €`, 155, 124)

    // Totaux
    doc.setFontSize(10)
    doc.text(`Montant HT :`, 130, 145)
    doc.text(`${facture.montant_ht.toFixed(2)} €`, 175, 145)
    doc.text(`TVA (${facture.taux_tva}%) :`, 130, 153)
    doc.text(`${montantTva.toFixed(2)} €`, 175, 153)
    doc.setFillColor(168, 85, 247)
    doc.rect(128, 158, 68, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL TTC :', 132, 166)
    doc.text(`${montantTtc.toFixed(2)} €`, 175, 166)

    // Footer
    doc.setTextColor(150, 150, 180)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Généré avec Crezzy — crezzy.vercel.app', 14, 285)

    doc.save(`${facture.numero}.pdf`)
  }

  const totalHt = factures.reduce((s, f) => s + f.montant_ht, 0)
  const totalPayees = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + f.montant_ht, 0)
  const totalEnAttente = factures.filter(f => f.statut === 'envoyee').reduce((s, f) => s + f.montant_ht, 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturation</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez vos factures clients</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 gradient-primary text-white px-4 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-purple-200 transition-all hover:scale-[1.02]">
          <PlusCircle className="w-4 h-4" />
          Nouvelle facture
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total facturé', value: totalHt, color: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'Encaissé', value: totalPayees, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'En attente', value: totalEnAttente, color: 'text-blue-700', bg: 'bg-blue-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-white`}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value.toFixed(2)} €</p>
          </div>
        ))}
      </div>

      {/* Liste des factures */}
      <div className="gradient-card rounded-2xl overflow-hidden">
        {factures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">Aucune facture pour l'instant</p>
            <p className="text-sm mt-1">Créez votre première facture ci-dessus</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-purple-100 bg-purple-50/50">
                {['Numéro', 'Client', 'Date', 'Montant HT', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {factures.map((f, i) => (
                <tr key={f.id} className={`border-b border-purple-50 hover:bg-purple-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-purple-50/20'}`}>
                  <td className="px-4 py-3 font-mono text-sm font-medium text-purple-700">{f.numero}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{f.client_nom}</p>
                    {f.client_email && <p className="text-xs text-gray-400">{f.client_email}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(f.date_emission).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{f.montant_ht.toFixed(2)} €</td>
                  <td className="px-4 py-3">
                    <select
                      value={f.statut}
                      onChange={e => updateStatut(f.id, e.target.value)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer ${STATUT_COLORS[f.statut]}`}
                    >
                      {Object.entries(STATUT_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => generatePDF(f)}
                        className="p-1.5 rounded-lg hover:bg-purple-100 text-purple-600 transition-colors"
                        title="Télécharger PDF">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(f.id)}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                        title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nouvelle Facture */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-purple-100">
              <h2 className="text-lg font-bold text-gray-900">Nouvelle facture</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={createFacture} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <input required value={form.client_nom} onChange={e => setForm({...form, client_nom: e.target.value})}
                  className="w-full border border-purple-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="Nom du client" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email client</label>
                  <input type="email" value={form.client_email} onChange={e => setForm({...form, client_email: e.target.value})}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="client@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date d'émission *</label>
                  <input required type="date" value={form.date_emission} onChange={e => setForm({...form, date_emission: e.target.value})}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse client</label>
                <input value={form.client_adresse} onChange={e => setForm({...form, client_adresse: e.target.value})}
                  className="w-full border border-purple-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="Adresse complète" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant HT (€) *</label>
                  <input required type="number" step="0.01" min="0" value={form.montant_ht} onChange={e => setForm({...form, montant_ht: e.target.value})}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TVA (%)</label>
                  <select value={form.taux_tva} onChange={e => setForm({...form, taux_tva: e.target.value})}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                    <option value="0">0% (micro)</option>
                    <option value="20">20%</option>
                    <option value="10">10%</option>
                    <option value="5.5">5.5%</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date d'échéance</label>
                  <input type="date" value={form.date_echeance} onChange={e => setForm({...form, date_echeance: e.target.value})}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select value={form.statut} onChange={e => setForm({...form, statut: e.target.value})}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                    {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={2}
                  className="w-full border border-purple-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                  placeholder="Description de la prestation..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-purple-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-purple-50 transition-colors">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 gradient-primary text-white py-2.5 rounded-xl font-medium shadow-md hover:shadow-purple-200 transition-all">
                  Créer la facture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-2xl mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 text-center">Supprimer la facture ?</h2>
            <p className="text-sm text-gray-500 text-center mt-2">Cette action est irréversible. La facture sera archivée.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteId(null)} disabled={deleting}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50">
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
