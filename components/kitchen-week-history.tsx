'use client';

import { useEffect, useState } from 'react';

type Row = {
  id: string;
  code: string;
  customer: string;
  status: string;
  createdAt: string;
  total: number;
  outcome: string;
};

function weekLabel(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'Sin fecha';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chihuahua',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const [year, month, day] = parts.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - weekday + 1);
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(utc);
}

export function KitchenWeekHistory() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!open || rows.length > 0) return;
    void fetch('/api/kitchen/orders?scope=history', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => setRows(payload.orders || []))
      .catch(() => undefined);
  }, [open, rows.length]);

  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = weekLabel(row.createdAt);
    groups.set(key, [...(groups.get(key) || []), row]);
  }

  return (
    <section className="mb-8">
      <button type="button" className="text-lg font-bold text-white" onClick={() => setOpen((value) => !value)}>
        {open ? 'Ocultar historial por semana' : 'Historial por semana'}
      </button>
      {open ? (
        <div className="mt-3 space-y-4">
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">Sin pedidos</p> : null}
          {Array.from(groups.entries()).map(([week, items]) => (
            <div key={week}>
              <p className="mb-2 text-sm font-semibold text-white">Semana del {week}</p>
              <div className="grid gap-2 md:grid-cols-3">
                {items.map((order) => (
                  <article key={order.id} className="rounded-xl border border-border/60 bg-card p-3 text-sm text-white">
                    <p className="font-bold">#{order.code}</p>
                    <p className="text-xs text-muted-foreground">{order.customer}</p>
                    <p className="text-xs">{order.outcome}</p>
                    <p className="text-xs text-muted-foreground">{order.status}</p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
