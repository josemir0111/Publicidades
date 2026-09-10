// ====== Reproductor de URLs ======
// Almacenamiento local: localStorage. Compartir: SOLO el reproductor, playlist codificada en el link (?playlist=...&view=player)

const STORAGE_KEY = "url_manager_items_v3";

const form = document.getElementById("urlForm");
const editIdInput = document.getElementById("editId");
const nameInput = document.getElementById("urlName");
const urlInput = document.getElementById("urlValue");
const typeInput = document.getElementById("urlType");
const tagInput = document.getElementById("urlTag");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const listEl = document.getElementById("urlList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const filterChips = document.querySelectorAll(".filter-chip");
const pageSubtitle = document.getElementById("pageSubtitle");
const playerOnlyFooter = document.getElementById("playerOnlyFooter");

// Reproductor
const playerStage = document.getElementById("playerStage");
const playerMedia = document.getElementById("playerMedia");
const stageShareBtn = document.getElementById("stageShareBtn");
const playerTitle = document.getElementById("playerTitle");
const playerTag = document.getElementById("playerTag");
const playerCounter = document.getElementById("playerCounter");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const playPauseBtn = document.getElementById("playPauseBtn");
const autoplayCheck = document.getElementById("autoplayCheck");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const dotsRow = document.getElementById("dotsRow");
const filmstrip = document.getElementById("filmstrip");

// Compartir
const shareBtn = document.getElementById("shareBtn");
const shareResult = document.getElementById("shareResult");
const shareLinkInput = document.getElementById("shareLink");
const copyLinkBtn = document.getElementById("copyLinkBtn");

const IS_PLAYER_ONLY = new URLSearchParams(window.location.search).get("view") === "player";
const IS_CLEAN = new URLSearchParams(window.location.search).get("clean") === "1";

let items = loadItemsFromUrlOrStorage();
let currentFilter = "all";
let currentIndex = 0;
let isPlaying = false;
let imageTimer = null;

if (IS_PLAYER_ONLY) {
  document.body.classList.add("player-only");
  pageSubtitle.textContent = "Playlist compartida";
  filmstrip.classList.remove("hidden");
  playerOnlyFooter.classList.remove("hidden");
  if (IS_CLEAN) document.body.classList.add("clean-view");
}

// ---------- Carga inicial: primero revisa si el link trae una playlist compartida ----------
function loadItemsFromUrlOrStorage() {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("playlist");
    if (encoded) {
      const json = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        if (params.get("view") !== "player") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn("No se pudo leer la playlist del link:", e);
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Detección de tipo ----------
function cleanPath(url) {
  try { return new URL(url).pathname.toLowerCase(); }
  catch { return url.split("?")[0].toLowerCase(); }
}
function detectType(url) {
  const path = cleanPath(url);
  const videoExt = [".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v", ".ogv"];
  const imageExt = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".avif"];
  if (videoExt.some((ext) => path.endsWith(ext))) return "video";
  if (imageExt.some((ext) => path.endsWith(ext))) return "image";
  return "other";
}
function typeLabel(type) {
  return { video: "🎬 Video", image: "🖼️ Imagen", other: "📄 Otro" }[type] || "📄 Otro";
}
function normalizePreviewUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("dropbox.com")) { u.searchParams.set("dl", "1"); return u.toString(); }
    return url;
  } catch { return url; }
}

// ---------- Lista filtrada visible (misma base que usa el reproductor) ----------
function getVisibleItems() {
  const term = IS_PLAYER_ONLY ? "" : searchInput.value.trim().toLowerCase();
  const filter = IS_PLAYER_ONLY ? "all" : currentFilter;
  return items.filter((it) => {
    const matchesType = filter === "all" || it.type === filter;
    const matchesTerm =
      !term ||
      it.name.toLowerCase().includes(term) ||
      it.url.toLowerCase().includes(term) ||
      (it.tag || "").toLowerCase().includes(term);
    return matchesType && matchesTerm;
  }).sort((a, b) => a.createdAt - b.createdAt); // orden de subida, para reproducción secuencial
}

