import { state } from "./state.js";
import { save, loadCap, saveCap, loadSettings, saveSettings } from "./storage.js";
import { validate, duplicateRegex } from "./validators.js";
import { compileRegex, highlight } from "./search.js";

const form = document.getElementById("txnForm");
const tableBody = document.getElementById("recordsTable");
const statsDiv = document.getElementById("stats");
const searchInput = document.getElementById("searchInput");
const capInput = document.getElementById("capInput");
const capStatus = document.getElementById("capStatus");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const importJsonBtn = document.getElementById("importJsonBtn");
const importJsonInput = document.getElementById("importJsonInput");
const importExportStatus = document.getElementById("importExportStatus");
const currencySymbolInput = document.getElementById("currencySymbolInput");
const unitLabelInput = document.getElementById("unitLabelInput");
const categoriesInput = document.getElementById("categoriesInput");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

const descInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");

const descError = document.getElementById("descError");
const amountError = document.getElementById("amountError");
const catError = document.getElementById("catError");
const dateError = document.getElementById("dateError");
const sortHeaders = document.querySelectorAll("th[data-sort]");
const toggleCaseBtn = document.getElementById("toggleCase");

let caseInsensitive = true;
let settings = loadSettings();

function normalizeSettingsValue(raw, base = loadSettings()) {
  if (!raw || typeof raw !== "object") {
    return { ...base };
  }

  const currencySymbol = String(raw.currencySymbol ?? base.currencySymbol).trim();
  const unitLabel = String(raw.unitLabel ?? base.unitLabel).trim();
  const source = Array.isArray(raw.categories) ? raw.categories : base.categories;

  const categories = source
    .map(value => String(value).trim())
    .filter(Boolean);

  const deduped = [...new Set(categories)];
  if (deduped.length === 0) {
    return { error: "At least one category is required." };
  }

  const invalid = deduped.find(category => !validate("category", category));
  if (invalid) {
    return { error: `Invalid category: ${invalid}` };
  }

  return {
    currencySymbol: currencySymbol || base.currencySymbol,
    unitLabel: unitLabel || base.unitLabel,
    categories: deduped
  };
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  const unitPart = settings.unitLabel ? ` ${settings.unitLabel}` : "";
  return `${settings.currencySymbol}${amount.toFixed(2)}${unitPart}`;
}

function renderCategoryOptions(selectedValue = "") {
  categoryInput.innerHTML = "";

  settings.categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryInput.appendChild(option);
  });

  if (selectedValue && settings.categories.includes(selectedValue)) {
    categoryInput.value = selectedValue;
  } else if (settings.categories.length > 0) {
    categoryInput.value = settings.categories[0];
  }
}

function isValidIsoDateTime(value) {
  if (typeof value !== "string") return false;
  return !Number.isNaN(Date.parse(value));
}

function normalizeImportedRecord(record, index) {
  if (!record || typeof record !== "object") {
    return { error: `Record ${index + 1}: must be an object` };
  }

  const description = String(record.description ?? "").trim();
  const amountValue = record.amount;
  const category = String(record.category ?? "").trim();
  const date = String(record.date ?? "").trim();
  const createdAt = String(record.createdAt ?? "");
  const updatedAt = String(record.updatedAt ?? "");
  const amount = typeof amountValue === "number" ? amountValue : Number(amountValue);

  if (!validate("description", description)) {
    return { error: `Record ${index + 1}: invalid description` };
  }
  if (!Number.isFinite(amount) || !validate("amount", String(amount))) {
    return { error: `Record ${index + 1}: invalid amount` };
  }
  if (!validate("category", category)) {
    return { error: `Record ${index + 1}: invalid category` };
  }
  if (!validate("date", date)) {
    return { error: `Record ${index + 1}: invalid date` };
  }
  if (!isValidIsoDateTime(createdAt) || !isValidIsoDateTime(updatedAt)) {
    return { error: `Record ${index + 1}: invalid createdAt/updatedAt` };
  }

  return {
    record: {
      id: typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `txn_import_${Date.now()}_${index}`,
      description,
      amount,
      category,
      date,
      createdAt: new Date(createdAt).toISOString(),
      updatedAt: new Date(updatedAt).toISOString()
    }
  };
}

