const STORAGE_KEY = "fieldhouse-sports-inventory-v1";

const demoData = {
  sports: ["Basketball", "Football", "Table Tennis", "Badminton", "Cricket", "Tennis"],
  conditions: ["Good", "Fair", "Needs repair", "Damaged"],
  units: ["pcs", "pairs", "sets", "boxes", "balls"],
  questions: [{ id: "purpose", label: "Purpose of issue", type: "dropdown", options: ["Practice", "Match", "Class"], required: false }],
  inventory: [
    { id: "demo-basketball", name: "Basketball", model: "Cosco Challenge Composite", sport: "Basketball", unit: "pcs", total: 29, minimum: 5 },
    { id: "demo-football", name: "Football", model: "Nivia Dominator 3.0", sport: "Football", unit: "pcs", total: 24, minimum: 5 },
    { id: "demo-gloves", name: "Goalkeeper Gloves", model: "Nivia", sport: "Football", unit: "pairs", total: 3, minimum: 2 },
    { id: "demo-racket", name: "Table Tennis Racket", model: "Butterfly Viscarial Ply", sport: "Table Tennis", unit: "pcs", total: 18, minimum: 4 },
    { id: "demo-shuttle", name: "Badminton Shuttle", model: "Yonex Mavis 350", sport: "Badminton", unit: "boxes", total: 20, minimum: 4 },
    { id: "demo-bat", name: "Cricket Bat", model: "SG KW (Profile Classic)", sport: "Cricket", unit: "pcs", total: 6, minimum: 2 },
  ],
  issues: [
    { id: "demo-issue-1", itemId: "demo-basketball", givenName: "Siddharth Verma", email: "siddharth@example.edu", issuedTo: "Siddharth Verma", rollNo: "24110398", quantity: 12, issueDate: "2026-10-22", dueDate: "2026-10-29", condition: "Good", returnedQty: 0, returnDate: "", remarks: "Practice", answers: { purpose: "Practice" } },
    { id: "demo-issue-2", itemId: "demo-basketball", givenName: "Yash Choudhary", email: "yash@example.edu", issuedTo: "Yash Choudhary", rollNo: "24110398", quantity: 10, issueDate: "2026-10-02", dueDate: "2026-10-09", condition: "Good", returnedQty: 0, returnDate: "", remarks: "", answers: { purpose: "Match" } },
    { id: "demo-issue-3", itemId: "demo-football", givenName: "Akash K.P.", email: "akash@example.edu", issuedTo: "Akash K.P.", rollNo: "24110398", quantity: 16, issueDate: "2026-10-16", dueDate: "2026-10-23", condition: "Fair", returnedQty: 12, returnDate: "2026-10-19", remarks: "12 returned", answers: { purpose: "Class" } },
    { id: "demo-issue-4", itemId: "demo-racket", givenName: "Kunal T.", email: "kunal@example.edu", issuedTo: "Kunal T.", rollNo: "23110180", quantity: 1, issueDate: "2026-10-12", dueDate: "2026-10-19", condition: "Good", returnedQty: 1, returnDate: "2026-10-13", remarks: "", answers: { purpose: "Practice" } },
  ],
  purchases: [
    { id: "demo-purchase-1", itemId: "demo-shuttle", itemName: "Badminton Shuttle", model: "Yonex Mavis 350", quantity: 20, unit: "boxes", sport: "Badminton", date: "2026-08-16", supplier: "Yonex", size: "" },
    { id: "demo-purchase-2", itemId: "demo-racket", itemName: "Table Tennis Racket", model: "Butterfly Viscarial Ply", quantity: 10, unit: "pcs", sport: "Table Tennis", date: "2026-08-24", supplier: "Butterfly", size: "No. 5" },
  ],
};

function readState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(demoData);
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.inventory) || !Array.isArray(parsed.issues) || !Array.isArray(parsed.purchases)) {
      throw new Error("Saved inventory data has an invalid structure.");
    }
    const inventory = parsed.inventory.map((item) => ({ ...item, total: Number(item.total || 0) }));
    return {
      ...demoData,
      ...parsed,
      inventory,
      issues: parsed.issues.map((issue) => ({
        ...issue,
        quantity: Number(issue.quantity || 0),
        returnedQty: Number(issue.returnedQty ?? (issue.returned ? issue.quantity : 0)),
        givenName: issue.givenName || issue.issuedTo || "",
        email: issue.email || "",
        dueDate: issue.dueDate || "",
        condition: issue.condition || "",
        sport: issue.sport || (inventory.find((item) => item.id === issue.itemId) || {}).sport || "",
        answers: issue.answers || {},
      })),
      purchases: parsed.purchases.map((purchase) => {
        const item = inventory.find((entry) => entry.id === purchase.itemId || (!purchase.itemId && entry.name === purchase.itemName));
        return { ...purchase, itemId: purchase.itemId || (item && item.id), unit: purchase.unit || (item && item.unit) || "pcs", supplier: purchase.supplier || "" };
      }),
      sports: parsed.sports || [...demoData.sports],
      conditions: parsed.conditions || [...demoData.conditions],
      units: parsed.units || [...demoData.units],
      questions: parsed.questions || [],
    };
  } catch (error) {
    console.error("Could not read the saved inventory data.", error);
    document.body.innerHTML = '<main style="max-width:560px;margin:12vh auto;padding:24px;font:14px sans-serif"><h1>Inventory data could not be loaded</h1><p>Your saved browser data appears to be damaged. Clear this app\'s site data to start with a fresh demo.</p></main>';
    throw error;
  }
}

let state = readState();
let activeTab = "give";
let issueSearch = "";
let issueStatus = "all";
let toastTimer;

