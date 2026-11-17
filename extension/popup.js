const byId = id => document.getElementById(id);
let current;
let busy = false;
let dirty = false;

async function request(type, config) {
  const result = await chrome.runtime.sendMessage({ type, config });
  if (!result?.ok) throw new Error(result?.error || 'Extension worker unavailable.');
  return result.value;
}

function render(value, fill = false) {
  current = value;
  byId('status').textContent = value.mode === 'proxy' ? 'PROXY ON' : value.mode === 'direct' ? 'DIRECT' : 'OTHER SETTINGS';
  byId('status').classList.toggle('on', value.mode === 'proxy');
  byId('detail').textContent = value.blocked ? 'Another extension or policy controls proxy settings.' :
    value.mode === 'proxy' ? `${value.config.scheme.toUpperCase()} ${value.config.host}:${value.config.port}. ${value.config.bypassLan ? 'LAN bypass enabled.' : 'LAN bypass disabled.'}` :
    value.mode === 'direct' ? 'New web connections go directly to their destinations.' : 'Browser or system settings are active.';
  byId('direct').setAttribute('aria-pressed', String(value.mode === 'direct'));
  byId('proxy').setAttribute('aria-pressed', String(value.mode === 'proxy'));
  byId('direct').disabled = busy || value.blocked;
  byId('proxy').disabled = busy || value.blocked || !value.config.host || dirty;
  byId('save').disabled = busy;
  if (fill) {
    for (const key of ['scheme', 'host', 'port', 'bypass']) byId(key).value = value.config[key];
    byId('bypassLan').checked = value.config.bypassLan;
    byId('configDetails').open = !value.config.host;
  }
}

async function act(type, config) {
  busy = true;
  if (current) render(current);
  byId('message').textContent = '';
  try {
    const result = await request(type, config);
    if (type === 'save') dirty = false;
    render(result, type === 'state' || type === 'save');
    if (type === 'save') byId('message').textContent = result.mode === 'proxy' ? 'Saved and applied.' : 'Saved. Choose Use proxy to connect.';
  } catch (error) {
    byId('message').textContent = error.message;
  } finally {
    busy = false;
    if (current) render(current);
  }
}

byId('direct').addEventListener('click', () => { void act('direct'); });
byId('proxy').addEventListener('click', () => { void act('proxy'); });
byId('settings').addEventListener('input', () => {
  dirty = true;
  if (current) render(current);
  byId('message').textContent = 'Unsaved changes. Save before enabling the proxy.';
});
byId('settings').addEventListener('submit', event => {
  event.preventDefault();
  void act('save', {
    scheme: byId('scheme').value, host: byId('host').value,
    port: Number(byId('port').value), bypassLan: byId('bypassLan').checked,
    bypass: byId('bypass').value
  });
});
// reflect changes from another popup or browser controller without overwriting edits.
chrome.proxy.settings.onChange.addListener(() => {
  if (!busy) request('state').then(value => render(value)).catch(() => {});
});
void act('state');
