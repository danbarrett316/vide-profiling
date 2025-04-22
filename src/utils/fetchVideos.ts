export interface Video {
  id: string
  title: string
  url: string
  thumbnail: string
  source: 'youtube' | 'rss' | 'manual' | 'specific'
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

export async function fetchVideoFromUrl(url: string): Promise<Video> {
  // Extract video ID from URL
  const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^"&?\/\s]{11})/)
  if (!videoIdMatch) {
    throw new Error('Invalid YouTube URL')
  }

  const videoId = videoIdMatch[1]
  
  // Create a video object with the ID
  const video: Video = {
    id: videoId,
    title: 'Loading...', // Title will be updated when the video player loads
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    source: 'manual',
    publishedAt: new Date().toISOString()
  }

  return video
}

export const DEFAULT_VIDEOS = [
  // Buster Murdaugh Interview
  'X2sBkbpESOI',
  // Alec Baldwin Interview
  'qpl0Ol-N-PU',
  // Nikolas Cruz Interrogation
  'oNtaFVAS69g',
  // Dylann Roof Interrogation
  '5DDqghxai-M',
  // Chris Watts Interrogation
  '3VVBPdDMn6M',
  // Stephanie Lazarus Interrogation
  'LFOZPHVAnJw',
  // Daniel Holtzclaw Interrogation
  'yrFY56FZOxI',
  // Russell Williams Interrogation
  'bsLbDzkIy3A',
  // Gypsy Rose Blanchard Interrogation
  'r6l-nKvYBgc',
  // Nicholas Godejohn Interrogation
  'ZV0HC0k3mtI',
  // Shayna Hubers Interrogation
  'EuN1Tz2i1pA',
  // Jennifer Pan Interrogation
  '1ZDMWtsv_Gc',
  // Al-Mutahan McLean Interrogation
  '2vh-RaR3kW8',
  // Hannah Payne Interview
  'DfXSPW_bjuQ',
  // Robert Fratta Interrogation
  'qf7zuIrnNio',
  // Lonna Lauramore Barton Interview
  '8ZpM8SfD7X0',
  // Seth Welch Interrogation
  'zmX2nM7M4hY',
  // Tatiana Fusari Interrogation
  'ef9bac6f-X2',
  // Brooks Houck Interview
  '7inqkmgwFbc',
  // Basil Borutski Interrogation
  'ekJVbFONywQ',
  // Susan Monica Interrogation
  'qHvQ5f6NsNc',
  // Michael Dunn Interrogation
  'WvGLvYus7oQ',
  // Alek Minassian Interrogation
  'VyHgtSy41VM',
  // William "Roddy" Bryan Interview
  'O4HUo6bZQM8',
  // Kelly Cochran Interrogation
  'KqvZkz6v8Pc',
  // Markeith Loyd Interrogation
  'rfa8xTRqSbw',
  // Chandler Halderson Interrogation
  '0DpPvKaVgr8',
  // Jennifer Nibbe Interrogation
  'zUzJ3QeCpDY',
  // Nichol "Nikki" Kessinger Interview
  'YTKaCx7Eudw',
  // Jeffrey Pelo Interrogation
  'zQCvkflYT60',
  // Officer Sean Williams Interrogation
  '5wseuW2-zxc',
  // Trevon Wiley Interrogation
  'zSIpaJkSItM',
  // Alissa Bustamante Interrogation
  'q3WBrgX9F9E',
  // Israel Keyes Interrogation
  'Uthlv-pMwh4',
  // Michelle Troconis Interrogation
  'Vp0SAok0BXU',
  // Terri-Lynne McClintic Interrogation
  'qHvQ5f6NsNc',
  // Michael Rafferty Interrogation
  'E1n8gS1JH_g',
  // Alex Murdaugh Second Interview
  'V9o0AuS6ePY',
  // Ezra McCandless Interrogation
  'QgW00KDZ7Z0',
  // Brooks Houck Interrogation
  '7inqkmgwFbc',
  // Patrick Frazee Interrogation
  'Y4rcCD3t8DI',
  // Krystal Lee Kenney Interview
  'Qml6n-gzI_c',
  // Brendan Dassey Interrogation
  'usg0rz0DIgg',
  // Ethan Crumbley Interview
  'ny0RKhMliV0',
  // Gypsy Rose & Nick Godejohn Jailhouse Call
  'JyuMvxzjnKc',
  // Officer Betty Jo Shelby Interview
  'G4Ks0KIeOBw',
  // Jodi Arias Interrogation
  '2yaLYdjXwSM',
  // Susan Smith Interview
  '1KI8KqSsWis',
  // Andrea Yates Interview
  'cIM529cCyrs',
  // Ted Bundy Jailhouse Interview
  'Y8Lw3oRKznY'
]

export async function fetchSpecificVideos(videoIds: string[]): Promise<Video[]> {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API key is not configured')
    throw new Error('YouTube API key is not configured')
  }

  try {
    // Batch the video IDs into groups of 50 (YouTube API limit)
    const batches = []
    for (let i = 0; i < videoIds.length; i += 50) {
      batches.push(videoIds.slice(i, i + 50))
    }

    const videos: Video[] = []
    
    for (const batch of batches) {
      const apiUrl = `${YOUTUBE_API_URL}/videos?key=${YOUTUBE_API_KEY}&id=${batch.join(',')}&part=snippet`
      console.log('Fetching video details from YouTube API')
      
      const response = await fetch(apiUrl)
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.items || data.items.length === 0) {
        console.log('No video details found')
        continue
      }

      const batchVideos = data.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnail: item.snippet.thumbnails.medium.url,
        source: 'specific' as const,
        publishedAt: item.snippet.publishedAt
      }))

      videos.push(...batchVideos)
    }

    // For any videos that failed to fetch, create a basic video object
    const fetchedIds = new Set(videos.map(v => v.id))
    for (const videoId of videoIds) {
      if (!fetchedIds.has(videoId)) {
        videos.push({
          id: videoId,
          title: 'Loading...',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          source: 'specific',
          publishedAt: new Date().toISOString()
        })
      }
    }

    return videos
  } catch (error) {
    console.error('Error fetching specific videos:', error)
    // If API fails, return basic video objects
    return videoIds.map(videoId => ({
      id: videoId,
      title: 'Loading...',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      source: 'specific',
      publishedAt: new Date().toISOString()
    }))
  }
}

