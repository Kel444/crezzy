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

const STATUTS = [
  { value: 'prospection', label: 'Prospection', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  { value: 'negociation', label: 'Negociation', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { value: 'contrat', label: 'Contrat signe', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  { value: 'facture', label: 'Facture envoyee', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  { value: 'paye', label: 'Paye', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  { value: 'annule', label: 'Annule', color: 'bg-red-100 text-red-600', dot: 'bg-red-400' },
]

const PLATEFORMES = ['YouTube', 'Instagram', 'TikTok', 'Podcast', 'Newsletter', 'Autre']

export default function BrandDealsPage() {
  const supabase = createClient()
  const [deals, setDeals] = useState<BrandDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterStatut, setFilterStatut] = useState('all')
  const [form, setForm] = useState({
    marque: '',
    contact_nom: '',
    contact_email: '',
    montant: '',
    statut: 'prospection',
    plateforme: 'YouTube',
    date_contact: new Date().toISOString().split('T')[0],
    date_livraison: '',
    notes: '',
  })

  useEffect(() => { loadDeals() }, [])

  async function loadDeals() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('brand_deals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setDeals(data)
    setLoading(false)
  }

  async function createDeal(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('brand_deals').insert({
      user_id: user.id,
      marque: form.marque,
      contact_nom: form.contact_nom || null,
      contact_email: form.contact_email || null,
      montant: form.montant ? parseFloat(form.montant) : null,
      statut: form.statut,
      plateforme: form.plateforme,
      date_contact: form.date_contact || null,
      date_livraison: form.date_livraison || null,
      notes: form.notes || null,
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
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Deals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Suivez vos partenariats du premier contact au paiement</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 gradient-primary text-white px-4 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-pink-200 transition-all hover:scale-[1.02]">
          <PlusCircle className="w-4 h-4" />
          Nouveau deal
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pipeline total', value: `${totalPipeline.toFixed(0)} EUR`, icon: TrendingUp, color: 'text-pink-700', bg: 'bg-pink-50' },
          { label: 'Encaisse', value: `${totalPaye.toFixed(0)} EUR`, icon: Euro, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'En cours', value: `${enCours} deals`, icon: Clock, color: 'text-blue-700', bg: 'bg-blue-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline visual */}
      <div className="gradient-card rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pipeline</p>
        <div className="flex gap-2">
          {STATUTS.filter(s => s.value !== 'annule').map(s => {
            const count = deals.filter(d => d.statut === s.value).length
            return (
              <button key={s.value}
                onClick={() => setFilterStatut(filterStatut === s.value ? 'all' : s.value)}
                className={`flex-1 py-2 rounded-xl text-center transition-all ${
                  filterStatut === s.value ? 'ring-2 ring-purple-400 scale-[1.03]' : ''
                } ${s.color}`}>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs opacity-80">{s.label}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="gradient-card rounded-2xl flex flex-col items-center justify-center py-16 text-gray-400">
            <Handshake className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">Aucun brand deal pour l instant</p>
            <p className="text-sm mt-1">Ajoutez votre premier partenariat ci-dessus</p>
          </div>
        ) : filtered.map(deal => {
          const st = getStatut(deal.statut)
          return (
            <div key={deal.id} className="gradient-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{deal.marque}</h3>
                    {deal.plateforme && (
                      <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-medium">
                        {deal.plateforme}
                      </span>
                    )}
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5 ${st.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>
                  {deal.contact_nom && <p className="text-sm text-gray-500 mt-1">{deal.contact_nom}{deal.contact_email && ` — ${deal.contact_email}`}</p>}
                  {deal.notes && <p className="text-sm text-gray-400 mt-1 italic">{deal.notes}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    {deal.date_contact && <span>Contact : {new Date(deal.date_contact).toLocaleDateString('fr-FR')}</span>}
                    {deal.date_livraison && <span>Livraison : {new Date(deal.date_livraison).toLocaleDateString('fr-FR')}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {deal.montant && <p className="text-lg font-bold text-pink-700">{deal.montant.toFixed(0)} EUR</p>}
                  <select value={deal.statut} onChange={e => updateStatut(deal.id, e.target.value)}
                    className="text-xs border border-pink-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white">
                    {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-pink-100">
              <h2 className="text-lg font-bold text-gray-900">Nouveau brand deal</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={createDeal} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marque / Entreprise *</label>
                <input required value={form.marque} onChange={e => setForm({...form, marque: e.target.value})}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="Nom de la marque" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                  <input value={form.contact_nom} onChange={e => setForm({...form, contact_nom: e.target.value})}
                    className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                    placeholder="Nom du contact" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email contact</label>
                  <input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})}
                    className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                    placeholder="contact@marque.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant (EUR)</label>
                  <input type="number" min="0" step="1" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})}
                    className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                    placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plateforme</label>
                  <select value={form.plateforme} onChange={e => setForm({...form, plateforme: e.target.value})}
                    className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
                    {PLATEFORMES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de contact</label>
                  <input type="date" value={form.date_contact} onChange={e => setForm({...form, date_contact: e.target.value})}
                    className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de livraison</label>
                  <input type="date" value={form.date_livraison} onChange={e => setForm({...form, date_livraison: e.target.value})}
                    className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select value={form.statut} onChange={e => setForm({...form, statut: e.target.value})}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
                  {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  rows={2}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                  placeholder="Details, conditions, briefing..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-pink-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-pink-50 transition-colors">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 gradient-primary text-white py-2.5 rounded-xl font-medium shadow-md hover:shadow-pink-200 transition-all">
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
