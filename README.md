# Vibe Profiling App

A Next.js application for analyzing and taking notes on video content with support for different analysis modes (body language, linguistic, and full analysis).

## Features

- Video playback with timestamp support
- Multiple analysis modes (body language, linguistic, full)
- Note-taking with automatic timestamps
- Practice session tracking
- Session export to Zapier
- Local storage persistence using IndexedDB
- Responsive design with Tailwind CSS

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
NEXT_PUBLIC_ZAPIER_HOOK_URL=your_zapier_webhook_url_here
YOUTUBE_API_KEY=your_youtube_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Practice Session
- Navigate to `/practice`
- Select an analysis mode
- Start a session
- Take timestamped notes
- Export session data when finished

### Freeform Analysis
- Navigate to `/freeform`
- Select an analysis mode
- Take notes freely without session tracking

## Technologies

- Next.js 13+ with App Router
- TypeScript
- Tailwind CSS
- Zustand for state management
- IndexedDB for persistence
- YouTube Data API
- Zapier integration 