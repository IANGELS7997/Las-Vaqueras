/**
 * Creates the Las Vaqueras Express recipient account (live).
 * Requires STRIPE_API_KEY or STRIPE_SECRET_KEY in the environment.
 */
const payload = JSON.parse(
  require('fs').readFileSync(require('path').join(__dirname, 'las-vaqueras-connect-account.json'), 'utf8')
);
delete payload.include;

const key = process.env.STRIPE_API_KEY || process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Missing STRIPE_API_KEY');
  process.exit(1);
}

async function main() {
  const response = await fetch('https://api.stripe.com/v2/core/accounts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Stripe-Version': '2026-08-26.preview',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) {
    console.error(JSON.stringify({ status: response.status, error: body.error || body }, null, 2));
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        id: body.id,
        display_name: body.display_name,
        dashboard: body.dashboard,
        livemode: body.livemode,
      },
      null,
      2
    )
  );
}

main();
