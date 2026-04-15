// ─── Storage Accessibility Check ─────────────────────────────────────────────
// Admin-only endpoint that verifies whether the isysocial-media bucket is
// publicly accessible (i.e. getPublicUrl returns reachable URLs).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkBucketPublicAccess } from "@isysocial/api/src/lib/supabase-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "isysocial-media";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      ok: false,
      error: "SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configurados",
    });
  }

  try {
    const result = await checkBucketPublicAccess(BUCKET);
    return NextResponse.json({
      ok: result.publicAccessible,
      bucket: BUCKET,
      ...result,
      recommendation: !result.uploadOk
        ? `Error al subir al bucket '${BUCKET}'. Verifica que el bucket existe y que la Service Role Key es correcta.`
        : !result.publicAccessible
        ? `El bucket '${BUCKET}' no es público. Ve a Supabase → Storage → isysocial-media → Edit bucket → activa "Public bucket" y guarda.`
        : "El almacenamiento está funcionando correctamente.",
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
    });
  }
}
