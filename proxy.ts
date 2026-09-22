import { NextResponse, type NextRequest } from "next/server";
import { createProxyClient } from "@/lib/supabase/proxy";

/**
 * Auth gate + security headers — Next.js 16 usa `proxy.ts` (substituiu `middleware.ts`).
 *
 * Fluxo:
 *  1. Aplica security headers (CSP, HSTS, etc.) em TODA resposta.
 *  2. Se a rota é pública (marketing/auth/webhooks/assets), libera.
 *  3. Pra rotas protegidas (/app, /aluno, /admin):
 *     - Cria cliente Supabase com cookies do request
 *     - Chama auth.getUser() (valida JWT e dá refresh se necessário)
 *     - Se não tem user → redireciona pra /login?redirect=<path>
 *     - Se tem user → libera, passando o response (com cookies atualizados)
 *
 *  Atenção: o `proxy.ts` precisa conseguir SETAR cookies no response
 *  pro refresh token funcionar. Por isso retornamos o mesmo `response`
 *  construído abaixo.
 */

const PROTECTED_PREFIXES = ["/app", "/aluno", "/admin"] as const;

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Security headers aplicados a toda resposta. CSP permite Supabase + Mercado Pago Bricks CDN. */
function setSecurityHeaders(res: NextResponse): void {
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // 'unsafe-inline' necessário pro Next.js inline styles + Mercado Pago Bricks.
    // 'unsafe-eval' NÃO permitido.
    "script-src 'self' 'unsafe-inline' https://*.mercadopago.com.br https://http2.mlstatic.com",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://*.mercadopago.com.br https://api.mercadopago.com",
    "frame-src 'self' https://*.mercadopago.com.br https://http2.mlstatic.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  // Cross-Origin policies (mitigam Spectre side-channel)
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0) Aplica security headers em qualquer rota que chegue até aqui
  let response = NextResponse.next({
    request,
    headers: { "x-pathname": pathname },
  });
  
  // COMENTADO PARA DIAGNÓSTICO: setSecurityHeaders(response);
  
  // 0b) /app é server-rendered dinâmico — NUNCA cachear.
  // Estava servindo página de erro antiga cacheada por CDN mesmo após
  // deploy novo. Forçar no-store garante que cada request chega ao server.
  if (pathname.startsWith("/app") || pathname.startsWith("/aluno") || pathname.startsWith("/admin")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  // 1) Rotas públicas — marketing, auth, webhooks, assets
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/entrar") ||
    pathname.startsWith("/boas-vindas") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/recuperar") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/evolution/webhook") ||
    pathname.startsWith("/api/asaas/webhook") ||
    pathname.startsWith("/api/mercadopago/webhook") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".");

  if (isPublic) return response;

  if (!isProtected(pathname)) return response;

  // 2) Rota protegida — exigir user Supabase válido
  const supabase = await createProxyClient(request, response);
  // Se faltam env vars, manda pro login em vez de quebrar tudo
  if (!supabase) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    const redirect = NextResponse.redirect(url);
    setSecurityHeaders(redirect);
    return redirect;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    const redirect = NextResponse.redirect(url);
    setSecurityHeaders(redirect);
    return redirect;
  }

  // 3) Usuário válido — devolve o response com cookies atualizados + headers
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

