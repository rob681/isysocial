// ─── Cron: Send Scheduled Analytics Reports ───────────────────────────────────
// Runs daily — checks all configured report schedules and sends due ones.
// Weekly schedules: sent every Monday
// Monthly schedules: sent on the 1st of each month

import { NextRequest, NextResponse } from "next/server";
import { db } from "@isysocial/db";
import {
  fetchInstagramAccountInsights,
  fetchFacebookPageInsights,
} from "@isysocial/api/src/lib/insights/meta";
import { sendEmailNotification } from "@isysocial/api/src/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Network = "INSTAGRAM" | "FACEBOOK";
type Range = "7d" | "14d" | "30d" | "90d";

interface ScheduleConfig {
  enabled: boolean;
  frequency: "weekly" | "monthly";
  emails: string[];
  range: Range;
  agencyId: string;
  clientId: string;
  network: Network;
}

function getRangeDays(range: Range): number {
  const map: Record<Range, number> = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };
  return map[range] ?? 30;
}

function getRangeDates(range: Range) {
  const until = new Date();
  const days = getRangeDays(range);
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);
  const prevUntil = new Date(since.getTime());
  const prevSince = new Date(prevUntil.getTime() - days * 24 * 60 * 60 * 1000);
  return { since, until, prevSince, prevUntil };
}

function sumArr(arr: number[] | undefined): number {
  return (arr ?? []).reduce((a, b) => a + b, 0);
}

function deltaStr(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100%" : "—";
  const d = Math.round(((current - previous) / previous) * 100);
  return d > 0 ? `+${d}%` : d < 0 ? `${d}%` : "Sin cambio";
}

