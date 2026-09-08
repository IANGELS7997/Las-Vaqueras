const account = process.env.STRIPE_CONNECT_ACCOUNT_ID || 'acct_1UDRDcLzV1Sjysxx';
const key = process.env.STRIPE_API_KEY || process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Missing STRIPE_API_KEY');
  process.exit(1);
}

async function main() {
  const body = new URLSearchParams({
    account,
    refresh_url: 'https://pureiangel.com/',
    return_url: 'https://pureiangel.com/',
    type: 'account_onboarding',
    'collection_options[fields]': 'eventually_due',
  });
  const response = await fetch('https://api.stripe.com/v1/account_links', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await response.json();
  if (!response.ok) {
    console.error(JSON.stringify({ status: response.status, error: data.error || data }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ url: data.url, expires_at: data.expires_at }, null, 2));
}

main();
