import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    return NextResponse.json({
      authenticated: !!user,
      user: user
        ? {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
          }
        : null,
      error: error?.message,
      timestamp: new Date().toISOString(),
    })
  } catch (err: unknown) {
    return NextResponse.json(
      {
        authenticated: false,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
