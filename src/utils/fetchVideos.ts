export interface Video {
  id: string
  title: string
  url: string
  thumbnail: string
  source: 'youtube' | 'rss'
  publishedAt: string
}

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3'

async function fetchYouTubeVideos(channelId: string): Promise<Video[]> {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API key is not configured. Current value:', YOUTUBE_API_KEY)
    throw new Error('YouTube API key is not configured')
  }

  try {
    const apiUrl = `${YOUTUBE_API_URL}/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=20`
    console.log('Fetching videos from YouTube API for channel:', channelId)
    
    const response = await fetch(apiUrl)
    console.log('YouTube API Response status:', response.status)
    
    const responseText = await response.text()
    
    if (!response.ok) {
      console.error('YouTube API Error. Status:', response.status)
      console.error('Error details:', responseText)
      
      try {
        const errorData = JSON.parse(responseText)
        if (errorData.error?.errors?.[0]?.reason === 'quotaExceeded') {
          throw new Error('quota')
        }
        throw new Error(errorData.error?.message || 'YouTube API error')
      } catch (parseError: unknown) {
        if (parseError instanceof Error && parseError.message === 'quota') {
          throw parseError
        }
        throw new Error(`YouTube API error: ${response.status}`)
      }
    }

    const data = JSON.parse(responseText)
    console.log('YouTube API Response for channel:', channelId, 'Items:', data.items?.length || 0)
    
    if (!data.items || data.items.length === 0) {
      console.log('No videos found for channel:', channelId)
      return []
    }

    const videos = data.items
      .filter((item: any) => item.id?.videoId)
      .map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnail: item.snippet.thumbnails.medium.url,
        source: 'youtube' as const,
        publishedAt: item.snippet.publishedAt
      }))

    console.log(`Successfully processed ${videos.length} videos from YouTube API for channel:`, channelId)
    return videos
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'quota') {
      console.log('YouTube API quota exceeded for channel:', channelId)
      throw error
    }
    console.error('Error fetching YouTube videos for channel:', channelId, error)
    throw error instanceof Error ? error : new Error('Unknown error fetching YouTube videos')
  }
}

async function fetchRSSVideos(feedUrl: string): Promise<Video[]> {
  try {
    console.log('Fetching RSS feed:', feedUrl)
    // Try multiple CORS proxies in case one fails
    const proxyUrls = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
      'https://cors-anywhere.herokuapp.com/'
    ]
    
    let response = null
    let error = null
    let responseText = ''
    
    // Try each proxy until one works
    for (const proxyUrl of proxyUrls) {
      try {
        const encodedUrl = encodeURIComponent(feedUrl)
        console.log('Trying proxy URL:', proxyUrl + encodedUrl)
        
        response = await fetch(proxyUrl + encodedUrl)
        if (response.ok) {
          responseText = await response.text()
          // Check if we got a valid XML response
          if (responseText.trim().startsWith('<?xml') || responseText.trim().startsWith('<feed')) {
            console.log('Successfully fetched valid XML from proxy:', proxyUrl)
            break
          } else {
            console.log('Invalid XML response from proxy:', proxyUrl)
            continue
          }
        }
      } catch (e) {
        error = e
        console.log('Proxy failed:', proxyUrl, e)
        continue
      }
    }
    
    if (!responseText || !responseText.trim()) {
      console.error('All proxies failed or returned empty response. Last error:', error)
      return []
    }

    console.log('RSS Feed Response Length:', responseText.length)
    console.log('RSS Feed Response Preview:', responseText.substring(0, 200))
    
    if (responseText.length < 100) {
      console.error('RSS feed response too short:', responseText)
      return []
    }

    // Clean the XML response
    responseText = responseText
      .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;')
      .replace(/<(\/?)[a-zA-Z0-9]+:/g, '<$1') // Remove XML namespaces
    
    // Use regex to extract video information
    const videoRegex = /<entry>.*?<title>(.*?)<\/title>.*?<link.*?href="(.*?)".*?<\/entry>|<item>.*?<title>(.*?)<\/title>.*?<link>(.*?)<\/link>.*?<\/item>/gs
    const matches = [...responseText.matchAll(videoRegex)]
    
    console.log('Found potential videos in RSS feed:', matches.length)
    
    const videos = matches.map(match => {
      try {
        const title = match[1] || match[3] || ''
        const link = match[2] || match[4] || ''
        
        // Extract video ID from URL
        const videoIdMatch = link.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^"&?\/\s]{11})/)
        if (!videoIdMatch) {
          console.log('Skipping item - no video ID found:', title)
          return null
        }
        
        const videoId = videoIdMatch[1]
        const video: Video = {
          id: videoId,
          title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          source: 'rss',
          publishedAt: new Date().toISOString() // We'll use current time since we can't reliably parse dates
        }
        
        console.log('Successfully processed video:', video.title)
        return video
      } catch (error) {
        console.error('Error processing RSS item:', error)
        return null
      }
    }).filter((video): video is NonNullable<typeof video> => video !== null)

    console.log(`Successfully processed ${videos.length} videos from RSS feed:`, feedUrl)
    return videos
  } catch (error) {
    console.error('Error fetching RSS videos:', error)
    return []
  }
}

