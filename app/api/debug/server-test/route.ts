import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/debug/server-test
 *
 * Roda o mesmo caminho do /app trainer dashboard, mas retorna HTML/text
 * simples em vez de JSX. Se essa rota funciona e o /app não, o problema
 * é algum componente client ou layout, não a lógica de servidor.
 */
export async function GET() {
  const logs: string[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    logs.push(`user: ${user?.id ?? "none"}`);

    if (!user) {
      return new NextResponse("NO USER", { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();
    logs.push(`profile: ${JSON.stringify(profile)}`);

    return new NextResponse(
      `<!doctype html><html><body>
        <h1>Server Test OK</h1>
        <pre>${logs.join("\n")}</pre>
      </body></html>`,
      {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  } catch (e) {
    return new NextResponse(
      `<!doctype html><html><body>
        <h1>ERROR</h1>
        <pre>${String(e)}\n\n${(e as Error).stack}</pre>
      </body></html>`,
      {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }
}
