/** Primera vez que el pedido queda entregado. No pisa una hora ya guardada. */
export function withDeliveredAt(
  patch: Record<string, unknown>,
  existingDeliveredAt: unknown,
  now = new Date().toISOString()
) {
  if (patch.status === 'delivered' && !existingDeliveredAt) {
    patch.delivered_at = now;
  }
  return patch;
}
