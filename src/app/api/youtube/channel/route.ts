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

  // Fix: query by user_id (FK to auth.users), not id (profile PK)
  const { data: profile } = await supabase
    .from('profiles')
    .select('youtube_api_key')
    .eq('user_id', user.id)
    .single()

  // Use profile key, then fall back to server-side env var
  const apiKey = profile?.youtube_api_key || process.env.YOUTUBE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Clé API YouTube manquante. Ajoutez-la dans Paramètres.' }, { status: 400 })

  const handle = req.nextUrl.searchParams.get('handle') || ''
  if (!handle) return NextResponse.json({ error: 'Handle manquant' }, { status: 400 })

  const isId = handle.startsWith('UC')
  const url = isId
    ? `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${handle}&key=${apiKey}`
    : `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${handle.replace('@','')}&key=${apiKey}`

  const res = await fetch(url)
  const data = await res.json()

  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 })
  if (!data.items?.length) return NextResponse.json({ error: 'Chaîne introuvable. Vérifiez le handle (@votrenom).' }, { status: 404 })

  const item = data.items[0]
  return NextResponse.json({
    channel_id: item.id,
    channel_name: item.snippet.title,
    thumbnail_url: item.snippet.thumbnails?.default?.url || null,
    subscribers: parseInt(item.statistics.subscriberCount || '0'),
    total_views: parseInt(item.statistics.viewCount || '0'),
    video_count: parseInt(item.statistics.videoCount || '0'),
  })
}
