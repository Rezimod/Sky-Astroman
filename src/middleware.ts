import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip if Supabase env vars are not configured (prevents crash on cold start)
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    // Required: refresh the session on every request
    const { data: { user } } = await supabase.auth.getUser()

    // ── Admin route protection ──
    if (pathname.startsWith('/admin')) {
      if (!user) return NextResponse.redirect(new URL('/login', request.url))
      if (user.app_metadata?.is_admin !== true) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      return supabaseResponse
    }

    // ── Redirect logged-in users away from auth pages ──
    if ((pathname === '/login' || pathname === '/register') && user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // ── Protect app pages ──
    const protectedPrefixes = ['/dashboard', '/missions', '/leaderboard', '/profile', '/sky-tools', '/teams']
    if (protectedPrefixes.some(p => pathname.startsWith(p)) && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

  } catch {
    // Never crash the middleware — let the request through
    return NextResponse.next({ request })
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