// ================= REPRODUCTOR =================
function renderPlayer() {
  const visible = getVisibleItems();
  stopImageTimer();

  if (visible.length === 0) {
    playerMedia.innerHTML = `
      <div class="player-placeholder">
        <span class="thumb-icon">🎞️</span>
        <p>Agrega una URL abajo para empezar a reproducir</p>
      </div>`;
    playerTitle.textContent = "—";
    playerTag.textContent = "";
    playerCounter.textContent = "0 / 0";
    dotsRow.innerHTML = "";
    filmstrip.innerHTML = "";
    stageShareBtn.classList.add("hidden");
    return;
  }
  stageShareBtn.classList.remove("hidden");

  if (currentIndex >= visible.length) currentIndex = 0;
  if (currentIndex < 0) currentIndex = visible.length - 1;

  const item = visible[currentIndex];
  const previewUrl = normalizePreviewUrl(item.url);

  if (item.type === "video") {
    playerMedia.innerHTML = `<video id="mainVideo" src="${escapeHtml(previewUrl)}" controls autoplay playsinline></video>`;
    const video = document.getElementById("mainVideo");
    video.addEventListener("ended", () => {
      if (autoplayCheck.checked) goTo(currentIndex + 1);
    });
    video.addEventListener("play", () => setPlayingUi(true));
    video.addEventListener("pause", () => setPlayingUi(false));
    setPlayingUi(true);
  } else if (item.type === "image") {
    playerMedia.innerHTML = `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(item.name)}" />`;
    setPlayingUi(isPlaying);
    if (isPlaying && autoplayCheck.checked) startImageTimer();
  } else {
    playerMedia.innerHTML = `
      <div class="player-other">
        📄
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Abrir enlace</a>
      </div>`;
    setPlayingUi(false);
  }

  playerTitle.textContent = item.name;
  playerTag.textContent = item.tag || "";
  playerCounter.textContent = `${currentIndex + 1} / ${visible.length}`;

  renderDots(visible);
  if (IS_PLAYER_ONLY) renderFilmstrip(visible);

  // Resalta el item activo en la lista de gestión (si está visible)
  document.querySelectorAll(".url-item").forEach((el) => el.classList.remove("playing"));
  const activeEl = document.querySelector(`.url-item[data-id="${item.id}"]`);
  if (activeEl) activeEl.classList.add("playing");
}

function renderDots(visible) {
  if (visible.length > 30) { dotsRow.innerHTML = ""; return; } // evita saturar con playlists enormes
  dotsRow.innerHTML = "";
  visible.forEach((it, idx) => {
    const dot = document.createElement("span");
    dot.className = "dot" + (idx === currentIndex ? " active" : "");
    dot.title = it.name;
    dot.addEventListener("click", () => goTo(idx));
    dotsRow.appendChild(dot);
  });
}

function renderFilmstrip(visible) {
  filmstrip.innerHTML = "";
  visible.forEach((it, idx) => {
    const previewUrl = normalizePreviewUrl(it.url);
    const cell = document.createElement("div");
    cell.className = "filmstrip-item" + (idx === currentIndex ? " active" : "");
    cell.title = it.name;
    if (it.type === "image") {
      cell.innerHTML = `<img src="${escapeHtml(previewUrl)}" loading="lazy" alt="" />`;
    } else if (it.type === "video") {
      cell.innerHTML = `<video src="${escapeHtml(previewUrl)}#t=0.5" muted preload="metadata"></video>`;
    } else {
      cell.innerHTML = `<span class="thumb-icon">📄</span>`;
    }
    cell.addEventListener("click", () => goTo(idx));
    filmstrip.appendChild(cell);
  });
}

function setPlayingUi(playing) {
  isPlaying = playing;
  playPauseBtn.textContent = playing ? "⏸" : "▶";
}

function startImageTimer() {
  stopImageTimer();
  imageTimer = setTimeout(() => goTo(currentIndex + 1), 4000);
}
function stopImageTimer() {
  if (imageTimer) { clearTimeout(imageTimer); imageTimer = null; }
}

function goTo(index) {
  const visible = getVisibleItems();
  if (visible.length === 0) return;
  currentIndex = (index + visible.length) % visible.length;
  renderPlayer();
}

prevBtn.addEventListener("click", () => goTo(currentIndex - 1));
nextBtn.addEventListener("click", () => goTo(currentIndex + 1));