const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");
const pageContent = document.getElementById("pageContent");
const pageNames = { give: "Give item", inventory: "Inventory & records", stockin: "Stock in", settings: "Settings" };
const icons = ["◉", "◈", "◍", "⌑", "◇", "⊞"];
const optionGroups = [
  { key: "sports", label: "Sports" },
  { key: "conditions", label: "Item condition" },
  { key: "units", label: "Quantity units" },
];

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function itemFor(id) {
  return state.inventory.find((item) => item.id === id);
}

function outstandingFor(issue) {
  return Math.max(0, Number(issue.quantity) - Number(issue.returnedQty || 0));
}

function issuedFor(itemId) {
  return state.issues.reduce((total, issue) => total + (issue.itemId === itemId ? outstandingFor(issue) : 0), 0);
}

function availableFor(item) {
  return Math.max(0, Number(item.total) - issuedFor(item.id));
}

function stockClass(item) {
  const available = availableFor(item);
  return available === 0 ? "none" : available <= Number(item.minimum || 0) ? "low" : "";
}

function unitLabel(unit) {
  return unit || "pcs";
}

function selectOptions(values, selected = "", placeholder = "Select an option") {
  return `${placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : ""}${values.map((value) => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}`;
}

function giveItemOptions(sport) {
  const names = [...new Set(state.inventory
    .filter((item) => item.sport === sport && availableFor(item) > 0)
    .map((item) => item.name))];
  return `<option value="">${names.length ? "Select an item" : "No available items for this sport"}</option>${names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
}

function giveVersionOptions(sport, itemName) {
  const versions = state.inventory.filter((item) => item.sport === sport && item.name === itemName && availableFor(item) > 0);
  return `<option value="">${versions.length ? "Select a version" : "No available versions"}</option>${versions.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.model)} · ${availableFor(item)} ${unitLabel(item.unit)} available</option>`).join("")}`;
}

function updateGiveItems() {
  const sport = document.getElementById("issueSportSelect").value;
  const itemSelect = document.getElementById("issueItemSelect");
  itemSelect.innerHTML = giveItemOptions(sport);
  itemSelect.disabled = !sport;
  updateGiveVersions();
}

function updateGiveVersions() {
  const sport = document.getElementById("issueSportSelect").value;
  const itemName = document.getElementById("issueItemSelect").value;
  const versionSelect = document.getElementById("issueVersionSelect");
  versionSelect.innerHTML = giveVersionOptions(sport, itemName);
  versionSelect.disabled = !itemName;
  updateGiveAvailability();
}

function updateGiveAvailability() {
  const versionSelect = document.getElementById("issueVersionSelect");
  const item = itemFor(versionSelect.value);
  const quantity = document.getElementById("issueQuantity");
  quantity.disabled = !item;
  quantity.max = item ? availableFor(item) : 0;
  document.getElementById("itemAvailability").textContent = item
    ? `Available: ${availableFor(item)} ${unitLabel(item.unit)}`
    : "Select a version to see available stock.";
}

function updateLogin() {
  const signedIn = sessionStorage.getItem("fieldhouse-admin") === "signed-in";
  loginView.classList.toggle("hidden", signedIn);
  appView.classList.toggle("hidden", !signedIn);
  if (signedIn) render();
}

function showToast(message, type = "ok") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type === "err" ? "err" : "ok"}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.className = "toast"; }, 2800);
}

function pageHeader(title, description, actions = "") {
  return `<div class="page-heading"><div><span class="eyebrow">SPORTS DEPARTMENT</span><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ""}</div>`;
}

function customQuestionFields() {
  return (state.questions || []).map((question) => {
    const label = escapeHtml(question.label);
    const required = question.required ? "required" : "";
    let field;
    if (question.type === "dropdown") {
      field = `<select name="custom-${escapeHtml(question.id)}" ${required}>${selectOptions(question.options || [], "", "Select an option")}</select>`;
    } else {
      const type = ["text", "number", "date"].includes(question.type) ? question.type : "text";
      field = `<input name="custom-${escapeHtml(question.id)}" type="${type}" ${required} />`;
    }
    return `<label>${label}${question.required ? ' <span class="req">*</span>' : ""}${field}</label>`;
  }).join("");
}

function renderGiveForm() {
  const sportOptions = selectOptions(state.sports || [], "", "Select a sport");
  const conditionOptions = state.conditions || [];
  return `${pageHeader("Give item", "Fill in the recipient details, then choose a sport, item, and version.")}<form id="issueForm" class="panel form-panel grid-form"><label>First name <span class="req">*</span><input name="givenName" autocomplete="given-name" required /></label><label>Roll number <span class="req">*</span><input name="rollNo" placeholder="e.g. 24110398" required /></label><label>Email address <span class="req">*</span><input name="email" type="email" autocomplete="email" placeholder="name@example.com" required /></label><label>Sport <span class="req">*</span><select name="sport" id="issueSportSelect" required>${sportOptions}</select></label><label>Item <span class="req">*</span><select name="itemName" id="issueItemSelect" required disabled><option value="">Select a sport first</option></select></label><label>Version <span class="req">*</span><select name="itemId" id="issueVersionSelect" required disabled><option value="">Select an item first</option></select></label><label>Quantity <span class="req">*</span><input id="issueQuantity" name="quantity" type="number" min="1" step="1" value="1" max="0" required disabled /><small class="stock-hint" id="itemAvailability">Select a version to see available stock.</small></label><label>Date given <span class="req">*</span><input name="issueDate" type="date" value="${today()}" required /></label><label>Date to be returned<input name="dueDate" type="date" /></label><label>Condition<select name="condition">${selectOptions(conditionOptions, conditionOptions[0] || "", "Select condition")}</select></label>${customQuestionFields()}<label class="full">Remarks / purpose<textarea name="remarks" rows="2" placeholder="Optional notes"></textarea></label><div class="full actions"><button class="button button-dark" type="submit">Save entry</button><button class="button button-light" type="reset">Clear</button></div></form>`;
}

