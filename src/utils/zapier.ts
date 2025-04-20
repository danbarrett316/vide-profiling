import { Video } from './fetchVideos'

export interface Note {
  id: string
  timestamp: number
  text: string
  mode: 'body' | 'linguistic' | 'full'
}

export interface ZapierPayload {
  videoTitle: string
  videoUrl: string
  mode: string
  notes: Array<{
    timestamp: number
    text: string
  }>
}

export async function sendToZapier(payload: ZapierPayload): Promise<void> {
  console.log('Zapier util: Preparing to send payload:', {
    videoTitle: payload.videoTitle,
    videoUrl: payload.videoUrl,
    mode: payload.mode,
    noteCount: payload.notes.length
  })

  try {
    const response = await fetch('/api/zapier', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const responseData = await response.json()
    console.log('Zapier util: API response:', responseData)

    if (!response.ok) {
      throw new Error(responseData.error || `API responded with status: ${response.status}`)
    }

    if (!responseData.success) {
      throw new Error('API indicated failure in response')
    }

    console.log('Zapier util: Successfully sent data to API')
  } catch (error) {
    console.error('Zapier util: Failed to send data:', error)
    throw error
  }
} 