playPauseBtn.addEventListener("click", () => {
  const video = document.getElementById("mainVideo");
  if (video) {
    video.paused ? video.play() : video.pause();
  } else {
    setPlayingUi(!isPlaying);
    if (isPlaying) startImageTimer(); else stopImageTimer();
  }
});

autoplayCheck.addEventListener("change", () => {
  if (isPlaying && autoplayCheck.checked) startImageTimer();
  else stopImageTimer();
});

fullscreenBtn.addEventListener("click", () => {
  const stage = document.getElementById("playerStage");
  if (!document.fullscreenElement) {
    stage.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
});

// ================= COMPARTIR DESDE EL STAGE (funciona también en pantalla completa) =================
// El botón vive dentro de #playerStage, así que sigue visible incluso cuando
// ese elemento entra en pantalla completa (a diferencia del panel de compartir de abajo).
function buildShareUrl(options = {}) {
  const json = JSON.stringify(items);
  const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
  const url = new URL(window.location.href);
  url.search = options.clean
    ? `?view=player&clean=1&playlist=${encoded}`
    : `?view=player&playlist=${encoded}`;
  return url.toString();
}

function flashStageShareBtn(text, title) {
  const original = stageShareBtn.textContent;
  const originalTitle = stageShareBtn.title;
  stageShareBtn.textContent = text;
  stageShareBtn.title = title;
  setTimeout(() => {
    stageShareBtn.textContent = original;
    stageShareBtn.title = originalTitle;
  }, 1500);
}

stageShareBtn.addEventListener("click", () => {
  if (items.length === 0) return;
  const finalUrl = buildShareUrl({ clean: true });

  navigator.clipboard.writeText(finalUrl).then(() => {
    flashStageShareBtn("✅", "¡Enlace copiado!");
  }).catch(() => {
    // Si el portapapeles falla (p. ej. permisos del navegador), mostramos el
    // enlace en el panel de abajo cuando esté disponible en pantalla.
    flashStageShareBtn("⚠️", "No se pudo copiar automáticamente");
    if (!IS_PLAYER_ONLY) {
      shareLinkInput.value = finalUrl;
      shareResult.classList.remove("hidden");
    }
  });
});

// ================= LISTA / GESTIÓN =================
function updateCounts() {
  document.getElementById("countAll").textContent = items.length;
  document.getElementById("countVideo").textContent = items.filter((i) => i.type === "video").length;
  document.getElementById("countImage").textContent = items.filter((i) => i.type === "image").length;
  document.getElementById("countOther").textContent = items.filter((i) => i.type === "other").length;
}

function render() {
  if (IS_PLAYER_ONLY) { renderPlayer(); return; }

  updateCounts();
  const visible = getVisibleItems();

  listEl.innerHTML = "";

  if (items.length === 0) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
  }

  if (items.length > 0 && visible.length === 0) {
    listEl.innerHTML = `<li class="empty-state">No se encontraron resultados.</li>`;
  }

  const displayOrder = [...visible].sort((a, b) => b.createdAt - a.createdAt);

  for (const item of displayOrder) {
    const li = document.createElement("li");
    li.className = "url-item";
    li.dataset.id = item.id;

    const previewUrl = normalizePreviewUrl(item.url);
    let thumbHtml = "";
    if (item.type === "image") {
      thumbHtml = `<img src="${escapeHtml(previewUrl)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'thumb-icon',textContent:'🖼️'}))" />`;
    } else if (item.type === "video") {
      thumbHtml = `<video src="${escapeHtml(previewUrl)}#t=0.5" muted preload="metadata"></video><span class="play-badge">▶️</span>`;
    } else {
      thumbHtml = `<span class="thumb-icon">📄</span>`;
    }

    li.innerHTML = `
      <div class="url-item-inner" data-action="play" data-id="${item.id}">
        <div class="url-thumb">${thumbHtml}</div>
        <div class="url-info">
          ${item.tag ? `<span class="url-tag">${escapeHtml(item.tag)}</span>` : ""}
          <span class="type-badge">${typeLabel(item.type)}</span>
          <p class="url-name">${escapeHtml(item.name)}</p>
          <a class="url-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${escapeHtml(item.url)}</a>
        </div>
      </div>
      <div class="url-actions">
        <button class="btn btn-outline btn-small" data-action="copy" data-id="${item.id}">📋</button>
        <button class="btn btn-secondary btn-small" data-action="edit" data-id="${item.id}">✏️</button>
        <button class="btn btn-danger btn-small" data-action="delete" data-id="${item.id}">🗑️</button>
      </div>
    `;
    listEl.appendChild(li);
  }

  renderPlayer();
}

