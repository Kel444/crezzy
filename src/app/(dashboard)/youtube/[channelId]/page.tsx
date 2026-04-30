'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Users, Eye, TrendingUp, PlayCircle, RefreshCw, Film, ThumbsUp, MessageSquare } from 'lucide-react'
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

interface Video {
  id: string
  title: string
  publishedAt: string
  viewCount: string
  likeCount: string
  commentCount: string
  thumbnail: string
  duration: string
}

function formatNum(n: number | string | null) {
  if (n === null || n === undefined) return '0'
  const num = typeof n === 'string' ? parseInt(n) : n
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`
  return num.toLocaleString('fr-FR')
}

export default function ChannelDetailPage({ params }: { params: { channelId: string } }) {
  const supabase = createClient()
  const [channel, setChannel] = useState<YoutubeChannel | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: prof }, { data: chan }] = await Promise.all([
      supabase.from('profiles').select('youtube_api_key').eq('user_id', user.id).single(),
      supabase.from('youtube_channels').select('*').eq('user_id', user.id).eq('channel_id', params.channelId).single(),
    ])
    if (prof?.youtube_api_key) {
      setApiKey(prof.youtube_api_key)
    }
    if (chan) {
      setChannel(chan)
      if (prof?.youtube_api_key) loadVideos(params.channelId, prof.youtube_api_key)
    }
    setLoading(false)
  }

  async function loadVideos(channelId: string, key: string) {
    setLoadingVideos(true)
    setError('')
    try {
      // Get recent uploads playlist
      const chanRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${key}`
      )
      const chanData = await chanRes.json()
      const uploadsId = chanData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
      if (!uploadsId) { setError('Impossible de recuperer la liste des videos'); setLoadingVideos(false); return }

      const playRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=20&key=${key}`
      )
      const playData = await playRes.json()
      const videoIds = playData.items?.map((i: any) => i.snippet.resourceId.videoId).join(',')
      if (!videoIds) { setLoadingVideos(false); return }

      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${key}`
      )
      const statsData = await statsRes.json()

      const vids: Video[] = statsData.items?.map((v: any) => ({
        id: v.id,
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        viewCount: v.statistics.viewCount || '0',
        likeCount: v.statistics.likeCount || '0',
        commentCount: v.statistics.commentCount || '0',
        thumbnail: v.snippet.thumbnails?.medium?.url || '',
        duration: v.contentDetails.duration,
      })) || []
      setVideos(vids)
    } catch {
      setError('Erreur lors du chargement des videos')
    }
    setLoadingVideos(false)
  }

  function parseDuration(iso: string) {
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!m) return ''
    const h = parseInt(m[1] || '0')
    const min = parseInt(m[2] || '0')
    const s = parseInt(m[3] || '0')
    if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${min}:${String(s).padStart(2, '0')}`
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  if (!channel) return (
    <div className="text-center py-16 text-gray-400">
      <p>Chaine introuvable.</p>
      <Link href="/youtube" className="text-pink-600 hover:underline text-sm mt-2 inline-block">Retour</Link>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/youtube" className="p-2 rounded-xl hover:bg-pink-50 text-gray-400 hover:text-pink-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          {channel.thumbnail_url ? (
            <img src={channel.thumbnail_url} alt={channel.channel_name} className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <PlayCircle className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{channel.channel_name}</h1>
            {channel.last_synced_at && (
              <p className="text-xs text-gray-400">
                Derniere synchro : {new Date(channel.last_synced_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
        </div>
        {apiKey && (
          <button onClick={() => loadVideos(channel.channel_id, apiKey)} disabled={loadingVideos}
            className="ml-auto p-2 rounded-xl hover:bg-pink-50 text-pink-600 transition-colors disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${loadingVideos ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Abonnes', value: formatNum(channel.subscribers), icon: Users, color: 'text-pink-700', bg: 'bg-pink-50' },
          { label: 'Vues totales', value: formatNum(channel.total_views), icon: Eye, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Videos', value: formatNum(channel.video_count), icon: Film, color: 'text-pink-700', bg: 'bg-pink-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Videos */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-pink-500" />
          Dernieres videos
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 mb-3">{error}</div>
        )}

        {loadingVideos ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <div className="gradient-card rounded-2xl py-10 text-center text-gray-400">
            <Film className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucune video chargee</p>
            {!apiKey && <p className="text-xs mt-1">Ajoutez votre cle API dans Parametres</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map(v => (
              <a key={v.id} href={`https://youtube.com/watch?v=${v.id}`} target="_blank"
                className="gradient-card rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all group block">
                <div className="relative shrink-0">
                  <img src={v.thumbnail} alt={v.title}
                    className="w-28 h-16 object-cover rounded-xl group-hover:scale-[1.02] transition-transform" />
                  <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                    {parseDuration(v.duration)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm line-clamp-2 group-hover:text-pink-700 transition-colors">
                    {v.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(v.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Eye className="w-3 h-3" />{formatNum(v.viewCount)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <ThumbsUp className="w-3 h-3" />{formatNum(v.likeCount)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <MessageSquare className="w-3 h-3" />{formatNum(v.commentCount)}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
