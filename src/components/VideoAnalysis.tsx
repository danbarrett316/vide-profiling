'use client'

import { useState, useEffect } from 'react'
import { VideoPlayer } from '@/components/VideoPlayer'
import { NotesPanel } from '@/components/NotesPanel'
import { Video, fetchVideoFromUrl, fetchSpecificVideos, DEFAULT_VIDEOS } from '@/utils/fetchVideos'

type Mode = 'body' | 'linguistic' | 'full'

export default function VideoAnalysis() {
  const [mode, setMode] = useState<Mode>('full')
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manualUrl, setManualUrl] = useState('')

  useEffect(() => {
    const loadVideos = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const fetchedVideos = await fetchSpecificVideos(DEFAULT_VIDEOS)
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

  const handleManualUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualUrl.trim()) return

    try {
      setIsLoading(true)
      setError(null)
      const video = await fetchVideoFromUrl(manualUrl)
      setSelectedVideo(video)
      setManualUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid YouTube URL')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error loading videos</p>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <form onSubmit={handleManualUrlSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="Enter YouTube URL"
              className="px-3 py-2 border rounded-lg w-64"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load Video'}
            </button>
          </form>

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
    </>
  )
} 