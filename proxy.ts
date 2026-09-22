import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Simplified to the absolute minimum. No headers, no complex logic.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
