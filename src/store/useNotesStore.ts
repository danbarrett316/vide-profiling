import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Note {
  id: string
  timestamp: number
  text: string
  videoId: string
  mode: 'body' | 'linguistic' | 'full'
}

interface NotesStore {
  notes: Note[]
  addNote: (note: Omit<Note, 'id'>) => void
  deleteNote: (id: string) => void
  clearNotes: () => void
}

export const useNotesStore = create<NotesStore>()(
  persist(
    (set) => ({
      notes: [],
      addNote: (note) =>
        set((state) => ({
          notes: [...state.notes, { ...note, id: Math.random().toString(36).substr(2, 9) }],
        })),
      deleteNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
        })),
      clearNotes: () => set({ notes: [] }),
    }),
    {
      name: 'vibe-profiling-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
) 