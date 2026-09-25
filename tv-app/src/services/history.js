const STORAGE_KEY = 'tv_stream_history_v1';

export function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addToHistory(item) {
  const history = loadHistory();
  const filtered = history.filter((entry) => entry.url !== item.url);
  const next = [item, ...filtered].slice(0, 12);
  saveHistory(next);
  return next;
}
