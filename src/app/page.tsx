import { Suspense } from 'react'
import VideoAnalysis from '@/components/VideoAnalysis'

export default function HomePage() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        }>
          <VideoAnalysis />
        </Suspense>
      </div>
    </main>
  )
} 