'use strict';
// Camera, world drawing (cached chunks + live trains, switches and particles) and screen overlays.
const RD=(()=>{
let cv,g,W=390,H=844,dpr=1;const cam={x:800,y:3400,z:1.3,px:0,py:0,shake:0};const view={top:96,bot:250};
const P=[];for(let i=0;i<360;i++)P.push({on:0});let pi=0;
function init(c){cv=c;g=cv.getContext('2d',{alpha:false});resize();}
function resize(){dpr=Math.min(2,window.devicePixelRatio||1);W=window.innerWidth;H=window.innerHeight;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';}
function cy(){return view.top+(H-view.top-view.bot)/2;}
function toScreen(x,y){return [(x-cam.x)*cam.z+W/2,(y-cam.y)*cam.z+cy()];}
function toWorld(sx,sy){return [(sx-W/2)/cam.z+cam.x,(sy-cy())/cam.z+cam.y];}
function emit(type,x,y,vx,vy,life,r){const p=P[pi];pi=(pi+1)%P.length;p.on=1;p.type=type;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.life=p.max=life;p.r=r;}
// follow the loco, look ahead in the direction of travel and pull back with speed
function follow(dt,snap){const S=SIM.S;if(!S.train)return;const L=S.loco,v=S.train.v;
  const a=TN.end(S.train,0),tA=TK.pt(a.e,a.s);const hx=Math.cos(L.h)*(v>=0?1:-1),hy=Math.sin(L.h)*(v>=0?1:-1);
  // heading toward end A is roughly loco heading (sprite +x points to A)
  const look=Math.min(150,Math.abs(v)*1.7);const tx=L.x+hx*look+cam.px,ty=L.y+hy*look+cam.py;
  const tz=(2.35-Math.min(1,Math.abs(v)/75)*1.15)*(GAME.zoomMul||1);const k=snap?1:Math.min(1,dt*2.2);
  cam.x+=(tx-cam.x)*k;cam.y+=(ty-cam.y)*k;cam.z+=(tz-cam.z)*Math.min(1,dt*1.2)*(snap?99:1);cam.z=Math.max(.45,Math.min(3,cam.z));
  if(!GAME.panning&&!(SIM.S.train&&Math.abs(SIM.S.train.v)<2)){cam.px*=Math.pow(.25,dt);cam.py*=Math.pow(.25,dt);}
}
function drawChunks(){const [x0,y0]=toWorld(0,0),[x1,y1]=toWorld(W,H);const C=ART.CH;
  for(let cx=Math.max(0,Math.floor(x0/C));cx<=Math.floor(x1/C);cx++)for(let cy_=Math.max(0,Math.floor(y0/C));cy_<=Math.floor(y1/C);cy_++){
    if(cx*C>MAP.W+200||cy_*C>MAP.H+200)continue;const c=ART.chunk(cx,cy_);g.drawImage(c,cx*C,cy_*C,C,C);}
  // build one chunk ahead per frame so driving into new ground doesn't hitch
  const ax=Math.floor(x0/C)-1,bx=Math.floor(x1/C)+1,ay=Math.floor(y0/C)-1,by=Math.floor(y1/C)+1;
  for(let cx=Math.max(0,ax);cx<=bx;cx++)for(let cy_=Math.max(0,ay);cy_<=by;cy_++){if(cx*C>MAP.W+200||cy_*C>MAP.H+200)continue;if(!ART.has(cx,cy_)){ART.chunk(cx,cy_);return;}}}
function worldXf(){const s=cam.z*dpr;const sh=cam.shake>0?(Math.random()-.5)*cam.shake*2:0;g.setTransform(s,0,0,s,(W/2-cam.x*cam.z+sh)*dpr,(cy()-cam.y*cam.z+sh)*dpr);}
function pathLine(pieces,col,w,dash){g.strokeStyle=col;g.lineWidth=w;g.setLineDash(dash||[]);g.lineCap='round';g.beginPath();let first=true;
  for(const p of pieces){const st=Math.sign(p.s1-p.s0)||1;const n=Math.max(1,Math.ceil(Math.abs(p.s1-p.s0)/6));for(let i=0;i<=n;i++){const q=TK.pt(p.e,p.s0+(p.s1-p.s0)*i/n);first?g.moveTo(q.x,q.y):g.lineTo(q.x,q.y);first=false;}}g.stroke();g.setLineDash([]);}
function drawSwitches(t){const nx=GAME.nextSw;
  for(const id in TK.N){const n=TK.N[id];const sw=n.p.length===2?n.p:n.m.length===2?n.m:null;if(!sw)continue;
    const [sx,sy]=toScreen(n.x,n.y);if(sx<-60||sx>W+60||sy<-60||sy>H+60)continue;
    const busy=TN.occupied(id),isNext=nx&&nx.id===id;
    // set route chevrons along the chosen branch
    for(let k=0;k<2;k++){const ei=sw[k],e=TK.E[ei],fromA=e.a===id;const on=k===n.sw;
      for(let s=8;s<=(on?44:20);s+=on?12:12){const p=TK.pt(ei,fromA?s:e.L-s);const h=fromA?p.h:p.h+Math.PI;
        g.save();g.translate(p.x,p.y);g.rotate(h);g.fillStyle=on?(busy?'rgba(220,90,60,.85)':'rgba(255,226,120,.92)'):'rgba(40,30,20,.35)';
        if(on){g.beginPath();g.moveTo(3,0);g.lineTo(-2.5,-3.4);g.lineTo(-1,0);g.lineTo(-2.5,3.4);g.fill();}else{g.fillRect(-1,-1,2,2);}g.restore();}}
    // lever stand
    const ex=TK.E[sw[0]],fromA=ex.a===id,p=TK.pt(sw[0],fromA?2:ex.L-2);const h=(fromA?p.h:p.h+Math.PI);
    const lx=n.x+Math.cos(h-1.5708)*15,ly=n.y+Math.sin(h-1.5708)*15;n.lx=lx;n.ly=ly;
    if(isNext){const pul=.5+.5*Math.sin(t*6);g.strokeStyle=`rgba(255,226,120,${.35+pul*.4})`;g.lineWidth=2/cam.z+1;g.beginPath();g.arc(n.x,n.y,18+pul*3,0,7);g.stroke();}
    g.fillStyle='rgba(0,0,0,.35)';g.fillRect(lx-3,ly-2,8,8);g.fillStyle='#2e2a26';g.fillRect(lx-4,ly-4,8,8);
    g.fillStyle=busy?'#c8432f':'#e6d27a';g.beginPath();g.arc(lx,ly,2.4,0,7);g.fill();
    g.strokeStyle='#d8d0bc';g.lineWidth=1.2;g.beginPath();g.moveTo(lx,ly);const la=h+(n.sw?.6:-.6);g.lineTo(lx+Math.cos(la)*6,ly+Math.sin(la)*6);g.stroke();
  }}
function drawVehicles(t){const S=SIM.S;
  for(const c of TN.cons){for(const v of c.veh){g.save();g.translate(v.x+3,v.y+4);g.rotate(v.h);g.fillStyle='rgba(0,0,0,.33)';g.fillRect(-v.len/2+1,-5.5,v.len-2,11);g.restore();}}
  for(const c of TN.cons){
    // couplers
    for(let i=0;i<c.veh.length-1;i++){const a=c.veh[i],b=c.veh[i+1];const o=b.o;const p=TN.at(c,o,{});g.fillStyle='#1c1a18';g.beginPath();g.arc(p.x,p.y,1.6,0,7);g.fill();}
    for(const v of c.veh){const sp=ART.sprite(v);g.save();g.translate(v.x,v.y);g.rotate(v.h+(v.loco&&v.face===1?Math.PI:0));
      g.drawImage(sp,-v.len/2-2,-7.5,v.len+4,15);
      if(v.loco){const fw=SIM.dirSign()>0===(v.face===0)||SIM.S.ctl.rev>0;const front=S.ctl.rev>0; // lamps: white on the leading end
        const lead=front?1:-1;g.fillStyle='rgba(255,244,200,.95)';for(const y of [-3.2,3.2]){g.beginPath();g.arc(lead*(v.len/2-.5),y,1,0,7);g.fill();}
        g.fillStyle='rgba(200,40,30,.9)';for(const y of [-3.2,3.2]){g.beginPath();g.arc(-lead*(v.len/2-.5),y,.8,0,7);g.fill();}
        if(GAME.light){g.fillStyle='rgba(255,240,190,.08)';g.beginPath();g.moveTo(lead*v.len/2,-4);g.lineTo(lead*(v.len/2+60),-18);g.lineTo(lead*(v.len/2+60),18);g.lineTo(lead*v.len/2,4);g.fill();}
      }
      if(!v.loco&&v.cond<.98){g.globalAlpha=Math.min(.6,(1-v.cond)*.9);g.strokeStyle='#1a1410';g.lineWidth=.6;const r=RNG.make(v.num);for(let k=0;k<5;k++){const x=(r()-.5)*v.len*.8,y=(r()-.5)*7;g.beginPath();g.moveTo(x,y);g.lineTo(x+r()*5-2.5,y+r()*4-2);g.lineTo(x+r()*6-3,y+r()*4-2);g.stroke();}g.globalAlpha=1;}
      if(c.lot&&GAME.targets&&!v.loco&&c!==S.train){g.strokeStyle=`rgba(255,200,90,${.45+.3*Math.sin(t*4)})`;g.lineWidth=1.2;g.strokeRect(-v.len/2-1,-6.5,v.len+2,13);}
      if(GAME.sel===v){g.strokeStyle='#fff3c0';g.lineWidth=1.4;g.setLineDash([3,2]);g.strokeRect(-v.len/2-1.5,-7,v.len+3,14);g.setLineDash([]);}
      g.restore();}
  }}
function particles(dt){for(const p of P){if(!p.on)continue;p.life-=dt;if(p.life<=0){p.on=0;continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;const f=p.life/p.max;
  if(p.type==='smoke'){p.vx*=.985;p.vy*=.985;p.r+=dt*7;g.fillStyle=`rgba(${p.dark?40:90},${p.dark?38:88},${p.dark?36:84},${.42*f})`;g.beginPath();g.arc(p.x,p.y,p.r,0,7);g.fill();}
  else if(p.type==='spark'){g.fillStyle=`rgba(255,${180+Math.random()*70|0},90,${f})`;g.fillRect(p.x,p.y,1.2,1.2);}
  else if(p.type==='dust'){p.r+=dt*12;g.fillStyle=`rgba(150,130,100,${.35*f})`;g.beginPath();g.arc(p.x,p.y,p.r,0,7);g.fill();}
  else if(p.type==='sand'){g.fillStyle=`rgba(210,180,120,${.6*f})`;g.fillRect(p.x,p.y,1.5,1.5);}}}
function feed(dt){const S=SIM.S;if(!S.train)return;const L=S.loco,v=Math.abs(S.train.v);const fx=Math.cos(L.h)*(L.face===1?-1:1),fy=Math.sin(L.h)*(L.face===1?-1:1);
  const ex=L.x-fx*(L.len/2-19),ey=L.y-fy*(L.len/2-19);GAME.smokeAcc=(GAME.smokeAcc||0)+dt*(2.5+S.ctl.thr*5+(GAME.puff||0)*40);
  while(GAME.smokeAcc>1){GAME.smokeAcc--;const wv=S.train.v;const mvx=-(Math.cos(L.h))*wv*.15,mvy=-(Math.sin(L.h))*wv*.15;const p=emit('smoke',ex,ey,mvx*0+8+Math.random()*6,-6-Math.random()*6+0,1.6+S.ctl.thr*.35,2+S.ctl.thr*.4);P[(pi+P.length-1)%P.length].dark=(GAME.puff||0)>0||S.ctl.thr>=4;}
  if(GAME.puff>0)GAME.puff-=dt;
  if(L.slip>.3){for(let i=0;i<2;i++)emit('spark',L.x+(Math.random()-.5)*L.len*.6,L.y+(Math.random()-.5)*10,(Math.random()-.5)*40,(Math.random()-.5)*40,.25,1);}
  if(S.ctl.brk>.7&&v>25){for(const c of S.train.veh)if(Math.random()<.25)emit('spark',c.x+(Math.random()-.5)*c.len*.8,c.y+(Math.random()-.5)*10,(Math.random()-.5)*30,(Math.random()-.5)*30,.2,1);}
  if(S.sandT>0){emit('sand',L.x+(Math.random()-.5)*20,L.y+(Math.random()-.5)*10,(Math.random()-.5)*10,(Math.random()-.5)*10,.8,1);}
}
function burst(type,x,y,n,spd){for(let i=0;i<n;i++){const a=Math.random()*6.28,s=spd*(.3+Math.random()*.7);emit(type,x,y,Math.cos(a)*s,Math.sin(a)*s,type==='dust'?1.1:.4,type==='dust'?3:1);}}
function stopMarker(){const S=SIM.S;const v=Math.abs(S.train.v);if(v<4)return null;const sd=SIM.stopDist();const inf=!isFinite(sd);const d=inf?260:Math.min(sd,700);
  const w=SIM.ahead(d+.01);pathLine(w.pieces,inf?'rgba(220,70,50,.4)':'rgba(255,190,80,.22)',inf?7:6);
  const end=TK.pt(w.e,w.s);const short=w.moved<d-1; // we'd hit something before stopping
  const ct=TN.contact(S.train,w.pieces);const danger=inf||short||(ct&&ct.d<d);
  g.save();g.translate(end.x,end.y);g.rotate(end.h);g.fillStyle=danger?'rgba(230,70,50,.95)':'rgba(255,214,110,.95)';g.fillRect(-1.6,-9,3.2,18);g.fillStyle='rgba(0,0,0,.4)';g.fillRect(-1.6,-9,3.2,2);g.restore();
  return {d:sd,danger};}
function aheadLine(){const S=SIM.S;const w=SIM.ahead(170);pathLine(w.pieces,'rgba(255,255,230,.10)',4,[4,6]);}
// screen-space indicators for targets that are off screen
function arrows(list){const pad=26,top=view.top+20,bot=H-view.bot-20;
  for(const tg of list){const [sx,sy]=toScreen(tg.x,tg.y);if(sx>pad&&sx<W-pad&&sy>top&&sy<bot)continue;
    const cx=W/2,cy_=cy();let dx=sx-cx,dy=sy-cy_;const kx=dx?((dx>0?W-pad:pad)-cx)/dx:1e9,ky=dy?((dy>0?bot:top)-cy_)/dy:1e9;const k=Math.min(kx,ky);
    const x=cx+dx*k,y=cy_+dy*k,a=Math.atan2(dy,dx);g.save();g.translate(x,y);g.fillStyle=tg.home?'rgba(240,232,210,.92)':'rgba(255,196,90,.95)';g.strokeStyle='rgba(20,16,12,.75)';g.lineWidth=2;
    g.save();g.rotate(a);g.beginPath();g.moveTo(14,0);g.lineTo(2,-8);g.lineTo(2,8);g.closePath();g.stroke();g.fill();g.restore();
    g.font="bold 11px 'Arial Narrow','Roboto Condensed',Arial,sans-serif";g.textAlign='center';g.textBaseline='middle';const lbl=tg.label;const tw=g.measureText(lbl).width+10;
    const ox=-Math.cos(a)*24,oy=-Math.sin(a)*18;g.fillStyle='rgba(20,16,12,.78)';g.beginPath();g.roundRect(ox-tw/2,oy-8,tw,16,4);g.fill();g.fillStyle=tg.home?'#efe6cf':'#ffd27a';g.fillText(lbl,ox,oy+.5);g.restore();}}
let vign=null;
function frame(dt,t){
  g.setTransform(1,0,0,1,0,0);g.fillStyle='#3f4a2c';g.fillRect(0,0,cv.width,cv.height);
  worldXf();drawChunks();
  if(SIM.S.on){drawSwitches(t);if(GAME.state==='play'){aheadLine();GAME.marker=SV.D.set.marker?stopMarker():null;}}
  drawVehicles(t);if(SIM.S.on&&GAME.state==='play')feed(dt);particles(dt);
  g.setTransform(dpr,0,0,dpr,0,0);
  if(!vign||vign.w!==W||vign.h!==H){vign=document.createElement('canvas');vign.w=W;vign.h=H;vign.width=W;vign.height=H;const vg=vign.getContext('2d');const gr=vg.createRadialGradient(W/2,H*.48,Math.min(W,H)*.35,W/2,H*.48,Math.max(W,H)*.75);gr.addColorStop(0,'rgba(30,20,10,0)');gr.addColorStop(1,'rgba(30,20,10,.45)');vg.fillStyle=gr;vg.fillRect(0,0,W,H);
    const t2=vg.createLinearGradient(0,0,0,H);t2.addColorStop(0,'rgba(255,190,120,.06)');t2.addColorStop(1,'rgba(40,60,90,.06)');vg.fillStyle=t2;vg.fillRect(0,0,W,H);}
  g.drawImage(vign,0,0,W,H);
  if(GAME.state==='play'&&GAME.targets)arrows(GAME.targets);
  if(cam.shake>0)cam.shake=Math.max(0,cam.shake-dt*14);
}
return {init,resize,frame,follow,toScreen,toWorld,cam,view,burst,emit,get W(){return W},get H(){return H}};
})();
