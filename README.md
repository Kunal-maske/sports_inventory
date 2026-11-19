# Sports inventory prototype

A browser-based prototype for managing sports equipment issues, returns, stock, and dropdown settings.

## Run the prototype

Open `index.html` in a browser. `config.js` uses `mode: "auto"`, which enables the demo only on a local file or `localhost`. Demo mode is blocked on hosted domains even if someone changes the mode to `"demo"`.

- **Demo username:** `admin`
- **Demo password:** `admin123`

In demo mode, inventory is stored in this browser's local storage. It is not shared across browsers or devices. Do not enter real student or staff data.

## IITGN handoff

See [HANDOFF.md](./HANDOFF.md) for the current status and [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for step-by-step instructions to complete the production work.

The production backend and secure authentication are not implemented. On a hosted domain, the default `auto` mode intentionally blocks sign-in instead of exposing the demo. The API URL in `config.js` is only a placeholder and is not connected.
