import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/auth";

export async function POST(req: Request) {
  await supabaseServer().auth.signOut();
  return NextResponse.redirect(new URL("/", new URL(req.url).origin), { status: 303 });
}
