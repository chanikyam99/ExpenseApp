// app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 'next' param lets us redirect to a specific page after login
  const next = searchParams.get('next') ?? '/groups'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    // if (!error) {
    //   return NextResponse.redirect(`${origin}${next}`)
    // }
    if (!error) {
        const pendingNext = cookieStore.get('pending_next')?.value

        if (pendingNext) {
          cookieStore.delete('pending_next')

          return NextResponse.redirect(
            `${origin}${decodeURIComponent(pendingNext)}`
          )
        }

        return NextResponse.redirect(`${origin}${next}`)
      }
  }

  // If something went wrong, go back to login
  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}