import { RESTAURANT_INFO } from '@/lib/restaurant';

type OrgToken = {
  access_token: string;
  expires_at: number;
};

let cachedOrgToken: OrgToken | null = null;

function orgCredentials() {
  const clientId = process.env.UBER_DIRECT_CLIENT_ID || '';
  const secret = process.env.UBER_DIRECT_CLIENT_SECRET || '';
  const customerId = process.env.UBER_DIRECT_CUSTOMER_ID || '';
  if (!clientId || !customerId || !secret || secret.includes('n8n_BLANK_VALUE') || secret.length < 16) {
    throw new Error('Faltan credenciales de Uber Direct para Organizations.');
  }
  return { clientId, secret, customerId };
}

function uberErrorMessage(payload: { message?: string; code?: string }, fallback: string) {
  if (payload.message && payload.code) return `${payload.code}: ${payload.message}`;
  return payload.message || payload.code || fallback;
}

async function getOrganizationsToken(): Promise<string> {
  if (cachedOrgToken && cachedOrgToken.expires_at > Date.now() + 30_000) {
    return cachedOrgToken.access_token;
  }
  const { clientId, secret } = orgCredentials();
  const response = await fetch('https://auth.uber.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      grant_type: 'client_credentials',
      scope: 'direct.organizations',
    }),
  });
  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        'Uber rechazó el alcance direct.organizations. Actívalo en Direct → Developer.'
    );
  }
  cachedOrgToken = {
    access_token: payload.access_token,
    expires_at: Date.now() + Math.max(60, payload.expires_in || 3600) * 1000,
  };
  return cachedOrgToken.access_token;
}

function mxPhoneDetails() {
  const digits = RESTAURANT_INFO.phone.replace(/\D/g, '');
  const withCountry = digits.startsWith('52') ? digits : `52${digits}`;
  return {
    phone_number: withCountry,
    country_code: '52',
    subscriber_number: withCountry.slice(2),
  };
}

export type DirectOrganization = {
  organizationId: string;
  name: string | null;
  billingStatus: string | null;
  billingType: string | null;
  merchantType: string | null;
  parentOrganizationId: string | null;
};

function parseOrg(payload: Record<string, unknown>): DirectOrganization {
  const info = (payload.info && typeof payload.info === 'object' ? payload.info : {}) as Record<
    string,
    unknown
  >;
  const hierarchy = (
    payload.hierarchy_info && typeof payload.hierarchy_info === 'object' ? payload.hierarchy_info : {}
  ) as Record<string, unknown>;
  const billing = (
    payload.billing_info && typeof payload.billing_info === 'object' ? payload.billing_info : {}
  ) as Record<string, unknown>;
  return {
    organizationId: String(payload.organization_id || ''),
    name: typeof info.name === 'string' ? info.name : null,
    billingStatus: typeof billing.billing_status === 'string' ? billing.billing_status : null,
    billingType: typeof info.billing_type === 'string' ? info.billing_type : null,
    merchantType: typeof info.merchant_type === 'string' ? info.merchant_type : null,
    parentOrganizationId:
      typeof hierarchy.parent_organization_id === 'string' ? hierarchy.parent_organization_id : null,
  };
}

/** GET /v1/direct/organizations/{id} — no crea sucursales. */
export async function getDirectOrganization(organizationId?: string): Promise<DirectOrganization> {
  const { customerId } = orgCredentials();
  const id = organizationId || customerId;
  const token = await getOrganizationsToken();
  const response = await fetch(`https://api.uber.com/v1/direct/organizations/${id}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const payload = (await response.json()) as Record<string, unknown> & {
    message?: string;
    code?: string;
  };
  if (!response.ok || !payload.organization_id) {
    throw new Error(uberErrorMessage(payload, 'No se pudo leer la organización de Uber Direct'));
  }
  return parseOrg(payload);
}

/**
 * Crea una sub-organización. Uber no las borra por API.
 * No llamar desde checkout. Solo script con UBER_ORG_CONFIRM=1.
 */
export async function createDirectSubOrganization(input: {
  name: string;
  parentOrganizationId?: string;
  contactEmail: string;
  firstName?: string;
  lastName?: string;
}): Promise<DirectOrganization> {
  const { customerId } = orgCredentials();
  const token = await getOrganizationsToken();
  const body = {
    info: {
      name: input.name,
      billing_type: 'BILLING_TYPE_CENTRALIZED',
      merchant_type: 'MERCHANT_TYPE_RESTAURANT',
      point_of_contact: {
        email: input.contactEmail,
        phone_details: mxPhoneDetails(),
        first_name: input.firstName || 'Admin',
        last_name: input.lastName || 'Vaqueras',
      },
    },
    hierarchy_info: {
      parent_organization_id: input.parentOrganizationId || customerId,
    },
    options: {
      onboarding_invite_type: 'ONBOARDING_INVITE_TYPE_INVALID',
    },
  };
  const response = await fetch('https://api.uber.com/v1/direct/organizations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as Record<string, unknown> & {
    message?: string;
    code?: string;
  };
  if (!response.ok || !payload.organization_id) {
    throw new Error(uberErrorMessage(payload, 'No se pudo crear la sub-organización'));
  }
  return parseOrg(payload);
}

export async function inviteDirectOrganizationUser(input: {
  organizationId?: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: 'ROLE_ADMIN' | 'ROLE_EMPLOYEE' | 'ROLE_SUPPORT';
}): Promise<{ membershipId: string | null; organizationId: string }> {
  const { customerId } = orgCredentials();
  const organizationId = input.organizationId || customerId;
  const token = await getOrganizationsToken();
  const response = await fetch(
    `https://api.uber.com/v1/direct/organizations/${organizationId}/memberships/invite`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_details: {
          email: input.email,
          first_name: input.firstName,
          last_name: input.lastName,
          phone_details: mxPhoneDetails(),
        },
        roles: [input.role || 'ROLE_EMPLOYEE'],
      }),
    }
  );
  const payload = (await response.json()) as {
    membership_id?: string;
    organization_id?: string;
    message?: string;
    code?: string;
  };
  if (!response.ok) {
    throw new Error(uberErrorMessage(payload, 'No se pudo invitar al usuario'));
  }
  return {
    membershipId: payload.membership_id || null,
    organizationId: payload.organization_id || organizationId,
  };
}
