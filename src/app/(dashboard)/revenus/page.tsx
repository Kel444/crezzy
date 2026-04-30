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
  { value: 'adsense', label: 'AdSense', color: 'bg-orange-100 text-orange-700' },
  { value: 'sponsoring', label: 'Sponsoring', color: 'bg-pink-100 text-pink-700' },
  { value: 'membership', label: 'Memberships', color: 'bg-purple-100 text-purple-700' },
  { value: 'super-chat', label: 'Super Chats', color: 'bg-blue-100 text-blue-700' },
  { value: 'merch', label: 'Merch', color: 'bg-green-100 text-green-700' },
  { value: 'autre', label: 'Autre', color: 'bg-gray-100 text-gray-600' },
]

const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function getSourceStyle(val: string) {
  return SOURCES.find(s => s.value === val) || SOURCES[SOURCES.length - 1]
}

export default function RevenusPage() {
  const supabase = createClient()
  const [revenus, setRevenus] = useState<Revenu[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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

  async function addRevenu(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('revenus').insert({
      user_id: user.id,
      mois: form.mois,
      annee: form.annee,
      montant_eur: parseFloat(form.montant_eur),
      source: form.source,
      description: form.description || null,
    })
    setShowForm(false)
    setForm({ mois: new Date().getMonth() + 1, annee: new Date().getFullYear(), montant_eur: '', source: 'adsense', description: '' })
    loadRevenus()
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

  // Group by month
  const byMois = Array.from({ length: 12 }, (_, i) => ({
    mois: i + 1,
    label: MOIS[i],
    total: revenus.filter(r => r.mois === i + 1).reduce((s, r) => s + r.montant_eur, 0),
    items: revenus.filter(r => r.mois === i + 1),
  })).filter(m => m.total > 0).reverse()

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenus</h1>
          <p className="text-sm text-gray-400 mt-0.5">Toutes vos rentrées d'argent en un coup d'oeil</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterAnnee} onChange={e => setFilterAnnee(parseInt(e.target.value))}
            className="border border-pink-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white">
            {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 gradient-primary text-white px-4 py-2.5 rounded-xl font-medium shadow-sm shadow-pink-200 hover:shadow-pink-300 transition-all hover:scale-[1.02]">
            <PlusCircle className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Total + répartition sources */}
      <div className="grid grid-cols-2 gap-4">
        <div className="gradient-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Euro className="w-4 h-4 text-pink-400" />
            <p className="text-xs font-medium text-gray-400">Total {filterAnnee}</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalAnnee.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
        </div>
        <div className="gradient-card rounded-2xl p-5">
          <p className="text-xs font-medium text-gray-400 mb-3">Répartition par source</p>
          {bySource.length === 0 ? (
            <p className="text-sm text-gray-300">Aucun revenu saisi</p>
          ) : (
            <div className="space-y-1.5">
              {bySource.map(s => (
                <div key={s.value} className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                  <span className="text-sm font-semibold text-gray-700">{s.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Liste par mois */}
      {byMois.length === 0 ? (
        <div className="gradient-card rounded-2xl flex flex-col items-center justify-center py-16 text-gray-300">
          <TrendingUp className="w-10 h-10 mb-3" />
          <p className="font-medium text-gray-400">Aucun revenu pour {filterAnnee}</p>
          <p className="text-sm mt-1">Ajoutez votre première rentrée ci-dessus</p>
        </div>
      ) : (
        <div className="space-y-4">
          {byMois.map(m => (
            <div key={m.mois} className="gradient-card rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-pink-50/60 border-b border-pink-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-pink-400" />
                  <span className="font-semibold text-gray-800">{m.label} {filterAnnee}</span>
                </div>
                <span className="font-bold text-pink-600">{m.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
              </div>
              <div className="divide-y divide-pink-50">
                {m.items.map(r => {
                  const src = getSourceStyle(r.source)
                  return (
                    <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-pink-50/40 transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${src.color}`}>{src.label}</span>
                        {r.description && <span className="text-sm text-gray-500">{r.description}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{r.montant_eur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                        <button onClick={() => deleteRevenu(r.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-100 text-red-400 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl shadow-pink-100 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Ajouter un revenu</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-pink-50">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={addRevenu} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
                  <select value={form.mois} onChange={e => setForm({...form, mois: parseInt(e.target.value)})}
                    className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
                    {MOIS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                  <input type="number" value={form.annee} onChange={e => setForm({...form, annee: parseInt(e.target.value)})}
                    className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select value={form.source} onChange={e => setForm({...form, source: e.target.value})}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
                  {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€) *</label>
                <input required type="number" step="0.01" min="0" value={form.montant_eur}
                  onChange={e => setForm({...form, montant_eur: e.target.value})}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="ex : Sponsoring Nike, AdSense mars..." />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-pink-200 text-gray-500 py-2.5 rounded-xl font-medium hover:bg-pink-50 transition-colors">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 gradient-primary text-white py-2.5 rounded-xl font-medium shadow-sm shadow-pink-200 transition-all">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
