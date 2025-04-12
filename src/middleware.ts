import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname;

  // If the path is exactly the root, redirect to login
  // if (path === '/') {
  //   // return NextResponse.redirect(new URL('/login', request.url));
  // }

  // Get the user token from the cookies
  const token = request.cookies.get('token')?.value;

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/signup', '/onboarding', '/listing'];
  
  // Check if the path is public
  const isPublicPath = publicPaths.some(publicPath => 
    path.includes(publicPath) ?? path.startsWith('/images/') ?? path.startsWith('/_next/')
  );

  // If there's no token and the path isn't public, redirect to login
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  //If there's a token and we're on a public path, redirect to dashboard
  if (token && publicPaths.includes(path)) {
    return NextResponse.redirect(new URL('/admin/apps', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/ (API routes)
     * 2. /_next/ (Next.js internals)
     * 3. /fonts/ (inside public)
     * 4. /images/ (inside public)
     * 5. all root files inside public (e.g. /favicon.ico)
     */
    '/((?!api|_next|fonts|images|[\\w-]+\\.\\w+).*)',
  ],
}; 