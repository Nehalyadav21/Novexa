import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request) {
  const token = await getToken({ req: request });
  
  console.log('Middleware - Current token:', token);
  console.log('Middleware - Current path:', request.nextUrl.pathname);
  
  if (!token) {
    console.log('Middleware - No token found, redirecting to login');
    // Redirect unauthenticated users to login
    if (request.nextUrl.pathname !== '/login' && request.nextUrl.pathname !== '/signup') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // If user is authenticated...
  if (token) {
    // Redirect away from login/signup pages if already authenticated
    if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') {
      // Check if user has a company
      if (token.company) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/join', request.url));
      }
    }

    // Handle /join page access
    if (request.nextUrl.pathname === '/join') {
      // If user already has a company, redirect to dashboard
      if (token.company) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return NextResponse.next();
    }

    // Handle protected pages that require company membership
    if (['/dashboard', '/company-info', '/agent', '/chats', '/teams', '/tasks', '/meetings', '/profile'].includes(request.nextUrl.pathname) || 
        request.nextUrl.pathname.startsWith('/agent/')) {
      console.log('Middleware - Protected page access:', {
        path: request.nextUrl.pathname,
        hasToken: !!token,
        hasCompany: !!token.company,
        tokenData: token
      });

      // For agent pages, only require authentication, not company membership
      if (request.nextUrl.pathname === '/agent' || request.nextUrl.pathname.startsWith('/agent/')) {
        return NextResponse.next();
      }

      // For other protected pages, require company membership
      if (!token.company) {
        console.log('Middleware - No company in token, redirecting to join');
        return NextResponse.redirect(new URL('/join', request.url));
      }
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/join', '/dashboard', '/company-info', '/agent/:path*', '/login', '/signup', '/chats', '/teams', '/tasks', '/meetings', '/profile']
};
