const KEY = "campus-ledger:records";
const CAP_KEY = "campus-ledger:limit";
const SETTINGS_KEY = "campus-ledger:prefs";

const LEGACY_KEYS = {
  records: "finance:data",
  cap: "finance:cap",
  settings: "finance:settings"
};

const DEFAULT_SETTINGS = {
  currencySymbol: "$",
  unitLabel: "USD",
  categories: [
    "Food",
    "Books",
    "Transport",
    "Entertainment",
    "Fees",
    "Other"
  ]
};

export function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEYS.records));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function loadCap() {
  const cap = Number(localStorage.getItem(CAP_KEY) ?? localStorage.getItem(LEGACY_KEYS.cap));
  return isNaN(cap) ? 0 : cap;
}

export function saveCap(cap) {
  localStorage.setItem(CAP_KEY, Number(cap) || 0);
}

function normalizeSettings(raw) {
  const base = { ...DEFAULT_SETTINGS };

  if (!raw || typeof raw !== "object") {
    return base;
  }

  const currencySymbol = String(raw.currencySymbol ?? base.currencySymbol).trim();
  const unitLabel = String(raw.unitLabel ?? base.unitLabel).trim();
  const categoriesSource = Array.isArray(raw.categories) ? raw.categories : base.categories;

  const categories = categoriesSource
    .map(value => String(value).trim())
    .filter(Boolean);

  return {
    currencySymbol: currencySymbol || base.currencySymbol,
    unitLabel: unitLabel || base.unitLabel,
    categories: categories.length > 0 ? [...new Set(categories)] : base.categories
  };
}

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? localStorage.getItem(LEGACY_KEYS.settings));
    return normalizeSettings(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
}
