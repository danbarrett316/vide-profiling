import React, { useState, useRef, useEffect } from 'react'
import { Video } from '@/utils/fetchVideos'
import { useNotes } from '@/hooks/useNotes'

interface NotesPanelProps {
  video: Video
  mode: 'body' | 'linguistic' | 'full'
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ video, mode }) => {
  const [noteInput, setNoteInput] = useState('')
  const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const {
    notes,
    addNote,
    deleteNote,
    exportNotes,
    formatTimestamp
  } = useNotes(video, mode)

  useEffect(() => {
    const handleTimestampEvent = (event: CustomEvent<number>) => {
      setCurrentTimestamp(event.detail)
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }

    window.addEventListener('timestamp', handleTimestampEvent as EventListener)
    return () => {
      window.removeEventListener('timestamp', handleTimestampEvent as EventListener)
    }
  }, [])

  const handleAddNote = () => {
    if (noteInput.trim() && currentTimestamp !== null) {
      addNote(currentTimestamp, noteInput.trim())
      setNoteInput('')
      setCurrentTimestamp(null)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddNote()
    }
  }

  const handleExport = async () => {
    if (notes.length === 0) {
      alert('No notes to export!')
      return
    }

    try {
      setIsExporting(true)
      const success = await exportNotes()
      if (success) {
        alert('Notes exported successfully to Zapier!')
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export notes. Please check your Zapier webhook configuration.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-2 flex justify-between items-center">
          <span>Notes ({notes.length})</span>
          <button
            onClick={handleExport}
            disabled={isExporting || notes.length === 0}
            className={`px-3 py-1 text-sm rounded transition-colors flex items-center space-x-2 ${
              isExporting || notes.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isExporting ? (
              <>
                <span className="animate-spin">↻</span>
                <span>Exporting...</span>
              </>
            ) : (
              'Export Notes'
            )}
          </button>
        </h2>
        <div className="flex space-x-2">
          <textarea
            ref={textareaRef}
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentTimestamp ? `Add note at ${formatTimestamp(currentTimestamp)}...` : 'Click timestamp button to add a note...'}
            className="flex-grow p-2 border rounded resize-none h-20"
            disabled={currentTimestamp === null}
          />
          <button
            onClick={handleAddNote}
            disabled={!noteInput.trim() || currentTimestamp === null}
            className={`px-4 py-2 rounded transition ${
              noteInput.trim() && currentTimestamp !== null
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Add
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {notes.map((note) => (
          <div
            key={note.id}
            className={`p-4 rounded-lg shadow ${
              note.mode === 'body'
                ? 'bg-purple-50 border-l-4 border-purple-500'
                : note.mode === 'linguistic'
                ? 'bg-blue-50 border-l-4 border-blue-500'
                : 'bg-gray-50 border-l-4 border-gray-500'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-mono bg-black/10 px-2 py-1 rounded">
                {formatTimestamp(note.timestamp)}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium px-2 py-1 rounded bg-black/5">
                  {note.mode}
                </span>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="text-red-500 hover:text-red-600 transition"
                >
                  ✕
                </button>
              </div>
            </div>
            <p className="whitespace-pre-wrap">{note.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
} 