'use client';

import { formatMXN } from '@/lib/pricing';
import { RESTAURANT_INFO } from '@/lib/restaurant';
import type { Order } from '@/types';

interface ThermalTicketProps {
  order: Order;
  active?: boolean;
}

export function ThermalTicket({ order, active = false }: ThermalTicketProps) {
  const getTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };
  const getDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div
      id={active ? 'ticket-comanda' : undefined}
      className={
        active
          ? 'font-mono text-[12px] leading-tight text-black'
          : 'hidden font-mono text-[12px] leading-tight text-black'
      }
    >
      <div className="text-center">
        <p className="font-bold">LAS VAQUERAS</p>
        <p>{RESTAURANT_INFO.address}</p>
        <p>Tel: {RESTAURANT_INFO.phone}</p>
      </div>
      <div className="my-1 border-t border-dashed border-black" />
      <div>
        <p>Orden: #{order.id}</p>
        <p>Fecha: {getDate(order.createdAt)}</p>
        <p>Hora: {getTime(order.createdAt)}</p>
      </div>
      <div className="my-1 border-t border-dashed border-black" />
      <div>
        <p className="font-bold">Cliente:</p>
        <p>{order.customer.name}</p>
        <p>Tel: {order.customer.phone}</p>
        <p>Dir: {order.customer.address}</p>
        {order.customer.references && <p>Ref: {order.customer.references}</p>}
      </div>
      <div className="my-1 border-t border-dashed border-black" />
      <div>
        {order.items.map((item) => (
          <div key={item.uid} className="mb-1">
            <p className="font-bold">
              {item.quantity}x {item.name}
            </p>
            {item.selections.map((sel) =>
              sel.choices.length > 0 ? (
                <p key={sel.optionGroupId} className="pl-3">
                  {sel.optionGroupId_label}: {sel.choices.join(', ')}
                </p>
              ) : null
            )}
            {item.comboUpgrade && <p className="pl-3">+ {item.comboUpgrade.name}</p>}
            {item.extras?.map((extra) => (
              <p key={extra.id} className="pl-3">
                + Extra {extra.name}
              </p>
            ))}
            {item.removals && item.removals.length > 0 && (
              <p className="pl-3">Sin {item.removals.join(', ').toLowerCase()}</p>
            )}
            {item.specialInstructions && <p className="pl-3 italic">Nota: {item.specialInstructions}</p>}
          </div>
        ))}
      </div>
      <div className="my-1 border-t border-dashed border-black" />
      <div>
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatMXN(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Servicio:</span>
          <span>{formatMXN(order.serviceFee)}</span>
        </div>
        <div className="flex justify-between">
          <span>Envio:</span>
          <span>{formatMXN(order.deliveryFee)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>TOTAL:</span>
          <span>{formatMXN(order.total)}</span>
        </div>
      </div>
      <div className="my-1 border-t border-dashed border-black" />
      <div className="text-center">
        <p>Pago: {order.paymentMethod.replace('_', ' ').toUpperCase()}</p>
        <p className="mt-2">Gracias por tu compra!</p>
      </div>
    </div>
  );
}