function normalizeImportedPayload(payload) {
  let recordsSource = null;
  let cap = loadCap();
  let importedSettings = settings;

  if (Array.isArray(payload)) {
    recordsSource = payload;
  } else if (payload && typeof payload === "object") {
    if (Array.isArray(payload.records)) {
      recordsSource = payload.records;
    }
    if ("cap" in payload) {
      const parsedCap = Number(payload.cap);
      if (!Number.isFinite(parsedCap) || parsedCap < 0) {
        return { error: "Invalid cap value" };
      }
      cap = parsedCap;
    }
    if ("settings" in payload) {
      const normalizedSettings = normalizeSettingsValue(payload.settings, settings);
      if (normalizedSettings.error) {
        return { error: normalizedSettings.error };
      }
      importedSettings = normalizedSettings;
    }
  }

  if (!Array.isArray(recordsSource)) {
    return { error: "JSON must be an array or an object with a records array" };
  }

  const normalizedRecords = [];
  const seenIds = new Set();

  for (let i = 0; i < recordsSource.length; i += 1) {
    const normalized = normalizeImportedRecord(recordsSource[i], i);
    if (normalized.error) return normalized;
    const record = normalized.record;
    if (!importedSettings.categories.includes(record.category)) {
      return { error: `Record ${i + 1}: category '${record.category}' is not in settings categories` };
    }
    if (seenIds.has(record.id)) {
      return { error: `Record ${i + 1}: duplicate id '${record.id}'` };
    }
    seenIds.add(record.id);
    normalizedRecords.push(record);
  }

  return { records: normalizedRecords, cap, settings: importedSettings };
}

function sortRecords(records) {
  if (!state.sortField) return records;

  return [...records].sort((a, b) => {
    const field = state.sortField;
    if (a[field] < b[field]) return -1 * state.sortDir;
    if (a[field] > b[field]) return 1 * state.sortDir;
    return 0;
  });
}

