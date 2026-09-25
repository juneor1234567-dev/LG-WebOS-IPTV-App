import { loadLibrary, importM3uFromFile } from '../services/m3uManager.js';
import { setupRemoteControl } from '../services/remote.js';
import { toggleFavorite, loadFavorites } from '../services/favorites.js';
import { addToHistory, loadHistory } from '../services/history.js';
import { loadRemoteM3u, normalizeUrl } from '../services/streamLoader.js';
import { getProgressForUrl, setProgressForUrl } from '../services/resume.js';

export default function App() {
  const root = document.createElement('div');
  root.className = 'app-shell';

  const state = {
    library: loadLibrary(),
    favorites: loadFavorites(),
    history: loadHistory(),
    screen: 'home',
    currentCategory: 'Filmes',
    selectedIndex: 0,
    query: '',
    currentItem: null,
    modalOpen: false,
    player: null,
    showOverlay: true
  };

  function isFavorite(item) {
    if (!item) return false;
    return state.favorites.some((entry) => entry.url === item.url);
  }

  function getCategories(items) {
    const normalized = items.map((item) => ({
      ...item,
      title: item.title || 'Sem nome',
      group: item.group || 'Geral'
    }));

    return {
      Filmes: normalized.filter((item) => item.group.toLowerCase().includes('filme')),
      Séries: normalized.filter((item) => item.group.toLowerCase().includes('série') || item.group.toLowerCase().includes('serie')),
      TV: normalized.filter((item) => item.group.toLowerCase().includes('tv')),
      Favoritos: normalized.filter((item) => isFavorite(item)),
      Recentes: state.history
    };
  }

  function getCurrentItems() {
    const categories = getCategories(state.library);
    const group = categories[state.currentCategory] || [];
    const q = state.query.trim().toLowerCase();

    if (!q) return group;

    return group.filter((item) =>
      (item.title || '').toLowerCase().includes(q) ||
      (item.group || '').toLowerCase().includes(q)
    );
  }

  function createPlayer() {
    const video = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('controls', 'true');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.background = '#000';
    video.style.objectFit = 'cover';
    video.style.borderRadius = '14px';
    return video;
  }

  function loadStream(url) {
    if (!state.player || !url) return;

    state.player.src = url;
    state.player.load();
    state.player.play().catch(() => {
      console.warn('Autoplay bloqueado. Interação do usuário requerida.');
    });
  }

  function togglePause() {
    if (!state.player) return;
    if (state.player.paused) state.player.play();
    else state.player.pause();
  }

  function savePlaybackProgress() {
    if (!state.player || !state.currentItem) return;

    const progress = {
      currentTime: state.player.currentTime || 0,
      duration: state.player.duration || 0,
      ts: Date.now()
    };

    if (state.currentItem.url) {
      setProgressForUrl(state.currentItem.url, progress);
    }
  }

  function resumePlaybackFromProgress() {
    if (!state.player || !state.currentItem) return;

    const progress = getProgressForUrl(state.currentItem.url);
    if (!progress || !progress.currentTime) return;

    state.player.currentTime = Math.min(progress.currentTime, progress.duration || progress.currentTime);
  }

  function toggleFullscreen() {
    if (!state.player) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (state.player.requestFullscreen) {
      state.player.requestFullscreen();
    } else if (state.player.webkitRequestFullscreen) {
      state.player.webkitRequestFullscreen();
    }
  }

  function openStream(item) {
    if (!item || !item.url) return;

    state.currentItem = item;
    state.screen = 'player';
    state.showOverlay = true;
    state.history = addToHistory(item);
    render();

    loadStream(item.url);

    setTimeout(() => {
      resumePlaybackFromProgress();
    }, 500);

    state.player?.addEventListener('timeupdate', savePlaybackProgress, { once: false });
  }

  function backToLibrary() {
    state.screen = 'home';
    state.showOverlay = false;
    render();
  }

  function openDetails(item) {
    state.currentItem = item;
    state.modalOpen = true;
    render();
  }

  function closeDetails() {
    state.modalOpen = false;
    render();
  }

  function renderHome() {
    const categories = getCategories(state.library);

    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';

    const logo = document.createElement('div');
    logo.className = 'logo';
    logo.textContent = 'TV STREAM';

    const menu = document.createElement('nav');
    menu.className = 'menu';

    const menuOrder = ['Filmes', 'Séries', 'TV', 'Favoritos', 'Recentes'];

    menuOrder.forEach((key) => {
      if (!categories[key]) return;

      const button = document.createElement('button');
      button.className = 'menu-item' + (key === state.currentCategory ? ' active' : '');
      button.textContent = key;

      button.addEventListener('click', () => {
        state.currentCategory = key;
        state.selectedIndex = 0;
        state.query = '';
        render();
      });

      menu.appendChild(button);
    });

    const searchWrap = document.createElement('div');
    searchWrap.className = 'search-wrap';

    const input = document.createElement('input');
    input.className = 'search-input';
    input.type = 'text';
    input.placeholder = 'Buscar filmes, séries ou canais';
    input.value = state.query;

    input.addEventListener('input', (event) => {
      state.query = event.target.value;
      state.selectedIndex = 0;
      render();
    });

    searchWrap.appendChild(input);

    const importWrap = document.createElement('div');
    importWrap.className = 'import-wrap';

    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.className = 'url-input';
    urlInput.placeholder = 'https://exemplo.com/lista.m3u';

    const importUrlButton = document.createElement('button');
    importUrlButton.className = 'secondary-button';
    importUrlButton.textContent = 'Carregar URL';

    importUrlButton.addEventListener('click', async () => {
      const url = normalizeUrl(urlInput.value);

      if (!url) {
        alert('Informe uma URL válida.');
        return;
      }

      try {
        const imported = await loadRemoteM3u(url);
        state.library = imported;
        state.currentCategory = 'Filmes';
        state.query = '';
        render();
      } catch (error) {
        alert(error.message || 'Erro ao carregar a playlist.');
      }
    });

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.m3u,.m3u8,.txt';
    fileInput.className = 'file-input';

    const importLocalButton = document.createElement('button');
    importLocalButton.className = 'secondary-button';
    importLocalButton.textContent = 'Importar M3U';

    importLocalButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const imported = await importM3uFromFile(file);
        state.library = imported;
        state.currentCategory = 'Filmes';
        state.query = '';
        render();
      } catch (error) {
        alert(error.message || 'Arquivo M3U inválido.');
      }
    });

    importWrap.appendChild(urlInput);
    importWrap.appendChild(importUrlButton);
    importWrap.appendChild(fileInput);
    importWrap.appendChild(importLocalButton);

    sidebar.appendChild(logo);
    sidebar.appendChild(menu);
    sidebar.appendChild(searchWrap);
    sidebar.appendChild(importWrap);

    const main = document.createElement('main');
    main.className = 'main-panel';

    const spotlight = document.createElement('section');
    spotlight.className = 'spotlight';

    const items = getCurrentItems();
    const featured = items.slice(0, 4);

    const spotlightCover = document.createElement('div');
    spotlightCover.className = 'spotlight-cover';

    const title = document.createElement('h1');
    title.textContent = featured[0]?.title || 'Sem destaque';

    const meta = document.createElement('div');
    meta.className = 'spotlight-meta';
    meta.textContent = (featured[0]?.group || 'Categoria') + ' • TV APP';

    const actions = document.createElement('div');
    actions.className = 'spotlight-actions';

    const playBtn = document.createElement('button');
    playBtn.className = 'primary-button';
    playBtn.textContent = 'Assistir';
    playBtn.addEventListener('click', () => featured[0] && openStream(featured[0]));

    const infoBtn = document.createElement('button');
    infoBtn.className = 'secondary-button';
    infoBtn.textContent = 'Detalhes';
    infoBtn.addEventListener('click', () => featured[0] && openDetails(featured[0]));

    actions.appendChild(playBtn);
    actions.appendChild(infoBtn);

    spotlightCover.appendChild(title);
    spotlightCover.appendChild(meta);
    spotlightCover.appendChild(actions);

    spotlight.appendChild(spotlightCover);

    const row = document.createElement('div');
    row.className = 'category-row';

    Object.keys(categories).forEach((key) => {
      const chip = document.createElement('button');
      chip.className = 'filter-chip' + (key === state.currentCategory ? ' active' : '');
      chip.textContent = key;
      chip.addEventListener('click', () => {
        state.currentCategory = key;
        state.selectedIndex = 0;
        render();
      });
      row.appendChild(chip);
    });

    const listPanel = document.createElement('section');
    listPanel.className = 'content-panel';

    const heading = document.createElement('h2');
    heading.textContent = `${state.currentCategory} • ${items.length}`;
    listPanel.appendChild(heading);

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Nenhum resultado encontrado.';
      listPanel.appendChild(empty);
    } else {
      const cards = document.createElement('div');
      cards.className = 'cards-grid';

      items.forEach((item, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'media-card' + (index === state.selectedIndex ? ' selected' : '');

        const mediaCover = document.createElement('div');
        mediaCover.className = 'media-cover';
        mediaCover.textContent = item.group || 'TV';

        const body = document.createElement('div');
        body.className = 'media-body';

        const titleEl = document.createElement('h3');
        titleEl.textContent = item.title;

        const metaEl = document.createElement('p');
        metaEl.textContent = item.group || 'Geral';

        const favEl = document.createElement('span');
        favEl.className = 'mini-fav';
        favEl.textContent = isFavorite(item) ? '★' : '☆';

        body.appendChild(titleEl);
        body.appendChild(metaEl);

        card.appendChild(mediaCover);
        card.appendChild(body);
        card.appendChild(favEl);

        card.addEventListener('click', () => {
          state.selectedIndex = index;
          openDetails(item);
        });

        cards.appendChild(card);
      });

      listPanel.appendChild(cards);
    }

    main.appendChild(spotlight);
    main.appendChild(row);
    main.appendChild(listPanel);

    root.appendChild(sidebar);
    root.appendChild(main);
  }

  function renderPlayer() {
    const playerScreen = document.createElement('div');
    playerScreen.className = 'player-screen';

    const topbar = document.createElement('div');
    topbar.className = 'player-topbar';

    const backBtn = document.createElement('button');
    backBtn.className = 'back-button';
    backBtn.textContent = 'Voltar';
    backBtn.addEventListener('click', backToLibrary);

    const title = document.createElement('div');
    title.className = 'player-title';
    title.textContent = state.currentItem?.title || 'Player';

    const actions = document.createElement('div');
    actions.className = 'player-actions';

    const favBtn = document.createElement('button');
    favBtn.className = 'secondary-button';
    favBtn.textContent = isFavorite(state.currentItem) ? 'Favorito' : 'Salvar';
    favBtn.addEventListener('click', () => {
      if (!state.currentItem) return;
      state.favorites = toggleFavorite(state.currentItem);
      render();
    });

    const detailBtn = document.createElement('button');
    detailBtn.className = 'secondary-button';
    detailBtn.textContent = 'Detalhes';
    detailBtn.addEventListener('click', () => openDetails(state.currentItem));

    const progress = getProgressForUrl(state.currentItem?.url || '');
    const progressBadge = document.createElement('div');
    progressBadge.className = 'progress-badge';
    progressBadge.textContent = progress ? `Retomar: ${Math.round(progress.currentTime || 0)}s` : 'Ao vivo';

    actions.appendChild(favBtn);
    actions.appendChild(detailBtn);
    actions.appendChild(progressBadge);

    topbar.appendChild(backBtn);
    topbar.appendChild(title);
    topbar.appendChild(actions);

    const videoWrap = document.createElement('div');
    videoWrap.className = 'video-wrap';

    if (!state.player) {
      state.player = createPlayer();
      state.player.addEventListener('ended', () => {
        setTimeout(() => backToLibrary(), 800);
      });

      state.player.addEventListener('click', () => {
        state.showOverlay = !state.showOverlay;
        updateOverlay();
      });
    }

    const overlay = document.createElement('div');
    overlay.className = 'player-overlay';
    overlay.style.display = state.showOverlay ? 'flex' : 'none';

    const overlayControls = document.createElement('div');
    overlayControls.className = 'overlay-controls';

    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'primary-button';
    playPauseBtn.textContent = state.player?.paused ? 'Play' : 'Pausar';
    playPauseBtn.addEventListener('click', () => {
      togglePause();
      playPauseBtn.textContent = state.player?.paused ? 'Play' : 'Pausar';
    });

    const fullBtn = document.createElement('button');
    fullBtn.className = 'secondary-button';
    fullBtn.textContent = 'Tela cheia';
    fullBtn.addEventListener('click', toggleFullscreen);

    overlayControls.appendChild(playPauseBtn);
    overlayControls.appendChild(fullBtn);

    overlay.appendChild(overlayControls);

    const controls = document.createElement('div');
    controls.className = 'player-controls';

    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'primary-button';
    pauseBtn.textContent = 'Pausar/Play';
    pauseBtn.addEventListener('click', togglePause);

    const volumeBtn = document.createElement('button');
    volumeBtn.className = 'secondary-button';
    volumeBtn.textContent = 'Volume';
    volumeBtn.addEventListener('click', () => {
      if (!state.player) return;
      state.player.muted = !state.player.muted;
      volumeBtn.textContent = state.player.muted ? 'Mudo' : 'Volume';
    });

    const full = document.createElement('button');
    full.className = 'secondary-button';
    full.textContent = 'Full';
    full.addEventListener('click', toggleFullscreen);

    controls.appendChild(pauseBtn);
    controls.appendChild(volumeBtn);
    controls.appendChild(full);

    videoWrap.appendChild(state.player);
    videoWrap.appendChild(overlay);

    playerScreen.appendChild(topbar);
    playerScreen.appendChild(videoWrap);
    playerScreen.appendChild(controls);

    root.appendChild(playerScreen);
  }

  function updateOverlay() {
    const overlay = document.querySelector('.player-overlay');
    if (overlay) {
      overlay.style.display = state.showOverlay ? 'flex' : 'none';
    }
  }

  function renderDetailsModal() {
    if (!state.modalOpen || !state.currentItem) return;

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    const card = document.createElement('div');
    card.className = 'modal-card';

    const head = document.createElement('div');
    head.className = 'modal-header';

    const h3 = document.createElement('h3');
    h3.textContent = state.currentItem.title;

    const close = document.createElement('button');
    close.className = 'secondary-button';
    close.textContent = 'Fechar';
    close.addEventListener('click', closeDetails);

    head.appendChild(h3);
    head.appendChild(close);

    const info = document.createElement('div');
    info.className = 'modal-info';

    [
      ['Categoria', state.currentItem.group || 'Geral'],
      ['URL', state.currentItem.url || 'Sem URL'],
      ['Logo', state.currentItem.logo || 'Sem logo'],
      ['ID', state.currentItem.tvgId || 'N/A']
    ].forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'modal-row';

      const labelEl = document.createElement('strong');
      labelEl.textContent = label + ': ';

      const valueEl = document.createElement('span');
      valueEl.textContent = value;

      row.appendChild(labelEl);
      row.appendChild(valueEl);
      info.appendChild(row);
    });

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const watchBtn = document.createElement('button');
    watchBtn.className = 'primary-button';
    watchBtn.textContent = 'Assistir';
    watchBtn.addEventListener('click', () => {
      closeDetails();
      openStream(state.currentItem);
    });

    const favBtn = document.createElement('button');
    favBtn.className = 'secondary-button';
    favBtn.textContent = isFavorite(state.currentItem) ? 'Remover favorito' : 'Adicionar favorito';
    favBtn.addEventListener('click', () => {
      state.favorites = toggleFavorite(state.currentItem);
      render();
    });

    actions.appendChild(watchBtn);
    actions.appendChild(favBtn);

    card.appendChild(head);
    card.appendChild(info);
    card.appendChild(actions);

    modal.appendChild(card);
    root.appendChild(modal);
  }

  function render() {
    root.innerHTML = '';

    if (state.screen === 'player') {
      renderPlayer();
    } else {
      renderHome();
    }

    if (state.modalOpen) {
      renderDetailsModal();
    }
  }

  setupRemoteControl((action) => {
    if (state.modalOpen) {
      if (action === 'back' || action === 'enter') {
        closeDetails();
      }
      return;
    }

    const items = getCurrentItems();

    if (state.screen === 'home') {
      if (action === 'up') {
        state.selectedIndex = Math.max(0, state.selectedIndex - 1);
        render();
      }

      if (action === 'down') {
        state.selectedIndex = Math.min(Math.max(items.length - 1, 0), state.selectedIndex + 1);
        render();
      }

      if (action === 'left') {
        const categories = Object.keys(getCategories(state.library));
        const currentIdx = categories.indexOf(state.currentCategory);
        const nextIdx = (currentIdx - 1 + categories.length) % categories.length;
        state.currentCategory = categories[nextIdx];
        state.selectedIndex = 0;
        render();
      }

      if (action === 'right') {
        const categories = Object.keys(getCategories(state.library));
        const currentIdx = categories.indexOf(state.currentCategory);
        const nextIdx = (currentIdx + 1) % categories.length;
        state.currentCategory = categories[nextIdx];
        state.selectedIndex = 0;
        render();
      }

      if (action === 'enter' && items[state.selectedIndex]) {
        openDetails(items[state.selectedIndex]);
      }

      if (action === 'pause' && items[state.selectedIndex]) {
        openStream(items[state.selectedIndex]);
      }
    }

    if (state.screen === 'player') {
      if (action === 'back') {
        backToLibrary();
      }

      if (action === 'pause' || action === 'enter') {
        togglePause();
      }

      if (action === 'fullscreen') {
        toggleFullscreen();
      }

      if (action === 'volup') {
        if (state.player) state.player.volume = Math.min(1, (state.player.volume || 0.5) + 0.1);
      }

      if (action === 'voldown') {
        if (state.player) state.player.volume = Math.max(0, (state.player.volume || 0.5) - 0.1);
      }
    }
  });

  render();
  return root;
}
