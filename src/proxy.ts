import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { findRedirect } from '@/lib/redirects';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');
  const isLoginPage = pathname === '/admin/login';
  const isPublicAuthApi =
    pathname === '/api/admin/auth/login' || pathname === '/api/admin/auth/seed';

  if (isAdminPage || isAdminApi) {
    if (isLoginPage || isPublicAuthApi) {
      return NextResponse.next();
    }

    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // Block direct access to visitor uploads (resumes, documents) — admin API only
  if (
    pathname.startsWith('/assets/uploads/resumes') ||
    pathname.startsWith('/assets/uploads/documents') ||
    pathname.startsWith('/uploads/resumes')
  ) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // CMS redirects for public HTML routes (skip assets/API)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // Legacy static HTML files → Next App Router routes
  const LEGACY_HTML: Record<string, string> = {
    '/index.html': '/',
    '/contact.html': '/contact',
    '/careers.html': '/careers',
    '/certifications.html': '/certifications',
    '/industries.html': '/#industries',
  };
  if (LEGACY_HTML[pathname]) {
    return NextResponse.redirect(new URL(LEGACY_HTML[pathname], request.url), 301);
  }

  try {
    const hit = await findRedirect(pathname);
    if (hit) {
      const target = hit.to_path.startsWith('http')
        ? hit.to_path
        : new URL(hit.to_path, request.url).toString();
      return NextResponse.redirect(target, hit.status_code as 301 | 302 | 307 | 308);
    }
  } catch {
    /* table may be missing before migrate */
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
};