function setFieldError(input, errorEl, message) {
  errorEl.textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function updateSortAria() {
  sortHeaders.forEach(th => {
    const field = th.dataset.sort;
    let sortState = "none";
    if (state.sortField === field) {
      sortState = state.sortDir === 1 ? "ascending" : "descending";
    }
    th.setAttribute("aria-sort", sortState);
  });
}

function toggleSort(field) {
  if (state.sortField === field) {
    state.sortDir *= -1;
  } else {
    state.sortField = field;
    state.sortDir = 1;
  }
  render();
}

function render() {
  tableBody.innerHTML = "";

  const re = compileRegex(searchInput.value, caseInsensitive ? "i" : "");

  let filtered = state.records;

  if (re) {
    filtered = filtered.filter(r =>
      re.test(r.description) || re.test(r.category)
    );
  }

  filtered = sortRecords(filtered);

  if (filtered.length === 0) {
    tableBody.innerHTML =
      `<tr><td colspan="5" class="empty">No records found</td></tr>`;
  }

  filtered.forEach(record => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${highlight(record.description, re)}</td>
      <td>${formatMoney(record.amount)}</td>
      <td>${highlight(record.category, re)}</td>
      <td>${record.date}</td>
      <td>
        <button data-id="${record.id}" class="deleteBtn danger">Delete</button>
      </td>
    `;

    tableBody.appendChild(tr);
  });

  updateStats();
  updateSortAria();
}

function updateStats() {
  const total = state.records.reduce((sum, r) => sum + r.amount, 0);
  statsDiv.textContent =
    `Total Records: ${state.records.length} | Total Spent: ${formatMoney(total)}`;

  const cap = loadCap();

  if (cap > 0) {
    if (total > cap) {
      capStatus.setAttribute("aria-live", "assertive");
      capStatus.textContent = `Over cap by ${formatMoney(total - cap)}`;
    } else {
      capStatus.setAttribute("aria-live", "polite");
      capStatus.textContent = `Remaining: ${formatMoney(cap - total)}`;
    }
  } else {
    capStatus.textContent = "";
  }
}

form.addEventListener("submit", e => {
  e.preventDefault();

  const description = descInput.value.trim();
  const amount = amountInput.value.trim();
  const category = categoryInput.value.trim();
  const date = dateInput.value.trim();

  const descValid = validate("description", description);
  const amountValid = validate("amount", amount);
  const categoryValid =
    validate("category", category) && settings.categories.includes(category);
  const dateValid = validate("date", date);

  setFieldError(descInput, descError, descValid ? "" : "Invalid description");
  setFieldError(amountInput, amountError, amountValid ? "" : "Invalid amount");
  setFieldError(categoryInput, catError, categoryValid ? "" : "Invalid category");
  setFieldError(dateInput, dateError, dateValid ? "" : "Invalid date");

  if (!descValid || !amountValid || !categoryValid || !dateValid) {
    if (!descValid) descInput.focus();
    else if (!amountValid) amountInput.focus();
    else if (!categoryValid) categoryInput.focus();
    else dateInput.focus();
    return;
  }

  if (duplicateRegex.test(description)) {
    alert("Duplicate consecutive word detected.");
  }

  const record = {
    id: "txn_" + Date.now(),
    description,
    amount: Number(amount),
    category,
    date,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.records.push(record);
  save(state.records);
  form.reset();
  render();
});

tableBody.addEventListener("click", e => {
  if (e.target.classList.contains("deleteBtn")) {
    const id = e.target.dataset.id;
    state.records = state.records.filter(r => r.id !== id);
    save(state.records);
    render();
  }
});

sortHeaders.forEach(th => {
  th.tabIndex = 0;
  th.addEventListener("click", () => {
    const field = th.dataset.sort;
    toggleSort(field);
  });
  th.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const field = th.dataset.sort;
      toggleSort(field);
    }
  });
});

searchInput.addEventListener("input", render);

toggleCaseBtn.addEventListener("click", () => {
  caseInsensitive = !caseInsensitive;
  toggleCaseBtn.setAttribute("aria-pressed", caseInsensitive ? "true" : "false");
  render();
});

capInput.value = loadCap();
capInput.addEventListener("input", e => {
  saveCap(e.target.value);
  render();
});

exportJsonBtn.addEventListener("click", () => {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    cap: loadCap(),
    settings,
    records: state.records
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finance-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  importExportStatus.textContent = "Export complete.";
});

importJsonBtn.addEventListener("click", () => {
  importJsonInput.value = "";
  importJsonInput.click();
});

importJsonInput.addEventListener("change", async e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  try {
    const rawText = await file.text();
    const parsed = JSON.parse(rawText);
    const normalized = normalizeImportedPayload(parsed);

    if (normalized.error) {
      importExportStatus.textContent = `Import failed: ${normalized.error}`;
      return;
    }

    state.records = normalized.records;
    save(state.records);
    saveCap(normalized.cap);
    settings = normalized.settings;
    saveSettings(settings);
    capInput.value = normalized.cap;
    currencySymbolInput.value = settings.currencySymbol;
    unitLabelInput.value = settings.unitLabel;
    categoriesInput.value = settings.categories.join(", ");
    renderCategoryOptions();
    importExportStatus.textContent =
      `Import complete. Loaded ${normalized.records.length} record(s).`;
    render();
  } catch {
    importExportStatus.textContent = "Import failed: invalid JSON file.";
  }
});

saveSettingsBtn.addEventListener("click", () => {
  const rawSettings = {
    currencySymbol: currencySymbolInput.value,
    unitLabel: unitLabelInput.value,
    categories: categoriesInput.value.split(",")
  };

  const normalizedSettings = normalizeSettingsValue(rawSettings, settings);
  if (normalizedSettings.error) {
    importExportStatus.textContent = `Settings error: ${normalizedSettings.error}`;
    return;
  }

  const previousCategory = categoryInput.value;
  settings = normalizedSettings;
  saveSettings(settings);
  renderCategoryOptions(previousCategory);
  importExportStatus.textContent = "Settings saved.";
  render();
});

currencySymbolInput.value = settings.currencySymbol;
unitLabelInput.value = settings.unitLabel;
categoriesInput.value = settings.categories.join(", ");
renderCategoryOptions();

render();