if (!IS_PLAYER_ONLY) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    const tag = tagInput.value.trim();
    const editId = editIdInput.value;
    const selectedType = typeInput.value;
    const type = selectedType === "auto" ? detectType(url) : selectedType;

    if (!name || !url) return;

    if (editId) {
      const idx = items.findIndex((it) => it.id === editId);
      if (idx !== -1) items[idx] = { ...items[idx], name, url, tag, type };
      exitEditMode();
    } else {
      items.push({ id: uid(), name, url, tag, type, createdAt: Date.now() });
    }

    saveItems();
    render();
    form.reset();
  });

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    const playArea = e.target.closest("[data-action='play']");

    if (btn) {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const item = items.find((it) => it.id === id);
      if (!item) return;

      if (action === "delete") {
        if (confirm(`¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`)) {
          items = items.filter((it) => it.id !== id);
          saveItems();
          render();
        }
        return;
      }
      if (action === "edit") { enterEditMode(item); return; }
      if (action === "copy") {
        navigator.clipboard.writeText(item.url).then(() => {
          const original = btn.textContent;
          btn.textContent = "✅";
          setTimeout(() => (btn.textContent = original), 1200);
        }).catch(() => alert("No se pudo copiar el enlace."));
        return;
      }
    }

    if (playArea) {
      const id = playArea.dataset.id;
      const visible = getVisibleItems();
      const idx = visible.findIndex((it) => it.id === id);
      if (idx !== -1) { currentIndex = idx; renderPlayer(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    }
  });

  function enterEditMode(item) {
    editIdInput.value = item.id;
    nameInput.value = item.name;
    urlInput.value = item.url;
    tagInput.value = item.tag || "";
    typeInput.value = item.type || "auto";
    submitBtn.textContent = "💾 Guardar cambios";
    cancelEditBtn.classList.remove("hidden");
    nameInput.focus();
  }

  function exitEditMode() {
    editIdInput.value = "";
    submitBtn.textContent = "➕ Agregar a la playlist";
    cancelEditBtn.classList.add("hidden");
    form.reset();
  }
  cancelEditBtn.addEventListener("click", exitEditMode);

  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filterChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      currentFilter = chip.dataset.filter;
      currentIndex = 0;
      render();
    });
  });

  searchInput.addEventListener("input", () => { currentIndex = 0; render(); });

  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "urls.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  importInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error("Formato inválido");
        const incoming = parsed.filter((p) => p && p.name && p.url).map((p) => ({
          id: p.id || uid(), name: p.name, url: p.url, tag: p.tag || "",
          type: p.type || detectType(p.url), createdAt: p.createdAt || Date.now(),
        }));
        items = [...items, ...incoming];
        saveItems();
        render();
        alert(`Se importaron ${incoming.length} URL(s).`);
      } catch (err) { alert("El archivo no tiene un formato JSON válido."); }
      importInput.value = "";
    };
    reader.readAsText(file);
  });

  // ================= COMPARTIR (link SOLO del reproductor) =================
  shareBtn.addEventListener("click", () => {
    if (items.length === 0) {
      alert("Agrega al menos una URL antes de compartir.");
      return;
    }
    const finalUrl = buildShareUrl();

    shareLinkInput.value = finalUrl;
    shareResult.classList.remove("hidden");

    if (finalUrl.length > 7500) {
      alert("Advertencia: la playlist es muy grande y el link podría no funcionar en algunos navegadores. Considera exportar el JSON en vez de compartir el link, o usar menos URLs por link.");
    }
  });

  copyLinkBtn.addEventListener("click", () => {
    shareLinkInput.select();
    navigator.clipboard.writeText(shareLinkInput.value).then(() => {
      const original = copyLinkBtn.textContent;
      copyLinkBtn.textContent = "✅ Copiado";
      setTimeout(() => (copyLinkBtn.textContent = original), 1500);
    }).catch(() => alert("No se pudo copiar. Selecciona el texto y copia manualmente."));
  });
}

// ---------- Inicial ----------
render();
