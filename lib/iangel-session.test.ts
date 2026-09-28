import assert from 'node:assert/strict';
import { issueIangelToken, readIangelRiderKey } from './iangel-auth';
import { orderVisibleToRider, serviceIsBusy } from './iangel-presence';

process.env.IANGEL_API_SECRET = 'test-secret';

const angel = issueIangelToken('angel');
const adrian = issueIangelToken('rider-adrian');
assert.equal(readIangelRiderKey(angel), 'angel');
assert.equal(readIangelRiderKey(adrian), 'rider-adrian');
assert.equal(readIangelRiderKey(angel.slice(0, -2) + 'xx'), null);

assert.equal(orderVisibleToRider({}, 'angel'), true);
assert.equal(orderVisibleToRider({ iangel_rider_key: 'rider-adrian' }, 'rider-adrian'), true);
assert.equal(orderVisibleToRider({ iangel_rider_key: 'rider-adrian' }, 'angel'), false);

assert.equal(serviceIsBusy(['angel', 'rider-adrian'], ['angel']), false);
assert.equal(serviceIsBusy(['angel', 'rider-adrian'], ['angel', 'rider-adrian']), true);
assert.equal(serviceIsBusy(['angel'], [null]), true);
assert.equal(serviceIsBusy([], []), false);

console.log('iangel-session tests: ok');
