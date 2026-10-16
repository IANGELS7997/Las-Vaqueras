import assert from 'node:assert/strict';
import { kitchenPowerPatch } from './kitchen-power';
import { kitchenSessionToken, readKitchenSession, sessionGenerationMatches } from './kitchen-auth';

const now = '2026-10-16T05:00:00.000Z';

const off = kitchenPowerPatch({ admin_enabled: true, session_generation: 2, shift_active: true }, false, now);
assert.equal(off.admin_enabled, false);
assert.equal(off.shift_active, false);
assert.equal(off.auto_print, false);
assert.equal(off.closed_at, now);
assert.equal(off.session_generation, 3);

const again = kitchenPowerPatch({ admin_enabled: false, session_generation: 3, shift_active: false }, false, now);
assert.equal(again.session_generation, undefined);

const on = kitchenPowerPatch({ admin_enabled: false, session_generation: 3, shift_active: false }, true, now);
assert.equal(on.admin_enabled, true);
assert.equal(on.shift_active, undefined);
assert.equal(on.session_generation, undefined);

assert.equal(sessionGenerationMatches(3, 3), true);
assert.equal(sessionGenerationMatches(2, 3), false);
assert.equal(sessionGenerationMatches(2, null), true);

const legacy = kitchenPowerPatch(null, false, now);
assert.equal(legacy.session_generation, 1);

async function main() {
  process.env.KITCHEN_PASSWORD = 'gate-test';
  const token = await kitchenSessionToken('norte', 4);
  const read = await readKitchenSession(token);
  assert.equal(read?.branch, 'norte');
  assert.equal(read?.generation, 4);
  assert.equal(await readKitchenSession('norte.nope'), null);
}

void main();
