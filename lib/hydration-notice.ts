const RECOVERED = /Minified React error #(?:418|422|423|425)\b|Hydration failed|Text content does not match|There was an error while hydrating|did not match server-rendered HTML|Hydration Error/i;

export function isRecoveredHydrationNotice(message: string) {
  return RECOVERED.test(message || '');
}
