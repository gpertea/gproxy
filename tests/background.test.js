import test from 'node:test';
import assert from 'node:assert/strict';

// exercise the real worker through its message boundary with browser APIs mocked.
let receiver;
let saved = {};
let level = 'controllable_by_this_extension';
let effective = { mode: 'system' };
let failStorage = false;
let ignoreNextSet = false;
const events = { addListener() {} };
globalThis.chrome = {
  runtime: { id: 'test', getURL: file => `chrome-extension://test/${file}`,
    onMessage: { addListener: fn => { receiver = fn; } }, onInstalled: events, onStartup: events },
  storage: { local: { get: async () => structuredClone(saved), set: async value => {
    if (failStorage) throw new Error('Storage failed');
    saved = structuredClone(value);
  } } },
  action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {}, setTitle: async () => {} },
  proxy: { settings: { onChange: events,
    get: async () => ({ value: structuredClone(effective), levelOfControl: level }),
    set: async ({ value }) => {
      if (ignoreNextSet) { ignoreNextSet = false; return; }
      effective = structuredClone(value); level = 'controlled_by_this_extension';
    },
    clear: async () => { effective = { mode: 'system' }; level = 'controllable_by_this_extension'; }
  } }
};
await import('../extension/background.js');
const sender = { id: 'test', url: 'chrome-extension://test/popup.html' };
const request = message => new Promise(resolve => receiver(message, sender, resolve));
const config = { scheme: 'socks5', host: 'proxy.example.org', port: 1080, bypassLan: true, bypass: '' };

test('worker validates messages, reports conflicts, switches explicitly and rolls back persistence failures', async () => {
  assert.equal(receiver({ type: 'direct' }, { id: 'other', url: sender.url }, () => {}), false);
  assert.equal(receiver({ type: 'direct' }, { id: 'test', url: 'https://example.org' }, () => {}), false);
  assert.equal((await request({ type: 'state' })).value.mode, 'other');
  assert.equal((await request({ type: 'proxy' })).ok, false);
  assert.equal((await request({ type: 'save', config })).ok, true);
  assert.equal(effective.mode, 'system');
  assert.equal((await request({ type: 'proxy' })).value.mode, 'proxy');
  const before = structuredClone(effective);
  failStorage = true;
  assert.equal((await request({ type: 'save', config: { ...config, port: 3128 } })).ok, false);
  assert.deepEqual(effective, before);
  failStorage = false;
  const concurrent = await Promise.all([request({ type: 'direct' }), request({ type: 'proxy' })]);
  assert.equal(concurrent[0].value.mode, 'direct');
  assert.equal(concurrent[1].value.mode, 'proxy');
  level = 'controlled_by_other_extensions';
  assert.equal((await request({ type: 'direct' })).ok, false);
  assert.deepEqual(effective, before);
  level = 'controlled_by_this_extension';
  assert.equal((await request({ type: 'direct' })).value.mode, 'direct');
  assert.deepEqual(effective, { mode: 'direct' });
  ignoreNextSet = true;
  const rejected = await request({ type: 'proxy' });
  assert.equal(rejected.ok, false);
  assert.match(rejected.error, /did not apply/);
  assert.deepEqual(effective, { mode: 'direct' });
  assert.equal((await request({ type: 'setState', args: [] })).ok, false);
});
