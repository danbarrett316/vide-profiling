import { NextResponse } from 'next/server'
import { ZapierPayload } from '@/utils/zapier'

// Enable CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: Request) {
  console.log('API route received request')
  
  const webhookUrl = process.env.ZAPIER_HOOK_URL

  if (!webhookUrl) {
    console.error('API route: Zapier webhook URL not configured')
    return NextResponse.json(
      { error: 'Zapier webhook URL not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    console.log('API route: Received payload:', {
      videoTitle: body.videoTitle,
      videoUrl: body.videoUrl,
      noteCount: body.notes?.length
    })

    console.log('API route: Sending to Zapier webhook:', webhookUrl)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const responseText = await response.text()
    console.log('API route: Raw Zapier response:', responseText)

    if (!response.ok) {
      console.error('API route: Zapier error response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      })
      return NextResponse.json(
        { error: `Zapier responded with status: ${response.status}` },
        { status: response.status }
      )
    }

    console.log('API route: Successfully sent to Zapier')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API route: Error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
} 