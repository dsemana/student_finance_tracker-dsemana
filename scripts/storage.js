const KEY = "finance:data";
const CAP_KEY = "finance:cap";

export function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
export function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function loadCap() {
  const cap = Number(localStorage.getItem(CAP_KEY));
  return isNaN(cap) ? 0 : cap;
}

export function saveCap(cap) {
  localStorage.setItem(CAP_KEY, Number(cap) || 0);
}
