import React, { useRef, useState, useEffect } from 'react'
import { Video } from '@/utils/fetchVideos'

interface VideoPlayerProps {
  video: Video
  mode: 'body' | 'linguistic' | 'full'
  onTimestamp: (time: number) => void
}

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, mode, onTimestamp }) => {
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressInterval = useRef<NodeJS.Timeout>()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isAPIReady, setIsAPIReady] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Load YouTube API script only once
  useEffect(() => {
    if (window.YT) {
      setIsAPIReady(true)
      return
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

    window.onYouTubeIframeAPIReady = () => {
      setIsAPIReady(true)
    }
  }, [])

  // Initialize or update player when API is ready and video changes
  useEffect(() => {
    if (!isAPIReady || !containerRef.current) return

    if (playerRef.current) {
      // If player exists, just load new video
      playerRef.current.loadVideoById(video.id)
      return
    }

    // Create new player instance
    playerRef.current = new window.YT.Player(containerRef.current, {
      height: '100%',
      width: '100%',
      videoId: video.id,
      playerVars: {
        autoplay: 0,
        modestbranding: 1,
        rel: 0,
        controls: 0,
        showinfo: 0,
        fs: 0
      },
      events: {
        onReady: () => {
          // Initial mute state based on mode
          if (mode === 'body') {
            playerRef.current.mute()
            setIsMuted(true)
          }
          setDuration(playerRef.current.getDuration())
        },
        onStateChange: (event: any) => {
          const isVideoPlaying = event.data === window.YT.PlayerState.PLAYING
          setIsPlaying(isVideoPlaying)
          
          // Update duration when it becomes available
          if (isVideoPlaying && !duration) {
            setDuration(playerRef.current.getDuration())
          }
        },
        onError: (event: any) => {
          console.error('YouTube Player Error:', event.data)
        }
      }
    })

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [isAPIReady, video.id])

  // Handle progress updates
  useEffect(() => {
    if (!playerRef.current) return

    if (isPlaying && !isDragging) {
      progressInterval.current = setInterval(() => {
        const time = playerRef.current?.getCurrentTime() || 0
        setCurrentTime(time)
      }, 1000)
    } else {
      clearInterval(progressInterval.current)
    }

    return () => {
      clearInterval(progressInterval.current)
    }
  }, [isPlaying, isDragging])

  // Handle mode changes
  useEffect(() => {
    if (!playerRef.current) return

    if (mode === 'body') {
      playerRef.current.mute()
      setIsMuted(true)
    } else if (mode === 'linguistic') {
      playerRef.current.unMute()
      setIsMuted(false)
    } else {
      playerRef.current.unMute()
      setIsMuted(false)
    }
  }, [mode])

  const handlePlayPause = () => {
    if (!playerRef.current) return
    
    if (isPlaying) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }

  const handleMuteToggle = () => {
    if (!playerRef.current) return

    if (mode === 'body') {
      // Don't allow unmuting in body language mode
      return
    }

    if (isMuted) {
      playerRef.current.unMute()
      setIsMuted(false)
    } else {
      playerRef.current.mute()
      setIsMuted(true)
    }
  }

  const handleTimestamp = () => {
    if (!playerRef.current) return
    
    const currentTime = playerRef.current.getCurrentTime()
    playerRef.current.pauseVideo()
    onTimestamp(currentTime)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (!isDragging) {
      playerRef.current?.seekTo(time, true)
    }
  }

  const handleSeekStart = () => {
    setIsDragging(true)
  }

  const handleSeekEnd = () => {
    setIsDragging(false)
    playerRef.current?.seekTo(currentTime, true)
  }

  return (
    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
      <div className="absolute top-0 left-0 w-full h-full bg-black rounded-lg overflow-hidden">
        <div className="relative w-full h-full">
          <div ref={containerRef} className="w-full h-full" />
          
          {/* Black overlay for linguistic mode */}
          {mode === 'linguistic' && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <p className="text-gray-400 text-lg">
                🔊 Audio Only Mode
              </p>
            </div>
          )}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent">
          {/* Progress bar */}
          <div className="px-4 py-2">
            <div className="flex items-center space-x-2 text-white text-sm">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                onMouseDown={handleSeekStart}
                onMouseUp={handleSeekEnd}
                onTouchStart={handleSeekStart}
                onTouchEnd={handleSeekEnd}
                className="flex-grow h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePlayPause}
                className="text-white hover:text-blue-400 transition"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              <button
                onClick={handleMuteToggle}
                className={`text-white hover:text-blue-400 transition ${
                  mode === 'body' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={mode === 'body'}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <div className="text-white font-medium">
                Mode: <span className="text-blue-400">{mode}</span>
              </div>
            </div>
            
            <button
              onClick={handleTimestamp}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Timestamp
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 