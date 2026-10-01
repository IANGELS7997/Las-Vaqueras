'use client';

import type { CartItem } from '@/types';

export type StoreSignalType = 'visit' | 'cart' | 'payment_failed' | 'dead_click' | 'client_error';

const SESSION_KEY = 'lv_dev_session';
const VISIT_KEY = 'lv_dev_visit';

let cartTimer: ReturnType<typeof setTimeout> | null = null;
let netSeq = 0;
let networkPatched = false;
const recentClientErrors = new Map<string, number>();

function clip(value: string, max: number) {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max) : text;
}

function stripCard(value: string) {
  return value.replace(/\d(?:[ -]?\d){12,18}/g, '[tarjeta]');
}

export function devSessionId() {
  try {
    const current = sessionStorage.getItem(SESSION_KEY);
    if (current) return current;
    const next = crypto.randomUUID().replace(/-/g, '');
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return '';
  }
}

export function isKitchenSurface() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host === 'cocina.lasvaqueras.com.mx' || host.startsWith('cocina.')) return true;
  return window.location.pathname.startsWith('/admin');
}

export function deviceLabel() {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent || '';
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const platform = navigator.platform || '';
  return clip(`${mobile ? 'móvil' : 'escritorio'} · ${platform} · ${ua}`, 300);
}

export function summarizeCart(items: CartItem[]) {
  return items.slice(0, 30).map((item) => ({
    name: item.name,
    quantity: item.quantity,
    options: (item.selections || []).flatMap((sel) => sel.choices || []),
    extras: (item.extras || []).map((extra) => extra.name),
    removals: item.removals || [],
    note: item.specialInstructions || '',
  }));
}

export function postDevSignal(input: {
  type: StoreSignalType;
  message?: string;
  page?: string;
  action?: string;
  at?: string;
  device?: string;
  cart?: ReturnType<typeof summarizeCart>;
}) {
  if (typeof window === 'undefined') return;
  if (isKitchenSurface() && input.type !== 'client_error') return;
  const body = {
    source: 'las-vaqueras',
    type: input.type,
    message: stripCard(input.message || ''),
    page: input.page || `${window.location.pathname}${window.location.search}`,
    action: input.action || '',
    at: input.at || new Date().toISOString(),
    session: devSessionId(),
    device: input.device || '',
    cart: input.cart,
  };
  void fetch('/api/ops/dev-signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}

export function markVisitSent() {
  try {
    if (sessionStorage.getItem(VISIT_KEY)) return false;
    sessionStorage.setItem(VISIT_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export function scheduleCartSignal(items: CartItem[]) {
  if (cartTimer) clearTimeout(cartTimer);
  const cart = summarizeCart(items);
  cartTimer = setTimeout(() => {
    cartTimer = null;
    const lines = cart.map((item) => `${item.quantity}× ${item.name}`).join(', ');
    postDevSignal({
      type: 'cart',
      message: lines || 'Carrito vacío',
      cart,
      action: 'carrito',
    });
  }, 10_000);
}

export function cancelCartSignal() {
  if (cartTimer) clearTimeout(cartTimer);
  cartTimer = null;
}

export function reportPaymentFailed(message: string, items: CartItem[]) {
  postDevSignal({
    type: 'payment_failed',
    message: message || 'El pago no se completó',
    action: 'confirmPayment',
    cart: summarizeCart(items),
  });
}

export function reportClientError(message: string, stack?: string) {
  const text = stripCard(`${message || 'Error'}${stack ? `\n${stack}` : ''}`).slice(0, 1500);
  if (!text || text.includes('/api/ops/dev-signal')) return;
  const now = Date.now();
  const seen = recentClientErrors.get(text.slice(0, 240)) || 0;
  if (seen && now - seen < 60_000) return;
  recentClientErrors.set(text.slice(0, 240), now);
  postDevSignal({
    type: 'client_error',
    message: text,
    action: 'navegador',
  });
}

function watchNetwork() {
  if (networkPatched || typeof window === 'undefined') return;
  networkPatched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    netSeq += 1;
    return originalFetch(input, init);
  };
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function send(this: XMLHttpRequest, ...args: Parameters<XMLHttpRequest['send']>) {
    netSeq += 1;
    return originalSend.apply(this, args);
  };
  const originalBeacon = navigator.sendBeacon?.bind(navigator);
  if (originalBeacon) {
    navigator.sendBeacon = (url, data) => {
      netSeq += 1;
      return originalBeacon(url, data);
    };
  }
}

function controlText(control: Element) {
  const label = control.getAttribute('aria-label') || control.textContent || control.getAttribute('href') || '';
  return clip(label, 80) || 'sin texto';
}

export function installDeadClickWatch() {
  if (typeof document === 'undefined' || isKitchenSurface()) return () => undefined;
  watchNetwork();
  const onClick = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest('button, a, [role="button"]');
    if (!control || control.closest('[data-lv-signal-ignore]')) return;
    if (control.matches(':disabled') || control.getAttribute('aria-disabled') === 'true') return;
    if (control instanceof HTMLAnchorElement) {
      const href = control.getAttribute('href') || '';
      if (control.target === '_blank' && href && !href.startsWith('#')) return;
      if (/^(mailto:|tel:|sms:)/i.test(href)) return;
    }
    const text = controlText(control);
    const page = window.location.href;
    const startUrl = page;
    const startNet = netSeq;
    let changed = false;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'childList' || record.type === 'characterData') changed = true;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.setTimeout(() => {
      observer.disconnect();
      if (changed || window.location.href !== startUrl || netSeq !== startNet) return;
      postDevSignal({
        type: 'dead_click',
        message: text,
        action: text,
        page,
      });
    }, 1000);
  };
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
