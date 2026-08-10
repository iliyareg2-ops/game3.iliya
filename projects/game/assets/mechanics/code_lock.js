/* Кодовый замок: решение связано с уликой, найденной лупой. */
Mechanics.register("code_lock", () => {
  let cfg, canvas, controller;
  let entered = "", solved = false, message = "";
  function answer() {
    if (!window.DETECTIVE_GAME_CODE) {
      window.DETECTIVE_GAME_CODE = String(Math.floor(Math.random() * 989) + 11);
    }
    return window.DETECTIVE_GAME_CODE;
  }

  function point(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * cfg.canvasW / r.width,
      y: (e.clientY - r.top) * cfg.canvasH / r.height,
    };
  }

  function rounded(ctx, x, y, w, h, radius, fill, stroke = "rgba(255,255,255,.2)") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function keyAt(x, y) {
    const keys = ["1","2","3","4","5","6","7","8","9","⌫","0","✓"];
    for (let i = 0; i < keys.length; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const kx = 555 + col * 88, ky = 355 + row * 82;
      if (x >= kx && x <= kx + 70 && y >= ky && y <= ky + 64) return keys[i];
    }
    return "";
  }

  return {
    init(_ctx, _cfg) {
      cfg = _cfg;
      canvas = document.getElementById("game");
      entered = ""; solved = false; message = "";
      if (window.__codeLockController) window.__codeLockController.abort();
      controller = new AbortController();
      window.__codeLockController = controller;
      canvas.addEventListener("pointerdown", (e) => {
        if (solved) return;
        const key = keyAt(point(e).x, point(e).y);
        if (!key) return;
        if (/^\d$/.test(key) && entered.length < 3) entered += key;
        if (key === "⌫") entered = entered.slice(0, -1);
        if (key === "✓") {
          if (entered === answer()) {
            solved = true;
            message = "Папка открыта: внутри фотография с уликой.";
            window.DETECTIVE_FLAGS = window.DETECTIVE_FLAGS || {};
            window.DETECTIVE_FLAGS.folderOpened = true;
          } else {
            message = "Код не подошёл. Вспомни номер на карте.";
            entered = "";
          }
        }
      }, { signal: controller.signal });
    },

    update() {},

    draw(ctx) {
      ctx.save();
      ctx.fillStyle = "rgba(8,10,16,.3)";
      ctx.fillRect(0, 0, cfg.canvasW, cfg.canvasH);
      rounded(ctx, 70, 155, 410, 570, 28, "rgba(20,24,34,.94)", "#d8b86c");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#d8b86c";
      ctx.font = "800 27px system-ui";
      ctx.fillText("ЗАПЕРТАЯ ПАПКА", 275, 205);
      ctx.fillStyle = "#fff";
      ctx.font = "700 31px system-ui";
      ctx.fillText("Введи найденный код", 275, 265);
      rounded(ctx, 125, 315, 300, 95, 18, "rgba(255,255,255,.08)");
      ctx.fillStyle = "#fff4bd";
      ctx.font = "800 52px ui-monospace, monospace";
      ctx.fillText(entered.padEnd(answer().length, "•"), 275, 362);
      ctx.fillStyle = "#c9d1df";
      ctx.font = "21px system-ui";
      ctx.fillText("Подсказка из телефона:", 275, 470);
      ctx.fillStyle = "#fff";
      ctx.font = "22px system-ui";
      ctx.fillText("«Код отмечен красным", 275, 520);
      ctx.fillText("на карте расследования». ", 275, 555);
      ctx.fillStyle = solved ? "#75e09a" : "#ffd37a";
      ctx.font = "700 20px system-ui";
      if (message) {
        ctx.fillText(message.includes("Папка") ? "Папка открыта!" : "Код не подошёл", 275, 650);
      }

      rounded(ctx, 515, 280, 330, 460, 28, "rgba(20,24,34,.94)", "#d8b86c");
      ctx.fillStyle = "#fff";
      ctx.font = "800 28px system-ui";
      ctx.fillText(solved ? "ОТКРЫТО" : "КОДОВЫЙ ЗАМОК", 680, 320);
      const keys = ["1","2","3","4","5","6","7","8","9","⌫","0","✓"];
      keys.forEach((key, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = 555 + col * 88, y = 355 + row * 82;
        rounded(ctx, x, y, 70, 64, 13,
          key === "✓" ? "rgba(48,112,72,.95)" : "rgba(55,63,80,.96)");
        ctx.fillStyle = "#fff";
        ctx.font = "800 26px system-ui";
        ctx.fillText(key, x + 35, y + 32);
      });
      if (solved) {
        ctx.fillStyle = "rgba(36,100,61,.94)";
        rounded(ctx, 120, 750, 660, 65, 18, "rgba(36,100,61,.94)", "#75e09a");
        ctx.fillStyle = "#fff4bd";
        ctx.font = "700 22px system-ui";
        ctx.fillText("Фотография добавлена к уликам — выход открыт", 450, 782);
      }
      ctx.restore();
    },

    isComplete() { return solved; },
    reset() { entered = ""; solved = false; message = ""; },
  };
});
