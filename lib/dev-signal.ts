const HOUR_MS = 60 * 60 * 1000;
const SESSION_CAP = 40;
const IP_CAP = 200;
const ERROR_REPEAT_MS = 60 * 1000;

const STORE_TYPES = new Set(['visit', 'cart', 'payment_failed', 'dead_click', 'client_error']);
const RIDER_TYPES = new Set(['api_error', 'dead_click', 'client_error']);
const ALWAYS_SEND = new Set(['payment_failed', 'client_error']);

const BOT_UA =
  /googlebot|bingbot|duckduckbot|baiduspider|yandexbot|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|petalbot|ahrefsbot|semrushbot|mj12bot|dotbot|bytespider|gptbot|claudebot|amazonbot|applebot|pingdom|uptimerobot/i;

type Bucket = { start: number; count: number; visit: boolean };

const sessions = new Map<string, Bucket>();
const ips = new Map<string, Bucket>();
const recentErrors = new Map<string, number>();

export type DevSignalInput = {
  source?: unknown;
  type?: unknown;
  message?: unknown;
  page?: unknown;
  action?: unknown;
  at?: unknown;
  session?: unknown;
  device?: unknown;
  cart?: unknown;
};

export type DevSignalDecision = {
  forward: boolean;
  reason: string;
  payload?: Record<string, unknown>;
};

function clip(value: unknown, max: number) {
  const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max) : text;
}

function clipBlock(value: unknown, max: number) {
  const text = String(value == null ? '' : value).trim();
  return text.length > max ? text.slice(0, max) : text;
}

function stripCard(value: string) {
  return value.replace(/\d(?:[ -]?\d){12,18}/g, '[tarjeta]');
}

function bucket(map: Map<string, Bucket>, key: string, now: number) {
  const current = map.get(key);
  if (!current || now - current.start >= HOUR_MS) {
    const fresh = { start: now, count: 0, visit: false };
    map.set(key, fresh);
    return fresh;
  }
  return current;
}

function prune(map: Map<string, Bucket>, now: number) {
  if (map.size < 4000) return;
  map.forEach((value, key) => {
    if (now - value.start >= HOUR_MS) map.delete(key);
  });
}

function sourceOf(value: unknown) {
  const source = clip(value, 40);
  if (source === 'iangel-rider') return 'iangel-rider';
  if (!source || source === 'las-vaqueras') return 'las-vaqueras';
  return '';
}

function cartLines(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.slice(0, 30).map((item) => {
    if (!item || typeof item !== 'object') return { name: clip(item, 80), quantity: 1 };
    const row = item as Record<string, unknown>;
    return {
      name: clip(row.name, 80),
      quantity: Number.isFinite(Number(row.quantity)) ? Number(row.quantity) : 1,
      options: clip(Array.isArray(row.options) ? row.options.join(', ') : row.options, 160),
      extras: clip(Array.isArray(row.extras) ? row.extras.join(', ') : row.extras, 160),
      removals: clip(Array.isArray(row.removals) ? row.removals.join(', ') : row.removals, 160),
      note: clip(row.note, 160),
    };
  });
}

export function decideDevSignal(
  input: DevSignalInput,
  meta: { userAgent: string; ip: string; now?: number }
): DevSignalDecision {
  if (BOT_UA.test(meta.userAgent || '')) return { forward: false, reason: 'bot' };

  const source = sourceOf(input.source);
  const type = clip(input.type, 40);
  const allowed =
    source === 'iangel-rider' ? RIDER_TYPES.has(type) : source === 'las-vaqueras' && STORE_TYPES.has(type);
  if (!allowed) return { forward: false, reason: 'type' };

  const now = meta.now ?? Date.now();
  prune(sessions, now);
  prune(ips, now);

  const message = stripCard(clipBlock(input.message, 1500));
  let errorKey = '';
  if (type === 'client_error') {
    errorKey = `${source}:${message.slice(0, 240)}`;
    const seen = recentErrors.get(errorKey) || 0;
    if (seen && now - seen < ERROR_REPEAT_MS) return { forward: false, reason: 'repeat' };
  }

  const ipKey = clip(meta.ip, 80) || 'unknown';
  const ipBucket = bucket(ips, ipKey, now);
  if (ipBucket.count >= IP_CAP) return { forward: false, reason: 'ip' };

  const sessionRaw = clip(input.session, 64).replace(/[^a-zA-Z0-9_-]/g, '');
  const sessionKey = `${source}:${sessionRaw || `ip:${ipKey}`}`;
  if (!ALWAYS_SEND.has(type)) {
    const sessionBucket = bucket(sessions, sessionKey, now);
    if (type === 'visit' && sessionBucket.visit) return { forward: false, reason: 'visit' };
    if (sessionBucket.count >= SESSION_CAP) return { forward: false, reason: 'cap' };
    sessionBucket.count += 1;
    if (type === 'visit') sessionBucket.visit = true;
  }
  ipBucket.count += 1;

  const payload: Record<string, unknown> = {
    source,
    type,
    message,
    page: clip(input.page, 300),
    action: clip(input.action, 200),
    at: clip(input.at, 40) || new Date(now).toISOString(),
    device: clip(input.device, 300),
  };
  const cart = cartLines(input.cart);
  if (cart && (type === 'cart' || type === 'payment_failed')) payload.cart = cart;
  if (errorKey) {
    recentErrors.set(errorKey, now);
    if (recentErrors.size > 2000) {
      recentErrors.forEach((at, key) => {
        if (now - at >= ERROR_REPEAT_MS) recentErrors.delete(key);
      });
    }
  }
  return { forward: true, reason: 'ok', payload };
}

export async function forwardDevSignal(payload: Record<string, unknown>) {
  const url = (process.env.N8N_DEV_SIGNAL_URL || '').trim();
  const secret = (process.env.N8N_DEV_SIGNAL_SECRET || '').trim();
  if (!url || !secret) return false;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LV-Dev-Signal': secret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
