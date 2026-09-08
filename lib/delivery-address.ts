export const CHIHUAHUA_CENTER = { lat: 28.635, lng: -106.089 };

export type DeliveryAddressParts = {
  street: string;
  extNumber: string;
  intNumber?: string;
  colonia: string;
  postalCode: string;
};

export function formatDeliveryAddress(parts: DeliveryAddressParts): string {
  const interior = parts.intNumber?.trim() ? ` Int. ${parts.intNumber.trim()}` : '';
  return `${parts.street.trim()} #${parts.extNumber.trim()}${interior}, Col. ${parts.colonia.trim()}, CP ${parts.postalCode.trim()}, Chihuahua, Chih.`;
}

export function formatDeliveryReferences(notes: string, lat?: number | null, lng?: number | null): string {
  const cleanNotes = notes
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('Ubicación:'))
    .join('\n');
  const lines = [];
  if (cleanNotes) lines.push(cleanNotes);
  if (typeof lat === 'number' && typeof lng === 'number') {
    lines.push(`Ubicación: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  }
  return lines.join('\n');
}

export function isValidPostalCode(value: string): boolean {
  return /^\d{5}$/.test(value.trim());
}

export function isValidCoord(lat: number, lng: number): boolean {
  return lat >= 28.3 && lat <= 28.9 && lng >= -106.4 && lng <= -105.7;
}