function renderGive() {
  return renderGiveForm();
}

function filteredIssues() {
  const query = issueSearch.trim().toLowerCase();
  return [...state.issues]
    .filter((issue) => {
      const item = itemFor(issue.itemId);
      const searchText = [item && item.name, issue.givenName || issue.issuedTo, issue.email, issue.rollNo, issue.sport, issue.remarks]
        .concat(Object.values(issue.answers || {})).join(" ").toLowerCase();
      if (query && !searchText.includes(query)) return false;
      if (issueStatus === "out" && outstandingFor(issue) === 0) return false;
      if (issueStatus === "returned" && outstandingFor(issue) > 0) return false;
      return true;
    })
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
}

function issueRows(issues) {
  return issues.map((issue) => {
    const item = itemFor(issue.itemId);
    if (!item) return "";
    const outstanding = outstandingFor(issue);
    const partialText = Number(issue.returnedQty || 0) > 0 && outstanding > 0
      ? `${issue.returnedQty} returned · ${outstanding} out`
      : outstanding ? `${outstanding} out` : `Returned ${formatDate(issue.returnDate)}`;
    const answerCells = (state.questions || []).map((question) => `<td>${escapeHtml((issue.answers || {})[question.id] || "—")}</td>`).join("");
    const toggle = `<label class="switch" title="Toggle returned status"><input type="checkbox" data-action="toggle-return" data-id="${escapeHtml(issue.id)}" ${outstanding === 0 ? "checked" : ""} /><span class="slider"></span></label><div class="return-status ${outstanding ? "warn-text" : "ok-text"}">${partialText}</div>`;
    const actions = outstanding
      ? `<button class="button button-small" data-action="partial-return" data-id="${escapeHtml(issue.id)}">Return qty</button> <button class="button button-danger button-small" data-action="delete-issue" data-id="${escapeHtml(issue.id)}" aria-label="Delete issue">×</button>`
      : `<button class="button button-danger button-small" data-action="delete-issue" data-id="${escapeHtml(issue.id)}" aria-label="Delete issue">×</button>`;
    return `<tr><td>${formatDate(issue.issueDate)}</td><td>${escapeHtml(issue.givenName || issue.issuedTo || "—")}</td><td>${escapeHtml(issue.rollNo)}</td><td>${escapeHtml(issue.email || "—")}</td><td>${escapeHtml(issue.sport || item.sport || "—")}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.model)}</td><td class="num">${issue.quantity} ${unitLabel(item.unit)}</td><td>${formatDate(issue.dueDate)}</td><td>${escapeHtml(issue.condition || "—")}</td><td>${Number(issue.returnedQty || 0)} ${unitLabel(item.unit)}</td><td>${formatDate(issue.returnDate)}</td><td><span class="num">${outstanding} ${unitLabel(item.unit)}</span></td><td>${escapeHtml(issue.remarks || "—")}</td>${answerCells}<td>${toggle}</td><td>${actions}</td></tr>`;
  }).join("");
}

function itemSummaryRows() {
  return state.inventory.map((item) => {
    const outstanding = issuedFor(item.id);
    const available = availableFor(item);
    const percent = item.total ? Math.round((outstanding / item.total) * 100) : 0;
    return `<tr><td><div class="item-cell"><span class="item-icon">${icons[state.inventory.indexOf(item) % icons.length]}</span><span class="item-meta"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.model)}</small></span></div></td><td><span class="badge">${escapeHtml(item.sport || "—")}</span></td><td class="num">${item.total} ${unitLabel(item.unit)}</td><td class="num warn-text">${outstanding}</td><td class="num ok-text">${available}</td><td><div class="usage-bar"><span class="${percent >= 90 ? "danger" : ""}" style="width:${percent}%"></span></div><small class="muted">${percent}% out</small></td><td><div class="table-actions"><button class="button button-small" data-action="edit-item" data-id="${escapeHtml(item.id)}">Edit</button><button class="button button-danger button-small" data-action="delete-item" data-id="${escapeHtml(item.id)}">×</button></div></td></tr>`;
  }).join("");
}

function renderInventory() {
  const questionHeaders = (state.questions || []).map((question) => `<th>${escapeHtml(question.label)}</th>`).join("");
  return `${pageHeader("Inventory & records", "Given records are listed first; the item summary shows total, issued, and remaining stock.", '<button class="button button-dark" data-action="add-item">＋ Add item</button>')}<section class="panel inventory-card"><div class="panel-header records-head"><div><h2>Given records</h2><p>Search issues, record returns, or filter by status.</p></div><div class="filters"><input id="issueSearch" aria-label="Search records" placeholder="Search item / name / roll no. / email" value="${escapeHtml(issueSearch)}" /><select id="issueStatus" aria-label="Filter records"><option value="all" ${issueStatus === "all" ? "selected" : ""}>All records</option><option value="out" ${issueStatus === "out" ? "selected" : ""}>Not returned</option><option value="returned" ${issueStatus === "returned" ? "selected" : ""}>Returned</option></select></div></div><div class="table-wrap"><table><thead><tr><th>DATE GIVEN</th><th>NAME</th><th>ROLL NO.</th><th>EMAIL</th><th>SPORT</th><th>ITEM</th><th>VERSION</th><th>ISSUE QTY</th><th>DATE TO BE RETURNED</th><th>CONDITION</th><th>RETURN QTY</th><th>RETURN DATE</th><th>BALANCE OUT</th><th>REMARKS</th>${questionHeaders}<th>RETURNED?</th><th></th></tr></thead><tbody id="issueRecordsBody">${issueRows(filteredIssues()) || `<tr><td colspan="${16 + (state.questions || []).length}" class="table-empty">No records found.</td></tr>`}</tbody></table></div></section><section class="panel inventory-card"><div class="panel-header"><div><h2>Item summary</h2><p>Total, issued, and remaining stock update automatically.</p></div></div><div class="table-wrap"><table><thead><tr><th>ITEM</th><th>SPORT</th><th>NEW STOCK IN STORE ROOM</th><th>GIVEN OUT</th><th>REMAINING</th><th>USAGE</th><th>ACTIONS</th></tr></thead><tbody>${itemSummaryRows() || '<tr><td colspan="7" class="table-empty">No items yet — add stock in the Stock in tab.</td></tr>'}</tbody></table></div></section>`;
}

