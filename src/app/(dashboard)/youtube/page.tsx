'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Eye, TrendingUp, ExternalLink, RefreshCw, Film, ThumbsUp, MessageSquare, LogIn, CheckCircle, AlertCircle } from 'lucide-react'
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

const S: React.CSSProperties = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
}

export default function YoutubePage() {
  const supabase = createClient()
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [connectingGoogle, setConnectingGoogle] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    init()
  }, [])

  async function init() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check if Google is connected (has provider_token or google identity)
    const { data: { session } } = await supabase.auth.getSession()
    const identities = session?.user?.identities || []
    const hasGoogle = identities.some((id: any) => id.provider === 'google')
    setGoogleConnected(hasGoogle)

    // Load saved channels
    const { data } = await supabase
      .from('youtube_channels')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')
    if (data) setChannels(data)

    // If we have a provider_token from fresh Google OAuth, auto-sync
    if (session?.provider_token && hasGoogle) {
      await syncFromGoogle(session.provider_token, user.id)
    }
    setLoading(false)
  }

  async function connectGoogle() {
    setConnectingGoogle(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/youtube.readonly',
        redirectTo: `${window.location.origin}/youtube`,
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    })
    if (error) { setError('Erreur de connexion Google : ' + error.message); setConnectingGoogle(false) }
  }

  async function syncFromGoogle(providerToken: string, userId: string) {
    setSyncing(true)
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true`,
        { headers: { Authorization: `Bearer ${providerToken}` } }
      )
      const data = await res.json()
      if (data.items) {
        for (const item of data.items) {
          await supabase.from('youtube_channels').upsert({
            user_id: userId,
            channel_id: item.id,
            channel_name: item.snippet.title,
            thumbnail_url: item.snippet.thumbnails?.default?.url || null,
            subscribers: parseInt(item.statistics.subscriberCount || '0'),
            total_views: parseInt(item.statistics.viewCount || '0'),
            video_count: parseInt(item.statistics.videoCount || '0'),
            last_synced_at: new Date().toISOString(),
          }, { onConflict: 'channel_id,user_id' })
        }
        const { data: updated } = await supabase.from('youtube_channels').select('*').eq('user_id', userId).order('created_at')
        if (updated) setChannels(updated)
      } else if (data.error) {
        setError('Erreur YouTube : ' + data.error.message)
      }
    } catch (e) {
      setError('Erreur lors de la synchronisation')
    }
    setSyncing(false)
  }

  async function refreshSync() {
    const { data: { session } } = await supabase.auth.getSession()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (session?.provider_token) {
      await syncFromGoogle(session.provider_token, user.id)
    } else {
      // Re-auth to get fresh token
      connectGoogle()
    }
  }

  const totalSubs = channels.reduce((s, c) => s + (c.subscribers || 0), 0)
  const totalViews = channels.reduce((s, c) => s + (c.total_views || 0), 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, ...S }}>
      <div style={{ width: 32, height: 32, border: '3px solid #F5F5F7', borderTopColor: '#FF2D78', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ ...S, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#1D1D1F', margin: 0 }}>YouTube</h1>
          <p style={{ color: '#6E6E73', fontSize: 14, marginTop: 4 }}>Statistiques de tes chaînes</p>
        </div>
        {channels.length > 0 && (
          <button onClick={refreshSync} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 980, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#1D1D1F' }}>
            <RefreshCw style={{ width: 14, height: 14, ...(syncing ? { animation: 'spin 0.7s linear infinite' } : {}) }} />
            Synchroniser
          </button>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.12)' }}>
          <AlertCircle style={{ width: 16, height: 16, color: '#FF3B30', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#FF3B30', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Google Connect card */}
      {!googleConnected ? (
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: 32, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F5F5F7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="28" height="28" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#1D1D1F', margin: '0 0 8px' }}>Connecte ta chaîne YouTube</h2>
          <p style={{ color: '#6E6E73', fontSize: 14, maxWidth: 380, margin: '0 auto 24px', lineHeight: 1.5 }}>
            Connecte ton compte Google pour importer automatiquement tes chaînes YouTube et voir tes stats (abonnés, vues, vidéos) en temps réel.
          </p>
          <button onClick={connectGoogle} disabled={connectingGoogle} style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 24px', borderRadius: 12,
            background: '#fff', border: '1px solid rgba(0,0,0,0.12)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            color: '#1D1D1F', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', transition: 'all 0.15s ease'
          }}>
            {connectingGoogle ? (
              <span style={{ width: 18, height: 18, border: '2px solid #E5E5EA', borderTopColor: '#1D1D1F', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            )}
            Continuer avec Google
          </button>
          <p style={{ color: '#AEAEB2', fontSize: 12, marginTop: 16 }}>
            Tes stats YouTube sont publiques — seul l'accès en lecture est demandé.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(52,199,89,0.06)', border: '1px solid rgba(52,199,89,0.15)' }}>
          <CheckCircle style={{ width: 16, height: 16, color: '#34C759' }} />
          <p style={{ fontSize: 13, color: '#1D7A3B', margin: 0, fontWeight: 500 }}>Compte Google connecté — chaînes importées automatiquement</p>
        </div>
      )}

      {/* Stats globales */}
      {channels.length > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Abonnés total', value: fmt(totalSubs), icon: Users, color: '#FF2D78' },
            { label: 'Vues totales', value: fmt(totalViews), icon: Eye, color: '#007AFF' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <s.icon style={{ width: 16, height: 16, color: s.color }} />
                <p style={{ fontSize: 12, color: '#6E6E73', margin: 0, fontWeight: 500 }}>{s.label}</p>
              </div>
              <p style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#1D1D1F', margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Channels list */}
      {channels.length === 0 && googleConnected && !syncing && (
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.06)', padding: 40, textAlign: 'center' }}>
          <Film style={{ width: 36, height: 36, color: '#E5E5EA', margin: '0 auto 12px' }} />
          <p style={{ color: '#6E6E73', fontSize: 14 }}>Aucune chaîne trouvée sur ce compte Google</p>
        </div>
      )}

      {channels.map(chan => (
        <div key={chan.id} style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.06)', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 20 }}>
          {chan.thumbnail_url ? (
            <img src={chan.thumbnail_url} alt={chan.channel_name} style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #FF6B9D, #FF2D78)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Film style={{ width: 24, height: 24, color: '#fff' }} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#1D1D1F', margin: 0 }}>{chan.channel_name}</h3>
              <a href={`https://youtube.com/channel/${chan.channel_id}`} target="_blank" style={{ color: '#AEAEB2' }}>
                <ExternalLink style={{ width: 14, height: 14 }} />
              </a>
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
              {[
                { icon: Users, val: fmt(chan.subscribers), label: 'abonnés', color: '#FF2D78' },
                { icon: Eye, val: fmt(chan.total_views), label: 'vues', color: '#007AFF' },
                { icon: Film, val: String(chan.video_count || 0), label: 'vidéos', color: '#FF9500' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <s.icon style={{ width: 14, height: 14, color: s.color }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F' }}>{s.val}</span>
                  <span style={{ fontSize: 12, color: '#AEAEB2' }}>{s.label}</span>
                </div>
              ))}
            </div>
            {chan.last_synced_at && (
              <p style={{ fontSize: 11, color: '#AEAEB2', marginTop: 6 }}>
                Mis à jour le {new Date(chan.last_synced_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <Link href={`/youtube/${chan.channel_id}`} style={{ padding: '8px 16px', borderRadius: 980, background: '#F5F5F7', fontSize: 13, fontWeight: 500, color: '#1D1D1F', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Voir détails
          </Link>
        </div>
      ))}

      {syncing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, borderRadius: 12, background: '#F5F5F7' }}>
          <span style={{ width: 16, height: 16, border: '2px solid #E5E5EA', borderTopColor: '#FF2D78', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
          <p style={{ fontSize: 13, color: '#6E6E73', margin: 0 }}>Synchronisation de tes chaînes...</p>
        </div>
      )}
    </div>
  )
}
