import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const channelId = req.nextUrl.searchParams.get('channelId') || ''
  if (!channelId) return NextResponse.json({ error: 'channelId manquant' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('youtube_api_key').eq('user_id', user.id).single()
  const apiKey = profile?.youtube_api_key || process.env.YOUTUBE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 400 })

  // Get uploads playlist ID
  const chanRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`)
  const chanData = await chanRes.json()
  if (!chanData.items?.length) return NextResponse.json({ videos: [] })
  const uploadsId = chanData.items[0].contentDetails?.relatedPlaylists?.uploads
  if (!uploadsId) return NextResponse.json({ videos: [] })

  // Get last 20 videos
  const plRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=20&key=${apiKey}`)
  const plData = await plRes.json()
  if (!plData.items?.length) return NextResponse.json({ videos: [] })

  const videoIds = plData.items.map((i: any) => i.snippet.resourceId.videoId).join(',')

  // Get video details (duration, views)
  const detailRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`)
  const detailData = await detailRes.json()

  const videos = (detailData.items || []).map((v: any) => ({
    id: v.id,
    title: v.snippet.title,
    thumbnail: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url || '',
    views: parseInt(v.statistics.viewCount || '0'),
    publishedAt: v.snippet.publishedAt,
    duration: v.contentDetails.duration,
  }))

  return NextResponse.json({ videos })
}