function purchaseForm() {
  const sports = selectOptions(state.sports || [], "", "Select a sport") + '<option value="__new__">＋ Add a new sport</option>';
  return `<form id="purchaseForm" class="panel form-panel grid-form">
    <label>Sport <span class="req">*</span><select name="sport" id="stockSportSelect" required>${sports}</select></label>
    <label id="newSportField" class="hidden">New sport name <span class="req">*</span><input name="newSport" placeholder="e.g. Volleyball" /></label>
    <label>Item <span class="req">*</span><select name="itemName" id="stockItemSelect" required disabled><option value="">Select a sport first</option></select></label>
    <label id="newItemField" class="hidden">New item name <span class="req">*</span><input name="newItemName" placeholder="e.g. Volleyball" /></label>
    <label>Date received <span class="req">*</span><input name="date" type="date" value="${today()}" required /></label>
    <label>Version <span class="req">*</span><select name="versionId" id="stockVersionSelect" required disabled><option value="">Select an item first</option></select></label>
    <label id="newVersionField" class="hidden">New version <span class="req">*</span><input name="newVersion" placeholder="Brand or model" /></label>
    <label id="newUnitField" class="hidden">Unit <span class="req">*</span><select name="unit">${selectOptions(state.units || [], state.units[0] || "", "Select a unit")}</select></label>
    <label>Quantity received <span class="req">*</span><input name="quantity" type="number" min="1" step="1" value="1" required /></label>
    <div class="full actions"><button class="button button-dark" type="submit">Add to inventory</button><button class="button button-light" type="reset">Clear</button></div>
  </form>`;
}

function purchaseRows() {
  return [...state.purchases].sort((a, b) => b.date.localeCompare(a.date)).map((purchase) => `<tr><td>${formatDate(purchase.date)}</td><td>${escapeHtml(purchase.sport || "—")}</td><td>${escapeHtml(purchase.itemName)}</td><td>${escapeHtml(purchase.model || "—")}</td><td class="num">+${purchase.quantity} ${unitLabel(purchase.unit)}</td><td><button class="button button-danger button-small" data-action="delete-purchase" data-id="${escapeHtml(purchase.id)}" aria-label="Delete stock entry">×</button></td></tr>`).join("");
}

function renderStockIn() {
  return `${pageHeader("Stock in", "Add stock to an existing or new sport, item, and version.")}<section class="panel"><div class="panel-header"><div><h2>Add to inventory</h2><p>Choose existing options or create new ones directly here.</p></div></div>${purchaseForm()}</section><section class="panel inventory-card"><div class="panel-header"><div><h2>Stock batches</h2><p>Purchases added to the equipment room</p></div></div><div class="table-wrap"><table><thead><tr><th>DATE RECEIVED</th><th>SPORT</th><th>ITEM</th><th>VERSION</th><th>QUANTITY</th><th></th></tr></thead><tbody>${purchaseRows() || '<tr><td colspan="6" class="table-empty">No stock entries yet.</td></tr>'}</tbody></table></div></section>`;
}

function renderOptionCard(group) {
  const values = state[group.key] || [];
  return `<section class="panel setting-card"><h2>${escapeHtml(group.label)}</h2><p>Manage the options available in the forms.</p><div class="chips">${values.map((value) => `<span class="chip">${escapeHtml(value)}<button type="button" class="chip-edit" data-action="edit-option" data-key="${escapeHtml(group.key)}" data-value="${escapeHtml(value)}" aria-label="Edit ${escapeHtml(value)}">✎</button><button type="button" data-action="delete-option" data-key="${escapeHtml(group.key)}" data-value="${escapeHtml(value)}" aria-label="Remove ${escapeHtml(value)}">×</button></span>`).join("") || '<span class="muted small">No options yet.</span>'}</div><form data-form="add-option" data-key="${escapeHtml(group.key)}" class="inline-add"><input name="value" aria-label="New option" placeholder="Add ${escapeHtml(group.label.toLowerCase())}..." required /><button class="button button-small" type="submit">Add</button></form></section>`;
}

function renameOption(key, oldValue, nextValue) {
  if (!optionGroups.some((group) => group.key === key) || !Array.isArray(state[key])) {
    showToast("That dropdown option could not be found.", "err");
    return false;
  }
  const options = state[key];
  const optionIndex = options.indexOf(oldValue);
  const value = String(nextValue || "").trim();
  if (optionIndex < 0) {
    showToast("That dropdown option could not be found.", "err");
    return false;
  }
  if (!value) {
    showToast("Enter a value for the dropdown option.", "err");
    return false;
  }
  if (options.some((option, index) => index !== optionIndex && option.toLowerCase() === value.toLowerCase())) {
    showToast("That dropdown option already exists.", "err");
    return false;
  }
  if (value === oldValue) return true;

  options[optionIndex] = value;
  if (key === "sports") {
    const itemIds = new Set(state.inventory.filter((item) => item.sport === oldValue).map((item) => item.id));
    state.inventory.forEach((item) => { if (item.sport === oldValue) item.sport = value; });
    state.issues.forEach((issue) => { if (issue.sport === oldValue || itemIds.has(issue.itemId)) issue.sport = value; });
    state.purchases.forEach((purchase) => { if (purchase.sport === oldValue || itemIds.has(purchase.itemId)) purchase.sport = value; });
  } else if (key === "conditions") {
    state.issues.forEach((issue) => { if (issue.condition === oldValue) issue.condition = value; });
  } else if (key === "units") {
    state.inventory.forEach((item) => { if (item.unit === oldValue) item.unit = value; });
    state.purchases.forEach((purchase) => { if (purchase.unit === oldValue) purchase.unit = value; });
  }
  persist();
  render();
  showToast(`${oldValue} renamed to ${value}.`);
  return true;
}

