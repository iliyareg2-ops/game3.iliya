/* Разорванное досье: переставить 9 фрагментов и восстановить фотографию старика. */
Mechanics.register("accusation_board", () => {
  let cfg, canvas, controller, dossier;
  let pieces = [], selected = -1, solved = false, moves = 0;

  function shuffledPieces(){
    let result;
    do {
      result=[0,1,2,3,4,5,6,7,8];
      for(let i=result.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [result[i],result[j]]=[result[j],result[i]];
      }
    } while(result.every((piece,i)=>piece===i));
    return result;
  }

  function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*cfg.canvasW/r.width,y:(e.clientY-r.top)*cfg.canvasH/r.height};}
  function box(ctx,x,y,w,h,fill,stroke="rgba(255,255,255,.2)"){ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
  function tileAt(x,y){
    const gx=210,gy=245,size=155,gap=8,col=Math.floor((x-gx)/(size+gap)),row=Math.floor((y-gy)/(size+gap));
    if(col<0||col>2||row<0||row>2)return -1;
    return x-gx-col*(size+gap)<=size&&y-gy-row*(size+gap)<=size?row*3+col:-1;
  }
  function createDossier(){
    const c=document.createElement("canvas");c.width=600;c.height=600;const d=c.getContext("2d");
    d.fillStyle="#d8d0bb";d.fillRect(0,0,600,600);d.strokeStyle="#6f6655";d.lineWidth=8;d.strokeRect(16,16,568,568);
    d.fillStyle="#25282e";d.beginPath();d.arc(300,210,105,0,Math.PI*2);d.fill();
    d.fillStyle="#b6aa91";d.beginPath();d.ellipse(300,225,76,94,0,0,Math.PI*2);d.fill();
    d.strokeStyle="#443d34";d.lineWidth=10;d.beginPath();d.moveTo(245,210);d.lineTo(275,195);d.moveTo(325,195);d.lineTo(355,210);d.stroke();
    d.fillStyle="#25282e";d.beginPath();d.arc(270,225,7,0,Math.PI*2);d.arc(330,225,7,0,Math.PI*2);d.fill();
    d.strokeStyle="#6f6655";d.lineWidth=5;d.beginPath();d.moveTo(300,230);d.lineTo(288,265);d.lineTo(310,265);d.moveTo(265,300);d.quadraticCurveTo(300,285,335,300);d.stroke();
    d.fillStyle="#3b4048";d.beginPath();d.moveTo(155,500);d.quadraticCurveTo(185,340,300,340);d.quadraticCurveTo(415,340,445,500);d.closePath();d.fill();
    d.fillStyle="#8b1f25";d.fillRect(55,485,490,72);d.fillStyle="#fff4df";d.font="900 48px system-ui";d.textAlign="center";d.textBaseline="middle";d.fillText("СТАРИК",300,521);
    d.fillStyle="#6f6655";d.font="700 23px system-ui";d.fillText("ДОСЬЕ № 17",300,62);return c;
  }
  function check(){
    solved=pieces.every((piece,i)=>piece===i);
    if(solved){window.DETECTIVE_FLAGS=window.DETECTIVE_FLAGS||{};window.DETECTIVE_FLAGS.accusedOldMan=true;window.showAsylEmotion?.("happy",2200);}
  }
  return {
    init(_ctx,_cfg){
      cfg=_cfg;canvas=document.getElementById("game");dossier=createDossier();pieces=shuffledPieces();selected=-1;solved=false;moves=0;
      if(window.__accusationController)window.__accusationController.abort();controller=new AbortController();window.__accusationController=controller;
      canvas.addEventListener("pointerdown",e=>{
        if(solved)return;const index=tileAt(point(e).x,point(e).y);if(index<0)return;
        if(selected<0){selected=index;return}if(selected===index){selected=-1;return}
        [pieces[selected],pieces[index]]=[pieces[index],pieces[selected]];selected=-1;moves++;window.showAsylEmotion?.(moves%3===0?"confused":"determined",700);check();
      },{signal:controller.signal});
    },
    update(){},
    draw(ctx){
      ctx.save();ctx.fillStyle="rgba(8,10,16,.62)";ctx.fillRect(0,0,cfg.canvasW,cfg.canvasH);box(ctx,55,35,790,830,"rgba(20,24,34,.96)","#d8b86c");
      ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#d8b86c";ctx.font="800 23px system-ui";ctx.fillText("ЗВОНОК АГЕНТУ",450,75);
      ctx.fillStyle="#fff";ctx.font="800 31px system-ui";ctx.fillText("Восстанови разорванное досье",450,122);
      ctx.fillStyle="#c9d1df";ctx.font="20px system-ui";ctx.fillText("Выбери два фрагмента — они поменяются местами",450,165);
      const gx=210,gy=245,size=155,gap=8,src=200;
      pieces.forEach((piece,i)=>{const col=i%3,row=Math.floor(i/3),x=gx+col*(size+gap),y=gy+row*(size+gap),pc=piece%3,pr=Math.floor(piece/3);
        ctx.drawImage(dossier,pc*src,pr*src,src,src,x,y,size,size);ctx.strokeStyle=selected===i?"#ffd37a":"rgba(20,24,34,.9)";ctx.lineWidth=selected===i?8:4;ctx.strokeRect(x,y,size,size)});
      ctx.fillStyle=solved?"#75e09a":"#ffd37a";ctx.font="800 19px system-ui";ctx.fillText(solved?"Досье восстановлено: агент получает приказ задержать старика":"Собери портрет и имя подозреваемого",450,770);
      ctx.fillStyle="#9ba7bb";ctx.font="17px system-ui";ctx.fillText(`Перестановок: ${moves}`,450,810);ctx.restore();
    },
    isComplete(){return solved},reset(){pieces=shuffledPieces();selected=-1;solved=false;moves=0}
  };
});
