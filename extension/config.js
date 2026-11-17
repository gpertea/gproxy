export const DEFAULT_CONFIG = Object.freeze({
  scheme: 'socks5', host: '', port: 1080, bypassLan: true, bypass: ''
});

export const LAN_RANGES = Object.freeze([
  '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',
  '169.254.0.0/16', 'fc00::/7', 'fe80::/10'
]);

function validHost(host) {
  if (typeof host !== 'string' || host.length > 253 || !host) return false;
  if (host.startsWith('[') && host.endsWith(']')) {
    try { return new URL(`http://${host}/`).hostname === host.toLowerCase(); }
    catch { return false; }
  }
  if (/^[\d.]+$/.test(host)) {
    return host.split('.').length === 4 && host.split('.').every(
      part => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255);
  }
  return host.split('.').every(label =>
    /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label));
}

function validBypass(rule) {
  if (rule === '<local>') return true;
  const slash = rule.lastIndexOf('/');
  if (slash >= 0) {
    const ip = rule.slice(0, slash);
    const prefix = rule.slice(slash + 1);
    if (!/^\d{1,3}$/.test(prefix)) return false;
    if (ip.includes(':')) {
      try { new URL(`http://[${ip}]/`); } catch { return false; }
      return Number(prefix) <= 128;
    }
    return /^[\d.]+$/.test(ip) && validHost(ip) && Number(prefix) <= 32;
  }
  if (rule.startsWith('[')) return validHost(rule);
  if (rule.startsWith('*.')) return validHost(rule.slice(2));
  if (rule.startsWith('.')) return validHost(rule.slice(1));
  return validHost(rule);
}

export function normalizeConfig(input, { requireHost = true } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid configuration.');
  }
  const { scheme, bypassLan } = input;
  const host = typeof input.host === 'string' ? input.host.trim().toLowerCase() : '';
  const port = input.port;
  if (!['socks5', 'http', 'https'].includes(scheme)) throw new Error('Choose a supported protocol.');
  if ((requireHost || host) && !validHost(host)) {
    throw new Error('Enter a hostname or IP, without a scheme, path, or credentials. Use brackets for IPv6.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be 1-65535.');
  if (typeof bypassLan !== 'boolean') throw new Error('Invalid LAN setting.');
  if (typeof input.bypass !== 'string' || input.bypass.length > 8192) throw new Error('Bypass list is too long.');
  const rules = [...new Set(input.bypass.split(/[\n,]+/).map(s => s.trim()).filter(Boolean))];
  if (rules.length > 100 || rules.some(rule => !validBypass(rule))) {
    throw new Error('Use hostnames, *.domain patterns, IPs, CIDR ranges, or <local>, one per line.');
  }
  return { scheme, host, port, bypassLan, bypass: rules.join('\n') };
}

export function proxyValue(config) {
  const clean = normalizeConfig(config);
  return {
    mode: 'fixed_servers',
    rules: {
      // chromium normalizes an HTTP fallbackProxy into per-scheme rules.
      // singleProxy preserves a stable, verifiable mapping for HTTP proxies.
      [clean.scheme === 'http' ? 'singleProxy' : 'fallbackProxy']:
        { scheme: clean.scheme, host: clean.host, port: clean.port },
      bypassList: [...new Set([
        ...(clean.bypassLan ? LAN_RANGES : []), ...clean.bypass.split('\n').filter(Boolean)
      ])]
    }
  };
}

export function matchesProxy(value, config) {
  if (!config.host) return false;
  const expected = proxyValue(config);
  const actual = value?.rules;
  const key = config.scheme === 'http' ? 'singleProxy' : 'fallbackProxy';
  const other = key === 'singleProxy' ? 'fallbackProxy' : 'singleProxy';
  return value?.mode === 'fixed_servers' && actual &&
    !actual[other] && !actual.proxyForHttp && !actual.proxyForHttps && !actual.proxyForFtp &&
    ['scheme', 'host', 'port'].every(k => actual[key]?.[k] === expected.rules[key][k]) &&
    JSON.stringify([...(actual.bypassList || [])].sort()) === JSON.stringify([...expected.rules.bypassList].sort());
}
