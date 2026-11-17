# gproxy

A small Chromium extension for switching between direct web access and your own
SOCKS5, HTTP, or HTTPS proxy. Original code, no framework, no dependencies, no build
step. Configuration stays in the current browser profile.

For development handoff, read [STATUS.md](STATUS.md), [DEVLOG.md](DEVLOG.md),
and [AGENTS.md](AGENTS.md).

## Install

1. Open `chrome://extensions` in the browser profile you want to configure.
2. Enable Developer mode and choose **Load unpacked**.
3. Select this repository's `extension` folder.
4. Pin **gproxy** using the browser's Extensions menu.

Open the toolbar popup or the extension's Options page and expand **Proxy settings**. Enter a proxy hostname or
IP and port, select its protocol, and save. IPv6 proxy addresses use brackets.
The extension starts without a proxy endpoint and does not change routing on
installation. Choose **Use proxy** to enable it or **Direct** to connect directly.
Saving while proxy mode is active applies the changed endpoint and bypass rules.
Reload pages after switching; existing streams may retain old connections.

The badge shows the effective configuration: `ON` for the saved proxy, `OFF` for
direct routing, or `OTHER` for browser/system settings. This is configuration
status, not a connectivity or anonymity test. A policy or another extension
controlling the proxy is reported as a conflict. Settings survive normal worker
sleep and browser restarts through Chromium's settings persistence.

Disable or remove gproxy to release its proxy setting to the browser. That may
restore a system proxy or direct routing. This extension is not a system firewall
or kill switch. Incognito use is deliberately disabled in this initial version.

## Direct LAN access

The LAN checkbox adds these literal-IP bypass ranges:

- IPv4 private: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
- IPv4 link-local: `169.254.0.0/16`.
- IPv6 unique local: `fc00::/7`; link-local: `fe80::/10`.

Chromium also bypasses loopback, localhost, link-local, and certain unspecified
addresses implicitly, even when the LAN checkbox is off. gproxy preserves these
browser protections. Carrier-grade NAT space is not included by default; add a
specific range to the additional direct destinations if needed.

**CIDR rules match literal IPs in URLs. They do not resolve hostnames to discover
whether their addresses are private.** Add LAN hostnames or domain patterns
explicitly, such as `router` or `*.example.internal`. `<local>` bypasses every
single-label hostname. A wildcard subdomain rule does not include the bare domain;
add that separately if needed. Additional destinations accept hostnames, IPs,
CIDRs, `*.domain`/`.domain` patterns, and `<local>`, separated by lines or commas.
No PAC scripts or URL-scheme-specific bypass syntax are accepted.

## Privacy and security scope

The extension requests only `proxy` and `storage`. It has no site permissions,
content scripts, browsing-history access, request monitoring, telemetry, cloud
sync, remote configuration, credential handling, or external update URL. Its
content security policy blocks network requests from extension pages and its
worker. It does not send health checks or IP probes. Browser settings and web
traffic still use the network normally.

Proxy configuration is stored in `chrome.storage.local`, not browser sync. It is
not a secret vault. Avoid sharing screenshots or configuration that reveal private
network details. The proxy permission is powerful: any code allowed to change
proxy settings can redirect web traffic. Review changes before updating.

For requests routed through SOCKS5, destination websites see the proxy's public
IP. SOCKS5 does not add an HTTP forwarding header carrying your source IP. Chrome
resolves proxied SOCKS5 destination names at the proxy. SOCKS5 itself does not
encrypt the connection to the proxy; HTTPS still protects application content.
Chrome does not support SOCKS5 username/password authentication. HTTP/HTTPS proxy
authentication, if required, is left to the browser's own prompt.

A proxy is not anonymity: your proxy operator sees your source IP, sites can
recognize logins/cookies/fingerprints, and WebRTC or other traffic outside the
browser's web proxy can expose other addresses. gproxy does not modify WebRTC,
DNS prefetch, browser telemetry, or operating-system networking. Explicit bypass
rules send matching traffic directly. A malicious HTTP proxy can also modify
unencrypted HTTP traffic. Use HTTPS for sensitive browsing.

The fixed proxy configuration contains no automatic direct fallback. Failed
proxied requests should fail; explicit bypass destinations remain direct.
This does not guarantee that every browser feature or existing connection is
covered. No claim of being backdoor-free or leak-proof is made.

## Develop and test

The contents of `extension/` are the shipped source. Edit those files, then click
Reload for gproxy in `chrome://extensions`. No install step is needed. Tests use
Node's standard library only:

```sh
npm test
```

Tests cover configuration validation, restricted capabilities, LAN ranges,
message authorization, setting conflicts, serialized requests, and restoring the
previous proxy if saving fails. They do not substitute for live Chromium checks.

For a live smoke test, use a dedicated profile:

1. Verify an IP-check page loads in Direct mode.
2. Enable a known working proxy; reload that page and compare its public IP.
3. Change the endpoint to an unused port while enabled. Confirm a fresh public
   request fails rather than succeeding directly.
4. With that dead proxy and LAN bypass enabled, navigate to a harmless HTTP
   fixture on a private interface address. It should load directly.
5. Disable LAN bypass and retry with a fresh URL. The private-IP request should
   fail through the dead proxy. Loopback should remain direct in both cases.
6. Restore your real endpoint and preferred mode. Inspect the extension's error
   list, and check that it works after the service worker sleeps.

Do not run failure tests while other tabs are doing important network work:
proxy settings apply across the whole browser profile.

## Public repository hygiene

This repository contains generic examples only. Real proxy endpoints belong in
the local extension settings. Keep test captures and personal configuration in
`.local/`; that folder and `worklogs/` are ignored. Do not commit browser profiles,
network captures, IP-check results, credentials, or screenshots of private tabs.
The development branch is `devel`.

## License

MIT. See [LICENSE](LICENSE).
