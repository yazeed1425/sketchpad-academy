import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ user: null });

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
  return NextResponse.json({ user });
}
