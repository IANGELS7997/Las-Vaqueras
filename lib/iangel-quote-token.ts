import { createHmac, timingSafeEqual } from 'crypto';
import { QUOTE_TTL_MS, type DeliveryProvider } from '@/lib/iangel-constants';

export type QuoteAssignment = {
  lat: number;
  lng: number;
  meters: number;
  kind: DeliveryProvider;
  uberQuoteId: string | null;
  uberFee: number;
  customerFee: number;
  exp: number;
};

function quoteSecret() {
  return (
    process.env.IANGEL_API_SECRET ||
    process.env.CUSTOMER_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}

function hmacHex(payload: string) {
  const secret = quoteSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function quoteExpiresAt(now = Date.now()) {
  return new Date(now + QUOTE_TTL_MS).toISOString();
}

export async function signQuoteAssignment(assignment: QuoteAssignment): Promise<string> {
  const body = Buffer.from(JSON.stringify(assignment), 'utf8').toString('base64url');
  const sig = hmacHex(body);
  return `${body}.${sig}`;
}

export async function readQuoteAssignment(token: string | undefined): Promise<QuoteAssignment | null> {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = hmacHex(body);
  if (!expected || expected.length !== sig.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as QuoteAssignment;
    if (!parsed || typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function assignmentFromRouting(input: {
  lat: number;
  lng: number;
  meters: number;
  kind: DeliveryProvider;
  uberQuoteId?: string | null;
  uberFee?: number;
  customerFee: number;
}): QuoteAssignment {
  return {
    lat: input.lat,
    lng: input.lng,
    meters: input.meters,
    kind: input.kind,
    uberQuoteId: input.uberQuoteId || null,
    uberFee: input.uberFee || 0,
    customerFee: input.customerFee,
    exp: Date.now() + QUOTE_TTL_MS,
  };
}
