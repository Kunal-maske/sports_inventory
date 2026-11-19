# Production Implementation Guide

This is a step-by-step guide for the IITGN technical team. It assumes an IITGN-approved identity provider, an authenticated API, and a PostgreSQL-compatible database. The college may substitute its approved hosting or database platform, but the security and workflow requirements still apply.

## Important: the current app is a prototype

The app currently reads and writes browser `localStorage`. That storage belongs to one browser profile and is not shared or backed up. The demo login is client-side and is not authentication.

`config.js` is only a placeholder. Its `production.apiBaseUrl` is not used by the app. Setting `mode` to `"production"` intentionally blocks sign-in; it does not connect a server. Do not remove this block or set a public site to demo mode as a substitute for authentication.

## Target architecture

```text
Browser
  -> IITGN sign-in (SSO / OIDC)
  -> authenticated API on an IITGN-approved host
  -> PostgreSQL database on an approved network
```

Prefer serving the API behind the same domain, for example `https://inventory.iitgn.ac.in/api/v1`, using a reverse proxy. This simplifies origin and cookie configuration.

## Phase 1: prepare the handoff

1. Clone the source repository:

   ```text
   git clone https://github.com/Kunal-maske/sports_inventory.git
   cd sports_inventory
   ```

2. Open `index.html` locally or serve the folder on `localhost`. The current app has no build step. Use `admin / admin123` only for local demo testing.
3. Assign an IITGN product owner, inventory data owner, technical owner, and incident contact.
4. Ask IITGN IT for:
   - approved frontend and API hosting;
   - the official domain and TLS/DNS process;
   - SSO/OIDC issuer, client registration process, and group/role claims;
   - approved database, backup, retention, and monitoring services;
   - the data classification and retention rules for roll numbers and email addresses.
5. Create a staging environment and a separate production environment. Use dummy data in staging.

## Phase 2: create the database

Use database migrations, not manual production edits. The following is a reference model to review with the data owner and IITGN DBA; it is not a migration to apply without review.

| Table | Purpose and key fields |
| --- | --- |
| `sports` | Catalog of sports; unique normalized name. |
| `catalog_options` | Conditions and quantity units, with group, display order, and active state. |
| `items` | Item name within a sport; foreign key to `sports`. |
| `item_versions` | Brand/model and unit for an item; foreign key to `items`. |
| `stock_receipts` | Quantity received, date received, version, actor, and creation time. |
| `stock_adjustments` | Signed quantity correction, reason, approver, and actor. Do not silently overwrite stock totals. |
| `issues` | Recipient name, roll number, email, version, quantity, issue date, due date, condition, remarks, and issuing user. |
| `returns` | Return quantity and date linked to an issue; supports multiple partial returns. |
| `form_questions` / `issue_answers` | Configurable questions, options, required flag, and answers captured on an issue. |
| `user_roles` | SSO subject and approved role; no local password column. |
| `audit_events` | Actor, action, timestamp, entity, and change details for every sensitive mutation. |

Add foreign keys and constraints for positive receipt/issue/return quantities, valid dates, unique sport/item/version names, and supported role/question types. Normalize names for uniqueness so `Football` and `football` cannot be added as separate options.

### PostgreSQL migration starting point

This is a schema sketch for the DBA to turn into a reviewed migration. It omits institution-specific grants and row-level policies; those must be added before production.