export async function fetchAllVideos(sources: { youtube?: string[], rss?: string[] } = {}): Promise<Video[]> {
  const videos: Video[] = []
  let youtubeQuotaExceeded = false
  let youtubeError: Error | null = null
  let rssError: Error | null = null
  
  console.log('Starting video fetch with sources:', sources)
  
  // Try YouTube API first
  if (sources.youtube?.length) {
    console.log('Attempting to fetch from YouTube API for channels:', sources.youtube)
    for (const channelId of sources.youtube) {
      try {
        console.log('Fetching videos for channel:', channelId)
        const youtubeVideos = await fetchYouTubeVideos(channelId)
        console.log(`Found ${youtubeVideos.length} videos from YouTube API for channel:`, channelId)
        videos.push(...youtubeVideos)
      } catch (error) {
        youtubeError = error instanceof Error ? error : new Error(String(error))
        console.error('YouTube API error for channel', channelId, ':', error)
        if (error instanceof Error && error.message.includes('quota')) {
          youtubeQuotaExceeded = true
          console.log('YouTube quota exceeded, will try RSS feeds')
          break // Stop trying more YouTube channels if quota is exceeded
        }
      }
    }
  }

  // Try RSS feeds if YouTube failed or returned no videos
  if (sources.rss?.length && (videos.length === 0 || youtubeQuotaExceeded)) {
    console.log('Attempting to fetch from RSS feeds:', sources.rss)
    let rssSuccessCount = 0
    
    for (const feedUrl of sources.rss) {
      try {
        const rssVideos = await fetchRSSVideos(feedUrl)
        if (rssVideos.length > 0) {
          videos.push(...rssVideos)
          rssSuccessCount++
          console.log(`Successfully fetched ${rssVideos.length} videos from RSS feed:`, feedUrl)
        }
      } catch (error) {
        rssError = error instanceof Error ? error : new Error(String(error))
        console.error(`Failed to fetch videos from RSS feed ${feedUrl}:`, error)
      }
    }
    
    console.log(`Successfully fetched from ${rssSuccessCount} RSS feeds`)
  }
  
  console.log(`Total videos found: ${videos.length}`)
  
  if (videos.length === 0) {
    const errorMessage = [
      'No videos found from any source.',
      youtubeQuotaExceeded ? 'YouTube API quota exceeded.' : youtubeError ? `YouTube error: ${youtubeError.message}` : 'No YouTube videos found.',
      rssError ? `RSS error: ${rssError.message}` : 'No RSS videos found.'
    ].filter(Boolean).join(' ')
    
    throw new Error(errorMessage)
  }
  
  const sortedVideos = videos.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
  
  console.log(`Returning ${sortedVideos.length} sorted videos`)
  return sortedVideos
}

// Example feed configuration
export const DEFAULT_SOURCES = {
  youtube: [
    'UC-PIytIH8C42pGSor6WW5KA',  // Channel 1
    'UC0MONMWgmyh2dSgfTZvdXhg',  // Channel 2
    'UC8-Th83bH_thdKZDJCrn88g',  // Channel 3
    'UC9zsNuzwsgW5nUMn38DvdDA',  // Channel 4
    'UCb4BNeMjPhnYQjzIeMgeXVA',  // Channel 5
    'UCftwRNsjfRo08xYE31tkiyw',  // Channel 6
    'UCIsbLox_y9dCIMLd8tdC6qg',  // Channel 7
    'UCJ0uqCI0Vqr2Rrt1HseGirg',  // Channel 8
    'UCjmpNd4fl6gc3O3zSJRSc0A',  // Channel 9
    'UCmSqlo5cLzZcAAvnoLMnYWw',  // Channel 10
    'UCMtFAi84ehTSYSE9XoHefig',  // Channel 11
    'UCnxGkOGNMqQEUMvroOWps6Q',  // Channel 12
    'UCp0hYYBW6IMayGgR-WeoCvQ',  // Channel 13
    'UCPRUgAl_MV9PajsrG_BmT9w',  // Channel 14
    'UCsEukrAd64fqA7FjwkmZ_Dw',  // Channel 15
    'UCX4sShAQ81050VuRrAzt68Q',  // Channel 16
    'UCzQ2sgHy7cQV7OQHVTX_U5g',  // Channel 17
    'UCZQEJ2jLs5zuuZQeQDPLaAQ'   // Channel 18
  ],
  rss: [
    'https://www.youtube.com/feeds/videos.xml?channel_id=UC-PIytIH8C42pGSor6WW5KA',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UC0MONMWgmyh2dSgfTZvdXhg',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UC8-Th83bH_thdKZDJCrn88g',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UC9zsNuzwsgW5nUMn38DvdDA',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCb4BNeMjPhnYQjzIeMgeXVA',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCftwRNsjfRo08xYE31tkiyw',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCIsbLox_y9dCIMLd8tdC6qg',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCJ0uqCI0Vqr2Rrt1HseGirg',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCjmpNd4fl6gc3O3zSJRSc0A',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCmSqlo5cLzZcAAvnoLMnYWw',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCMtFAi84ehTSYSE9XoHefig',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCnxGkOGNMqQEUMvroOWps6Q',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCp0hYYBW6IMayGgR-WeoCvQ',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCPRUgAl_MV9PajsrG_BmT9w',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCsEukrAd64fqA7FjwkmZ_Dw',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCX4sShAQ81050VuRrAzt68Q',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCzQ2sgHy7cQV7OQHVTX_U5g',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCZQEJ2jLs5zuuZQeQDPLaAQ'
  ]
} 