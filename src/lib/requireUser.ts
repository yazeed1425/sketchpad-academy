import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";

export class UnauthorizedError extends Error {}

export async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) throw new UnauthorizedError();
  return userId;
}

export function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error(error);
  return NextResponse.json({ error: message }, { status: 400 });
}
