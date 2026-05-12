import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/auth");

  // Not logged in — redirect to login for protected routes
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged in — enforce single-user lockdown
  if (user) {
    const allowedEmail = process.env.ALLOWED_EMAIL;
    if (!allowedEmail || user.email !== allowedEmail) {
      // Wrong account — sign out and redirect to login
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signout";
      return NextResponse.redirect(url);
    }

    // Correct user on an auth route — send to dashboard
    if (isAuthRoute && pathname !== "/auth/callback") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