function renderQuestion(question) {
  const type = ["text", "number", "date", "dropdown"].includes(question.type) ? question.type : "text";
  return `<div class="question-row"><form data-form="edit-question" data-id="${escapeHtml(question.id)}"><input name="label" aria-label="Question" value="${escapeHtml(question.label)}" required /><select name="type" aria-label="Answer type"><option value="text" ${type === "text" ? "selected" : ""}>Text</option><option value="number" ${type === "number" ? "selected" : ""}>Number</option><option value="date" ${type === "date" ? "selected" : ""}>Date</option><option value="dropdown" ${type === "dropdown" ? "selected" : ""}>Dropdown</option></select><input name="choices" aria-label="Dropdown choices" class="question-choices ${type === "dropdown" ? "" : "hidden"}" value="${escapeHtml((question.options || []).join(", "))}" placeholder="Options, separated by commas" /><label class="check-label"><input type="checkbox" name="required" ${question.required ? "checked" : ""} /> Required</label><div class="question-footer"><button class="button button-small" type="submit">Save question</button><button class="button button-danger button-small" type="button" data-action="delete-question" data-id="${escapeHtml(question.id)}">Remove</button></div></form></div>`;
}

function renderSettings() {
  return `${pageHeader("Settings", "Manage dropdown options and the questions shown on the Give item form.")}<div class="demo-warning">This is a browser-only prototype. Settings and inventory live in this browser; demo sign-in is not secure enough for real student data.</div><div class="settings-grid">${optionGroups.map(renderOptionCard).join("")}</div><section class="panel setting-card question-settings"><h2>Custom questions</h2><p>Add questions to the Give item form, edit them later, or remove them.</p><div class="question-list">${(state.questions || []).map(renderQuestion).join("") || '<p class="muted small">No custom questions yet. Add one below.</p>'}<form data-form="add-question" class="add-question"><input name="label" aria-label="New question" placeholder="Question, e.g. Team / class" required /><select name="type" aria-label="Answer type"><option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="dropdown">Dropdown</option></select><input name="choices" class="question-choices hidden" aria-label="Dropdown choices" placeholder="Options, separated by commas" /><label class="check-label"><input type="checkbox" name="required" /> Required</label><button class="button button-dark button-small" type="submit">＋ Add question</button></form></div></section><section class="panel setting-card danger-card"><h2>Placeholder data</h2><p>Remove the sample items, issue records, and purchase history. Your sports, names, conditions, units, and questions will stay in place.</p><button class="button button-danger button-small" data-action="clear-demo">Clear placeholder inventory</button></section>`;
}

function render() {
  const renderer = { give: renderGive, inventory: renderInventory, stockin: renderStockIn, settings: renderSettings };
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.tab === activeTab));
  document.getElementById("pageCrumb").textContent = pageNames[activeTab];
  document.getElementById("todayLabel").textContent = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  pageContent.innerHTML = renderer[activeTab]();
  if (activeTab === "stockin") updatePurchaseFields(document.getElementById("purchaseForm"));
}

