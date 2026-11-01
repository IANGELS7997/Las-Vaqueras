export function sameWebhookSecret(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

export function opsWebhookAuthorized(req: Request) {
  const secret = req.headers.get('x-webhook-secret') || '';
  const expected = process.env.IANGEL_OPS_WEBHOOK_SECRET || '';
  return sameWebhookSecret(secret, expected);
}
