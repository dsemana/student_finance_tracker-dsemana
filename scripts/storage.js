
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
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return normalizeSettings(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
}