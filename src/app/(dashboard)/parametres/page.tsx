'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, User, CreditCard, PlayCircle, CheckCircle } from 'lucide-react'

interface Profile {
  id: string
  full_name: string | null
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

export default function ParametresPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    siret: '',
    adresse: '',
    acre: false,
    taux_imposition: 22,
    frequence_urssaf: 'mensuel',
    date_debut_activite: '',
    youtube_api_key: '',
    activite_type: 'services',
  })

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setForm({
        full_name: data.full_name || '',
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: form.full_name || null,
      email: form.email || null,
      siret: form.siret || null,
      adresse: form.adresse || null,
      acre: form.acre,
      taux_imposition: form.taux_imposition,
      frequence_urssaf: form.frequence_urssaf,
      date_debut_activite: form.date_debut_activite || null,
      youtube_api_key: form.youtube_api_key || null,
      activite_type: form.activite_type,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  const tauxEffectif = form.acre ? (form.taux_imposition * 0.5) : form.taux_imposition

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parametres</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configurez votre profil et vos preferences fiscales</p>
      </div>

      <form onSubmit={saveProfile} className="space-y-5">
        <div className="gradient-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 gradient-primary rounded-lg flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="font-semibold text-gray-800">Profil</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
                className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="Votre nom" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="votre@email.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
              <input value={form.siret} onChange={e => setForm({...form, siret: e.target.value})}
                className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="123 456 789 00012" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type d activite</label>
              <select value={form.activite_type} onChange={e => setForm({...form, activite_type: e.target.value})}
                className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
                <option value="services">Prestations de services</option>
                <option value="vente">Vente de marchandises</option>
                <option value="liberal">Profession liberale</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input value={form.adresse} onChange={e => setForm({...form, adresse: e.target.value})}
              className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="Votre adresse complete" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de debut d activite</label>
            <input type="date" value={form.date_debut_activite} onChange={e => setForm({...form, date_debut_activite: e.target.value})}
              className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          </div>
        </div>

        <div className="gradient-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 gradient-primary rounded-lg flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="font-semibold text-gray-800">Fiscalite et Cotisations</h2>
          </div>

          <div className="flex items-center justify-between p-4 bg-pink-50 rounded-xl border border-pink-100">
            <div>
              <p className="font-medium text-gray-800 text-sm">Beneficiaire de l ACRE</p>
              <p className="text-xs text-gray-500 mt-0.5">Reduction de 50% sur vos cotisations la 1ere annee</p>
            </div>
            <button type="button" onClick={() => setForm({...form, acre: !form.acre})}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.acre ? 'bg-pink-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.acre ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Taux de cotisations URSSAF</label>
              <span className="text-sm font-bold text-pink-700 bg-pink-100 px-2.5 py-0.5 rounded-full">
                {form.taux_imposition}%
                {form.acre && <span className="text-green-600 ml-1">(effectif : {tauxEffectif.toFixed(1)}%)</span>}
              </span>
            </div>
            <input type="range" min="0" max="50" step="0.5" value={form.taux_imposition}
              onChange={e => setForm({...form, taux_imposition: parseFloat(e.target.value)})}
              className="w-full accent-pink-500" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span>
              <span className="text-pink-600">22% micro-services</span>
              <span>50%</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: 'Micro services', value: 22 },
                { label: 'Micro vente', value: 12.3 },
                { label: 'Liberal', value: 21.1 },
              ].map(p => (
                <button key={p.label} type="button"
                  onClick={() => setForm({...form, taux_imposition: p.value})}
                  className={`text-xs py-1.5 px-2 rounded-lg border transition-colors ${
                    form.taux_imposition === p.value
                      ? 'border-pink-400 bg-pink-100 text-pink-700 font-medium'
                      : 'border-pink-200 text-gray-600 hover:bg-pink-50'
                  }`}>
                  {p.label} ({p.value}%)
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Frequence de paiement URSSAF</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'mensuel', label: 'Mensuel', desc: 'Paiement chaque mois' },
                { value: 'trimestriel', label: 'Trimestriel', desc: 'Paiement tous les 3 mois' },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm({...form, frequence_urssaf: opt.value})}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    form.frequence_urssaf === opt.value
                      ? 'border-pink-400 bg-pink-50 shadow-sm'
                      : 'border-pink-200 hover:border-purple-300'
                  }`}>
                  <p className={`font-medium text-sm ${form.frequence_urssaf === opt.value ? 'text-pink-700' : 'text-gray-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="gradient-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <PlayCircle className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="font-semibold text-gray-800">YouTube</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cle API YouTube Data v3</label>
            <input type="password" value={form.youtube_api_key} onChange={e => setForm({...form, youtube_api_key: e.target.value})}
              className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 font-mono"
              placeholder="AIza..." />
            <p className="text-xs text-gray-400 mt-1.5">
              Obtenez une cle gratuite sur{' '}
              <a href="https://console.cloud.google.com" target="_blank" className="text-pink-600 hover:underline">
                Google Cloud Console
              </a>
            </p>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full gradient-primary text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-pink-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
          {saved ? (
            <><CheckCircle className="w-5 h-5" /> Enregistre !</>
          ) : saving ? (
            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Enregistrement...</>
          ) : (
            <><Save className="w-5 h-5" /> Enregistrer les parametres</>
          )}
        </button>
      </form>
    </div>
  )
}
