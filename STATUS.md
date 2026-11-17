# Status

Updated: 2026-11-17. Version: 0.1.0.

## Current state

The initial dependency-free Chromium Manifest V3 extension is implemented in
`extension/`. The working branch is `devel`; `origin` points to the public
`gpertea/gproxy` GitHub repository over SSH. The initial implementation is
versioned on `devel`; use direct commits and pushes for this project.

Implemented:

- Direct/proxy mode buttons with effective-state badge and a compact popup.
- Editable SOCKS5, HTTP and HTTPS endpoint form; browser-local persistence.
- Optional private LAN IP exclusions and explicit hostname/IP/CIDR bypass rules.
- Input validation, authorized UI messages, serialized setting changes,
  configuration read-back verification and rollback if saving fails.
- Only `proxy` and `storage` permissions. No runtime dependencies, build step,
  telemetry, cloud sync, remote code or extension-origin network access.

The extension was loaded unpacked into the authorized development browser. The
working endpoint is saved only in that browser profile. Final routing mode was
restored to Direct with LAN bypass enabled. Use the toolbar icon to enable it.
Do not copy local browser configuration into this public repository.

## Verification

`npm test`: seven passing Node standard-library tests. Syntax checks passed for
the worker and popup scripts. Public-source review found no actual test endpoint,
public IP-check result, local home path or browser extension ID in source files.

Live Chromium checks passed:

- Public HTTPS requests have a different exit IP in SOCKS5 mode than Direct.
- Public requests fail with an unavailable SOCKS5 proxy; no direct fallback.
- A private-IP HTTP fixture loads with LAN bypass enabled despite a dead proxy.
- The same private-IP fixture fails through the dead proxy with LAN bypass off.
- Loopback HTTP remains direct with LAN bypass off.
- HTTP and HTTPS proxy configurations pass browser read-back verification, and
  public HTTPS requests fail when those proxy endpoints are unavailable.
- UI save, custom bypass editing and switching work after reloading the extension.
- The configured popup begins collapsed and fits within the browser popup height.
- An attempted extension-page fetch is blocked by the CSP. No extension manifest
  or runtime errors were reported at the final error-list inspection.

The live tests used harmless fixtures and fresh tabs for each request. Do not
reuse an errored tab as a routing oracle without waiting for the intended content.

## Limits and remaining checks

- This is a web proxy switcher, not a VPN, firewall, anonymity system or WebRTC
  leak guard. Browser identities and traffic outside its proxy scope remain.
- Incognito is disabled. Multiple named endpoints and JSON import/export are not
  implemented. Settings are edited through the form.
- LAN CIDRs match literal IP URLs, not hostnames that resolve to private IPs.
  Configure LAN hostnames separately. Chromium's implicit bypasses remain active.
- No authenticated HTTP/HTTPS proxy, working HTTP/HTTPS proxy server, IPv6
  transport, browser restart or worker idle-termination test has been completed.
- WebSocket failure probes produced generic errors without a diagnostic network
  reason; they do not establish routing behavior. Use a controlled WebSocket
  fixture before making a WebSocket-specific privacy claim.
- No exhaustive dependency/browser security audit or whole-browser traffic
  capture has been performed. The extension itself has no dependencies.

## Handoff

Read `AGENTS.md`, `README.md`, this file and `DEVLOG.md`. Run `git status --short`
and `npm test`. Inspect the current browser instance before acting; display
assignments, extension IDs, tab indices and running state are local runtime data
and must be rediscovered. Do not hardcode them into tracked files.

Use the installed browser skill for any live browser work. Obtain the current
authorized browser context, make only the requested changes, restore a usable
configuration after failure tests and detach automation immediately afterward.
Any new feature should preserve the permission boundary unless the user approves
a concrete expansion. Review all files for private data before committing or
pushing to the public origin. Update this file when outstanding checks change.
