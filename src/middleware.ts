import { NextResponse, type NextRequest } from "next/server";

/** Exposes the path to server layouts and bounces signed-out users before rendering. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = req.cookies.has("apex_session");
  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (!authed && !isAuthPage && !pathname.startsWith("/api") && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const h = new Headers(req.headers);
  h.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: h } });
}

export const config = { matcher: ["/((?!_next|mediapipe|icons|favicon|icon.png|manifest.webmanifest|sw.js|.*\\.(?:png|svg|ico|wasm|task)$).*)"] };
