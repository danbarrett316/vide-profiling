'use client'

import { useState } from 'react'
import { VideoPlayer } from '@/components/VideoPlayer'
import { NotesPanel } from '@/components/NotesPanel'
import { fetchAllVideos, DEFAULT_SOURCES, Video } from '@/utils/fetchVideos'

export default function FreeformPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [mode, setMode] = useState<'body' | 'linguistic' | 'full'>('full')

  const handleTimestamp = (time: number) => {
    // NotesPanel will handle the actual note creation
    console.log('Timestamp:', time)
  }

  const loadVideos = async () => {
    const fetchedVideos = await fetchAllVideos(DEFAULT_SOURCES)
    setVideos(fetchedVideos)
    if (fetchedVideos.length > 0) {
      setSelectedVideo(fetchedVideos[0])
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Freeform Analysis</h1>
        
        <div className="flex items-center space-x-4">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="body">Body Language</option>
            <option value="linguistic">Linguistic</option>
            <option value="full">Full Analysis</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {selectedVideo && (
            <VideoPlayer
              video={selectedVideo}
              mode={mode}
              onTimestamp={handleTimestamp}
            />
          )}
        </div>
        
        <div className="col-span-1">
          {selectedVideo && (
            <NotesPanel
              videoId={selectedVideo.id}
              mode={mode}
            />
          )}
        </div>
      </div>
    </div>
  )
} 