'use strict';
// Touch-first input. Levers and buttons use Pointer Events with capture so a finger can slide off and keep control;
// pointercancel and lost capture always release cleanly. The world view takes taps (points, wagons) and drags (look around).
const IN=(()=>{
const levers={};
function lever(id,o){const el=document.getElementById(id),h=el.querySelector('.handle'),fill=el.querySelector('.fill');let pid=null,grab=0,last=-1;
  const geom=()=>{const r=el.getBoundingClientRect();return {top:r.top,range:Math.max(1,r.height-h.offsetHeight),hh:h.offsetHeight};};
  const pos=v=>{const g=geom();return o.down?v*g.range:(1-v)*g.range;};
  const val=y=>{const g=geom();let t=(y-g.top-grab)/g.range;t=Math.max(0,Math.min(1,t));return o.down?t:1-t;};
  function apply(y){let v=val(y);if(o.notches){v=Math.round(v*o.notches)/o.notches;}else{if(v<.04)v=0;if(v>.96)v=1;}o.set(v);draw();}
  function draw(){const v=o.get(),g=geom();h.style.top=pos(v)+'px';if(o.down)fill.style.height=(v*100)+'%';else fill.style.height=(v*100)+'%';
    if(o.notches){const n=Math.round(v*o.notches);if(n!==last){if(last>=0)o.onNotch&&o.onNotch(n,last);last=n;}}}
  function up(e){if(e.pointerId!==pid)return;pid=null;el.classList.remove('held');}
  el.addEventListener('pointerdown',e=>{e.preventDefault();AU.resume();if(pid!==null)return;pid=e.pointerId;try{el.setPointerCapture(pid);}catch(_){}
    const g=geom(),ht=g.top+pos(o.get());grab=(e.clientY>=ht-6&&e.clientY<=ht+g.hh+6)?Math.max(0,Math.min(g.hh,e.clientY-ht)):g.hh/2;apply(e.clientY);el.classList.add('held');GAME.onInput&&GAME.onInput();});
  el.addEventListener('pointermove',e=>{if(e.pointerId!==pid)return;e.preventDefault();apply(e.clientY);});
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);
  levers[id]={draw};return levers[id];}
function press(id,fn,upFn){const el=document.getElementById(id);let pid=null;
  el.addEventListener('pointerdown',e=>{e.preventDefault();AU.resume();pid=e.pointerId;try{el.setPointerCapture(pid);}catch(_){}el.classList.add('down');fn(e);});
  const rel=e=>{if(pid===null||e.pointerId!==pid)return;pid=null;el.classList.remove('down');upFn&&upFn(e);};
  el.addEventListener('pointerup',rel);el.addEventListener('pointercancel',rel);el.addEventListener('lostpointercapture',rel);}
function world(cv){let pid=null,sx=0,sy=0,lx=0,ly=0,t0=0,panned=false;
  cv.addEventListener('pointerdown',e=>{AU.resume();if(pid!==null)return;pid=e.pointerId;try{cv.setPointerCapture(pid);}catch(_){}sx=lx=e.clientX;sy=ly=e.clientY;t0=performance.now();panned=false;});
  cv.addEventListener('pointermove',e=>{if(e.pointerId!==pid)return;const dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;
    if(!panned&&Math.hypot(e.clientX-sx,e.clientY-sy)>12){panned=true;}if(panned&&GAME.state==='play'){GAME.panning=true;RD.cam.px-=dx/RD.cam.z;RD.cam.py-=dy/RD.cam.z;RD.cam.x-=dx/RD.cam.z;RD.cam.y-=dy/RD.cam.z;}});
  const end=e=>{if(e.pointerId!==pid)return;pid=null;GAME.panning=false;if(e.type==='pointerup'&&!panned&&performance.now()-t0<700)GAME.tap(e.clientX,e.clientY);};
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);cv.addEventListener('lostpointercapture',end);
  cv.addEventListener('wheel',e=>{if(GAME.state!=='play')return;GAME.zoomMul=Math.max(.6,Math.min(1.6,(GAME.zoomMul||1)*(e.deltaY>0?.92:1.08)));},{passive:true});
}
function keys(){const held={};window.addEventListener('keydown',e=>{if(GAME.state!=='play'||held[e.code])return;held[e.code]=1;const c=SIM.S.ctl;
    if(e.code==='ArrowUp'||e.code==='KeyW')GAME.setThr(Math.min(5,c.thr+1));if(e.code==='ArrowDown'||e.code==='KeyS')GAME.setThr(Math.max(0,c.thr-1));
    if(e.code==='KeyB')GAME.setBrk(Math.min(1,c.brk+.25));if(e.code==='KeyV')GAME.setBrk(Math.max(0,c.brk-.25));if(e.code==='KeyR')GAME.setRev(-c.rev);
    if(e.code==='KeyP')GAME.points();if(e.code==='KeyH')AU.hornOn();});
  window.addEventListener('keyup',e=>{held[e.code]=0;if(e.code==='KeyH')AU.hornOff();});}
return {lever,press,world,keys,levers};
})();
