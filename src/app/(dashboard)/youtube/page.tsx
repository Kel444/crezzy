'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PlusCircle, X, PlayCircle, Users, Eye, TrendingUp, ExternalLink, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface YoutubeChannel {
  id: string
  channel_id: string
  channel_name: string
  thumbnail_url: string | null
  subscribers: number | null
  total_views: number | null
  video_count: number | null
  last_synced_at: string | null
}

interface Profile {
  youtube_api_key: string | null
}

function formatNum(n: number | null) {
  if (n === null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

export default function YoutubePage() {
  const supabase = createClient()
  const [channels, setChannels] = useState<YoutubeChannel[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [channelInput, setChannelInput] = useState('')
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: prof }, { data: chans }] = await Promise.all([
      supabase.from('profiles').select('youtube_api_key').eq('id', user.id).single(),
      supabase.from('youtube_channels').select('*').eq('user_id', user.id).order('created_at'),
    ])
    if (prof) setProfile(prof)
    if (chans) setChannels(chans)
    setLoading(false)
  }

  async function fetchChannelData(channelId: string, apiKey: string) {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
    const res = await fetch(url)
    const data = await res.json()
    if (!data.items || data.items.length === 0) {
      // Try by username/handle
      const url2 = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${channelId}&key=${apiKey}`
      const res2 = await fetch(url2)
      const data2 = await res2.json()
      if (!data2.items || data2.items.length === 0) return null
      return data2.items[0]
    }
    return data.items[0]
  }

  async function addChannel(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.youtube_api_key) {
      setAddError('Ajoutez votre cle API YouTube dans les Parametres')
      return
    }
    setAdding(true)
    setAddError('')
    try {
      const item = await fetchChannelData(channelInput.trim(), profile.youtube_api_key)
      if (!item) {
        setAddError('Chaine introuvable. Verifiez l ID ou le handle (@chaine)')
        setAdding(false)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('youtube_channels').upsert({
        user_id: user.id,
        channel_id: item.id,
        channel_name: item.snippet.title,
        thumbnail_url: item.snippet.thumbnails?.default?.url || null,
        subscribers: parseInt(item.statistics.subscriberCount || '0'),
        total_views: parseInt(item.statistics.viewCount || '0'),
        video_count: parseInt(item.statistics.videoCount || '0'),
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'channel_id,user_id' })
      if (error) { setAddError(error.message); setAdding(false); return }
      setShowForm(false)
      setChannelInput('')
      loadData()
    } catch (err) {
      setAddError('Erreur reseau. Verifiez votre cle API.')
    }
    setAdding(false)
  }

  async function syncChannel(chan: YoutubeChannel) {
    if (!profile?.youtube_api_key) return
    setSyncing(chan.id)
    try {
      const item = await fetchChannelData(chan.channel_id, profile.youtube_api_key)
      if (item) {
        await supabase.from('youtube_channels').update({
          channel_name: item.snippet.title,
          thumbnail_url: item.snippet.thumbnails?.default?.url || null,
          subscribers: parseInt(item.statistics.subscriberCount || '0'),
          total_views: parseInt(item.statistics.viewCount || '0'),
          video_count: parseInt(item.statistics.videoCount || '0'),
          last_synced_at: new Date().toISOString(),
        }).eq('id', chan.id)
        loadData()
      }
    } catch {}
    setSyncing(null)
  }

  const totalSubs = channels.reduce((s, c) => s + (c.subscribers || 0), 0)
  const totalViews = channels.reduce((s, c) => s + (c.total_views || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">YouTube</h1>
          <p className="text-sm text-gray-500 mt-0.5">Statistiques de vos chaines</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 gradient-primary text-white px-4 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-purple-200 transition-all hover:scale-[1.02]">
          <PlusCircle className="w-4 h-4" />
          Ajouter une chaine
        </button>
      </div>

      {!profile?.youtube_api_key && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Cle API YouTube manquante</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Ajoutez votre cle API dans{' '}
              <Link href="/parametres" className="underline font-medium">Parametres</Link>
              {' '}pour synchroniser vos stats.
            </p>
          </div>
        </div>
      )}

      {channels.length > 1 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="gradient-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-purple-500" />
              <p className="text-xs text-gray-500 font-medium">Total abonnes</p>
            </div>
            <p className="text-2xl font-bold text-purple-700">{formatNum(totalSubs)}</p>
          </div>
          <div className="gradient-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-gray-500 font-medium">Total vues</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{formatNum(totalViews)}</p>
          </div>
        </div>
      )}

      {channels.length === 0 ? (
        <div className="gradient-card rounded-2xl flex flex-col items-center justify-center py-16 text-gray-400">
          <PlayCircle className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">Aucune chaine ajoutee</p>
          <p className="text-sm mt-1">Ajoutez votre premiere chaine YouTube ci-dessus</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {channels.map(chan => (
            <div key={chan.id} className="gradient-card rounded-2xl p-5">
              <div className="flex items-center gap-4">
                {chan.thumbnail_url ? (
                  <img src={chan.thumbnail_url} alt={chan.channel_name}
                    className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                ) : (
                  <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center">
                    <PlayCircle className="w-7 h-7 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{chan.channel_name}</h3>
                    <a href={`https://youtube.com/channel/${chan.channel_id}`} target="_blank"
                      className="text-gray-400 hover:text-purple-500 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="flex items-center gap-5 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-sm font-semibold text-purple-700">{formatNum(chan.subscribers)}</span>
                      <span className="text-xs text-gray-400">abonnes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-sm font-semibold text-blue-700">{formatNum(chan.total_views)}</span>
                      <span className="text-xs text-gray-400">vues</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-pink-400" />
                      <span className="text-sm font-semibold text-pink-700">{chan.video_count || '—'}</span>
                      <span className="text-xs text-gray-400">videos</span>
                    </div>
                  </div>
                  {chan.last_synced_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Synchro : {new Date(chan.last_synced_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => syncChannel(chan)} disabled={syncing === chan.id || !profile?.youtube_api_key}
                    className="text-xs border border-purple-200 text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-40 flex items-center gap-1">
                    {syncing === chan.id ? (
                      <><div className="w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" /> Sync...</>
                    ) : 'Synchroniser'}
                  </button>
                  <Link href={`/youtube/${chan.channel_id}`}
                    className="text-xs gradient-primary text-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow-purple-200 transition-all">
                    Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Ajouter une chaine</h2>
              <button onClick={() => { setShowForm(false); setAddError('') }} className="p-2 rounded-xl hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={addChannel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID ou handle de la chaine</label>
                <input required value={channelInput} onChange={e => setChannelInput(e.target.value)}
                  className="w-full border border-purple-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="UCxxxxxx ou @votrenom" />
                <p className="text-xs text-gray-400 mt-1">Trouvez l ID dans l URL de votre chaine YouTube</p>
              </div>
              {addError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600">{addError}</p>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setAddError('') }}
                  className="flex-1 border border-purple-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-purple-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={adding}
                  className="flex-1 gradient-primary text-white py-2.5 rounded-xl font-medium shadow-md disabled:opacity-60 flex items-center justify-center gap-2">
                  {adding ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Recherche...</> : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
