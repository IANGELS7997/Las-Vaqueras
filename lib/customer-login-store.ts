const STORAGE_KEY = 'lv_customer_login';

export type StoredCustomerLogin = {
  firstName: string;
  lastName: string;
  phone: string;
};

function canUseStorage() {
  return typeof window !== 'undefined';
}

export function readStoredCustomerLogin(): StoredCustomerLogin | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCustomerLogin>;
    const firstName = typeof parsed.firstName === 'string' ? parsed.firstName.trim() : '';
    const lastName = typeof parsed.lastName === 'string' ? parsed.lastName.trim() : '';
    const phone = typeof parsed.phone === 'string' ? parsed.phone.trim() : '';
    if (!firstName || !lastName || !phone) return null;
    return { firstName, lastName, phone };
  } catch {
    return null;
  }
}

export function writeStoredCustomerLogin(login: StoredCustomerLogin) {
  if (!canUseStorage()) return;
  const firstName = login.firstName.trim();
  const lastName = login.lastName.trim();
  const phone = login.phone.trim();
  if (!firstName || !lastName || !phone) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ firstName, lastName, phone }));
}

export function clearStoredCustomerLogin() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
