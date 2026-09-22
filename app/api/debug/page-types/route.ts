import { NextResponse } from "next/server";

/**
 * GET /api/debug/page-types
 * Diagnóstico para descobrir se o problema é layout vs page.
 *
 * Apenas confirma que esse código executa. Se quebrou antes daqui,
 * o problema é proxy.ts ou layout.tsx.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    msg: "API route funcionando",
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
