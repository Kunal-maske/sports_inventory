# Fieldhouse sports inventory

A lightweight browser-only prototype for managing school sports equipment.

## Open the app

Open `index.html` in a recent browser. No install or server is required. The demo signs in with:

- **Username:** `admin`
- **Password:** `admin123`

## Prototype notes

- The four tabs are **Give item**, **Inventory & records**, **Stock in**, and **Settings**.
- The Give item form requires a name, roll number, and valid email. Sport, item, and version are dependent dropdowns; issue date is required and return date is optional.
- Given records appear above the item summary and show the issue details, returned quantity, and remaining quantity. Records can be searched and filtered; returns can be recorded with the toggle or as a partial quantity.
- Stock in follows sport, item, date received, version, and quantity. It can add a new sport, item, or version, and new stock is immediately available in the Give item form.
- Settings let you add, rename, and remove dropdown options and add, edit, or remove required and optional form questions. Renaming an option updates existing inventory and record references.
- New stock batches can be removed, provided doing so would not leave issued equipment without stock.
- Data is saved in this browser's local storage and is not shared or synchronized between browsers.
- Demo sign-in is only a front-end demonstration. It is not secure authentication; do not enter real student or staff information.
- **Settings > Clear placeholder inventory** removes the sample equipment, issue, and purchase records while keeping your dropdown options and form questions.
- Issued stock reduces the available quantity. Recording a full or partial return increases it again. New purchases increase total stock.

This prototype intentionally has no server, user accounts, or production data import.
