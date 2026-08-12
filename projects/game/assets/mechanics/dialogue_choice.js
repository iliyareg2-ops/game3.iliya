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
        const reactions = { teen:"neutral", old_man:"angry", girl:"surprised", double:"confused" };
        window.showAsylEmotion?.(reactions[pick.id], 1800);
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

/* Проверка алиби двойника по камерам аэропорта. */
Mechanics.register("double_alibi", () => {
  let cfg, canvas, controller, selected = new Set(), solved = false, message = "";
  const records = [
    { id: "arrival", text: "Камера прилёта: 18:42", correct: true },
    { id: "passport", text: "Паспортный контроль: 19:03", correct: true },
    { id: "exit", text: "Выход из аэропорта: 19:18", correct: true },
    { id: "cafe", text: "Чек из кафе: 17:10", correct: false },
    { id: "park", text: "Камера у парка: 18:55", correct: false },
    { id: "taxi", text: "Заказ такси: 20:40", correct: false },
  ];
  const point = (e) => { const r = canvas.getBoundingClientRect(); return { x:(e.clientX-r.left)*cfg.canvasW/r.width, y:(e.clientY-r.top)*cfg.canvasH/r.height }; };
  const box = (c,x,y,w,h,fill,stroke="rgba(255,255,255,.18)") => { c.beginPath(); c.roundRect(x,y,w,h,14); c.fillStyle=fill; c.fill(); c.strokeStyle=stroke; c.lineWidth=2; c.stroke(); };
  return {
    init(_ctx,_cfg) {
      cfg=_cfg; canvas=document.getElementById("game"); selected=new Set(); solved=false; message="";
      if(window.__doubleAlibiCtl) window.__doubleAlibiCtl.abort(); controller=new AbortController(); window.__doubleAlibiCtl=controller;
      canvas.addEventListener("pointerdown",e=>{ if(solved)return; const p=point(e);
        records.forEach((item,i)=>{const col=i%2,row=Math.floor(i/2),x=95+col*370,y=340+row*105;if(p.x>=x&&p.x<=x+340&&p.y>=y&&p.y<=y+78){selected.has(item.id)?selected.delete(item.id):selected.size<3&&selected.add(item.id);message="";}});
        if(p.x>315&&p.x<585&&p.y>700&&p.y<770){if(selected.size!==3){message="Выбери три записи с камер.";return;} const ok=records.filter(x=>x.correct).every(x=>selected.has(x.id)); if(ok){solved=true;message="Алиби подтверждено: двойник только прилетел в страну.";}else message="Одна запись не подходит. Проверь место и время.";}
      },{signal:controller.signal});
    },
    update(){},
    draw(c){c.save();c.fillStyle="rgba(8,10,16,.58)";c.fillRect(0,0,cfg.canvasW,cfg.canvasH);box(c,55,45,790,800,"rgba(20,24,34,.96)","#d8b86c");c.textAlign="center";c.textBaseline="middle";c.fillStyle="#d8b86c";c.font="800 23px system-ui";c.fillText("ПРОВЕРКА АЛИБИ",450,90);c.fillStyle="#fff";c.font="800 30px system-ui";c.fillText("Проверь камеры аэропорта",450,140);c.fillStyle="#c9d1df";c.font="20px system-ui";c.fillText("Двойник говорит, что был в другой стране. Найди 3 подтверждения.",450,195);records.forEach((item,i)=>{const col=i%2,row=Math.floor(i/2),x=95+col*370,y=340+row*105,on=selected.has(item.id);box(c,x,y,340,78,on?"rgba(42,92,63,.95)":"rgba(55,63,80,.96)",on?"#75e09a":"rgba(255,255,255,.18)");c.fillStyle="#fff";c.font="700 18px system-ui";c.fillText(`${on?"✓ ":""}${item.text}`,x+170,y+39);});box(c,315,700,270,70,solved?"rgba(42,100,62,.96)":"rgba(80,63,30,.96)",solved?"#75e09a":"#d8b86c");c.fillStyle="#fff";c.font="800 22px system-ui";c.fillText(solved?"Алиби подтверждено":"Проверить записи",450,735);if(message){c.fillStyle=solved?"#75e09a":"#ffd37a";c.font="700 18px system-ui";c.fillText(message,450,810);}c.restore();},
    isComplete(){return solved;}, reset(){selected=new Set();solved=false;message="";}
  };
});
