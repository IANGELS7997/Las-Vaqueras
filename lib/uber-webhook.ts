import { createHmac, timingSafeEqual } from 'crypto';
import type { OrderStatus } from '@/types';

export type UberWebhookEvent = {
  kind: string;
  deliveryId: string | null;
  status: string | null;
  orderId: string | null;
  trackingUrl: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function verifyUberSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const left = Buffer.from(expected, 'utf8');
  const right = Buffer.from(signature, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function parseUberWebhook(payload: unknown): UberWebhookEvent {
  const root = asRecord(payload) || {};
  const data = asRecord(root.data) || {};
  const manifest = asRecord(data.manifest) || asRecord(root.manifest) || {};

  const kind = asString(root.kind) || asString(root.event_type) || 'unknown';
  const deliveryId =
    asString(data.id) || asString(root.delivery_id) || asString(root.id);
  const status = asString(data.status) || asString(root.status);
  const orderId =
    asString(manifest.reference) ||
    asString(data.external_id) ||
    asString(data.external_order_id) ||
    asString(root.external_id) ||
    asString(root.external_order_id);
  const trackingUrl = asString(data.tracking_url) || asString(root.tracking_url);

  return { kind, deliveryId, status, orderId, trackingUrl };
}

export function kitchenStatusFromUber(uberStatus: string | null): OrderStatus | null {
  const status = (uberStatus || '').toLowerCase();
  if (status === 'delivered' || status === 'dropoff_complete' || status === 'completed') {
    return 'delivered';
  }
  if (
    status === 'pickup' ||
    status === 'pickup_complete' ||
    status === 'dropoff' ||
    status === 'en_route_to_pickup' ||
    status === 'en_route_to_dropoff' ||
    status === 'near_pickup' ||
    status === 'near_dropoff'
  ) {
    return 'in_transit';
  }
  return null;
}
