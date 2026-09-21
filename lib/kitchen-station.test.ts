import assert from 'node:assert/strict';
import {
  isKitchenStationOnline,
  shouldSendOfflineAlert,
  shouldSendOrderOfflineAlert,
  viewKitchenStation,
  type KitchenStationRow,
} from '@/lib/kitchen-station';

const now = Date.now();
const onlineRow: KitchenStationRow = {
  id: 'main',
  shift_active: true,
  auto_print: true,
  last_seen_at: new Date(now - 10_000).toISOString(),
  last_print_at: null,
  closed_at: null,
  offline_alert_sent_at: null,
  order_alert_sent_at: null,
  updated_at: new Date(now).toISOString(),
};

assert.equal(isKitchenStationOnline(onlineRow, now), true);
assert.equal(viewKitchenStation(onlineRow, now).printerReady, true);
assert.equal(shouldSendOfflineAlert(onlineRow, now), false);
assert.equal(shouldSendOrderOfflineAlert(onlineRow, now), false);

const offlineRow: KitchenStationRow = {
  ...onlineRow,
  last_seen_at: new Date(now - 120_000).toISOString(),
};
assert.equal(isKitchenStationOnline(offlineRow, now), false);
assert.equal(shouldSendOfflineAlert(offlineRow, now), true);
assert.equal(shouldSendOrderOfflineAlert(offlineRow, now), true);

console.log('kitchen-station.test.ts ok');
