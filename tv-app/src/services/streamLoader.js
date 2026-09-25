export async function loadRemoteM3u(url) {
  if (!url) {
    throw new Error('URL da playlist não informada.');
  }

  const response = await fetch(url, { method: 'GET', mode: 'cors' });

  if (!response.ok) {
    throw new Error('Não foi possível carregar a playlist remota.');
  }

  const text = await response.text();
  const lines = text
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

  if (!items.length) {
    throw new Error('Playlist sem canais válidos.');
  }

  return items;
}

export function normalizeUrl(value) {
  return (value || '').trim();
}
