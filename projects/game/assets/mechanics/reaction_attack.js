/* Реакция на внезапную атаку: пять сигналов с ограничением времени. */
Mechanics.register("reaction_attack", () => {
  let cfg, canvas, controller;
  let state="ready", index=0, hits=0, misses=0, promptAt=0, countdownAt=0, finishedAt=0;
  let reactionTimes=[];
  const prompts=[
    {code:"ArrowLeft",key:"←",text:"УКЛОНИСЬ ВЛЕВО"},
    {code:"ArrowRight",key:"→",text:"ОТСКОЧИ ВПРАВО"},
    {code:"ArrowDown",key:"↓",text:"НАЗАД"},
    {code:"ArrowUp",key:"↑",text:"ПРИГНИСЬ"},
    {code:"KeyE",key:"E",text:"ВЫЗОВИ АГЕНТА"},
  ];
  const limit=700;

  function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*cfg.canvasW/r.width,y:(e.clientY-r.top)*cfg.canvasH/r.height};}
  function box(ctx,x,y,w,h,fill,stroke="rgba(255,255,255,.2)"){ctx.beginPath();ctx.roundRect(x,y,w,h,18);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();}
  function nextPrompt(now){index++;if(index>=prompts.length){finish(now);return}promptAt=now;}
  function finish(now){
    state="done";finishedAt=now;const avg=reactionTimes.length?reactionTimes.reduce((a,b)=>a+b,0)/reactionTimes.length:9999;
    const fast=hits>=4&&avg<900;window.DETECTIVE_FLAGS=window.DETECTIVE_FLAGS||{};
    window.DETECTIVE_FLAGS.fastReaction=fast;window.DETECTIVE_FLAGS.reactionHits=hits;
  }
  function start(){state="countdown";index=0;hits=0;misses=0;reactionTimes=[];countdownAt=performance.now();canvas.focus();}

  return {
    init(_ctx,_cfg){
      cfg=_cfg;canvas=document.getElementById("game");state="ready";index=0;hits=0;misses=0;reactionTimes=[];
      if(window.__reactionAttackController)window.__reactionAttackController.abort();controller=new AbortController();window.__reactionAttackController=controller;
      canvas.addEventListener("pointerdown",e=>{const p=point(e);if(state==="ready"&&p.x>300&&p.x<600&&p.y>650&&p.y<730)start();},{signal:controller.signal});
      window.addEventListener("keydown",e=>{
        if(state!=="playing")return;e.preventDefault();const now=performance.now();
        if(e.code===prompts[index].code){hits++;reactionTimes.push(now-promptAt)}else misses++;
        nextPrompt(now);
      },{signal:controller.signal});
    },
    update(){
      if(state==="countdown"&&performance.now()-countdownAt>=3000){state="playing";promptAt=performance.now();}
      if(state==="playing"&&performance.now()-promptAt>limit){misses++;nextPrompt(performance.now());}
    },
    draw(ctx){
      const now=performance.now();ctx.save();ctx.fillStyle="rgba(8,10,16,.56)";ctx.fillRect(0,0,cfg.canvasW,cfg.canvasH);
      box(ctx,75,70,750,760,"rgba(20,24,34,.94)","#d8b86c");ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillStyle="#e07171";ctx.font="900 26px system-ui";ctx.fillText("ВНЕЗАПНАЯ АТАКА",450,120);
      if(state==="ready"){
        ctx.fillStyle="#fff";ctx.font="800 34px system-ui";ctx.fillText("Среагируй на пять сигналов",450,205);
        ctx.fillStyle="#c9d1df";ctx.font="23px system-ui";ctx.fillText("Стрелки — уклонение",450,295);ctx.fillText("E — экстренный вызов агента",450,340);
        ctx.fillStyle="#ffd37a";ctx.font="700 21px system-ui";ctx.fillText("На каждый сигнал — 0,7 секунды",450,430);
        box(ctx,300,650,300,80,"rgba(115,35,35,.96)","#ff8a80");ctx.fillStyle="#fff";ctx.font="900 27px system-ui";ctx.fillText("НАЧАТЬ",450,690);
      }else if(state==="countdown"){
        const remaining=Math.max(1,3-Math.floor((now-countdownAt)/1000));
        ctx.fillStyle="#c9d1df";ctx.font="700 25px system-ui";ctx.fillText("Приготовься",450,245);
        ctx.fillStyle="#fff4bd";ctx.font="900 140px system-ui";ctx.fillText(String(remaining),450,425);
        ctx.fillStyle="#c9d1df";ctx.font="22px system-ui";ctx.fillText("Первый сигнал появится после отсчёта",450,555);
      }else if(state==="playing"){
        const p=prompts[index],left=Math.max(0,1-(now-promptAt)/limit);
        ctx.fillStyle="#c9d1df";ctx.font="700 21px system-ui";ctx.fillText(`Сигнал ${index+1} из ${prompts.length}`,450,185);
        ctx.fillStyle=left>.35?"#fff4bd":"#ff8a80";ctx.font="900 100px system-ui";ctx.fillText(p.key,450,365);
        ctx.fillStyle="#fff";ctx.font="900 32px system-ui";ctx.fillText(p.text,450,470);
        box(ctx,170,565,560,30,"rgba(255,255,255,.08)");ctx.fillStyle=left>.35?"#75e09a":"#e07171";ctx.fillRect(170,565,560*left,30);
        ctx.fillStyle="#c9d1df";ctx.font="21px system-ui";ctx.fillText(`Успехи: ${hits}   Ошибки: ${misses}`,450,650);
      }else{
        const fast=window.DETECTIVE_FLAGS&&window.DETECTIVE_FLAGS.fastReaction;
        ctx.fillStyle=fast?"#75e09a":"#ffd37a";ctx.font="900 35px system-ui";ctx.fillText(fast?"СИГНАЛ ПЕРЕДАН":"ВЫЗОВ ПРЕРВАН",450,220);
        ctx.fillStyle="#fff";ctx.font="24px system-ui";ctx.fillText(`Точных реакций: ${hits} из ${prompts.length}`,450,305);
        ctx.fillStyle="#c9d1df";ctx.font="22px system-ui";
        ctx.fillText(fast?"Агент услышал: «Нападающий — младенец!»":"Агент услышал только шум нападения.",450,390);
        ctx.fillText("События продолжаются как в комиксе.",450,445);
        ctx.fillStyle="#ffd37a";ctx.font="700 20px system-ui";ctx.fillText("Выход открыт",450,650);
      }
      ctx.restore();
    },
    isComplete(){return state==="done"},reset(){state="ready";index=0;hits=0;misses=0;reactionTimes=[];countdownAt=0}
  };
});