function changeTab(tab) {
  if (!pageNames[tab]) return;
  activeTab = tab;
  render();
  pageContent.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showItemDialog(item) {
  const form = document.getElementById("itemForm");
  const hasHistory = item && (state.issues.some((issue) => issue.itemId === item.id) || state.purchases.some((purchase) => purchase.itemId === item.id));
  form.elements.sport.innerHTML = selectOptions(state.sports || [], "", "Select a sport");
  form.elements.unit.innerHTML = selectOptions(state.units || [], "", "Select a unit");
  form.reset();
  form.elements.itemId.value = item ? item.id : "";
  form.elements.name.value = item ? item.name : "";
  form.elements.model.value = item ? item.model : "";
  form.elements.sport.value = item ? item.sport : "";
  form.elements.unit.value = item ? item.unit : (state.units[0] || "pcs");
  form.elements.unit.disabled = Boolean(hasHistory);
  document.getElementById("unitHint").classList.toggle("hidden", !hasHistory);
  document.getElementById("itemDialogTitle").textContent = item ? "Edit item details" : "Add an item";
  document.getElementById("itemDialog").showModal();
}

function recordReturn(issueId, quantity, returnDate = today()) {
  const issue = state.issues.find((record) => record.id === issueId);
  if (!issue) {
    showToast("The issue record could not be found.", "err");
    return false;
  }
  const outstanding = outstandingFor(issue);
  const returnQuantity = quantity === undefined ? outstanding : Number(quantity);
  if (!Number.isInteger(returnQuantity) || returnQuantity < 1 || returnQuantity > outstanding) {
    showToast(`Enter a return quantity from 1 to ${outstanding}.`, "err");
    return false;
  }
  issue.returnedQty = Number(issue.returnedQty || 0) + returnQuantity;
  issue.returnDate = returnDate || today();
  persist();
  render();
  showToast(outstandingFor(issue) === 0 ? "Equipment marked as returned." : `${returnQuantity} returned. ${outstandingFor(issue)} still out.`);
  return true;
}

function saveIssue(form) {
  const values = new FormData(form);
  const item = itemFor(values.get("itemId"));
  const quantity = Number(values.get("quantity"));
  const givenName = String(values.get("givenName") || "").trim();
  const rollNo = String(values.get("rollNo") || "").trim();
  const email = String(values.get("email") || "").trim();
  if (!item || item.sport !== values.get("sport") || item.name !== values.get("itemName")) {
    showToast("Choose a sport, item, and version from the dropdowns.", "err");
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > availableFor(item)) {
    showToast("That quantity is not available. Check the current stock and try again.", "err");
    return;
  }
  if (!givenName || !rollNo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !values.get("issueDate")) {
    showToast("Fill in the name, roll number, valid email, and date given.", "err");
    return;
  }
  const answers = {};
  (state.questions || []).forEach((question) => { answers[question.id] = String(values.get(`custom-${question.id}`) || "").trim(); });
  state.issues.push({
    id: crypto.randomUUID(),
    itemId: item.id,
    givenName,
    issuedTo: givenName,
    email,
    rollNo,
    sport: item.sport,
    quantity,
    issueDate: String(values.get("issueDate")),
    dueDate: String(values.get("dueDate") || ""),
    condition: String(values.get("condition") || ""),
    returnedQty: 0,
    returnDate: "",
    remarks: String(values.get("remarks") || "").trim(),
    answers,
  });
  persist();
  render();
  showToast(`${quantity} ${unitLabel(item.unit)} of ${item.name} issued.`);
}

function savePurchase(form) {
  const values = new FormData(form);
  const quantity = Number(values.get("quantity"));
  if (!Number.isInteger(quantity) || quantity < 1) {
    showToast("Enter a whole number greater than zero for the received quantity.", "err");
    return;
  }
  const date = String(values.get("date") || "");
  if (!date) {
    showToast("Select a date received.", "err");
    return;
  }
  const sportChoice = String(values.get("sport") || "");
  const isNewSport = sportChoice === "__new__";
  const sport = isNewSport ? String(values.get("newSport") || "").trim() : sportChoice;
  const itemChoice = String(values.get("itemName") || "");
  const isNewItem = itemChoice === "__new__";
  const name = isNewItem ? String(values.get("newItemName") || "").trim() : itemChoice;
  const versionChoice = String(values.get("versionId") || "");
  const isNewVersion = versionChoice === "__new__";
  let item = isNewVersion ? null : itemFor(versionChoice);
  const model = isNewVersion ? String(values.get("newVersion") || "").trim() : item && item.model;
  if (!sport || (!isNewSport && !state.sports.includes(sport))) {
    showToast("Select a sport or enter a new sport name.", "err");
    return;
  }
  if (isNewSport && state.sports.some((option) => option.toLowerCase() === sport.toLowerCase())) {
    showToast("That sport already exists. Select it from the list.", "err");
    return;
  }
  if (!name) {
    showToast("Select an item or enter a new item name.", "err");
    return;
  }
  if (!isNewItem && !state.inventory.some((entry) => entry.sport === sport && entry.name === name)) {
    showToast("Select an item that belongs to the chosen sport.", "err");
    return;
  }
  if (isNewItem && state.inventory.some((entry) => entry.sport.toLowerCase() === sport.toLowerCase() && entry.name.toLowerCase() === name.toLowerCase())) {
    showToast("That item already exists for this sport. Select it to add another version.", "err");
    return;
  }
  if (!model) {
    showToast("Select a version or enter a new version name.", "err");
    return;
  }
  if (!isNewVersion && (!item || item.sport !== sport || item.name !== name)) {
    showToast("Select a version that belongs to the chosen item.", "err");
    return;
  }
  if (isNewVersion && state.inventory.some((entry) => entry.sport.toLowerCase() === sport.toLowerCase()
      && entry.name.toLowerCase() === name.toLowerCase()
      && entry.model.toLowerCase() === model.toLowerCase())) {
    showToast("That version already exists. Select it from the list.", "err");
    return;
  }
  const unit = isNewVersion ? String(values.get("unit") || "") : item.unit;
  if (isNewVersion && !state.units.includes(unit)) {
    showToast("Select a valid unit for the new version.", "err");
    return;
  }
  if (isNewSport) state.sports.push(sport);
  if (isNewVersion) {
    item = { id: crypto.randomUUID(), name, model, sport, unit, total: 0, minimum: 0 };
    state.inventory.push(item);
  }
  item.total = Number(item.total) + quantity;
  state.purchases.push({
    id: crypto.randomUUID(),
    itemId: item.id,
    itemName: item.name,
    model: item.model,
    quantity,
    unit,
    sport: item.sport,
    date,
    supplier: "",
    size: "",
  });
  persist();
  render();
  showToast(`${quantity} ${unitLabel(unit)} added to ${item.name}.`);
}

function refreshIssueRecords() {
  const body = document.getElementById("issueRecordsBody");
  if (!body) return;
  const rows = issueRows(filteredIssues());
  body.innerHTML = rows || `<tr><td colspan="${16 + (state.questions || []).length}" class="table-empty">No records found.</td></tr>`;
}

function updatePurchaseFields(form) {
  if (!form) return;
  const sportSelect = form.elements.sport;
  const newSportInput = form.elements.newSport;
  const isNewSport = sportSelect.value === "__new__";
  const sport = isNewSport ? newSportInput.value.trim() : sportSelect.value;
  document.getElementById("newSportField").classList.toggle("hidden", !isNewSport);
  newSportInput.required = isNewSport;

  const itemSelect = form.elements.itemName;
  const previousItem = itemSelect.value;
  const names = [...new Set(state.inventory.filter((item) => item.sport === sport).map((item) => item.name))];
  itemSelect.innerHTML = `${selectOptions(names, "", sport ? "Select an item" : "Select a sport first")}<option value="__new__">＋ Add a new item</option>`;
  itemSelect.disabled = !sport;
  if (isNewSport && sport) itemSelect.value = "__new__";
  else if (previousItem === "__new__") itemSelect.value = "__new__";
  else if (names.includes(previousItem)) itemSelect.value = previousItem;
  else itemSelect.value = "";
  document.getElementById("newItemField").classList.toggle("hidden", itemSelect.value !== "__new__");
  form.elements.newItemName.required = itemSelect.value === "__new__";

  const isNewItem = itemSelect.value === "__new__";
  const itemName = isNewItem ? form.elements.newItemName.value.trim() : itemSelect.value;
  const versionSelect = form.elements.versionId;
  const previousVersion = versionSelect.value;
  const versions = state.inventory.filter((item) => item.sport === sport && item.name === itemName);
  if (isNewItem) {
    versionSelect.innerHTML = '<option value="__new__">＋ Add a new version</option>';
    versionSelect.value = "__new__";
  } else {
    const versionOptions = versions.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.model)}</option>`).join("");
    versionSelect.innerHTML = `<option value="">${itemName ? "Select a version" : "Select an item first"}</option>${versionOptions}${itemName ? '<option value="__new__">＋ Add a new version</option>' : ""}`;
    if (versions.some((item) => item.id === previousVersion) || previousVersion === "__new__") versionSelect.value = previousVersion;
    else versionSelect.value = "";
  }
  versionSelect.disabled = !sport || !itemName;
  const isNewVersion = isNewItem || versionSelect.value === "__new__";
  document.getElementById("newVersionField").classList.toggle("hidden", !isNewVersion);
  document.getElementById("newUnitField").classList.toggle("hidden", !isNewVersion);
  form.elements.newVersion.required = isNewVersion;
  form.elements.unit.required = isNewVersion;
  if (isNewVersion && (previousVersion !== "__new__" || !state.units.includes(form.elements.unit.value))) {
    const existingVersion = versions[0];
    form.elements.unit.value = existingVersion ? existingVersion.unit : (state.units[0] || "");
  }
}

document.getElementById("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  const error = document.getElementById("loginError");
  if (values.get("username") !== "admin" || values.get("password") !== "admin123") {
    error.textContent = "Invalid credentials. Try admin / admin123.";
    return;
  }
  sessionStorage.setItem("fieldhouse-admin", "signed-in");
  error.textContent = "";
  updateLogin();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("button, a[data-tab]");
  if (!button) return;
  if (button.dataset.tab) {
    event.preventDefault();
    changeTab(button.dataset.tab);
    return;
  }
  const { action, id } = button.dataset;
  if (action === "add-item") showItemDialog(null);
  if (action === "edit-item") showItemDialog(itemFor(id));
  if (action === "edit-option") {
    const key = button.dataset.key;
    const group = optionGroups.find((entry) => entry.key === key);
    if (!group || !Array.isArray(state[key])) return;
    const oldValue = button.dataset.value;
    const value = window.prompt(`Rename ${group.label.toLowerCase()} option:`, oldValue);
    if (value !== null) renameOption(key, oldValue, value);
  }
  if (action === "close-return") document.getElementById("returnDialog").close();
  if (action === "close-item") document.getElementById("itemDialog").close();
  if (action === "partial-return") {
    const issue = state.issues.find((record) => record.id === id);
    const item = issue && itemFor(issue.itemId);
    if (!issue || !item) return;
    const form = document.getElementById("returnForm");
    form.elements.issueId.value = id;
    form.elements.returnQty.max = outstandingFor(issue);
    form.elements.returnQty.value = outstandingFor(issue);
    form.elements.returnDate.value = today();
    document.getElementById("returnSummary").textContent = `${issue.givenName || issue.issuedTo} has ${outstandingFor(issue)} ${unitLabel(item.unit)} of ${item.name} outstanding.`;
    document.getElementById("returnDialog").showModal();
  }
  if (action === "delete-issue") {
    if (!window.confirm("Delete this issue record? Its unreturned quantity will be added back to available stock.")) return;
    state.issues = state.issues.filter((issue) => issue.id !== id);
    persist();
    render();
    showToast("Issue record deleted.");
  }
  if (action === "delete-purchase") {
    const purchase = state.purchases.find((entry) => entry.id === id);
    const item = purchase && itemFor(purchase.itemId);
    if (!purchase || !item) return;
    if (item.total - purchase.quantity < issuedFor(item.id)) {
      showToast("Cannot remove this stock entry while those units are issued.", "err");
      return;
    }
    if (!window.confirm("Delete this stock entry? The total stock will decrease.")) return;
    item.total -= purchase.quantity;
    state.purchases = state.purchases.filter((entry) => entry.id !== id);
    persist();
    render();
    showToast("Stock entry removed.");
  }
  if (action === "delete-option") {
    const key = button.dataset.key;
    const value = button.dataset.value;
    if (!optionGroups.some((group) => group.key === key) || !Array.isArray(state[key])) return;
    if (key === "units" && state.inventory.some((item) => item.unit === value)) {
      showToast("This unit is assigned to inventory items. Remove or update those items first.", "err");
      return;
    }
    if (state[key].length <= 1) {
      showToast("Keep at least one option in each dropdown.", "err");
      return;
    }
    state[key] = state[key].filter((option) => option !== value);
    persist();
    render();
    showToast(`${value} removed from the list.`);
  }
  if (action === "delete-question") {
    state.questions = state.questions.filter((question) => question.id !== id);
    persist();
    render();
    showToast("Question removed.");
  }
  if (action === "clear-demo") {
    if (!window.confirm("Remove all placeholder items, issue records, and purchase history? This cannot be undone.")) return;
    state.inventory = [];
    state.issues = [];
    state.purchases = [];
    persist();
    render();
    showToast("Placeholder inventory cleared.");
  }
  if (button.id === "logoutButton") {
    sessionStorage.removeItem("fieldhouse-admin");
    updateLogin();
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (form.id === "issueForm") {
    event.preventDefault();
    saveIssue(form);
    return;
  }
  if (form.id === "purchaseForm") {
    event.preventDefault();
    savePurchase(form);
    return;
  }
  if (form.id === "returnForm") {
    event.preventDefault();
    const values = new FormData(form);
    if (recordReturn(values.get("issueId"), values.get("returnQty"), String(values.get("returnDate") || today()))) {
      document.getElementById("returnDialog").close();
    }
    return;
  }
  if (form.id === "itemForm") {
    event.preventDefault();
    const values = new FormData(form);
    const item = itemFor(String(values.get("itemId") || ""));
    const name = String(values.get("name") || "").trim();
    const model = String(values.get("model") || "").trim();
    const sport = String(values.get("sport") || "").trim();
    if (!name || !model || !sport) {
      showToast("Enter an item name, brand, and sport.", "err");
      return;
    }
    if (state.inventory.some((entry) => entry.id !== (item && item.id)
      && entry.name.toLowerCase() === name.toLowerCase()
      && entry.model.toLowerCase() === model.toLowerCase()
      && entry.sport.toLowerCase() === sport.toLowerCase())) {
      showToast("That item version already exists.", "err");
      return;
    }
    if (item) {
      item.name = name;
      item.model = model;
      item.sport = sport;
      const hasHistory = state.issues.some((issue) => issue.itemId === item.id) || state.purchases.some((purchase) => purchase.itemId === item.id);
      if (!hasHistory) item.unit = String(values.get("unit") || item.unit);
    } else {
      state.inventory.push({ id: crypto.randomUUID(), name, model, sport, unit: String(values.get("unit") || state.units[0] || "pcs"), total: 0, minimum: 0 });
    }
    persist();
    document.getElementById("itemDialog").close();
    render();
    showToast(item ? `${name} updated.` : `${name} added. Add its quantity in Stock in.`);
    return;
  }

  const formType = form.dataset.form;
  if (!formType) return;
  event.preventDefault();
  const values = new FormData(form);
  if (formType === "add-option") {
    const key = form.dataset.key;
    const value = String(values.get("value") || "").trim();
    if (!optionGroups.some((group) => group.key === key) || !value) {
      showToast("Enter an option to add.", "err");
      return;
    }
    if (state[key].some((option) => option.toLowerCase() === value.toLowerCase())) {
      showToast("That option already exists.", "err");
      return;
    }
    state[key].push(value);
    persist();
    render();
    showToast("Dropdown option added.");
    return;
  }
  if (formType === "edit-question" || formType === "add-question") {
    const label = String(values.get("label") || "").trim();
    const type = String(values.get("type") || "text");
    const options = String(values.get("choices") || "").split(",").map((value) => value.trim()).filter(Boolean);
    if (!label || (type === "dropdown" && !options.length)) {
      showToast(type === "dropdown" ? "Enter the question and at least one dropdown option." : "Enter a question.", "err");
      return;
    }
    const question = formType === "edit-question" ? state.questions.find((entry) => entry.id === form.dataset.id) : null;
    const updatedQuestion = {
      id: question ? question.id : crypto.randomUUID(),
      label,
      type,
      options: type === "dropdown" ? [...new Set(options)] : [],
      required: values.get("required") === "on",
    };
    if (question) Object.assign(question, updatedQuestion);
    else state.questions.push(updatedQuestion);
    persist();
    render();
    showToast(question ? "Question updated." : "Question added to the issue form.");
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches('input[data-action="toggle-return"]')) {
    const issue = state.issues.find((record) => record.id === target.dataset.id);
    if (!issue) return;
    if (target.checked) {
      recordReturn(issue.id);
    } else if (outstandingFor(issue) === 0) {
      issue.returnedQty = 0;
      issue.returnDate = "";
      persist();
      render();
      showToast("Return status changed back to outstanding.", "err");
    }
    return;
  }
  if (target.id === "issueSportSelect") updateGiveItems();
  if (target.id === "issueItemSelect") updateGiveVersions();
  if (target.id === "issueVersionSelect") updateGiveAvailability();
  if (["stockSportSelect", "stockItemSelect", "stockVersionSelect"].includes(target.id)) {
    updatePurchaseFields(document.getElementById("purchaseForm"));
  }
  if (target.name === "type" && target.form && ["add-question", "edit-question"].includes(target.form.dataset.form)) {
    const choices = target.form.elements.choices;
    choices.classList.toggle("hidden", target.value !== "dropdown");
    choices.required = target.value === "dropdown";
  }
  if (target.id === "issueStatus") {
    issueStatus = target.value;
    refreshIssueRecords();
  }
});

document.addEventListener("reset", (event) => {
  if (event.target.id === "purchaseForm") {
    window.setTimeout(() => updatePurchaseFields(event.target), 0);
  }
  if (event.target.id === "issueForm") {
    window.setTimeout(updateGiveItems, 0);
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "issueSearch") {
    issueSearch = event.target.value;
    refreshIssueRecords();
  }
  if (["newSport", "newItemName"].includes(event.target.name)) {
    updatePurchaseFields(document.getElementById("purchaseForm"));
  }
});

document.getElementById("todayLabel").textContent = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
updateLogin();
