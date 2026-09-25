const STORAGE_KEY = 'tv_stream_favorites_v1';

export function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function toggleFavorite(item) {
  const favorites = loadFavorites();
  const exists = favorites.some((entry) => entry.url === item.url);
  const next = exists
    ? favorites.filter((entry) => entry.url !== item.url)
    : [...favorites, item];

  saveFavorites(next);
  return next;
}
