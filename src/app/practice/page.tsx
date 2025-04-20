'use client'

import { useState, useEffect } from 'react'
import { VideoPlayer } from '@/components/VideoPlayer'
import { NotesPanel } from '@/components/NotesPanel'
import { fetchAllVideos, DEFAULT_SOURCES, Video } from '@/utils/fetchVideos'

type Mode = 'body' | 'linguistic' | 'full'

export default function PracticePage() {
  const [mode, setMode] = useState<Mode>('full')
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadVideos = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const fetchedVideos = await fetchAllVideos(DEFAULT_SOURCES)
        setVideos(fetchedVideos)
        if (fetchedVideos.length > 0) {
          setSelectedVideo(fetchedVideos[0])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load videos')
        console.error('Error loading videos:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadVideos()
  }, [])

  const handleTimestamp = (time: number) => {
    const event = new CustomEvent('timestamp', { detail: time })
    window.dispatchEvent(event)
  }

  // Client-side only content wrapper
  if (typeof window === 'undefined') {
    return null // Return null on server-side
  }

  if (isLoading) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error loading videos</p>
            <p>{error}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="full">Full Analysis</option>
              <option value="body">Body Language</option>
              <option value="linguistic">Linguistic</option>
            </select>

            <select
              value={selectedVideo?.id || ''}
              onChange={(e) => {
                const video = videos.find(v => v.id === e.target.value)
                setSelectedVideo(video || null)
              }}
              className="px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {videos.map((video) => (
                <option key={video.id} value={video.id}>
                  {video.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedVideo ? (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8">
              <VideoPlayer
                video={selectedVideo}
                mode={mode}
                onTimestamp={handleTimestamp}
              />
            </div>
            <div className="col-span-4 h-[calc(100vh-12rem)] bg-white rounded-lg shadow">
              <NotesPanel
                video={selectedVideo}
                mode={mode}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-700">
              No videos available
            </h2>
            <p className="mt-2 text-gray-500">
              Please check your API configuration and try again
            </p>
          </div>
        )}
      </div>
    </main>
  )
} 