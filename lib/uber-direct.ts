import { RESTAURANT_INFO } from '@/lib/restaurant';

type UberToken = {
  access_token: string;
  expires_at: number;
  cacheKey: string;
};

type UberCredentials = {
  customerId: string;
  clientId: string;
  clientSecret: string;
  sandbox: boolean;
};

let cachedToken: UberToken | null = null;

function useSandboxCredentials(): boolean {
  return process.env.UBER_USE_SANDBOX === '1';
}

function resolveUberCredentials(): UberCredentials {
  if (useSandboxCredentials()) {
    return {
      customerId: process.env.UBER_PRUEBAS_API_CUSTOMER || '',
      clientId: process.env.UBER_PRUEBAS_API_CLIENT_ID || '',
      clientSecret: process.env.UBER_PRUEBAS_CLIENT_SECRET || '',
      sandbox: true,
    };
  }
  return {
    customerId: process.env.UBER_DIRECT_CUSTOMER_ID || '',
    clientId: process.env.UBER_DIRECT_CLIENT_ID || '',
    clientSecret: process.env.UBER_DIRECT_CLIENT_SECRET || '',
    sandbox: false,
  };
}

function credentialsAreReady(creds: UberCredentials): boolean {
  if (!creds.clientId || !creds.customerId || !creds.clientSecret) return false;
  if (creds.clientSecret.includes('n8n_BLANK_VALUE')) return false;
  return creds.clientSecret.length >= 16;
}

export function isUberQuoteConfigured(): boolean {
  return credentialsAreReady(resolveUberCredentials());
}

function toE164Mx(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('52') && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10) return `+52${digits}`;
  return RESTAURANT_INFO.phone.replace(/\s/g, '');
}

function encodeAddress(input: {
  street: string;
  city?: string;
  zipCode: string;
}): string {
  return JSON.stringify({
    street_address: [input.street],
    city: input.city || RESTAURANT_INFO.city,
    state: RESTAURANT_INFO.state,
    zip_code: input.zipCode,
    country: RESTAURANT_INFO.country,
  });
}

async function getAccessToken(): Promise<{ token: string; creds: UberCredentials }> {
  const creds = resolveUberCredentials();
  const cacheKey = `${creds.sandbox ? 'sandbox' : 'live'}:${creds.clientId}`;
  if (cachedToken && cachedToken.cacheKey === cacheKey && cachedToken.expires_at > Date.now() + 30_000) {
    return { token: cachedToken.access_token, creds };
  }
  if (!credentialsAreReady(creds)) {
    throw new Error(
      creds.sandbox
        ? 'Faltan credenciales sandbox de Uber Direct (UBER_PRUEBAS_API_CUSTOMER, UBER_PRUEBAS_API_CLIENT_ID, UBER_PRUEBAS_CLIENT_SECRET).'
        : 'Falta el Client Secret real de Uber Direct. El valor de n8n es un placeholder, cópialo desde https://direct.uber.com (Developer).'
    );
  }

  const response = await fetch('https://auth.uber.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: 'client_credentials',
      scope: 'eats.deliveries',
    }),
  });
  const payload = (await response.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error || 'Uber rechazó las credenciales');
  }
  cachedToken = {
    access_token: payload.access_token,
    expires_at: Date.now() + Math.max(60, payload.expires_in || 3600) * 1000,
    cacheKey,
  };
  return { token: cachedToken.access_token, creds };
}

export type DeliveryQuote = {
  quoteId: string;
  fee: number;
  durationMinutes: number | null;
  expiresAt: string | null;
};

export async function createDeliveryQuote(input: {
  dropoffStreet: string;
  dropoffZip: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffPhone?: string;
}): Promise<DeliveryQuote> {
  const { token, creds } = await getAccessToken();
  const customerId = creds.customerId;
  const pickupPhone = toE164Mx(RESTAURANT_INFO.phone);
  const body: Record<string, unknown> = {
    pickup_address: encodeAddress({
      street: RESTAURANT_INFO.pickupStreet,
      zipCode: RESTAURANT_INFO.zipCode,
    }),
    dropoff_address: encodeAddress({
      street: input.dropoffStreet,
      zipCode: input.dropoffZip,
    }),
    pickup_latitude: RESTAURANT_INFO.pickupLat,
    pickup_longitude: RESTAURANT_INFO.pickupLng,
    dropoff_latitude: input.dropoffLat,
    dropoff_longitude: input.dropoffLng,
    pickup_phone_number: pickupPhone,
    pickup_name: RESTAURANT_INFO.name,
  };
  if (input.dropoffPhone && input.dropoffPhone.replace(/\D/g, '').length >= 10) {
    body.dropoff_phone_number = toE164Mx(input.dropoffPhone);
  }

  const response = await fetch(
    `https://api.uber.com/v1/customers/${customerId}/delivery_quotes`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  const payload = (await response.json()) as {
    id?: string;
    fee?: number;
    duration?: number;
    expires?: string;
    message?: string;
    code?: string;
  };
  if (!response.ok || typeof payload.fee !== 'number' || !payload.id) {
    throw new Error(payload.message || 'Uber no pudo cotizar esta ruta');
  }

  return {
    quoteId: payload.id,
    fee: Math.round(payload.fee) / 100,
    durationMinutes: typeof payload.duration === 'number' ? payload.duration : null,
    expiresAt: payload.expires || null,
  };
}

export type ManifestItem = {
  name: string;
  quantity: number;
  size?: 'small' | 'medium' | 'large';
};

export type CreatedDelivery = {
  deliveryId: string;
  status: string | null;
  trackingUrl: string | null;
  fee: number | null;
  sandbox: boolean;
};

/** D8: Next.js must never create Uber Direct deliveries. n8n node stays off. */
export async function createDelivery(_input: {
  quoteId: string;
  dropoffStreet: string;
  dropoffZip: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffName: string;
  dropoffPhone: string;
  dropoffNotes?: string;
  manifestItems: ManifestItem[];
  externalId?: string;
}): Promise<CreatedDelivery> {
  throw new Error(
    'createDelivery está desactivado en Next.js (D8). El nodo n8n Create Uber Direct permanece apagado hasta que el dueño active el workflow.'
  );
}