```sql
CREATE TABLE sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sports_name_ci ON sports (lower(name));

CREATE TABLE catalog_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key text NOT NULL CHECK (group_key IN ('condition', 'unit')),
  value text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX catalog_options_value_ci ON catalog_options (group_key, lower(value));

CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid NOT NULL REFERENCES sports(id),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX items_name_per_sport_ci ON items (sport_id, lower(name));

CREATE TABLE item_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id),
  label text NOT NULL,
  unit text NOT NULL,
  minimum_stock integer NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX item_versions_label_ci ON item_versions (item_id, lower(label));

CREATE TABLE stock_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES item_versions(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  received_date date NOT NULL,
  actor_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES item_versions(id),
  quantity_delta integer NOT NULL CHECK (quantity_delta <> 0),
  reason text NOT NULL,
  actor_subject text NOT NULL,
  approved_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES item_versions(id),
  given_name text NOT NULL,
  roll_no text NOT NULL,
  email text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  issue_date date NOT NULL,
  due_date date,
  condition text,
  remarks text NOT NULL DEFAULT '',
  actor_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE issue_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES issues(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  return_date date NOT NULL,
  actor_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  subject text PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('admin', 'storekeeper', 'viewer')),
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE form_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  answer_type text NOT NULL CHECK (answer_type IN ('text', 'number', 'date', 'dropdown')),
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES form_questions(id),
  value text NOT NULL,
  position integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX question_options_value_ci ON question_options (question_id, lower(value));

CREATE TABLE issue_answers (
  issue_id uuid NOT NULL REFERENCES issues(id),
  question_id uuid NOT NULL REFERENCES form_questions(id),
  answer text NOT NULL,
  PRIMARY KEY (issue_id, question_id)
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_subject text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

In production, avoid hard deletion of referenced sports, items, versions, options, and questions; deactivate them or create a documented correction. Validate `item_versions.unit` against an active `catalog_options` row. Add indexes for common issue searches (`roll_no`, `email`, `issue_date`, `version_id`) and apply the institution's privacy and database-access policies.

Use these calculations consistently:

- **Total stock** = received quantities + approved signed adjustments.
- **Outstanding** = issued quantities - returned quantities.
- **Available** = total stock - outstanding.

### Make issue and return writes atomic

Implement issue creation in one database transaction:

1. Lock the selected `item_versions` row (`SELECT ... FOR UPDATE`) or use an equivalent serializable transaction.
2. Calculate available stock from receipts, adjustments, issues, and returns.
3. Reject the operation if the requested quantity is not a positive whole number or exceeds available stock.
4. Insert the issue and audit event, then commit.

For a return, lock the issue, calculate its outstanding quantity, reject a return greater than the outstanding amount, then insert a return and audit event in the same transaction. This prevents two admins from issuing the last unit concurrently.

Apply adjustments under the same version lock and reject any adjustment that would make available stock negative. Require a reason and the configured approval role for corrections.

## Phase 3: implement identity and API

### Authentication and roles

1. Register the application with IITGN's approved SSO/OIDC provider.
2. Register exact redirect and logout URLs for staging and production.
3. Have the API validate tokens or sessions (issuer, audience, signature, expiry) on every protected request.
4. Map verified IITGN groups to roles, for example:
   - `admin`: manage users, settings, catalog, and corrections;
   - `storekeeper`: receive stock, issue items, and record returns;
   - `viewer`: read-only access, if required.
5. Enforce roles in the API/database. Hiding a button in the browser is not access control.
6. Use secure, HttpOnly, SameSite cookies or IITGN's approved token flow; do not store passwords or privileged tokens in browser storage.

### API contract

Keep the API versioned and return consistent errors. A starting contract:

| Method and path | Purpose |
| --- | --- |
| `GET /api/v1/bootstrap` | Current user, catalog options, questions, and inventory summary. |
| `GET /api/v1/issues?q=&status=` | Search/filter issue records. |
| `POST /api/v1/issues` | Issue stock after an atomic availability check. |
| `POST /api/v1/issues/{id}/returns` | Record a full or partial return. |
| `POST /api/v1/stock-receipts` | Add stock to an existing or newly created sport/item/version. |
| `POST /api/v1/stock-adjustments` | Record a reasoned and authorized correction. |
| `POST/PATCH/DELETE /api/v1/catalog/...` | Manage sports, items, versions, and dropdown settings with audit events. |
| `POST/PATCH/DELETE /api/v1/questions/...` | Manage custom questions and their options. |

Use a consistent error contract: `401` for no valid session, `403` for insufficient role, `409` for stock conflicts or duplicate catalog entries, and `422` for invalid fields. The stock-receipt endpoint should create any new sport/item/version and the receipt in one transaction. For real records, use reversal/adjustment workflows instead of hard deletion.

Example issue request:

```json
{
  "givenName": "Example Student",
  "rollNo": "24110001",
  "email": "student@example.edu",
  "versionId": "server-generated-id",
  "quantity": 1,
  "issueDate": "2026-11-19",
  "dueDate": "2026-11-26",
  "condition": "Good",
  "remarks": ""
}
```

Example stock receipt request:

```json
{
  "sport": "Basketball",
  "itemName": "Basketball",
  "version": "Training V1",
  "unit": "pcs",
  "quantity": 12,
  "receivedDate": "2026-11-19"
}
```

The API should validate all fields, identify the actor from the verified session, write an audit event, and return the updated inventory totals. Never trust an actor ID, role, available quantity, or total submitted by the browser.

## Phase 4: connect the frontend

1. Implement an authentication client that starts the IITGN sign-in flow, restores the signed-in user, and handles logout/session expiry.
2. Implement an API client that sends authenticated requests to the configured API URL and surfaces server errors to the user.
3. Replace `readState()` and `persist()` in `app.js`. Do not persist the complete mutable state as one browser blob; use the API endpoints for individual operations.
4. Convert these current UI operations to API calls:
   - startup/catalog loading;
   - `saveIssue()` and `recordReturn()`;
   - `savePurchase()`;
   - option and question edits;
   - deletes, corrections, and clearing placeholder data.
5. Update the UI from API responses. On failure, show an error and reload authoritative state rather than leaving optimistic local changes displayed.
6. Keep `config.js` public and secret-free. Set `production.apiBaseUrl` to the approved API URL only after the API exists. The current demo credentials must not be used by production authentication.
7. Change the production login guard only as part of the reviewed SSO/API integration. The production mode must not reveal app data until the API confirms the user's identity and permissions.

## Phase 5: prepare and import data

1. Obtain the current inventory source from the inventory data owner.
2. Prepare a reviewed import with sport, item name, version, unit, opening quantity, and any minimum stock.
3. Resolve duplicate names, inconsistent units, and missing versions before import.
4. Import through a one-time migration script or approved admin import endpoint; make the import repeatable or reject duplicate re-runs.
5. Exclude all `demo-*` items/issues/purchases and all sample student details.
6. Compare per-version totals and row counts with the approved spreadsheet. Get written sign-off before production use.
7. Do not commit the spreadsheet, exports, student data, or production database credentials to GitHub.

## Phase 6: deploy to staging, then the official domain

1. Deploy the frontend files and API to the approved staging hosts.
2. Configure DNS and HTTPS through IITGN IT. Configure the API behind the agreed `/api/v1` route or approved API hostname.
3. Configure the exact allowed frontend origin, secure session settings, and security headers (including an appropriately tested Content Security Policy).
4. Configure server/database secrets in IITGN's secret manager. Keep them out of `config.js`, Git, build logs, and browser responses.
5. Set the public API URL in `config.js` after the frontend API client is implemented. Until then, the prototype will intentionally block sign-in on hosted domains.
6. Run migrations in staging, test SSO, roles, stock transactions, and backups, then obtain product-owner and data-owner approval.
7. Repeat deployment using production credentials and production migrations. Do not copy staging/demo data to production.

## Phase 7: verify and operate

Run every launch acceptance check in [HANDOFF.md](./HANDOFF.md), including two-user stock contention, unauthorized API access, partial returns, and restore-from-backup. Also document:

- who provisions and revokes admin/storekeeper accounts;
- who approves stock corrections and catalog changes;
- how to review audit events and handle a suspected data incident;
- backup frequency, retention, restore owner, and recovery time objective;
- deployment rollback and support contacts.

Do not announce the service for real use until SSO, API authorization, database persistence, import reconciliation, backup restore, and data-owner approval have all passed in staging.
