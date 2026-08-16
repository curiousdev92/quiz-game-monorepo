// app/auth/logout/route.ts

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  cookieStore.delete("token");

  const loginUrl = new URL("/login", request.url);

  return NextResponse.redirect(loginUrl);
}
