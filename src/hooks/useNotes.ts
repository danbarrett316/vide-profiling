import { useState, useCallback } from 'react'
import { Note, ZapierPayload, sendToZapier } from '@/utils/zapier'
import { Video } from '@/utils/fetchVideos'

export const useNotes = (video: Video, mode: 'body' | 'linguistic' | 'full') => {
  const [notes, setNotes] = useState<Note[]>([])

  const addNote = useCallback((timestamp: number, text: string) => {
    const newNote: Note = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      text,
      mode
    }

    setNotes(prevNotes => {
      // Insert the new note in the correct position based on timestamp
      const updatedNotes = [...prevNotes, newNote].sort((a, b) => a.timestamp - b.timestamp)
      return updatedNotes
    })
  }, [mode])

  const deleteNote = useCallback((id: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id))
  }, [])

  const exportNotes = useCallback(async () => {
    if (!video?.id) {
      throw new Error('Invalid video data')
    }

    if (notes.length === 0) {
      throw new Error('No notes to export')
    }

    const payload: ZapierPayload = {
      videoTitle: video.title,
      videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
      mode,
      notes: notes.map(note => ({
        timestamp: note.timestamp,
        text: note.text
      }))
    }

    try {
      await sendToZapier(payload)
      return true
    } catch (error) {
      console.error('Failed to export notes:', error)
      return false
    }
  }, [video, notes, mode])

  const formatTimestamp = (timestamp: number) => {
    const minutes = Math.floor(timestamp / 60)
    const seconds = Math.floor(timestamp % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return {
    notes,
    addNote,
    deleteNote,
    exportNotes,
    formatTimestamp
  }
} 