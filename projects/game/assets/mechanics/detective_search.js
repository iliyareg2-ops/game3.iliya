/* Детективный поиск: лупа проявляет улику, телефон даёт подсказку. */
Mechanics.register("detective_search", () => {
  let cfg, scene, canvas, controller;
  let pointer = { x: 450, y: 450, inside: false };
  let found = false;
  let phoneOpen = false;

  function gameCode() {
    if (!window.DETECTIVE_GAME_CODE) {
      window.DETECTIVE_GAME_CODE = String(Math.floor(Math.random() * 989) + 11);
    }
    return window.DETECTIVE_GAME_CODE;
  }

  function pointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (cfg.canvasW / rect.width),
      y: (e.clientY - rect.top) * (cfg.canvasH / rect.height),
    };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function cluePosition() {
    const p = scene.detective || { x: 0.61, y: 0.39 };
    return { x: cfg.canvasW * p.x, y: cfg.canvasH * p.y };
  }

  function inPhone(x, y) {
    return x >= 24 && x <= 112 && y >= 24 && y <= 112;
  }

  return {
    init(_ctx, _cfg, _scene) {
      cfg = _cfg;
      scene = _scene;
      canvas = document.getElementById("game");
      found = false;
      phoneOpen = false;

      if (window.__detectiveSearchController) window.__detectiveSearchController.abort();
      controller = new AbortController();
      window.__detectiveSearchController = controller;
      const opts = { signal: controller.signal };

      canvas.addEventListener("pointermove", (e) => {
        pointer = { ...pointFromEvent(e), inside: true };
      }, opts);
      canvas.addEventListener("pointerleave", () => { pointer.inside = false; }, opts);
      canvas.addEventListener("pointerdown", (e) => {
        const p = pointFromEvent(e);
        if (inPhone(p.x, p.y)) {
          phoneOpen = !phoneOpen;
          window.showAsylEmotion?.(phoneOpen ? "thinking" : "neutral", 1200);
          return;
        }
        if (phoneOpen) {
          phoneOpen = false;
          return;
        }
        const clue = cluePosition();
        if (Math.hypot(p.x - clue.x, p.y - clue.y) < 58) { found = true; window.showAsylEmotion?.("happy", 2200); }
      }, opts);
    },

    update() {},

    draw(ctx) {
      const clue = cluePosition();
      ctx.save();

      ctx.fillStyle = "rgba(20,24,34,.86)";
      roundRect(ctx, 24, 24, 88, 88, 20);
      ctx.fill();
      ctx.strokeStyle = "#f4cf72";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.font = "48px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("☎", 68, 68);

      if (!found && pointer.inside && !phoneOpen) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 82, 0, Math.PI * 2);
        ctx.clip();
        const near = Math.hypot(pointer.x - clue.x, pointer.y - clue.y) < 115;
        if (near) {
          ctx.strokeStyle = "#e84b3c";
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.arc(clue.x, clue.y, 25, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "rgba(255,235,150,.92)";
          ctx.font = "700 26px system-ui";
          ctx.fillText(gameCode(), clue.x, clue.y);
        }
        ctx.restore();

        ctx.strokeStyle = "rgba(255,255,255,.95)";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 82, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#2b3444";
        ctx.lineWidth = 18;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(pointer.x + 58, pointer.y + 58);
        ctx.lineTo(pointer.x + 112, pointer.y + 112);
        ctx.stroke();
      }

      ctx.fillStyle = found ? "rgba(38,92,58,.9)" : "rgba(20,24,34,.82)";
      roundRect(ctx, found ? 255 : 230, 28, found ? 390 : 440, found ? 62 : 58, 16);
      ctx.fill();
      ctx.fillStyle = found ? "#fff4bd" : "#fff";
      ctx.font = found ? "700 25px system-ui" : "700 24px system-ui";
      ctx.fillText(found ? `Улика найдена: номер ${gameCode()}` : "Найди скрытый номер на карте", 450, 58);

      if (phoneOpen) {
        ctx.fillStyle = "rgba(12,16,24,.94)";
        roundRect(ctx, 155, 145, 590, 570, 34);
        ctx.fill();
        ctx.strokeStyle = "#f4cf72";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = "#f4cf72";
        ctx.font = "800 34px system-ui";
        ctx.fillText("Телефон Асыла", 450, 200);
        ctx.fillStyle = "#fff";
        ctx.font = "600 27px system-ui";
        ctx.fillText("Сообщение от агента:", 450, 280);
        ctx.font = "24px system-ui";
        ctx.fillText("«Проверь место, где сходятся", 450, 340);
        ctx.fillText("красные линии на карте». ", 450, 380);
        ctx.fillStyle = "#b9c4d8";
        ctx.font = "20px system-ui";
        ctx.fillText("Нажми вне телефона, чтобы закрыть", 450, 650);
      }
      ctx.restore();
    },

    isComplete() { return found; },
    reset() { found = false; phoneOpen = false; },
  };
});
