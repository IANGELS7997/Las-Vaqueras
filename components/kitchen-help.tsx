'use client';

import { useEffect, useState } from 'react';
import { formatMXN } from '@/lib/pricing';

type Report = {
  id: string;
  orderId: string;
  label: string;
  phase: string;
  payMethod: string | null;
  foodMxn: number;
  riderDueMxn: number;
  customerDueMxn: number;
  note: string | null;
  payoutCode: string | null;
  payoutPaidAt: string | null;
  resolution: string | null;
  customerReason: string | null;
  customerNote: string | null;
  customerChoice: string | null;
  kitchenRefund: string | null;
  adminRefund: string | null;
  refundNote: string | null;
  refundCreditMxn: number | null;
  kind?: string;
};

export function KitchenHelpPayout({
  orderId,
  label,
  amount,
}: {
  orderId: string;
  label: string;
  amount?: number | null;
}) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/kitchen/help-payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, code }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    setMessage(response.ok ? `Pagado ${formatMXN(Number(payload.amount || amount || 0))}` : payload.error || 'No se pudo pagar');
  }

  return (
    <div className="mb-3 rounded-lg border border-red-500/70 bg-red-950/40 p-3 text-sm text-red-50">
      <p className="font-semibold">{label}</p>
      {amount ? <p className="mt-1">Entregar al rider: {formatMXN(amount)}</p> : null}
      <div className="mt-2 flex gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          inputMode="numeric"
          placeholder="Código del rider"
          className="min-h-10 flex-1 rounded-md border border-red-400/40 bg-black/30 px-2 text-white"
        />
        <button type="button" className="rounded-md bg-white px-3 font-semibold text-black" disabled={busy} onClick={() => void pay()}>
          Pagar
        </button>
      </div>
      {message ? <p className="mt-2 text-xs">{message}</p> : null}
    </div>
  );
}

export function KitchenHelpDesk() {
  const [reports, setReports] = useState<Report[]>([]);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  async function load() {
    const response = await fetch('/api/kitchen/help-reports');
    const payload = await response.json().catch(() => ({}));
    if (response.ok) setReports(payload.reports || []);
  }

  useEffect(() => {
    if (open) void load();
  }, [open]);

  async function resolve(id: string, decision: 'approved' | 'rejected' | 'deposited') {
    setNote('');
    const response = await fetch('/api/kitchen/help-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, decision }),
    });
    const payload = await response.json().catch(() => ({}));
    setNote(response.ok ? 'Caso actualizado' : payload.error || 'No se pudo resolver');
    if (response.ok) await load();
  }

  return (
    <section className="mt-3 rounded-lg border border-border/60 bg-card p-3">
      <button type="button" className="text-sm font-semibold text-white" onClick={() => setOpen((value) => !value)}>
        {open ? 'Ocultar reembolsos' : 'Reembolsos y reportes'}
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          {note ? <p className="text-xs text-brand-400">{note}</p> : null}
          {reports.length === 0 ? <p className="text-sm text-muted-foreground">Sin reportes</p> : null}
          {reports.map((report) => (
            <article key={report.id} className="rounded-lg border border-red-500/40 p-3 text-sm text-white">
              <p className="font-semibold">{report.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pedido {String(report.orderId).slice(0, 8)} · {report.payMethod || 'tarjeta'} · {report.phase}
                {report.resolution ? ` · ${report.resolution}` : ''}
              </p>
              <p className="mt-1 text-xs">
                Comida {formatMXN(Number(report.foodMxn || 0))}
                {Number(report.riderDueMxn) > 0 ? ` · caja ${formatMXN(Number(report.riderDueMxn))}` : ''}
                {Number(report.customerDueMxn) > 0 ? ` · cliente ${formatMXN(Number(report.customerDueMxn))}` : ''}
              </p>
              {report.payoutCode ? <p className="mt-1 text-xs">Código {report.payoutCode}{report.payoutPaidAt ? ' · pagado' : ''}</p> : null}
              {report.note ? <p className="mt-1 text-xs">{report.note}</p> : null}
              {report.customerReason ? (
                <p className="mt-1 text-xs">
                  Cliente: {report.customerReason}. {report.customerNote}. Lo revisa admin.
                  {report.refundNote ? ` ${report.refundNote}` : ''}
                </p>
              ) : null}
              {report.resolution && (report.kind === 'moto' || report.kind === 'unsafe') ? (
                <button type="button" className="mt-2 rounded-md border border-white/30 px-2 py-1 text-xs" onClick={() => void resolve(report.id, 'deposited')}>
                  Depósito recibido
                </button>
              ) : null}
              {!report.resolution && report.phase !== 'notice' && !(report.kind === 'incomplete' && report.customerNote) ? (
                <div className="mt-2 flex gap-2">
                  <button type="button" className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-black" onClick={() => void resolve(report.id, 'approved')}>
                    Aprobar
                  </button>
                  <button type="button" className="rounded-md border border-white/30 px-2 py-1 text-xs" onClick={() => void resolve(report.id, 'rejected')}>
                    Rechazar
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
