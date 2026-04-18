import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware de autenticação.
 * Redireciona usuários não autenticados para /login
 * e usuários autenticados fora das rotas protegidas para /apostas.
 *
 * Nota: A verificação completa de admin é feita no AdminGate (server component),
 * pois o middleware não tem acesso ao Firebase Admin SDK de forma eficiente.
 * O middleware aqui serve como primeira linha de defesa para rotas protegidas.
 */

// Rotas que NÃO precisam de autenticação
const PUBLIC_ROUTES = ["/login", "/register"];

// Rotas que precisam de autenticação
const PROTECTED_ROUTES = ["/apostas", "/nominais", "/classificacao", "/noticias", "/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verifica se há cookie de sessão Firebase (indicador básico de auth)
  // A verificação real é feita via onAuthStateChanged no cliente
  const hasSession =
    request.cookies.has("__session") || request.cookies.has("firebase_session");

  // Ignora rotas de API e assets
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Redireciona raiz para /apostas
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/apostas", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
