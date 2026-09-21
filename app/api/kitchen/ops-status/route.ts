import { NextResponse } from 'next/server';
import { buildOpsHealthReport } from '@/lib/ops-health';
import { requireKitchenSession } from '@/lib/kitchen-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resumen seguro para el panel de cocina (sin secretos).
 * Cookie de cocina requerida.
 */
export async function GET() {
  const denied = await requireKitchenSession();
  if (denied) return denied;

  const report = await buildOpsHealthReport();
  const critical = report.checks.filter((c) => !c.ok && (c.severity === 'fatal' || c.severity === 'warn'));

  return NextResponse.json(
    {
      ok: report.ok,
      fatal: report.fatal,
      checkedAt: report.checkedAt,
      summary: report.summary,
      kitchen: report.kitchen,
      problems: critical.map((c) => ({
        id: c.id,
        severity: c.severity,
        label: c.label,
        detail: c.detail,
      })),
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
