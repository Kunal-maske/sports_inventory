# IIT Gandhinagar Sports Inventory Handoff

## Status at handoff

The GitHub repository contains a working browser prototype, not a production system. The code is in `index.html`, `app.js`, `styles.css`, and `config.js`.

### Implemented in the prototype

- Four tabs: Give item, Inventory & records, Stock in, and Settings.
- Demo login for local evaluation.
- Issue form with required name, roll number, and email; dependent sport, item, and version lists; issue and due dates.
- Records list with search, status filter, partial returns, full-return toggle, and remaining quantity.
- Inventory list with total, issued, and available counts per item version.
- Stock in flow for existing or new sports, items, and versions.
- Settings for adding, renaming, and removing sports, conditions, and units, and for editing custom questions.
- Placeholder data and a control to clear placeholder inventory.
- Browser local storage for prototype persistence.
- A configuration guard: local preview runs in demo mode; a hosted domain using `auto` mode does not expose the demo login.

### Not implemented

- Remote database or API.
- Secure authentication, IITGN SSO, user provisioning, or roles.
- Shared data between browsers or devices.
- Server-side authorization, validation, concurrency control, or audit logging.
- Production import/export, monitoring, backups, or recovery.

**Do not use the prototype to store real student, staff, or inventory data.** The demo password and browser storage are not secure.

## Configuration placeholders

`config.js` currently contains:

- `mode: "auto"`: demo mode is enabled only for `file://`, `localhost`, and `127.0.0.1`. `"demo"` is also restricted to local hosts.
- Demo-only credentials for local evaluation.
- `production.apiBaseUrl`: a placeholder URL, not currently used by the app.

On other hosts, the app blocks sign-in until the tech team completes production authentication and data integration. Setting `mode` to `"production"` does **not** connect a backend; it continues to block sign-in. Do not set a public deployment to `"demo"`.

## Work required before launch

### 1. Confirm ownership and requirements

- Assign an IITGN product owner, inventory data owner, technical owner, and operational contact.
- Confirm who may issue equipment, manage catalog options, view records, correct entries, and manage accounts.
- Confirm whether the collected name, roll number, and email fields are all necessary, and define retention and deletion rules for student records.
- Decide on the supported browsers, expected number of users, reports, and any required spreadsheet import/export.

### 2. Select IITGN-approved identity and hosting

- Use IITGN-approved hosting and an identity provider, preferably the college's supported SSO/OIDC service.
- Do not use the current shared demo login for real users. Create individual accounts and enforce roles on the server, not just by hiding UI controls.
- Decide whether the API and database will be hosted by IITGN or by an institution-approved managed provider.
- Provide the official domain, TLS certificate, deployment owner, and staging environment.

### 3. Implement the shared backend

Replace the prototype's `readState()` and `persist()` local-storage flow with authenticated API calls. The API must authorize every read and write and validate all submitted values.

Suggested data entities:

- Users/profiles and roles.
- Sports.
- Items and versions (brand/specification and unit).
- Stock receipts and stock adjustments.
- Issue records and separate return entries, including partial returns.
- Configurable dropdown options, questions, and issue answers.
- Audit events containing actor, action, timestamp, and affected record.

Treat issue, return, receipt, and adjustment writes as database transactions. A concurrent issue must not make available stock negative. Preserve an audit history instead of silently overwriting or deleting real inventory activity.

The prototype currently represents each version as an inventory row with a `total` value. The backend migration should preserve this distinction between item name and version and define one authoritative stock calculation:

- Total stock is received stock plus approved adjustments.
- Outstanding stock is issued quantity minus recorded returns.
- Available stock is total stock minus outstanding stock.

### 4. Integrate authentication and data safely

- Validate the authenticated user's identity and role on every API request.
- Use server-side sessions or the approved OIDC flow; implement logout, session expiry, and account revocation.
- If using a database with row-level security, enable and test policies for every table.
- Use HTTPS, restrict CORS to approved IITGN domains, and configure appropriate security headers.
- Keep server secrets in the hosting provider's secret manager. Never commit passwords, database credentials, signing keys, or privileged/service-role API keys.
- Treat any browser-visible API key as public and secure its access with server authorization and database policies.

### 5. Prepare and migrate real data

- Confirm the source inventory spreadsheet and have the inventory owner approve its contents.
- Map each row to sport, item name, version, unit, total quantity, and any minimum-stock value.
- Import actual issue and stock history only if it is required and legally approved.
- Exclude all demo records, demo credentials, and placeholder purchases from the production import.
- Reconcile imported totals with the source spreadsheet and have the data owner sign off before launch.
- Do not put real inventory exports or student records in this GitHub repository.

### 6. Deploy and operate

- Build a staging deployment on an IITGN-controlled domain and test it with dummy accounts and data.
- Configure the production API URL in the approved deployment configuration after the API is implemented. `config.js` is public client configuration; it is not a place for secrets.
- Configure automated database backups and perform a restore test before launch.
- Set up error monitoring, access/audit log review, uptime monitoring, and an incident contact.
- Document who creates and removes user accounts, how stock corrections are approved, and how the service can be rolled back.

## Launch acceptance checks

- An authorized admin can sign in from two different devices and sees the same records.
- A non-admin or signed-out user cannot read or change protected data by calling the API directly.
- New sports, items, and versions added through Stock in appear in Give item on another device.
- Issuing stock updates availability; full and partial returns update outstanding and available quantities correctly.
- Two users attempting to issue the final available unit cannot both succeed.
- Invalid quantities, duplicate catalog entries, and invalid dates are rejected by the server.
- Every stock, issue, return, and settings change has an attributable audit entry.
- Backups can be restored and the restored totals match the approved source data.
- No placeholder records or demo credentials are present in production.

## Local prototype checks

1. Open `index.html` locally or serve the folder on `localhost`.
2. Sign in with the demo credentials shown on the login screen.
3. Test the four tabs using placeholder data.
4. Use **Settings > Clear placeholder inventory** to test a clean catalog, then add a sport, item, and version in **Stock in**.
5. Remember that changes in demo mode are stored only in that browser's local storage.

## Repository

Source repository: <https://github.com/Kunal-maske/sports_inventory>