// Example feed configuration
export const DEFAULT_SOURCES = {
  youtube: [], // We're not using channel IDs anymore
  rss: [
    // Law&Crime Network (main channel)
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCz8K1occVvDTYDfFo7N5EZw',
    // Law&Crime Network - Investigates
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCo5E9pEhK_9kWG7-5HHcyRg',
    // Real World Police
    'https://www.youtube.com/feeds/videos.xml?channel_id=UChaEeYV0iibwFqrmFYTweVA',
    // Pink Dino Media
    'https://www.youtube.com/feeds/videos.xml?channel_id=UC3ZLQFf-8PZigpofBfSkBpw',
    // Couch Detectives
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCf-sJGMGO9EGeC39afwB2UA',
    // BlueDot Crime Clips
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCLrH0PU-bK34PR4c5OTFGlQ',
    // TruRed Crime Vault
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCfdXAXfrXJ4x_oYPPa1Sh_w',
    // The Mob Reporter
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCE4REwQ6qEyxvaZyvM0SWew',
    // Ol' Boy
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCs30KnhFkbHBNZ0TNjv4Fqw',
    // CBC News: The Fifth Estate
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCd3S4nEh2rXray21OrSTYGw',
    // KHOU 11 News (Houston)
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCx8vbgWs666cAS7wsKos5sA',
    // WPLG Local 10 (Miami)
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCgVfwh6MxlvgVOGFoLb1h7w',
    // Court TV
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCdC8jgDebnunL8MK_FBK1JA',
    // FOX 17 WXMI (West Michigan)
    'https://www.youtube.com/feeds/videos.xml?channel_id=UC-qgFkQxM28KjWJ8QK8p-mQ',
    // WFAA (Dallas/Fort Worth)
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCwf9TcLyS5KDoLRLjke41Hg',
    // ABC15 Arizona
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCjRd3nsR4Np_Z3GX3q4meEw',
    // KGET - 17 News (Bakersfield)
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCMIqRmoxywsbiKpT2EVRZEg',
    // Law&Crime Network - Trials
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCXCLaaClAWQiTkl3pw9ZdCg',
    // Just Interrogations
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCZNE8aI-HYPId_Nasj5lCeg',
    // Crime Circus
    'https://www.youtube.com/feeds/videos.xml?channel_id=UC-8RQaIR5oZDFy8aZbw3mYw'
  ]
} 