const FONT = 'Inter,Segoe UI,Arial,sans-serif';
const LOGO = 'https://lasvaqueras.com.mx/logo-vaqueras.png';

export type MailButtonKind = 'primary' | 'secondary' | 'billing';

function esc(value: string) {
  return value.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;');
}

const BUTTON = {
  primary: { bg: '#f97316', color: '#ffffff', border: '#f97316', margin: '0 0 12px' },
  secondary: { bg: '#111111', color: '#ffffff', border: '#111111', margin: '0 0 12px' },
  billing: { bg: '#ffffff', color: '#c2410c', border: '#f97316', margin: '0' },
} as const;

/** Mismo ancho, alto, radio y letra. El color depende del tipo. */
export function mailButton(href: string, label: string, kind: MailButtonKind) {
  const style = BUTTON[kind];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:${style.margin};">
<tr>
<td bgcolor="${style.bg}" style="border-radius:12px;background-color:${style.bg};border:1px solid ${style.border};">
<a href="${href}" style="display:block;padding:14px 16px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:700;color:${style.color};text-decoration:none;text-align:center;">${label}</a>
</td>
</tr>
</table>`;
}

export function mailParagraph(inner: string, strong = false) {
  const weight = strong ? 'font-weight:700;color:#111111;' : '';
  return `<p style="margin:0 0 16px;${weight}">${inner}</p>`;
}

export function mailNote(inner: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fafafa" style="background-color:#fafafa;border:1px solid #ececec;border-radius:12px;margin:0 0 16px;">
<tr><td style="padding:16px;font-family:${FONT};font-size:15px;line-height:1.5;color:#3f3f46;">${inner}</td></tr>
</table>`;
}

/** Tarjeta clara de 440px. El cuerpo ya viene en HTML. Título y ceja se escapan aquí. */
export function mailDocument(input: { eyebrow?: string; title: string; body: string; footer?: string }) {
  const footer = input.footer
    ? `<tr>
<td align="center" bgcolor="#ffffff" style="padding:24px 32px 32px;background-color:#ffffff;font-family:${FONT};font-size:13px;line-height:1.5;color:#737373;">
${input.footer}
</td>
</tr>`
    : `<tr><td bgcolor="#ffffff" height="32" style="height:32px;font-size:0;line-height:0;background-color:#ffffff;">&nbsp;</td></tr>`;
  const eyebrowText = input.eyebrow?.trim() || '';
  const eyebrow = eyebrowText
    ? `<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#f97316;font-weight:700;">${esc(eyebrowText)}</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;color-scheme:light;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f5" style="background-color:#f4f4f5;">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="440" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:440px;background-color:#ffffff;border:1px solid #ececec;border-radius:16px;overflow:hidden;">
<tr>
<td bgcolor="#f97316" height="4" style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
</tr>
<tr>
<td align="center" bgcolor="#ffffff" style="padding:32px 32px 0;background-color:#ffffff;">
<img src="${LOGO}" alt="Las Vaqueras" width="112" style="display:block;margin:0 auto;border:0;outline:none;">
</td>
</tr>
<tr>
<td align="center" bgcolor="#ffffff" style="padding:24px 32px 0;background-color:#ffffff;font-family:${FONT};">
${eyebrow}
<h1 style="margin:0;font-size:22px;line-height:1.3;color:#111111;font-weight:700;">${esc(input.title)}</h1>
</td>
</tr>
<tr>
<td bgcolor="#ffffff" style="padding:16px 32px 0;background-color:#ffffff;font-family:${FONT};font-size:15px;line-height:1.5;color:#3f3f46;">
${input.body}
</td>
</tr>
${footer}
</table>
</td>
</tr>
</table>
</body>
</html>`;
}
