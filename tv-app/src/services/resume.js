const STORAGE_KEY = 'tv_stream_resume_v1';

export function loadResumeMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveResumeMap(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getProgressForUrl(url) {
  const map = loadResumeMap();
  return map[url] || null;
}

export function setProgressForUrl(url, value) {
  const map = loadResumeMap();
  map[url] = value;
  saveResumeMap(map);
}
