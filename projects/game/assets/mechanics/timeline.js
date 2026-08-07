/* Сопоставление показания старика с уликами: выбрать три противоречия. */
Mechanics.register("timeline", () => {
  let cfg, canvas, controller;
  let selected = new Set(), solved = false, message = "";
  const evidence = [
    { id: "camera", text: "Камера метро: старик там в 19:25", contradiction: true },
    { id: "weather", text: "Прогноз: вечером шёл дождь", contradiction: false },
    { id: "receipt", text: "Чек магазина у метро: 19:40", contradiction: true },
    { id: "battery", text: "Телефон старика был заряжен на 18%", contradiction: false },
    { id: "ticket", text: "Вход в парк по его билету: 20:10", contradiction: true },
    { id: "bus", text: "Последний автобус ушёл в 21:30", contradiction: false },
  ];

  function point(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX-r.left)*cfg.canvasW/r.width, y: (e.clientY-r.top)*cfg.canvasH/r.height };
  }
  function box(ctx,x,y,w,h,fill,stroke="rgba(255,255,255,.18)") {
    ctx.beginPath(); ctx.roundRect(x,y,w,h,14); ctx.fillStyle=fill; ctx.fill();
    ctx.strokeStyle=stroke; ctx.lineWidth=2; ctx.stroke();
  }
  function evidenceAt(x,y) {
    for (let i=0;i<evidence.length;i++) {
      const col=i%2,row=Math.floor(i/2),ex=95+col*370,ey=365+row*105;
      if(x>=ex&&x<=ex+340&&y>=ey&&y<=ey+78)return evidence[i];
    }
    return null;
  }
  return {
    init(_ctx,_cfg) {
      cfg=_cfg; canvas=document.getElementById("game"); selected=new Set(); solved=false; message="";
      if(window.__timelineCtl)window.__timelineCtl.abort(); controller=new AbortController(); window.__timelineCtl=controller;
      canvas.addEventListener("pointerdown",e=>{
        if(solved)return; const p=point(e); const item=evidenceAt(p.x,p.y);
        if(item){selected.has(item.id)?selected.delete(item.id):selected.size<3&&selected.add(item.id);message="";return}
        if(p.x>315&&p.x<585&&p.y>720&&p.y<785){
          if(selected.size!==3){message="Выбери ровно три противоречия.";return}
          const correct=evidence.filter(x=>x.contradiction).every(x=>selected.has(x.id));
          if(correct){solved=true;message="Рассказ развалился: в указанное время старик был у метро, а в парк вошёл позже."}
          else{message="Среди выбранного есть лишняя деталь. Сравни время и место."}
        }
      },{signal:controller.signal});
    },
    update(){},
    draw(ctx){
      ctx.save(); ctx.fillStyle="rgba(8,10,16,.58)";ctx.fillRect(0,0,cfg.canvasW,cfg.canvasH);
      box(ctx,55,45,790,800,"rgba(20,24,34,.96)","#d8b86c");ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillStyle="#d8b86c";ctx.font="800 23px system-ui";ctx.fillText("ДОСКА ПРОТИВОРЕЧИЙ",450,85);
      ctx.fillStyle="#fff";ctx.font="800 30px system-ui";ctx.fillText("Разбей алиби старика",450,130);
      box(ctx,110,175,680,125,"rgba(125,38,38,.35)","#e07171");ctx.fillStyle="#fff";ctx.font="700 23px system-ui";
      ctx.fillText("Старик: «Я вошёл в парк в 19:00,",450,215);ctx.fillText("был там весь час и вышел в 20:00». ",450,255);
      ctx.fillStyle="#c9d1df";ctx.font="21px system-ui";ctx.fillText("Выбери 3 улики, которые противоречат его словам",450,330);
      evidence.forEach((item,i)=>{const col=i%2,row=Math.floor(i/2),x=95+col*370,y=365+row*105,on=selected.has(item.id);
        box(ctx,x,y,340,78,on?"rgba(120,42,42,.92)":"rgba(55,63,80,.96)",on?"#ff8a80":"rgba(255,255,255,.18)");
        ctx.fillStyle=on?"#ffd2ce":"#fff";ctx.font="700 18px system-ui";ctx.fillText(`${on?"✓ ":""}${item.text}`,x+170,y+39)});
      box(ctx,315,720,270,65,solved?"rgba(42,100,62,.96)":"rgba(80,63,30,.96)",solved?"#75e09a":"#d8b86c");
      ctx.fillStyle="#fff";ctx.font="800 22px system-ui";ctx.fillText(solved?"Алиби разрушено":"Сопоставить",450,752);
      if(message){ctx.fillStyle=solved?"#75e09a":"#ffd37a";ctx.font="700 17px system-ui";ctx.fillText(message,450,815)}
      ctx.restore();
    },
    isComplete(){return solved},
    reset(){selected=new Set();solved=false;message=""}
  };
});
