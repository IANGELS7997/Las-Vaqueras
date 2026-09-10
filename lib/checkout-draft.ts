export const CHECKOUT_DRAFT_KEY = 'lv_checkout_draft';

export type CheckoutDraft = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  street: string;
  extNumber: string;
  intNumber: string;
  colonia: string;
  postalCode: string;
  references: string;
  lat: number | null;
  lng: number | null;
  pickupAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asCoord(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readCheckoutDraft(): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    return {
      firstName: asString(parsed.firstName),
      lastName: asString(parsed.lastName),
      phone: asString(parsed.phone),
      email: asString(parsed.email),
      street: asString(parsed.street),
      extNumber: asString(parsed.extNumber),
      intNumber: asString(parsed.intNumber),
      colonia: asString(parsed.colonia),
      postalCode: asString(parsed.postalCode),
      references: asString(parsed.references),
      lat: asCoord(parsed.lat),
      lng: asCoord(parsed.lng),
      pickupAt: asString(parsed.pickupAt),
    };
  } catch {
    return null;
  }
}

export function writeCheckoutDraft(draft: CheckoutDraft): void {
  try {
    sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // sessionStorage may be unavailable
  }
}

export function clearCheckoutDraft(): void {
  try {
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    // sessionStorage may be unavailable
  }
}
