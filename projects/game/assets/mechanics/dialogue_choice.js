/* Допрос всех подозреваемых; порядок первого выбора влияет на будущую концовку. */
Mechanics.register("dialogue_choice", () => {
  let cfg, canvas, controller;
  let interviewed = new Set();
  let lastChosen = "";

  const choices = [
    { id: "teen", label: "Полный подросток", result: "🙂 Конечно. Я отвечу на все вопросы." },
    { id: "old_man", label: "Нервный старик", result: "😠 Я... не обязан отвечать!" },
    { id: "girl", label: "Маленькая девочка", result: "👶 Агу-агу!" },
    { id: "double", label: "Двойник Асыла", result: "Я был в другой стране. Время моего прилёта видно на камерах аэропорта." },
  ];

  function point(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * cfg.canvasW / r.width,
      y: (e.clientY - r.top) * cfg.canvasH / r.height,
    };
  }

  function box(ctx, x, y, w, h, radius, fill, stroke = "rgba(255,255,255,.18)") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function choiceAt(x, y) {
    for (let i = 0; i < choices.length; i++) {
      const by = 445 + i * 76;
      if (x >= 190 && x <= 710 && y >= by && y <= by + 58) return choices[i];
    }
    return null;
  }

  function wrapText(ctx, text, cx, startY, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "", y = startY;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth) {
        ctx.fillText(line, cx, y);
        line = word;
        y += lineHeight;
      } else line = next;
    }
    if (line) ctx.fillText(line, cx, y);
  }

  return {
    init(_ctx, _cfg) {
      cfg = _cfg;
      canvas = document.getElementById("game");
      interviewed = new Set();
      lastChosen = "";
      if (window.__dialogueChoiceController) window.__dialogueChoiceController.abort();
      controller = new AbortController();
      window.__dialogueChoiceController = controller;
      canvas.addEventListener("pointerdown", (e) => {
        const pick = choiceAt(point(e).x, point(e).y);
        if (!pick || interviewed.has(pick.id)) return;
        if (interviewed.size === 0) {
          window.DETECTIVE_FLAGS = window.DETECTIVE_FLAGS || {};
          window.DETECTIVE_FLAGS.firstSuspect = pick.id;
        }
        interviewed.add(pick.id);
        lastChosen = pick.id;
        window.DETECTIVE_FLAGS.interviewed = [...interviewed];
      }, { signal: controller.signal });
    },

    update() {},

    draw(ctx) {
      ctx.save();
      ctx.fillStyle = "rgba(8,10,16,.46)";
      ctx.fillRect(0, 0, cfg.canvasW, cfg.canvasH);
      box(ctx, 125, 55, 650, 790, 30, "rgba(19,23,33,.94)", "#d8b86c");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#d8b86c";
      ctx.font = "800 23px system-ui";
      ctx.fillText("ДОПРОС • ГЛАВА 2", 450, 95);
      ctx.fillStyle = "#fff";
      ctx.font = "800 34px system-ui";
      ctx.fillText("Собери все показания", 450, 145);
      ctx.fillStyle = "#c9d1df";
      ctx.font = "22px system-ui";
      ctx.fillText(`Опрошено: ${interviewed.size} из ${choices.length}`, 450, 190);

      if (lastChosen) {
        const selected = choices.find((item) => item.id === lastChosen);
        box(ctx, 175, 225, 550, 150, 18, "rgba(255,255,255,.08)");
        ctx.fillStyle = lastChosen === "teen" ? "#75e09a" : "#ffd37a";
        ctx.font = "800 23px system-ui";
        ctx.fillText("Показание добавлено в заметки", 450, 258);
        ctx.fillStyle = "#fff";
        ctx.font = "21px system-ui";
        wrapText(ctx, selected.result, 450, 305, 475, 31);
      } else {
        ctx.fillStyle = "#eef2f8";
        ctx.font = "23px system-ui";
        ctx.fillText("Выбери, с кого начать допрос", 450, 295);
      }

      choices.forEach((choice, i) => {
        const y = 445 + i * 76;
        const done = interviewed.has(choice.id);
        box(ctx, 190, y, 520, 58, 15,
          done ? "rgba(42,92,63,.92)" : "rgba(50,58,75,.96)",
          done ? "#75e09a" : "rgba(255,255,255,.18)");
        ctx.fillStyle = done ? "#bdf5cd" : "#fff";
        ctx.font = "700 23px system-ui";
        ctx.fillText(`${done ? "✓ " : ""}${choice.label}`, 450, y + 29);
      });

      if (interviewed.size === choices.length) {
        ctx.fillStyle = "#f4cf72";
        ctx.font = "700 21px system-ui";
        ctx.fillText("Все показания собраны — выход открыт", 450, 790);
      }
      ctx.restore();
    },

    isComplete() { return interviewed.size === choices.length; },
    reset() { interviewed = new Set(); lastChosen = ""; },
  };
});
