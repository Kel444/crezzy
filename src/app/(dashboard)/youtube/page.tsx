'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Eye, Film, Plus, X, AlertCircle, RefreshCw, ExternalLink, Key, ArrowRight, PlayCircle, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

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

interface Snapshot {
  date: string
  views: number
  subscribers: number
}

interface Revenu {
  mois: number
  annee: number
  montant_eur: number
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return "Aujourd'hui"
  if (d === 1) return "Hier"
  if (d < 30) return `il y a ${d}j`
  const mo = Math.floor(d / 30)
  return `il y a ${mo} mois`
}

const MOIS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const D = {
  bg: '#111113', card: 'rgba(255,255,255,0.055)', card2: 'rgba(255,255,255,0.09)', border: 'rgba(255,255,255,0.12)',
  text: '#F5F5F7', sub: '#8E8E93', muted: '#636366',
  pink: '#FF2D78', blue: '#0A84FF', orange: '#FF9F0A', green: '#30D158',
}

const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: D.card2, border: `1px solid ${D.border}`, borderRadius: 10, padding: '8px 14px' }}>
      <p style={{ color: D.muted, fontSize: 11, margin: '0 0 4px' }}>{label}</p>
      <p style={{ color: D.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{prefix}{payload[0].value?.toLocaleString('fr-FR')}{suffix}</p>
    </div>
  )
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
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot[]>>({})
  const [revenueData, setRevenueData] = useState<{ label: string, value: number }[]>([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: prof }, { data: chans }, { data: revs }] = await Promise.all([
      supabase.from('profiles').select('youtube_api_key').eq('user_id', user.id).single(),
      supabase.from('youtube_channels').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('revenus').select('mois,annee,montant_eur').eq('user_id', user.id).order('annee').order('mois'),
    ])

    setHasApiKey(!!prof?.youtube_api_key)

    if (revs) {
      const now = new Date()
      const last6: { label: string, value: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const mo = d.getMonth() + 1
        const yr = d.getFullYear()
        const total = revs.filter((r: Revenu) => r.mois === mo && r.annee === yr).reduce((s: number, r: Revenu) => s + r.montant_eur, 0)
        last6.push({ label: MOIS_SHORT[mo - 1], value: Math.round(total) })
      }
      setRevenueData(last6)
    }

    if (chans) {
      setChannels(chans)
      chans.forEach((c: Channel) => {
        fetchVideos(c.channel_id)
        fetchSnapshots(user.id, c.channel_id)
      })
    }
    setLoading(false)
  }

  async function fetchVideos(channelId: string) {
    try {
      const res = await fetch(`/api/youtube/videos?channelId=${channelId}`)
      if (res.ok) {
        const data = await res.json()
        setChannelVideos(prev => ({ ...prev, [channelId]: data.videos || [] }))
      }
    } catch {}
  }

  async function fetchSnapshots(userId: string, channelId: string) {
    const { data } = await supabase
      .from('youtube_daily_stats')
      .select('date,views,subscribers')
      .eq('user_id', userId)
      .eq('channel_id', channelId)
      .order('date', { ascending: true })
      .limit(28)
    if (data) setSnapshots(prev => ({ ...prev, [channelId]: data }))
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
      // Save initial snapshot
      await supabase.from('youtube_daily_stats').upsert({
        user_id: user.id, channel_id: data.channel_id,
        date: new Date().toISOString().split('T')[0],
        views: data.total_views, subscribers: data.subscribers, video_count: data.video_count,
      }, { onConflict: 'user_id,channel_id,date' })
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
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('youtube_channels').update({ ...data, last_synced_at: new Date().toISOString() }).eq('id', chan.id)
          await supabase.from('youtube_daily_stats').upsert({
            user_id: user.id, channel_id: chan.channel_id,
            date: new Date().toISOString().split('T')[0],
            views: data.total_views, subscribers: data.subscribers, video_count: data.video_count,
          }, { onConflict: 'user_id,channel_id,date' })
        }
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
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .vid-item:hover{background:rgba(255,255,255,0.04)}`}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: D.text, margin: 0 }}>YouTube</h1>
          <p style={{ color: D.sub, fontSize: 14, marginTop: 4 }}>Stats de tes chaînes</p>
        </div>
        {hasApiKey && (
          <button onClick={() => setShowAdd(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 980, background: D.pink, color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            <Plus style={{ width: 15, height: 15 }} />Ajouter une chaîne
          </button>
        )}
      </div>

      {hasApiKey === false && (
        <div style={{ background: D.card, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 18, border: `1px solid ${D.border}`, padding: 32 }}>
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

      {channels.length === 0 && hasApiKey && (
        <div style={{ background: D.card, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 18, border: `1px solid ${D.border}`, padding: '48px 32px', textAlign: 'center' }}>
          <PlayCircle style={{ width: 36, height: 36, color: D.muted, margin: '0 auto 12px' }} />
          <p style={{ color: D.sub, fontSize: 15, fontWeight: 500, margin: '0 0 4px' }}>Aucune chaîne ajoutée</p>
          <p style={{ color: D.muted, fontSize: 13, margin: '0 0 16px' }}>Clique sur "Ajouter une chaîne" pour commencer</p>
          <button onClick={() => setShowAdd(true)} style={{ padding: '9px 20px', borderRadius: 980, background: D.pink, color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            + Ajouter une chaîne
          </button>
        </div>
      )}

      {/* Revenue chart — shared across all channels */}
      {channels.length > 0 && (
        <div style={{ background: D.card, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 18, border: `1px solid ${D.border}`, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp style={{ width: 16, height: 16, color: D.pink }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: 0 }}>Revenus déclarés — 6 derniers mois</p>
          </div>
          {revenueData.every(d => d.value === 0) ? (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
              <p style={{ color: D.muted, fontSize: 13, margin: 0 }}>Aucun revenu saisi</p>
              <Link href="/revenus" style={{ fontSize: 12, color: D.pink }}>Ajouter des revenus →</Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={revenueData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={D.pink} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={D.pink} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: D.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: D.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip suffix=" €" />} />
                <Area type="monotone" dataKey="value" stroke={D.pink} strokeWidth={2} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {channels.map(chan => {
        const videos = channelVideos[chan.channel_id] || []
        const longForm = videos.filter(v => parseDuration(v.duration) > 60)
        const snaps = snapshots[chan.channel_id] || []
        // Daily delta: views gained each day (difference between consecutive snapshots)
        const viewsData = snaps.slice(1).map((s, i) => ({
          label: s.date.slice(5),
          value: Math.max(0, (s.views ?? 0) - (snaps[i].views ?? 0))
        }))
        const subsData = snaps.slice(1).map((s, i) => ({
          label: s.date.slice(5),
          value: Math.max(0, (s.subscribers ?? 0) - (snaps[i].subscribers ?? 0))
        }))
        const hasSnaps = snaps.length >= 2

        return (
          <div key={chan.id} style={{ background: D.card, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 20, border: `1px solid ${D.border}`, overflow: 'hidden' }}>
            {/* Channel header */}
            <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: `1px solid ${D.border}` }}>
              {chan.thumbnail_url
                ? <img src={chan.thumbnail_url} alt={chan.channel_name} style={{ width: 48, height: 48, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#FF6B9D,#FF2D78)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PlayCircle style={{ width: 22, height: 22, color: '#fff' }} /></div>
              }
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: D.text, margin: 0 }}>{chan.channel_name}</h3>
                  <a href={`https://youtube.com/channel/${chan.channel_id}`} target="_blank" style={{ color: D.muted, display: 'flex' }}><ExternalLink style={{ width: 12, height: 12 }} /></a>
                </div>
                {chan.last_synced_at && <p style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>Synchro {new Date(chan.last_synced_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
              </div>
              <button onClick={() => syncChannel(chan)} disabled={syncing === chan.id}
                style={{ padding: '7px 14px', borderRadius: 980, border: `1px solid ${D.border}`, background: 'transparent', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: D.sub, display: 'flex', alignItems: 'center', gap: 5 }}>
                <RefreshCw style={{ width: 12, height: 12, ...(syncing === chan.id ? { animation: 'spin 0.7s linear infinite' } : {}) }} />
                Sync
              </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: `1px solid ${D.border}` }}>
              {[
                { icon: Users, val: fmt(chan.subscribers), label: 'Abonnés', color: D.pink },
                { icon: Eye, val: fmt(chan.total_views), label: 'Vues totales', color: D.blue },
                { icon: Film, val: String(chan.video_count || 0), label: 'Vidéos', color: D.orange },
              ].map((s, i) => (
                <div key={s.label} style={{ padding: '16px 20px', borderLeft: i > 0 ? `1px solid ${D.border}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <s.icon style={{ width: 13, height: 13, color: s.color }} />
                    <span style={{ fontSize: 10, color: D.sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
                  </div>
                  <p style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: 0, letterSpacing: '-0.03em' }}>{s.val}</p>
                </div>
              ))}
            </div>

            {/* Main layout: videos left | charts right */}
            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', minHeight: 420 }}>

              {/* Left: Long Form scrollable list */}
              <div style={{ borderRight: `1px solid ${D.border}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${D.border}` }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: D.sub, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Long Form · {longForm.length} vidéos
                  </p>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', maxHeight: 460 }}>
                  {longForm.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                      <p style={{ color: D.muted, fontSize: 13 }}>Aucune vidéo longue trouvée</p>
                    </div>
                  ) : longForm.map(v => (
                    <div key={v.id} className="vid-item"
                      style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${D.border}`, cursor: 'pointer', transition: 'background 0.12s' }}
                      onClick={() => window.open(`https://youtube.com/watch?v=${v.id}`, '_blank')}>
                      <div style={{ position: 'relative', width: 96, height: 54, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: D.card2 }}>
                        <img src={v.thumbnail} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: D.text, margin: '0 0 4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{v.title}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: D.pink, fontWeight: 600 }}>{fmt(v.views)} vues</span>
                          <span style={{ fontSize: 11, color: D.muted }}>{timeAgo(v.publishedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Charts */}
              <div style={{ display: 'flex', flexDirection: 'column', padding: '18px 20px', gap: 18 }}>

                {/* Views 28J */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: D.sub, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Vues / jour</p>
                  {!hasSnaps ? (
                    <div style={{ height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: D.card2, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 12, gap: 6 }}>
                      <Eye style={{ width: 18, height: 18, color: D.muted }} />
                      <p style={{ color: D.muted, fontSize: 12, margin: 0, textAlign: 'center' }}>Synchro quotidienne pour<br/>voir la tendance</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={100}>
                      <AreaChart data={viewsData} margin={{ top: 4, right: 0, bottom: 0, left: -30 }}>
                        <defs>
                          <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={D.blue} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={D.blue} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                        <Tooltip content={<CustomTooltip suffix=" vues" />} />
                        <Area type="monotone" dataKey="value" stroke={D.blue} strokeWidth={2} fill="url(#viewGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: D.border }} />

                {/* Subs 28J */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: D.sub, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Abonnés gagnés / jour</p>
                  {!hasSnaps ? (
                    <div style={{ height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: D.card2, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 12, gap: 6 }}>
                      <Users style={{ width: 18, height: 18, color: D.muted }} />
                      <p style={{ color: D.muted, fontSize: 12, margin: 0, textAlign: 'center' }}>Synchro quotidienne pour<br/>voir la tendance</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={100}>
                      <AreaChart data={subsData} margin={{ top: 4, right: 0, bottom: 0, left: -30 }}>
                        <defs>
                          <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={D.green} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={D.green} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: D.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="value" stroke={D.green} strokeWidth={2} fill="url(#subGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {!hasSnaps && (
                  <p style={{ fontSize: 11, color: D.muted, margin: 0, textAlign: 'center' }}>
                    Les graphiques se remplissent au fil des synchros 📈
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: D.card, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, border: `1px solid ${D.border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>Ajouter une chaîne</h2>
              <button onClick={() => { setShowAdd(false); setAddError(''); setHandle('') }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: D.muted, display: 'flex' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <form onSubmit={addChannel} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: D.sub, marginBottom: 6 }}>Handle ou ID de la chaîne</label>
                <input value={handle} onChange={e => setHandle(e.target.value)}
                  style={{ width: '100%', background: D.card2, border: `1px solid ${D.border}`, borderRadius: 12, padding: '10px 14px', fontSize: 14, color: D.text, outline: 'none', boxSizing: 'border-box' as any }}
                  placeholder="@tonnom ou UCxxxxxx" required />
                <p style={{ fontSize: 11, color: D.muted, marginTop: 6 }}>Exemple : @NomDeLaChaîne</p>
              </div>
              {addError && (
                <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.2)' }}>
                  <AlertCircle style={{ width: 15, height: 15, color: '#FF3B30', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: '#FF3B30', margin: 0 }}>{addError}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => { setShowAdd(false); setAddError(''); setHandle('') }}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: `1px solid ${D.border}`, background: 'transparent', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: D.sub }}>
                  Annuler
                </button>
                <button type="submit" disabled={adding}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', background: D.pink, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
