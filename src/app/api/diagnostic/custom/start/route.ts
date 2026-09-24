import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { startCustomDiagnostic } from "@/lib/services/customDiagnosticService";
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/gamification/customDiagnostic";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("No file was uploaded");
    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])) {
      throw new Error("Unsupported file type — upload a PDF or an image (PNG/JPEG/WEBP)");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`File is too large — the limit is ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const state = await startCustomDiagnostic(userId, {
      mimeType: file.type,
      base64Data: buffer.toString("base64"),
      fileName: file.name,
    });
    return NextResponse.json(state);
  } catch (error) {
    return errorResponse(error);
  }
}
