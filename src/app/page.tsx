'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-8">
          Vibe Profiling
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Link
            href="/practice"
            className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-4">Practice Session</h2>
            <p className="text-gray-600">
              Start a structured practice session with timestamps and export capabilities.
              Perfect for focused analysis and improvement.
            </p>
          </Link>
          
          <Link
            href="/freeform"
            className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-4">Freeform Analysis</h2>
            <p className="text-gray-600">
              Analyze videos freely without session tracking.
              Ideal for casual study and quick notes.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
} 