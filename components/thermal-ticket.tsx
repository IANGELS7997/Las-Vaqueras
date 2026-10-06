'use client';

import { BILLING_FORM_URL } from '@/lib/billing-form';
import { cajaPayBanner, cajaTicketBanner } from '@/lib/caja-ticket';
import { loyaltyCajaTicketLines } from '@/lib/loyalty';
import { formatMXN } from '@/lib/pricing';
import { formatPickupAt } from '@/lib/pickup-slots';
import { branchById } from '@/lib/branches';
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
  const promoLines = loyaltyCajaTicketLines(order.loyaltyKind);
  const branch = branchById(order.branchId);
  const banner = cajaTicketBanner(order);
  const pay = cajaPayBanner(order);

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
        {banner ? (
          <div className="ticket-pay my-1 border-2 border-black px-1 py-1 text-center">
            <p className="ticket-pay-title text-[28px] font-black leading-none tracking-wide">{banner}</p>
          </div>
        ) : null}
        <p className="font-bold">{branch.name.toUpperCase()}</p>
        <p>{branch.address}</p>
        <p>Tel: {branch.phone}</p>
        <p>{RESTAURANT_INFO.email}</p>
      </div>
      <div className="my-1 border-t border-dashed border-black" />
      <div>
        <p>Orden: #{order.shortCode || order.id.slice(0, 8)}</p>
        <p>Fecha: {getDate(order.createdAt)}</p>
        <p>Hora: {getTime(order.createdAt)}</p>
        <div className="ticket-pay my-1 border-2 border-black px-1 py-1 text-center">
          <p className="ticket-pay-title text-[28px] font-black leading-none tracking-wide">{pay.title}</p>
          {pay.lines.map((line) => (
            <p key={line} className="ticket-pay-line mt-1 text-[14px] font-bold leading-tight">
              {line}
            </p>
          ))}
        </div>
        {order.fulfillment === 'pickup' ? (
          <p className="font-bold">
            RECOGER EN TIENDA
            {order.pickupAt ? ` · ${formatPickupAt(order.pickupAt)}` : ''}
          </p>
        ) : (
          <p className="font-bold">ENTREGA A DOMICILIO</p>
        )}
      </div>
      {promoLines.length > 0 ? (
        <>
          <div className="my-1 border-t border-dashed border-black" />
          <div className="text-center">
            {promoLines.map((line) => (
              <p key={line} className="font-bold">
                {line}
              </p>
            ))}
          </div>
        </>
      ) : null}
      <div className="my-1 border-t border-dashed border-black" />
      <div>
        <p className="font-bold">Cliente:</p>
        <p>{order.customer.name}</p>
        <p>Tel: {order.customer.phone}</p>
        {order.fulfillment === 'pickup' ? (
          <p>Recoge en tienda</p>
        ) : (
          <>
            <p>Dir: {order.customer.address}</p>
            {order.customer.references && <p>Ref: {order.customer.references}</p>}
          </>
        )}
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
        <div className="flex justify-between font-bold">
          <span>TOTAL COMIDA:</span>
          <span>{formatMXN(order.subtotal)}</span>
        </div>
        {order.loyaltyKind === 'first_30' ? (
          <p className="mt-1 font-bold">Total YA con 30% desc. primer pedido</p>
        ) : null}
        {order.loyaltyKind === 'fifth_20' ? (
          <p className="mt-1 font-bold">Total YA con 20% desc. 5.o pedido</p>
        ) : null}
      </div>
      <div className="my-1 border-t border-dashed border-black" />
      <div className="text-center">
        <p>Solo comida · sin envio ni comisiones</p>
      </div>
      <div className="my-1 border-t border-dashed border-black" />
      <div className="text-center">
        <p className="font-bold">FACTURACIÓN</p>
        <img
          src="/facturacion-qr.png"
          alt="Facturación"
          width={112}
          height={112}
          className="ticket-billing-qr"
        />
        <p className="ticket-billing-url">{BILLING_FORM_URL}</p>
      </div>
    </div>
  );
}
