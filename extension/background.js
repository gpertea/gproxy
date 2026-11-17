import { DEFAULT_CONFIG, normalizeConfig, proxyValue, matchesProxy } from './config.js';

async function readConfig() {
  const { config } = await chrome.storage.local.get('config');
  return normalizeConfig(config || DEFAULT_CONFIG, { requireHost: false });
}

async function state() {
  const config = await readConfig();
  const effective = await chrome.proxy.settings.get({ incognito: false });
  const controlled = effective.levelOfControl === 'controlled_by_this_extension';
  const proxy = controlled && matchesProxy(effective.value, config);
  const direct = effective.value.mode === 'direct';
  const mode = proxy ? 'proxy' : direct ? 'direct' : 'other';
  const blocked = ['not_controllable', 'controlled_by_other_extensions'].includes(effective.levelOfControl);
  return { config, mode, controlled, blocked };
}

async function badge() {
  try {
    const current = await state();
    const label = current.mode === 'proxy' ? 'ON' : current.mode === 'direct' ? 'OFF' : 'OTHER';
    await chrome.action.setBadgeText({ text: label });
    await chrome.action.setBadgeBackgroundColor({ color: current.mode === 'proxy' ? '#17704b' : '#56616f' });
    await chrome.action.setTitle({ title: `gproxy: ${label === 'ON' ? 'proxy enabled' : label === 'OFF' ? 'direct access' : 'browser/system proxy settings'}` });
  } catch {
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setTitle({ title: 'gproxy: open settings to check configuration' });
  }
}

async function restore(previous) {
  if (previous.levelOfControl === 'controlled_by_this_extension') {
    await chrome.proxy.settings.set({ value: previous.value, scope: 'regular' });
  } else {
    await chrome.proxy.settings.clear({ scope: 'regular' });
  }
}

async function setValue(value, config) {
  const previous = await chrome.proxy.settings.get({ incognito: false });
  if (['not_controllable', 'controlled_by_other_extensions'].includes(previous.levelOfControl)) {
    throw new Error('Proxy settings are controlled by a policy or another extension. Resolve that conflict first.');
  }
  await chrome.proxy.settings.set({ value, scope: 'regular' });
  const actual = await chrome.proxy.settings.get({ incognito: false });
  if (actual.levelOfControl !== 'controlled_by_this_extension') {
    throw new Error('The browser did not give gproxy control of proxy settings.');
  }
  if (config ? !matchesProxy(actual.value, config) : actual.value.mode !== 'direct') {
    await restore(previous);
    throw new Error('The browser did not apply the requested proxy configuration. Previous settings restored.');
  }
  return previous;
}

async function handle(message) {
  switch (message.type) {
    case 'state': return state();
    case 'save': {
      const config = normalizeConfig(message.config);
      const current = await state();
      const previous = current.mode === 'proxy' ? await setValue(proxyValue(config), config) : null;
      try { await chrome.storage.local.set({ config }); }
      catch (error) {
        // preserve the previous working endpoint if local persistence fails.
        if (previous) await restore(previous);
        throw error;
      }
      break;
    }
    case 'proxy': {
      const config = await readConfig();
      await setValue(proxyValue(config), config);
      break;
    }
    case 'direct': await setValue({ mode: 'direct' }); break;
    default: throw new Error('Unknown action.');
  }
  await badge();
  return state();
}

// serialize UI requests so double clicks cannot leave settings and badge out of order.
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html')) return false;
  queue = queue.then(() => handle(message)).then(
    value => reply({ ok: true, value }),
    error => reply({ ok: false, error: error.message || 'Operation failed.' })
  );
  return true;
});
chrome.proxy.settings.onChange.addListener(() => { void badge(); });
chrome.runtime.onInstalled.addListener(() => { void badge(); });
chrome.runtime.onStartup.addListener(() => { void badge(); });
