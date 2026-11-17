# Development log

Entries record completed changes and validation. Personal endpoints, browser
state, captures and machine-specific details are excluded from this document.

## 2026-11-17 - Initial implementation

Created the project and initialized a local Git repository on `devel`. Configured
`origin` for `gpertea/gproxy`. Implemented gproxy as original JavaScript, HTML and
CSS under an MIT license, without copying ZeroOmega source or its dependencies.

Added the proxy worker, local settings, popup and options page, explicit Direct
and Use proxy actions, effective-state badge, LAN range bypass checkbox and
additional direct-destination rules. Restricted extension capabilities to proxy
and local storage access. Added a CSP that prevents extension-origin network
requests and prohibits remote scripts.

Added configuration validation, an allowlisted message boundary, serialized
mutations, read-back verification, conflict reporting and rollback following
persistence failure. Live Chromium checks showed that an HTTP fallback mapping
is normalized differently by the browser. HTTP configuration now uses singleProxy;
SOCKS5 and HTTPS use fallbackProxy. Read-back checks reject unexpected mappings.

Added seven standard-library tests covering validation, protocol mappings,
permissions/CSP, message authorization, conflicts, operation ordering, persistence
rollback and rejected browser-setting application. `npm test` passed. Worker and
popup syntax checks passed.

Loaded the extension into the authorized development browser. Verified SOCKS5
exit-IP change, failure without direct fallback, LAN bypass on/off, and preserved
loopback access. Verified HTTP/HTTPS settings application and unavailable-proxy
failure. Verified settings editing, mode switching, extension-page network
blocking and an empty extension error list. Adjusted the popup to collapse saved
settings by default; the initial configured view fits within popup height limits.
Restored Direct mode and retained the user's working endpoint in browser-local
storage only. Automation was detached after browser actions.

Added README installation, operation, privacy and development guidance, AGENTS.md
public-repository rules, and STATUS.md handoff details. Ignored local captures and
worklogs. Reviewed candidate source files for private test data. Finalized the
initial implementation and documentation for publication on `devel`.
