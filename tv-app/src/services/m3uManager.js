import { sampleM3u } from '../data/m3u.js';

const STORAGE_KEY = 'tv_stream_playlist_v1';

export function parseM3u(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      const titleMatch = line.match(/,(.*)$/);
      const title = titleMatch ? titleMatch[1].trim() : 'Sem nome';
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);

      current = {
        title,
        group: groupMatch ? groupMatch[1] : 'Geral',
        logo: logoMatch ? logoMatch[1] : '',
        tvgId: tvgIdMatch ? tvgIdMatch[1] : '',
        url: ''
      };
    } else if (line.startsWith('http') || line.startsWith('https') || line.startsWith('rtmp') || line.startsWith('rtsp')) {
      if (current) {
        items.push({ ...current, url: line });
        current = null;
      }
    }
  }

  return items;
}

export function getDefaultLibrary() {
  return parseM3u(sampleM3u);
}

export function saveLibrary(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function loadLibrary() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultLibrary();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : getDefaultLibrary();
  } catch {
    return getDefaultLibrary();
  }
}

export async function importM3uFromFile(file) {
  if (!file) return getDefaultLibrary();

  const content = await file.text();
  const parsed = parseM3u(content);

  if (!parsed.length) {
    throw new Error('Arquivo M3U inválido ou vazio.');
  }

  saveLibrary(parsed);
  return parsed;
}
