/* Финал сохраняет событие комикса, а реакция меняет судьбу преступника. */
Mechanics.register("final_outcome", () => {
  let cfg, canvas, controller, revealed=false, impactAt=0;
  function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*cfg.canvasW/r.width,y:(e.clientY-r.top)*cfg.canvasH/r.height};}
  function box(ctx,x,y,w,h,fill,stroke="rgba(255,255,255,.2)"){ctx.beginPath();ctx.roundRect(x,y,w,h,18);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();}
  return {
    init(_ctx,_cfg){
      cfg=_cfg;canvas=document.getElementById("game");revealed=false;impactAt=0;
      if(window.__finalOutcomeController)window.__finalOutcomeController.abort();controller=new AbortController();window.__finalOutcomeController=controller;
      canvas.addEventListener("pointerdown",e=>{const p=point(e);if(p.x>290&&p.x<610&&p.y>690&&p.y<770&&!revealed){revealed=true;impactAt=performance.now();}},{signal:controller.signal});
    },
    update(){},
    draw(ctx){
      const fast=window.DETECTIVE_FLAGS&&window.DETECTIVE_FLAGS.fastReaction;
      ctx.save();ctx.fillStyle="rgba(8,10,16,.5)";ctx.fillRect(0,0,cfg.canvasW,cfg.canvasH);
      box(ctx,90,100,720,700,"rgba(20,24,34,.94)","#d8b86c");ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillStyle="#e07171";ctx.font="900 27px system-ui";ctx.fillText("ФИНАЛ РАССЛЕДОВАНИЯ",450,155);
      ctx.fillStyle="#fff";ctx.font="900 36px system-ui";ctx.fillText("Настоящий преступник — карапуз",450,230);
      ctx.fillStyle="#c9d1df";ctx.font="24px system-ui";ctx.fillText("Асыл слишком поздно понял свою ошибку",450,295);
      ctx.fillText("и погиб во время внезапного нападения.",450,335);
      box(ctx,155,395,590,190,fast?"rgba(42,92,63,.78)":"rgba(100,35,35,.72)",fast?"#75e09a":"#e07171");
      ctx.fillStyle=fast?"#75e09a":"#ff9d94";ctx.font="900 28px system-ui";ctx.fillText(fast?"ПОСЛЕДНЕЕ СООБЩЕНИЕ УСПЕЛО":"ВЫЗОВ ОБОРВАЛСЯ",450,440);
      ctx.fillStyle="#fff";ctx.font="22px system-ui";
      ctx.fillText(fast?"Агент услышал, кто напал, и поймал карапуза.":"Агент услышал только шум. Карапуз скрылся.",450,500);
      ctx.fillText(fast?"Ошибка раскрыта, преступник наказан.":"Дело осталось с трагическим финалом.",450,540);
      box(ctx,290,690,320,80,revealed?"rgba(42,92,63,.95)":"rgba(80,63,30,.96)",revealed?"#75e09a":"#d8b86c");
      ctx.fillStyle="#fff";ctx.font="900 24px system-ui";ctx.fillText(revealed?"ИСТОРИЯ ПРОЙДЕНА":"ЗАВЕРШИТЬ ИСТОРИЮ",450,730);
      if(impactAt){
        const t=Math.min(1,(performance.now()-impactAt)/900),bx=290,by=690,bw=320,bh=80;
        ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle="#fff4bd";ctx.lineWidth=10*(1-t)+2;
        for(let i=0;i<3;i++){
          const spread=t*(150+i*55);
          ctx.beginPath();ctx.roundRect(bx-spread,by-spread,bw+spread*2,bh+spread*2,18+spread*.35);ctx.stroke();
        }
        ctx.strokeStyle="#d9f3ff";ctx.lineWidth=5;ctx.lineCap="round";
        for(let i=0;i<7;i++){
          const x=bx+28+i*44,wind=45+t*125;
          ctx.beginPath();ctx.moveTo(x,by-t*70);ctx.lineTo(x,by-wind);ctx.stroke();
          ctx.beginPath();ctx.moveTo(x,by+bh+t*70);ctx.lineTo(x,by+bh+wind);ctx.stroke();
        }
        for(let i=0;i<3;i++){
          const y=by+18+i*22,wind=45+t*125;
          ctx.beginPath();ctx.moveTo(bx-t*70,y);ctx.lineTo(bx-wind,y);ctx.stroke();
          ctx.beginPath();ctx.moveTo(bx+bw+t*70,y);ctx.lineTo(bx+bw+wind,y);ctx.stroke();
        }
        const glow=t*125;ctx.fillStyle=`rgba(255,244,189,${0.24*(1-t)})`;
        ctx.beginPath();ctx.roundRect(bx-glow,by-glow,bw+glow*2,bh+glow*2,18+glow*.35);ctx.fill();ctx.restore();
        if(t>=1)impactAt=0;
      }
      ctx.restore();
    },
    isComplete(){return revealed},reset(){revealed=false;impactAt=0}
  };
});
