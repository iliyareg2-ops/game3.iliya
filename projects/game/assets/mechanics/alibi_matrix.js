/* Проверка алиби как pipe-пазл: восстановить непрерывный маршрут по камерам. */
Mechanics.register("alibi_matrix", () => {
  let cfg, canvas, controller;
  let solved = false, moves = 0;
  const tiles = [
    { type:"straight", target:0 }, { type:"corner", target:2 }, { type:"corner", target:1 },
    { type:"corner", target:1 },   { type:"corner", target:3 }, { type:"straight", target:1 },
    { type:"corner", target:0 },   { type:"straight", target:0 }, { type:"corner", target:3 },
  ];
  let rotations = [];

  function point(e){
    const r=canvas.getBoundingClientRect();
    return {x:(e.clientX-r.left)*cfg.canvasW/r.width,y:(e.clientY-r.top)*cfg.canvasH/r.height};
  }
  function box(ctx,x,y,w,h,fill,stroke="rgba(255,255,255,.18)"){
    ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();
  }
  function tileAt(x,y){
    const gx=210,gy=300,size=155,gap=10;
    const col=Math.floor((x-gx)/(size+gap)),row=Math.floor((y-gy)/(size+gap));
    if(col<0||col>2||row<0||row>2)return -1;
    const lx=x-(gx+col*(size+gap)),ly=y-(gy+row*(size+gap));
    return lx<=size&&ly<=size?row*3+col:-1;
  }
  function drawPipe(ctx,cx,cy,type,rot){
    const dirs=type==="straight"
      ? (rot%2===0?[[-67,0],[67,0]]:[[0,-67],[0,67]])
      : [[[0,-67],[67,0]],[[67,0],[0,67]],[[0,67],[-67,0]],[[-67,0],[0,-67]]][rot];
    ctx.strokeStyle="#d8b86c";ctx.lineWidth=22;ctx.lineCap="round";ctx.beginPath();
    ctx.moveTo(cx+dirs[0][0],cy+dirs[0][1]);ctx.lineTo(cx,cy);ctx.lineTo(cx+dirs[1][0],cy+dirs[1][1]);ctx.stroke();
    ctx.fillStyle="#fff4bd";ctx.beginPath();ctx.arc(cx,cy,12,0,Math.PI*2);ctx.fill();
  }
  function check(){
    solved=rotations.every((r,i)=>tiles[i].type==="straight"
      ? r%2===tiles[i].target%2
      : r===tiles[i].target);
    if(solved){window.DETECTIVE_FLAGS=window.DETECTIVE_FLAGS||{};window.DETECTIVE_FLAGS.doubleCleared=true;window.showAsylEmotion?.("happy",2200);}
  }
  return {
    init(_ctx,_cfg){
      cfg=_cfg;canvas=document.getElementById("game");solved=false;moves=0;
      rotations=tiles.map((tile,i)=>(tile.target+(i%3)+1)%4);
      if(window.__alibiMatrixController)window.__alibiMatrixController.abort();
      controller=new AbortController();window.__alibiMatrixController=controller;
      canvas.addEventListener("pointerdown",e=>{
        if(solved)return;const i=tileAt(point(e).x,point(e).y);if(i<0)return;
        rotations[i]=(rotations[i]+1)%4;moves++;window.showAsylEmotion?.(moves%3===0?"confused":"thinking",700);check();
      },{signal:controller.signal});
    },
    update(){},
    draw(ctx){
      ctx.save();ctx.fillStyle="rgba(8,10,16,.6)";ctx.fillRect(0,0,cfg.canvasW,cfg.canvasH);
      box(ctx,55,35,790,830,"rgba(20,24,34,.96)","#d8b86c");ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillStyle="#d8b86c";ctx.font="800 23px system-ui";ctx.fillText("АРХИВ КАМЕР АЭРОПОРТА",450,75);
      ctx.fillStyle="#fff";ctx.font="800 30px system-ui";ctx.fillText("Восстанови маршрут двойника",450,122);
      ctx.fillStyle="#c9d1df";ctx.font="20px system-ui";ctx.fillText("Нажимай на фрагменты, чтобы поворачивать линии камер",450,166);
      ctx.fillStyle="#75e09a";ctx.font="700 18px system-ui";ctx.fillText("ВХОД →",145,375);
      ctx.fillStyle="#75e09a";ctx.fillText("→ ПОСАДКА",755,375);
      const gx=210,gy=300,size=155,gap=10;
      tiles.forEach((tile,i)=>{
        const col=i%3,row=Math.floor(i/3),x=gx+col*(size+gap),y=gy+row*(size+gap);
        box(ctx,x,y,size,size,"rgba(48,56,72,.98)","rgba(255,255,255,.16)");
        ctx.fillStyle="#9ba7bb";ctx.font="700 14px system-ui";ctx.fillText(`КАМЕРА ${i+1}`,x+size/2,y+22);
        drawPipe(ctx,x+size/2,y+size/2+10,tile.type,rotations[i]);
      });
      ctx.fillStyle=solved?"#75e09a":"#ffd37a";ctx.font="800 20px system-ui";
      ctx.fillText(solved?"Маршрут совпал: алиби двойника подтверждено":"Соедини все девять камер одной линией",450,820);
      ctx.fillStyle="#9ba7bb";ctx.font="16px system-ui";ctx.fillText(`Поворотов: ${moves}`,450,845);ctx.restore();
    },
    isComplete(){return solved},
    reset(){rotations=tiles.map((tile,i)=>(tile.target+(i%3)+1)%4);solved=false;moves=0}
  };
});
