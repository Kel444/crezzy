'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Eye, Film, Plus, X, AlertCircle, RefreshCw, ExternalLink, Key, ArrowRight, PlayCircle } from 'lucide-react'
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

interface Video {
  id: string
  title: string
  thumbnail: string
  views: number
  publishedAt: string
  duration: string
}

function fmt(n: number | null) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString('fr-FR')
}

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (parseInt(m[1] || '0') * 3600) + (parseInt(m[2] || '0') * 60) + parseInt(m[3] || '0')
}

const D = {
  bg: '#111113',
  card: '#1C1C1E',
  card2: '#2C2C2E',
  border: 'rgba(255,255,255,0.07)',
  text: '#F5F5F7',
  sub: '#8E8E93',
  muted: '#636366',
  pink: '#FF2D78',
  blue: '#0A84FF',
  orange: '#FF9F0A',
  green: '#30D158',
}

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
  const [channelVideos, setChannelVideos] = useState<Record<string, Video[]>>({})
  const [loadingVideos, setLoadingVideos] = useState<Record<string, boolean>>({})

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
    if (chans) {
      setChannels(chans)
      chans.forEach((c: Channel) => fetchVideos(c.channel_id))
    }
    setLoading(false)
  }

  async function fetchVideos(channelId: string) {
    setLoadingVideos(prev => ({ ...prev, [channelId]: true }))
    try {
      const res = await fetch(`/api/youtube/videos?channelId=${channelId}`)
      if (res.ok) {
        const data = await res.json()
        setChannelVideos(prev => ({ ...prev, [channelId]: data.videos || [] }))
      }
    } catch {}
    setLoadingVideos(prev => ({ ...prev, [channelId]: false }))
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
        user_id: user.id, ...data, last_synced_at: new Date().toISOString(),
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${D.card2}`, borderTopColor: D.pink, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: D.text, margin: 0 }}>YouTube</h1>
          <p style={{ color: D.sub, fontSize: 14, marginTop: 4 }}>Statistiques de tes chaînes</p>
        </div>
        {hasApiKey && (
          <button onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 980, background: D.pink, color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            <Plus style={{ width: 15, height: 15 }} />Ajouter une chaîne
          </button>
        )}
      </div>

      {/* No API key */}
      {hasApiKey === false && (
        <div style={{ background: D.card, borderRadius: 18, border: `1px solid ${D.border}`, padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: D.card2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Key style={{ width: 20, height: 20, color: D.sub }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, color: D.text, margin: 0 }}>Configure ta clé YouTube API</p>
              <p style={{ color: D.sub, fontSize: 13, margin: '2px 0 0' }}>Gratuit — 2 minutes de setup</p>
            </div>
          </div>
          <Link href="/parametres" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 980, background: D.pink, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Aller dans Paramètres <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      )}

      {/* Empty state */}
      {channels.length === 0 && hasApiKey && (
        <div style={{ background: D.card, borderRadius: 18, border: `1px solid ${D.border}`, padding: '48px 32px', textAlign: 'center' }}>
          <PlayCircle style={{ width: 36, height: 36, color: D.muted, margin: '0 auto 12px' }} />
          <p style={{ color: D.sub, fontSize: 15, fontWeight: 500 }}>Aucune chaîne ajoutée</p>
          <p style={{ color: D.muted, fontSize: 13, margin: '4px 0 16px' }}>Clique sur "Ajouter une chaîne" pour commencer</p>
          <button onClick={() => setShowAdd(true)} style={{ padding: '9px 20px', borderRadius: 980, background: D.pink, color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            + Ajouter une chaîne
          </button>
        </div>
      )}

      {/* Channel cards */}
      {channels.map(chan => {
        const videos = channelVideos[chan.channel_id] || []
        const longForm = videos.filter(v => parseDuration(v.duration) > 60)
        const shorts = videos.filter(v => parseDuration(v.duration) <= 60 && parseDuration(v.duration) > 0)
        const totalVideosTyped = longForm.length + shorts.length
        const longPct = totalVideosTyped > 0 ? Math.round((longForm.length / totalVideosTyped) * 100) : 0
        const shortPct = totalVideosTyped > 0 ? 100 - longPct : 0

        return (
          <div key={chan.id} style={{ background: D.card, borderRadius: 20, border: `1px solid ${D.border}`, overflow: 'hidden' }}>
            {/* Top: channel info + sync */}
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              {chan.thumbnail_url
                ? <img src={chan.thumbnail_url} alt={chan.channel_name} style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #FF6B9D, #FF2D78)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PlayCircle style={{ width: 24, height: 24, color: '#fff' }} /></div>
              }
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0, letterSpacing: '-0.02em' }}>{chan.channel_name}</h3>
                  <a href={`https://youtube.com/channel/${chan.channel_id}`} target="_blank" style={{ color: D.muted, display: 'flex' }}><ExternalLink style={{ width: 13, height: 13 }} /></a>
                </div>
                {chan.last_synced_at && <p style={{ fontSize: 11, color: D.muted, marginTop: 3 }}>Mis à jour {new Date(chan.last_synced_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
              </div>
              <button onClick={() => syncChannel(chan)} disabled={syncing === chan.id} style={{ padding: '7px 14px', borderRadius: 980, border: `1px solid ${D.border}`, background: 'transparent', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: D.sub, display: 'flex', alignItems: 'center', gap: 5 }}>
                <RefreshCw style={{ width: 12, height: 12, ...(syncing === chan.id ? { animation: 'spin 0.7s linear infinite' } : {}) }} />
                Sync
              </button>
            </div>

            {/* Big stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, borderTop: `1px solid ${D.border}`, borderBottom: `1px solid ${D.border}` }}>
              {[
                { icon: Users, val: fmt(chan.subscribers), label: 'Abonnés', color: D.pink },
                { icon: Eye, val: fmt(chan.total_views), label: 'Vues totales', color: D.blue },
                { icon: Film, val: String(chan.video_count || 0), label: 'Vidéos', color: D.orange },
              ].map((s, i) => (
                <div key={s.label} style={{ padding: '18px 20px', background: D.card, borderLeft: i > 0 ? `1px solid ${D.border}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <s.icon style={{ width: 14, height: 14, color: s.color }} />
                    <span style={{ fontSize: 11, color: D.sub, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: s.color, margin: 0, letterSpacing: '-0.03em' }}>{s.val}</p>
                </div>
              ))}
            </div>

            {/* Long Form vs Shorts breakdown */}
            {totalVideosTyped > 0 && (
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${D.border}` }}>
                <p style={{ fontSize: 11, color: D.sub, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Répartition (20 dernières vidéos)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Long Form', count: longForm.length, pct: longPct, color: D.blue },
                    { label: 'Shorts', count: shorts.length, pct: shortPct, color: D.pink },
                  ].map(t => (
                    <div key={t.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: D.text }}>{t.label}</span>
                        <span style={{ fontSize: 12, color: D.sub }}>{t.count} vidéos</span>
                      </div>
                      <div style={{ height: 6, background: D.card2, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${t.pct}%`, background: t.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent videos thumbnails */}
            {videos.length > 0 && (
              <div style={{ padding: '16px 24px' }}>
                <p style={{ fontSize: 11, color: D.sub, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>Vidéos récentes</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {videos.slice(0, 4).map(v => (
                    <div key={v.id} style={{ borderRadius: 10, overflow: 'hidden', background: D.card2 }}>
                      <div style={{ position: 'relative', paddingBottom: '56.25%', background: D.card2 }}>
                        <img src={v.thumbnail} alt={v.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        {parseDuration(v.duration) <= 60 && parseDuration(v.duration) > 0 && (
                          <div style={{ position: 'absolute', top: 4, left: 4, background: D.pink, borderRadius: 4, padding: '1px 5px', fontSize: 9, fontWeight: 700, color: '#fff' }}>SHORT</div>
                        )}
                      </div>
                      <div style={{ padding: '6px 8px' }}>
                        <p style={{ fontSize: 10, color: D.sub, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</p>
                        <p style={{ fontSize: 10, color: D.muted, margin: '2px 0 0' }}>{fmt(v.views)} vues</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingVideos[chan.channel_id] && (
              <div style={{ padding: '12px 24px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 14, height: 14, border: `2px solid ${D.card2}`, borderTopColor: D.pink, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <span style={{ fontSize: 12, color: D.muted }}>Chargement des vidéos...</span>
              </div>
            )}
          </div>
        )
      })}

      {/* Modal add channel */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: D.card, borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, border: `1px solid ${D.border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>Ajouter une chaîne</h2>
              <button onClick={() => { setShowAdd(false); setAddError(''); setHandle('') }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: D.muted }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <form onSubmit={addChannel} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.text, marginBottom: 6 }}>Handle ou ID de la chaîne</label>
                <input value={handle} onChange={e => setHandle(e.target.value)} className="input-field" placeholder="@tonnom ou UCxxxxxx" required />
                <p style={{ fontSize: 11, color: D.muted, marginTop: 6 }}>Exemple : @NomDeLaChaîne</p>
              </div>
              {addError && (
                <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.2)' }}>
                  <AlertCircle style={{ width: 15, height: 15, color: '#FF3B30', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: '#FF3B30', margin: 0 }}>{addError}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => { setShowAdd(false); setAddError(''); setHandle('') }} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: `1px solid ${D.border}`, background: 'transparent', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: D.sub }}>Annuler</button>
                <button type="submit" disabled={adding} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', background: D.pink, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
