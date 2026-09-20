import assert from 'node:assert/strict';
import {
  resolveStripeConnectDestination,
  STRIPE_CONNECT_OWNER_LIVE,
} from './stripe-connect-destination';

assert.equal(
  resolveStripeConnectDestination('acct_1UDRDcLzV1Sjysxx', {
    live: STRIPE_CONNECT_OWNER_LIVE,
  }),
  STRIPE_CONNECT_OWNER_LIVE,
  'ignora cuenta eliminada del cliente'
);

assert.equal(
  resolveStripeConnectDestination(null, {
    live: 'acct_1UDRDcLzV1Sjysxx',
    fallback: 'acct_1UDDqBQJSRc118AP',
  }),
  'acct_1UDDqBQJSRc118AP',
  'salta LIVE eliminada y usa fallback de test'
);

assert.equal(
  resolveStripeConnectDestination(null, {}),
  STRIPE_CONNECT_OWNER_LIVE,
  'default seguro = dueño live'
);

console.log('stripe-connect-destination tests: ok');
