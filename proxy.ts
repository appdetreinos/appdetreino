import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // RESET TOTAL: Apenas deixa passar.
  // Se o site crashar com isso, o erro está no layout.tsx ou no bundle do Next.js.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