function deltaColor(current: number, previous: number): string {
  if (previous === 0) return "#6b7280";
  const d = current - previous;
  return d > 0 ? "#059669" : d < 0 ? "#dc2626" : "#6b7280";
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
  const dayOfMonth = now.getDate();

  // Find all scheduled report configs
  const configs = await db.systemConfig.findMany({
    where: { key: { startsWith: "report_schedule_" } },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const config of configs) {
    let schedule: ScheduleConfig;
    try {
      schedule = JSON.parse(config.value as string) as ScheduleConfig;
    } catch {
      continue;
    }

    if (!schedule.enabled) { skipped++; continue; }

    // Check if it should run today
    const shouldRunToday =
      (schedule.frequency === "weekly" && dayOfWeek === 1) || // Monday
      (schedule.frequency === "monthly" && dayOfMonth === 1);  // 1st of month

    if (!shouldRunToday) { skipped++; continue; }

    try {
      const { clientId, network, range, emails, agencyId } = schedule;
      const rangeDays = getRangeDays(range);
      const { since, until, prevSince, prevUntil } = getRangeDates(range);
      const rangeLabel = range === "7d" ? "últimos 7 días" : range === "14d" ? "últimas 2 semanas" : range === "30d" ? "últimos 30 días" : "últimos 90 días";

      // Get client name
      const client = await db.clientProfile.findFirst({
        where: { id: clientId, agencyId },
        select: { companyName: true },
      });
      if (!client) { skipped++; continue; }

      // Resolve credentials
      const cred = await db.clientSocialNetwork.findFirst({
        where: { clientId, network: network as any, isActive: true, accessToken: { not: null } },
        select: { accountId: true, pageId: true, accessToken: true },
      });
      if (!cred?.accessToken) { skipped++; continue; }

      const accountId = network === "FACEBOOK"
        ? (cred.pageId || cred.accountId)!
        : cred.accountId!;

      const networkLabel = network === "INSTAGRAM" ? "Instagram" : "Facebook";
      const accentColor = network === "INSTAGRAM" ? "#E1306C" : "#1877F2";
      const headerBg = network === "INSTAGRAM" ? "#fdf2f8" : "#eff6ff";
      const headerBorder = network === "INSTAGRAM" ? "#fbcfe8" : "#bfdbfe";
      const reportDate = now.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

      let rows = "";
      const row = (label: string, val: number, c: number, p: number) => `
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 14px;font-size:13px;color:#374151;">${label}</td>
          <td style="text-align:right;padding:10px 14px;font-size:14px;font-weight:700;color:#111827;">${val.toLocaleString("es-MX")}</td>
          <td style="text-align:right;padding:10px 14px;font-size:12px;font-weight:600;color:${deltaColor(c, p)};">${deltaStr(c, p)}</td>
        </tr>`;

      if (network === "INSTAGRAM") {
        const [cur, prev] = await Promise.all([
          fetchInstagramAccountInsights(accountId, cred.accessToken, since, until).catch(() => null),
          fetchInstagramAccountInsights(accountId, cred.accessToken, prevSince, prevUntil).catch(() => null),
        ]);
        const reach = sumArr(cur?.reach);
        const impressions = sumArr(cur?.impressions);
        const prevReach = sumArr(prev?.reach);
        const prevImpressions = sumArr(prev?.impressions);

        rows =
          `<tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 14px;font-size:13px;color:#374151;">Seguidores</td><td style="text-align:right;padding:10px 14px;font-size:14px;font-weight:700;color:#111827;">${(cur?.followerCount ?? 0).toLocaleString("es-MX")}</td><td style="text-align:right;padding:10px 14px;font-size:12px;color:#6b7280;">—</td></tr>` +
          row(`Alcance (${rangeDays}d)`, reach, reach, prevReach) +
          row(`Impresiones (${rangeDays}d)`, impressions, impressions, prevImpressions);
      } else {
        const [cur, prev] = await Promise.all([
          fetchFacebookPageInsights(accountId, cred.accessToken, since, until).catch(() => null),
          fetchFacebookPageInsights(accountId, cred.accessToken, prevSince, prevUntil).catch(() => null),
        ]);
        const reach = sumArr(cur?.reach);
        const impressions = sumArr(cur?.impressions);
        const engagements = sumArr(cur?.postEngagements);
        const prevReach = sumArr(prev?.reach);
        const prevImpressions = sumArr(prev?.impressions);

        rows =
          `<tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 14px;font-size:13px;color:#374151;">Fans totales</td><td style="text-align:right;padding:10px 14px;font-size:14px;font-weight:700;color:#111827;">${(cur?.fanCount ?? 0).toLocaleString("es-MX")}</td><td style="text-align:right;padding:10px 14px;font-size:12px;color:#6b7280;">—</td></tr>` +
          row(`Alcance (${rangeDays}d)`, reach, reach, prevReach) +
          row(`Impresiones (${rangeDays}d)`, impressions, impressions, prevImpressions) +
          row(`Engagements (${rangeDays}d)`, engagements, engagements, 0);
      }

      const tableHtml = `
        <p style="font-size:14px;color:#374151;margin:0 0 16px;">
          Reporte ${schedule.frequency === "weekly" ? "semanal" : "mensual"} de <strong style="color:${accentColor};">${networkLabel}</strong>
          para <strong>${client.companyName}</strong> — ${rangeLabel}.<br>
          <span style="font-size:12px;color:#9ca3af;">Generado automáticamente el ${reportDate}.</span>
        </p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:${headerBg};">
              <th style="text-align:left;padding:10px 14px;font-size:12px;font-weight:600;color:#374151;border-bottom:2px solid ${headerBorder};">Métrica</th>
              <th style="text-align:right;padding:10px 14px;font-size:12px;font-weight:600;color:#374151;border-bottom:2px solid ${headerBorder};">Valor</th>
              <th style="text-align:right;padding:10px 14px;font-size:12px;font-weight:600;color:#374151;border-bottom:2px solid ${headerBorder};">Vs período anterior</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://isysocial.com";

      for (const email of emails) {
        await sendEmailNotification({
          db,
          to: email,
          subject: `Reporte ${schedule.frequency === "weekly" ? "semanal" : "mensual"} — ${networkLabel} · ${client.companyName}`,
          title: `Analytics de ${networkLabel} — ${client.companyName}`,
          body: tableHtml,
          actionUrl: `${appUrl}/admin/analiticas/social`,
          actionLabel: "Ver analytics completos",
        });
      }

      sent++;
    } catch (err: any) {
      errors.push(`${config.key}: ${err?.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: now.toISOString(),
  });
}
