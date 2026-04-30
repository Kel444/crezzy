'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Eye, ExternalLink, RefreshCw, Film, Plus, X, AlertCircle, CheckCircle, ArrowRight, Key } from 'lucide-react'
import Link from 'next/link'

interface Channel {
  id: string
  channel_id: string
  channel_name: string
  thumbnail_url: string | null
  subscribers: number | null
  total_views: number | null
  video_count: number | null
  last_synced_at: string | null
}

function fmt(n: number | null) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n/1_000).toFixed(1)}k`
  return n.toLocaleString('fr-FR')
}

const S: React.CSSProperties = { fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }

export default function YoutubePage() {
  const supabase = createClient()
  const [channels, setChannels] = useState<Channel[]>([])
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [handle, setHandle] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [syncing, setSyncing] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: prof }, { data: chans }] = await Promise.all([
      supabase.from('profiles').select('youtube_api_key').eq('user_id', user.id).single(),
      supabase.from('youtube_channels').select('*').eq('user_id', user.id).order('created_at'),
    ])
    setHasApiKey(!!prof?.youtube_api_key)
    if (chans) setChannels(chans)
    setLoading(false)
  }

  async function addChannel(e: React.FormEvent) {
    e.preventDefault()
    if (!handle.trim()) return
    setAdding(true)
    setAddError('')
    try {
      const res = await fetch(`/api/youtube/channel?handle=${encodeURIComponent(handle.trim())}`)
      const data = await res.json()
      if (!res.ok) { setAddError(data.error || 'Erreur inconnue'); setAdding(false); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('youtube_channels').upsert({
        user_id: user.id,
        ...data,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'channel_id,user_id' })
      setShowAdd(false)
      setHandle('')
      loadData()
    } catch { setAddError('Erreur réseau') }
    setAdding(false)
  }

  async function syncChannel(chan: Channel) {
    setSyncing(chan.id)
    try {
      const res = await fetch(`/api/youtube/channel?handle=${chan.channel_id}`)
      const data = await res.json()
      if (res.ok) {
        await supabase.from('youtube_channels').update({ ...data, last_synced_at: new Date().toISOString() }).eq('id', chan.id)
        loadData()
      }
    } catch {}
    setSyncing(null)
  }

  const totalSubs = channels.reduce((s, c) => s + (c.subscribers || 0), 0)
  const totalViews = channels.reduce((s, c) => s + (c.total_views || 0), 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #F5F5F7', borderTopColor: '#FF2D78', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ ...S, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#1D1D1F', margin: 0 }}>YouTube</h1>
          <p style={{ color: '#6E6E73', fontSize: 14, marginTop: 4 }}>Statistiques de tes chaînes</p>
        </div>
        {hasApiKey && (
          <button onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 980, background: '#FF2D78', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            <Plus style={{ width: 15, height: 15 }} />
            Ajouter une chaîne
          </button>
        )}
      </div>

      {/* No API key — setup guide */}
      {hasApiKey === false && (
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.06)', padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Key style={{ width: 20, height: 20, color: '#6E6E73' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, color: '#1D1D1F', margin: 0, letterSpacing: '-0.02em' }}>Configure ta clé YouTube API</p>
              <p style={{ color: '#6E6E73', fontSize: 13, margin: '2px 0 0' }}>Gratuit — 2 minutes de setup</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { n: 1, text: <>Va sur <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" style={{ color: '#FF2D78', textDecoration: 'none', fontWeight: 500 }}>Google Cloud Console</a> et active YouTube Data API v3</> },
              { n: 2, text: <>Dans le menu <strong>Identifiants</strong>, clique sur <strong>Créer des identifiants → Clé API</strong></> },
              { n: 3, text: <>Copie la clé (commence par <code style={{ background: '#F5F5F7', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>AIza</code>) et colle-la dans <Link href="/parametres" style={{ color: '#FF2D78', fontWeight: 500, textDecoration: 'none' }}>Paramètres → YouTube</Link></> },
              { n: 4, text: 'Reviens ici pour ajouter tes chaînes en un clic' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,45,120,0.1)', color: '#FF2D78', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{s.n}</span>
                <p style={{ fontSize: 14, color: '#3D3D3D', margin: 0, lineHeight: 1.5 }}>{s.text as any}</p>
              </div>
            ))}
          </div>

          <Link href="/parametres" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, padding: '10px 20px', borderRadius: 980, background: '#1D1D1F', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Aller dans Paramètres
            <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      )}

      {/* Stats globales */}
      {channels.length > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { label: 'Abonnés total', value: fmt(totalSubs), color: '#FF2D78' },
            { label: 'Vues totales', value: fmt(totalViews), color: '#007AFF' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: 12, color: '#6E6E73', fontWeight: 500, margin: '0 0 8px' }}>{s.label}</p>
              <p style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Channels */}
      {channels.length === 0 && hasApiKey && (
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.06)', padding: '48px 32px', textAlign: 'center' }}>
          <Film style={{ width: 32, height: 32, color: '#E5E5EA', margin: '0 auto 12px' }} />
          <p style={{ color: '#6E6E73', fontSize: 14, fontWeight: 500 }}>Aucune chaîne ajoutée</p>
          <p style={{ color: '#AEAEB2', fontSize: 13, margin: '4px 0 0' }}>Clique sur "Ajouter une chaîne" pour commencer</p>
        </div>
      )}

      {channels.map(chan => (
        <div key={chan.id} style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.06)', padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 18 }}>
          {chan.thumbnail_url
            ? <img src={chan.thumbnail_url} alt={chan.channel_name} style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #FF6B9D, #FF2D78)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Film style={{ width: 22, height: 22, color: '#fff' }} /></div>
          }
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1D1D1F', margin: 0, letterSpacing: '-0.02em' }}>{chan.channel_name}</h3>
              <a href={`https://youtube.com/channel/${chan.channel_id}`} target="_blank" style={{ color: '#AEAEB2' }}><ExternalLink style={{ width: 13, height: 13 }} /></a>
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
              {[
                { icon: Users, val: fmt(chan.subscribers), label: 'abonnés', color: '#FF2D78' },
                { icon: Eye, val: fmt(chan.total_views), label: 'vues', color: '#007AFF' },
                { icon: Film, val: String(chan.video_count || 0), label: 'vidéos', color: '#FF9500' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <s.icon style={{ width: 13, height: 13, color: s.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1D1D1F' }}>{s.val}</span>
                  <span style={{ fontSize: 11, color: '#AEAEB2' }}>{s.label}</span>
                </div>
              ))}
            </div>
            {chan.last_synced_at && <p style={{ fontSize: 11, color: '#AEAEB2', marginTop: 5 }}>Mis à jour {new Date(chan.last_synced_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => syncChannel(chan)} disabled={syncing === chan.id} style={{ padding: '7px 14px', borderRadius: 980, border: '1px solid rgba(0,0,0,0.08)', background: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw style={{ width: 12, height: 12, ...(syncing === chan.id ? { animation: 'spin 0.7s linear infinite' } : {}) }} />
              Sync
            </button>
            <Link href={`/youtube/${chan.channel_id}`} style={{ padding: '7px 14px', borderRadius: 980, background: '#F5F5F7', fontSize: 12, fontWeight: 500, color: '#1D1D1F', textDecoration: 'none' }}>Détails</Link>
          </div>
        </div>
      ))}

      {/* Modal add channel */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1D1D1F', margin: 0, letterSpacing: '-0.02em' }}>Ajouter une chaîne</h2>
              <button onClick={() => { setShowAdd(false); setAddError(''); setHandle('') }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#AEAEB2' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <form onSubmit={addChannel} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1D1D1F', marginBottom: 6 }}>Handle ou ID de la chaîne</label>
                <input value={handle} onChange={e => setHandle(e.target.value)} className="input-field" placeholder="@tonnom ou UCxxxxxx" required />
                <p style={{ fontSize: 11, color: '#AEAEB2', marginTop: 6 }}>Trouve ton handle sur ta page YouTube (ex : @nomdelachaine)</p>
              </div>
              {addError && (
                <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.12)' }}>
                  <AlertCircle style={{ width: 15, height: 15, color: '#FF3B30', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: '#FF3B30', margin: 0 }}>{addError}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => { setShowAdd(false); setAddError(''); setHandle('') }} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#1D1D1F' }}>Annuler</button>
                <button type="submit" disabled={adding} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', background: '#FF2D78', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {adding ? <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
