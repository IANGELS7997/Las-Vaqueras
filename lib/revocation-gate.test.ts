import assert from 'node:assert/strict';
import { revocationDecision } from './revocation-gate';

const kitchen = 'cocina.lasvaqueras.com.mx';

assert.equal(
  revocationDecision({
    host: 'lasvaqueras.com.mx',
    pathname: '/',
    kitchenHost: kitchen,
    local: false,
  }),
  'blank-page'
);

assert.equal(
  revocationDecision({
    host: 'www.lasvaqueras.com.mx',
    pathname: '/menu',
    kitchenHost: kitchen,
    local: false,
  }),
  'blank-page'
);

assert.equal(
  revocationDecision({
    host: 'lasvaqueras.com.mx',
    pathname: '/checkout',
    kitchenHost: kitchen,
    local: false,
  }),
  'blank-page'
);

assert.equal(
  revocationDecision({
    host: 'lasvaqueras.com.mx',
    pathname: '/api/checkout',
    kitchenHost: kitchen,
    local: false,
  }),
  'blank-api'
);

assert.equal(
  revocationDecision({
    host: 'lasvaqueras.com.mx',
    pathname: '/api/iangel/queue',
    kitchenHost: kitchen,
    local: false,
  }),
  'keep'
);

assert.equal(
  revocationDecision({
    host: 'lasvaqueras.com.mx',
    pathname: '/api/ops/health',
    kitchenHost: kitchen,
    local: false,
  }),
  'keep'
);

assert.equal(
  revocationDecision({
    host: 'lasvaqueras.com.mx',
    pathname: '/api/store-status',
    kitchenHost: kitchen,
    local: false,
  }),
  'keep'
);

assert.equal(
  revocationDecision({
    host: 'lasvaqueras.com.mx',
    pathname: '/api/cron/experience-email',
    kitchenHost: kitchen,
    local: false,
  }),
  'keep'
);

assert.equal(
  revocationDecision({
    host: 'lasvaqueras.com.mx',
    pathname: '/api/uber/webhook',
    kitchenHost: kitchen,
    local: false,
  }),
  'keep'
);

assert.equal(
  revocationDecision({
    host: kitchen,
    pathname: '/',
    kitchenHost: kitchen,
    local: false,
  }),
  'blank-page'
);

assert.equal(
  revocationDecision({
    host: kitchen,
    pathname: '/admin/login',
    kitchenHost: kitchen,
    local: false,
  }),
  'blank-page'
);

assert.equal(
  revocationDecision({
    host: kitchen,
    pathname: '/api/kitchen/login',
    kitchenHost: kitchen,
    local: false,
  }),
  'blank-api'
);

assert.equal(
  revocationDecision({
    host: 'localhost',
    pathname: '/',
    kitchenHost: kitchen,
    local: true,
  }),
  'passthrough'
);

console.log('revocation-gate tests: ok');
