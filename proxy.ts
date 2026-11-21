import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { REGION_COOKIE, detectCountryFromHeaders } from '@/lib/core/region'
import { isClerkAdminFromClaims, getExplicitClerkRole } from '@/lib/core/admin-rbac'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', 
  '/sign-up(.*)', 
  '/get-started(.*)',
  '/', 
  '/pricing', 
  '/tutorial', 
  '/blog(.*)',
  '/Assets/(.*)',
  '/assets/(.*)',
  '/api/webhooks/clerk(.*)',
  '/api/payments/uddoktapay/webhook(.*)',
  '/api/payments/uddoktapay/cancel(.*)', 
  '/api/webhooks/meta(.*)',
  '/api/webhooks/n8n-facebook(.*)',  // n8n Facebook relay (Meta sends here)
  '/api/webhooks/whatsapp(.*)',      // Meta WhatsApp webhook verification + relay
  '/api/webhooks/n8n-whatsapp(.*)',  // n8n WhatsApp runtime status callbacks
  '/api/webhooks/instagram(.*)',      // Meta Instagram webhook verification + relay
  '/api/integrations/instagram/oauth/callback(.*)', // Instagram Login OAuth return (no Clerk on redirect)
  '/api/webhooks/n8n-instagram(.*)',  // n8n Instagram runtime status callbacks
  '/api/webhooks/n8n-callback(.*)',  // n8n calls this after sending reply
  '/api/internal/(.*)',              // n8n → platform server-to-server (guarded by x-n8n-secret)
  // n8n's `Automation Gate` node calls this, so there is never a Clerk session
  // on the request. Leaving it out would hand the call to `auth.protect()`,
  // which redirects to sign-in — and the gate would never reach the engine.
  // Its security is the route's own `x-chatsfly-internal` shared-secret check
  // (timingSafeEqual), same as `/api/internal/*`.
  '/api/automations/evaluate(.*)',
  // Scheduled cron routes authenticate themselves with CRON_SECRET.
  '/api/cron/process-downgrades(.*)',
  '/api/cron/reset-credits(.*)',
  '/api/cron/usage-alerts(.*)',
  '/api/cron/webhook-cleanup(.*)',
  '/api/cron/run-automations(.*)',
  '/api/cron/process-conversation-learning(.*)',
  // The website widget. Both halves are fetched from a **merchant's own site**,
  // where no Clerk session can exist: the shopper reading that page has never
  // heard of ChatsFly. Handing either call to `auth.protect()` would send it to
  // sign-in — the embed tag would receive an HTML login page instead of
  // JavaScript, and every message would 401.
  //
  // Their security is the widget key in the path — the integration's
  // `integrationId`, a cuid — and it is read-only by construction: it resolves
  // one agent's display config and spends that agent owner's credits, while
  // every route that can *change* an integration stays behind Clerk and an
  // ownership check. See `lib/domain/widget-key.ts`.
  //
  // (`/widget/<key>.js` is also skipped by the matcher below, since `.js` is
  //  treated as a static asset. Both are listed so the route survives a change
  //  to that pattern.)
  '/widget/(.*)',
  '/api/widget/(.*)',
  '/dashboard/payment/success(.*)',  // Payment success page is public
  '/payment/success(.*)',            // Clean URL payment success page
  '/api/contact(.*)',                // Public contact / demo form submissions
  '/api/test(.*)'
])

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') ?? ''

  // ----------------------------------------------------------------
  // Subdomain routing
  // chatsfly.com        → public landing page
  // app.chatsfly.com    → merchant dashboard (clean URLs: /overview, /inbox, etc.)
  // cfhq.chatsfly.com   → admin panel (root / or /admin)
  // admin.chatsfly.com  → 301 redirects to cfhq.chatsfly.com
  // dev.chatsfly.com    → all-in-one staging/dev environment (/dashboard, /admin)
  // ----------------------------------------------------------------
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'chatsfly.com'
  const isDevDomain = host === `dev.${appDomain}` || host === `www.dev.${appDomain}` || host.startsWith('dev.')
  const isMainDomain = (host === appDomain || host === `www.${appDomain}`) && !isDevDomain
  const isAppSubdomain = (host === `app.${appDomain}` || host.startsWith('app.')) && !isDevDomain
  const isCfhqSubdomain = (host === `cfhq.${appDomain}` || host.startsWith('cfhq.')) && !isDevDomain
  const isLegacyAdminSubdomain = (host === `admin.${appDomain}` || host.startsWith('admin.')) && !isDevDomain
  const isAdminSubdomain = isCfhqSubdomain || isLegacyAdminSubdomain

  // Legacy admin.chatsfly.com → permanent redirect to cfhq.chatsfly.com
  if (isLegacyAdminSubdomain) {
    return NextResponse.redirect(new URL(pathname + request.nextUrl.search, `https://cfhq.${appDomain}`), 301)
  }

  // On cfhq (admin) subdomain:
  // Root path → /admin
  if (isCfhqSubdomain && (pathname === '/' || pathname === '')) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }
  // Non-admin, non-auth, non-api routes on cfhq → redirect back to main domain
  if (
    isCfhqSubdomain &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/api/admin') &&
    !pathname.startsWith('/sign-in') &&
    !pathname.startsWith('/sign-up') &&
    !pathname.startsWith('/api/')
  ) {
    return NextResponse.redirect(new URL('/', `https://${appDomain}`))
  }

  // On app subdomain:
  // Root path → /overview (clean URL)
  if (isAppSubdomain && (pathname === '/' || pathname === '')) {
    return NextResponse.redirect(new URL('/overview', request.url))
  }
  // Public marketing pages on app subdomain → send to main domain
  if (
    isAppSubdomain &&
    (pathname === '/pricing' || pathname === '/tutorial' || pathname.startsWith('/blog') || pathname === '/get-started')
  ) {
    return NextResponse.redirect(new URL(pathname + request.nextUrl.search, `https://${appDomain}`))
  }
  // Any request with explicit /dashboard prefix on app subdomain → strip /dashboard for clean URL
  if (isAppSubdomain && pathname.startsWith('/dashboard')) {
    const cleanPath = pathname.replace(/^\/dashboard/, '') || '/overview'
    return NextResponse.redirect(new URL(cleanPath + request.nextUrl.search, request.url))
  }

  // On main domain:
  // /dashboard → app subdomain (clean URL)
  if (isMainDomain && pathname.startsWith('/dashboard')) {
    const cleanPath = pathname.replace(/^\/dashboard/, '') || '/overview'
    return NextResponse.redirect(new URL(cleanPath + request.nextUrl.search, `https://app.${appDomain}`))
  }
  // /admin → cfhq subdomain
  if (isMainDomain && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL(pathname + request.nextUrl.search, `https://cfhq.${appDomain}`))
  }

  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  // Block non-admins when Clerk metadata explicitly denies admin access.
  // Prisma User.role is verified server-side in admin layout via requireAdmin().
  if (isAdminRoute(request) || isCfhqSubdomain) {
    const authState = await auth()
    const claims = authState.sessionClaims as Record<string, unknown> | null | undefined

    if (claims && !isClerkAdminFromClaims(claims)) {
      const explicitRole = getExplicitClerkRole(claims)

      if (explicitRole && explicitRole !== 'admin' && explicitRole !== 'super_admin') {
        const redirectPath = isAppSubdomain ? '/overview' : '/dashboard/overview'
        return NextResponse.redirect(new URL(`${redirectPath}?error=admin_unauthorized`, request.url))
      }
    }
  }

  // --- Region detection ---
  const existingRegion = request.cookies.get(REGION_COOKIE)?.value

  // Attach region cookie if not present
  const applyRegionCookie = (res: NextResponse) => {
    if (!existingRegion) {
      const country = detectCountryFromHeaders(request.headers)
      // Bangladesh → bd, everything else → global
      // On local dev (no geo headers) → default to bd
      const region = country === null || country === 'BD' ? 'bd' : 'global'
      res.cookies.set(REGION_COOKIE, region, {
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 90,
        sameSite: 'lax',
        path: '/',
      })
    }
    return res
  }

  // Rewrite clean dashboard routes on app subdomain
  // e.g. app.chatsfly.com/overview → internally serves /dashboard/overview
  if (
    isAppSubdomain &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/sign-in') &&
    !pathname.startsWith('/sign-up') &&
    !pathname.startsWith('/widget') &&
    !pathname.startsWith('/assets') &&
    !pathname.startsWith('/Assets')
  ) {
    const rewriteUrl = new URL(`/dashboard${pathname}`, request.url)
    rewriteUrl.search = request.nextUrl.search
    return applyRegionCookie(NextResponse.rewrite(rewriteUrl))
  }

  if (!existingRegion) {
    return applyRegionCookie(NextResponse.next())
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|mov)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
