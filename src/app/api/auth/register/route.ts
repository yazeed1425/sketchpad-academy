import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { createProfileForUser } from "@/lib/services/profileService";
import { errorResponse } from "@/lib/requireUser";

const schema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const existing = await db.user.findUnique({ where: { email: body.email } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const passwordHash = await hashPassword(body.password);
    const user = await db.user.create({ data: { name: body.name, email: body.email, passwordHash } });
    await createProfileForUser(user.id);
    await createSession(user.id);

    return NextResponse.json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    return errorResponse(error);
  }
}
