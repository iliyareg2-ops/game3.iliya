(function () {
  let activeTab = "gallery";
  let galleryEl, comicEl, gameEl, jet3dEl, drift3dEl, siteEl, btns;

  // ленивые src для iframe-проектов: проставляем при первом открытии таба,
  // чтобы не дёргать projects/, которых ещё может не быть.
  const FRAME_SRC = {
    comic: { id: "comic-frame", src: "projects/comics/index.html" },
    game: { id: "game-frame", src: "projects/game/index.html" },
    jet3d: { id: "jet3d-frame", src: "projects/sky-jet-3d/index.html" },
    drift3d: { id: "drift3d-frame", src: "projects/cyber-drift-3d/index.html" },
    site: { id: "site-frame", src: "projects/site/index.html" },
  };

  function setup() {
    galleryEl = document.getElementById("tab-gallery");
    comicEl = document.getElementById("tab-comic");
    gameEl = document.getElementById("tab-game");
    jet3dEl = document.getElementById("tab-jet3d");
    drift3dEl = document.getElementById("tab-drift3d");
    siteEl = document.getElementById("tab-site");
    btns = Array.from(document.querySelectorAll(".tab-btn"));

    btns.forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        if (tab === activeTab) return;
        activeTab = tab;
        ensureFrame(tab);
        applyView();
      });
    });

    applyView();
  }

  // при первом открытии таба-проекта проставляем src (лениво)
  function ensureFrame(tab) {
    const cfg = FRAME_SRC[tab];
    if (!cfg) return;
    const frame = document.getElementById(cfg.id);
    if (frame && !frame.src) frame.src = cfg.src;
  }

  function applyView() {
    btns.forEach(btn => {
      btn.classList.toggle("tab-active", btn.dataset.tab === activeTab);
    });
    galleryEl.hidden = (activeTab !== "gallery");
    comicEl.hidden = (activeTab !== "comic");
    if (gameEl) gameEl.hidden = (activeTab !== "game");
    if (jet3dEl) jet3dEl.hidden = (activeTab !== "jet3d");
    if (drift3dEl) drift3dEl.hidden = (activeTab !== "drift3d");
    if (siteEl) siteEl.hidden = (activeTab !== "site");
  }

  // Все табы открыты всегда — доступность НЕ зависит от checkpoints.
  // Пустой таб показывает заглушку («здесь появится твой комикс»), а не блокируется:
  // иначе единственный способ открыть ребёнку вкладку — проставить checkpoint авансом.
  document.addEventListener("DOMContentLoaded", setup);
})();
