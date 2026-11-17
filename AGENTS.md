# Working on gproxy

Read STATUS.md and DEVLOG.md before starting. Keep them current with verified
changes and remaining limits; avoid conversational history or private test data.

Keep the shipped extension small, readable, dependency-free and local-only.
Do not add telemetry, cloud sync, remote code, health checks, content scripts or
host permissions. Any new permission needs a concrete feature justification.
Preserve the strict CSP and explicit direct/proxy distinction. Do not introduce
automatic direct fallback or claim that this extension guarantees anonymity.

This is a PUBLIC repository. Never put real proxy endpoints, public IP results,
credentials, browser state, private URLs, screenshots or machine details in
tracked files. Use ignored .local/ for test artifacts and worklogs/ for local
plans. Generic reserved examples and standard private CIDR ranges are fine.
Review the staged diff for sensitive information before any commit or push.

Use devel. Do not create pull requests unless the user explicitly asks.
Run npm test after code changes and perform live Chromium checks for routing
changes. Browser tests must restore a usable configuration and relinquish any
automation attachment. Do not restart the user's browser without authorization.

Use ASCII prose and concise comments explaining non-obvious intent. Start comment
lines with lower case. Shell and Python comments use double hash markers.
Keep documentation aligned with actual tested behavior and clearly distinguish
configuration status from connectivity or leak protection.
