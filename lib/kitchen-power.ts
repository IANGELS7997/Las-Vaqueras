type StationGate = {
  admin_enabled?: boolean | null;
  session_generation?: number | null;
  shift_active?: boolean | null;
};

/** Apagar cierra el turno y sube la generación solo en ese cambio. Prender solo quita el bloqueo. */
export function kitchenPowerPatch(previous: StationGate | null, enabled: boolean, now: string) {
  const patch: Record<string, unknown> = {
    admin_enabled: enabled,
    updated_at: now,
  };
  if (!enabled) {
    patch.shift_active = false;
    patch.auto_print = false;
    patch.closed_at = now;
    if (previous?.admin_enabled !== false) {
      const generation = previous?.session_generation;
      patch.session_generation = (typeof generation === 'number' && generation >= 0 ? generation : 0) + 1;
    }
  }
  return patch;
}
