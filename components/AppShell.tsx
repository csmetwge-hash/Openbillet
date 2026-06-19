import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = [
  '/',
  '/legal',
  '/contact',
  '/pricing',
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
  '/auth/verify',
  '/auth/invite',
  '/robots.txt',
  '/sitemap.xml',
];

const API_ROUTES_PUBLIC = [
  '/api/v1/integrations/webhook',
  '/api/v1/admin/invite-lookup',
  '/api/v1/admin/create-worker',
  '/api/v1/admin/bulk-import',
  '/api/v1/notifications/evaluate',
  '/api/v1/push',
  '/api/contact',
  '/api/stripe/webhook',
  '/api/stripe/checkout',
];

// Routes only schedulers/managers/admins/rta_analysts can access
const SCHEDULER_ROUTES = ['/dashboard', '/schedule'];

// Routes only workers can access
const WORKER_ROUTES = ['/worker'];

// Roles that belong to the "staff" side (non-worker)
const STAFF_ROLES = ['scheduler', 'manager', 'admin', 'rta_analyst'];

function getRole(user: any): string {
  return user?.app_metadata?.role ?? user?.user_metadata?.role ?? 'worker';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (API_ROUTES_PUBLIC.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );

  // Not logged in — redirect to login
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in + hitting an auth page — redirect to correct home
  const ALWAYS_ACCESSIBLE = ['/', '/pricing', '/contact', '/legal'];
  const isAlwaysAccessible = ALWAYS_ACCESSIBLE.some(r => pathname === r || pathname.startsWith(r + '/'));
  if (user && isPublicRoute && pathname !== '/auth/callback' && !isAlwaysAccessible) {
    const role = getRole(user);
    const home = role === 'worker' ? '/worker' : '/dashboard';
    return NextResponse.redirect(new URL(home, request.url));
  }

  // ── RBAC ────────────────────────────────────────────────
  if (user) {
    const role = getRole(user);
    const isWorker = role === 'worker';
    const isStaff  = STAFF_ROLES.includes(role);

    // Worker trying to access scheduler/staff routes
    if (isWorker && SCHEDULER_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
      return NextResponse.redirect(new URL('/worker', request.url));
    }

    // Staff trying to access worker routes
    if (isStaff && WORKER_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // rta_analyst blocked from /admin
    if (role === 'rta_analyst' && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};