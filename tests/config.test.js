import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_CONFIG, LAN_RANGES, normalizeConfig, proxyValue, matchesProxy } from '../extension/config.js';

const config = { ...DEFAULT_CONFIG, host: 'proxy.example.org', port: 1080 };
test('LAN exclusions are optional; no direct fallback or PAC script', () => {
  const value = proxyValue(config);
  assert.equal(value.mode, 'fixed_servers');
  assert.deepEqual(value.rules.bypassList, LAN_RANGES);
  assert.deepEqual(proxyValue({ ...config, bypassLan: false }).rules.bypassList, []);
  assert.ok(!JSON.stringify(value).includes('direct://'));
  assert.ok(matchesProxy(value, config));
  assert.ok(!matchesProxy({ mode: 'direct' }, config));
  assert.ok(!matchesProxy(proxyValue({ ...config, port: 3128 }), config));
});
test('rejects credentials, URL injection, malformed hosts and ports', () => {
  for (const host of ['user:pass@host', 'https://host', 'host/path', 'host?x=1', 'host\nother', '256.2.3.4', '127.1', '0127.0.0.1', '-host', 'host..org']) {
    assert.throws(() => normalizeConfig({ ...config, host }), host);
  }
  for (const port of [0, 65536, 1.5, '1080', null, NaN]) assert.throws(() => normalizeConfig({ ...config, port }));
  assert.throws(() => normalizeConfig({ ...config, scheme: 'direct' }));
  assert.throws(() => normalizeConfig({ ...config, bypassLan: 'true' }));
});
test('HTTP uses singleProxy; SOCKS5 and HTTPS use fallbackProxy', () => {
  for (const scheme of ['socks5', 'http', 'https']) {
    const settings = { ...config, scheme };
    const value = proxyValue(settings);
    assert.ok(matchesProxy(value, settings));
    assert.equal(Boolean(value.rules.singleProxy), scheme === 'http');
    assert.equal(Boolean(value.rules.fallbackProxy), scheme !== 'http');
  }
});
test('normalizes without retaining unknown fields or credentials', () => {
  assert.deepEqual(normalizeConfig({ ...config, host: ' Proxy.Example.Org ', password: 'not-stored' }), config);
  assert.equal(normalizeConfig({ ...config, host: '[::1]' }).host, '[::1]');
  assert.equal(normalizeConfig(DEFAULT_CONFIG, { requireHost: false }).host, '');
  assert.throws(() => proxyValue(DEFAULT_CONFIG));
});
test('supports explicit LAN hostnames and literal IP ranges without broad syntax injection', () => {
  const bypass = '*.example.internal\nrouter\n10.20.0.0/16\nfc00::/7\n[::1]\n<local>,router';
  assert.equal(normalizeConfig({ ...config, bypass }).bypass.split('\n').length, 6);
  for (const rule of ['*', '<-loopback>', 'https://example.org', '10.0.0.0/33', 'fc00::/129', 'host;DIRECT', 'user@host']) {
    assert.throws(() => normalizeConfig({ ...config, bypass: rule }), rule);
  }
});
test('manifest limits capabilities and disallows network requests', async () => {
  const manifest = JSON.parse(await readFile(new URL('../extension/manifest.json', import.meta.url)));
  assert.deepEqual(manifest.permissions.sort(), ['proxy', 'storage']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.externally_connectable, undefined);
  assert.equal(manifest.update_url, undefined);
  assert.match(manifest.content_security_policy.extension_pages, /connect-src 'none'/);
});
