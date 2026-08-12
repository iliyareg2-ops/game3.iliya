Mechanics.register("baby_cipher",()=>{
  let cfg,canvas,ctl,stage=1,map={},active="",words=[],solved=false,msg="",cards=[],wordOrder=[];
  const syll=["АГУ","БУ","ГА"],mean=["ВИДЕЛА","ОДЕЖДА","ДВИЖЕНИЕ"],correct={АГУ:"ВИДЕЛА",БУ:"ОДЕЖДА",ГА:"ДВИЖЕНИЕ"};
  const slots=[{x:100,y:335},{x:370,y:325},{x:635,y:350},{x:145,y:470},{x:425,y:485},{x:650,y:500}];
  function shuffle(items){const r=[...items];for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]]}return r}
  function shuffleWords(){
    const previous=(window.__babyCipherLastWordOrder||[]).join("-");
    do{wordOrder=shuffle(mean)}while(wordOrder.join("-")===previous);
    window.__babyCipherLastWordOrder=[...wordOrder];
  }
  function randomize(){const positions=shuffle(slots);cards=shuffle([...syll.map(v=>({kind:"syll",value:v})),...mean.map(v=>({kind:"mean",value:v}))]).map((card,i)=>({...card,...positions[i]}));shuffleWords()}
  function pt(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*cfg.canvasW/r.width,y:(e.clientY-r.top)*cfg.canvasH/r.height}}
  function box(c,x,y,w,h,f,s="#d8b86c"){c.beginPath();c.roundRect(x,y,w,h,14);c.fillStyle=f;c.fill();c.strokeStyle=s;c.lineWidth=2;c.stroke()}
  return{
    init(_c,_cfg){cfg=_cfg;canvas=document.getElementById("game");stage=1;map={};active="";words=[];solved=false;msg="";randomize();if(window.__babyCipherCtl)window.__babyCipherCtl.abort();ctl=new AbortController();window.__babyCipherCtl=ctl;canvas.addEventListener("pointerdown",e=>{if(solved)return;const p=pt(e);if(stage===1){const card=cards.find(c=>p.x>c.x&&p.x<c.x+165&&p.y>c.y&&p.y<c.y+70);if(card?.kind==="syll"&&!map[card.value])active=card.value;if(card?.kind==="mean"&&active){if(correct[active]===card.value){map[active]=card.value;active="";msg="Верная связь."}else msg="Жест девочки означает другое."}if(Object.keys(map).length===3){stage=2;msg="Теперь расшифруй фразу: АГУ — ГА — БУ"}}else{for(let i=0;i<3;i++)if(p.x>170+i*195&&p.x<335+i*195&&p.y>510&&p.y<585&&!words.includes(wordOrder[i]))words.push(wordOrder[i]);if(p.x>330&&p.x<570&&p.y>680&&p.y<750){if(words.join("-")==="ВИДЕЛА-ДВИЖЕНИЕ-ОДЕЖДА"){solved=true;msg="Девочка видела движение под одеждой подростка."}else{words=[];shuffleWords();msg="Смысл не складывается. Слова перемешались — попробуй ещё."}}}},{signal:ctl.signal})},
    update(){},
    draw(c){c.save();c.fillStyle="rgba(8,10,16,.55)";c.fillRect(0,0,cfg.canvasW,cfg.canvasH);box(c,55,45,790,800,"rgba(20,24,34,.96)");c.textAlign="center";c.textBaseline="middle";c.fillStyle="#d8b86c";c.font="800 23px system-ui";c.fillText("ШИФР «АГУ-АГУ»",450,90);c.fillStyle="#fff";c.font="800 30px system-ui";c.fillText(stage===1?"Сопоставь слоги и жесты":"Собери смысл сообщения",450,140);c.fillStyle="#c9d1df";c.font="20px system-ui";c.fillText(stage===1?"АГУ — глаза • БУ — рукав • ГА — взмах руки":"Фраза девочки: АГУ — ГА — БУ",450,195);if(stage===1){cards.forEach(card=>{const done=card.kind==="syll"&&map[card.value],on=card.kind==="syll"&&active===card.value;box(c,card.x,card.y,165,70,done?"rgba(42,92,63,.95)":on?"rgba(120,75,30,.95)":"rgba(55,63,80,.96)");c.fillStyle="#fff";c.font="800 18px system-ui";c.fillText(done?`${card.value} = ${done}`:card.value,card.x+82,card.y+35)})}else{c.fillStyle="#fff4bd";c.font="800 32px system-ui";c.fillText(words.length?words.join(" → "):"Выбери слова по порядку",450,390);wordOrder.forEach((m,i)=>{const x=170+i*195;box(c,x,510,165,75,words.includes(m)?"rgba(42,92,63,.95)":"rgba(55,63,80,.96)");c.fillStyle="#fff";c.font="800 18px system-ui";c.fillText(m,x+82,548)});box(c,330,680,240,70,"rgba(80,63,30,.96)");c.fillStyle="#fff";c.font="800 23px system-ui";c.fillText("Расшифровать",450,715)}if(msg){c.fillStyle=solved?"#75e09a":"#ffd37a";c.font="700 18px system-ui";c.fillText(msg,450,795)}c.restore()},
    isComplete(){return solved},reset(){stage=1;map={};active="";words=[];solved=false;msg="";randomize()}
  }
});
