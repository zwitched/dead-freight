'use strict';
// Glue: state machine, main loop, shift setup for career and daily, HUD, events, tutorial.
const GAME={state:'title',targets:null,nextSw:null,sel:null,zoomMul:1,panning:false,puff:0,mode:null,tut:null,light:0};
(()=>{
const $=id=>document.getElementById(id);
const S=SIM.S;let last=performance.now(),acc=0,hudT=0,miniT=0,radioT=0,toastN=0;
const YD=.55,MPH=.42;
// ---------- shift setup
function availLocs(open){return Object.keys(DATA.LOC).filter(k=>k!=='depot'&&(!DATA.LOC[k].need||open.includes(DATA.LOC[k].need)));}
function genLots(seed,open,o){const r=RNG.make(seed);const locs=availLocs(open);const pool=[];
  for(const l of locs)DATA.LOC[l].slots.forEach((s,i)=>pool.push({loc:l,slot:s,i}));r.shuffle(pool);
  const n=o.daily?7:Math.min(pool.length,2+Math.min(4,locs.length));const lots=[];const used=new Set();
  const near=pool.find(p=>p.loc==='brick'||p.loc==='mercy');const pick=[near].concat(pool.filter(p=>p!==near));
  for(const p of pick){if(lots.length>=n)break;if(o.reserve&&o.reserve(p))continue;const k=p.slot.join();if(used.has(k))continue;used.add(k);
    const tier=DATA.LOC[p.loc].tier;const nc=Math.min(3,1+Math.floor(r()*(tier>=3?3:2.4)));const cars=[];
    for(let i=0;i<nc;i++){const c=Object.assign({},r.pick(DATA.CARGO[p.loc]));c.loc=p.loc;cars.push(c);}lots.push({loc:p.loc,slot:p.slot,cars});}
  if(o.wanted&&lots.length){const l=r.pick(lots);r.pick(l.cars).wanted=1;}
  return lots;}
function careerLots(c){
  if(c.lots&&c.lotsDay===c.day)return c.lots;
  let lots;
  if(!c.tut&&c.day===1)lots=[{loc:'brick',slot:['BFb','BF0',6],cars:[Object.assign({loc:'brick'},DATA.CARGO.brick[0])]}];
  else{const lastOn=c.open.includes('ferrow')&&!c.ended;
    lots=genLots(c.seed+c.day*7919,c.open,{wanted:c.day>1,reserve:p=>lastOn&&p.loc==='ferrow'&&p.i===0});
    if(lastOn)lots.push({loc:'ferrow',slot:DATA.LOC.ferrow.slots[0],cars:[Object.assign({loc:'ferrow'},DATA.LAST)]});}
  c.lots=lots;c.lotsDay=c.day;SV.save();return lots;}
function dailyCfg(date){const seed=RNG.hash('df'+date);const open=['viaduct','larch','quarry','ferrow'];
  return {spec:DATA.spec({brakes:1,power:1,tank:1,sand:1,coupler:1}),open:new Set(open),lots:genLots(seed,open,{daily:1,wanted:1}),seed,mode:'daily',date};}
GAME.genLots=genLots;GAME.dailyCfg=dailyCfg;GAME.careerLots=careerLots;
function startShift(cfg){timers.length=0;radioT=0;
  SIM.start(cfg);ART.invalidate();GAME.mode=cfg.mode;GAME.cfg=cfg;GAME.sel=null;GAME.zoomMul=1;GAME.flags={};GAME.areaSeen=new Set();
  setThr(0,true);setBrk(.6,true);setRev(1,true);$('card').classList.add('hidden');$('radio').classList.add('hidden');$('toasts').innerHTML='';
  UI.show(null);$('hud').classList.remove('hidden');GAME.layout();IN.levers.lvThr.draw();IN.levers.lvBrake.draw();RD.follow(0,true);GAME.state='play';
  $('bSand').classList.toggle('dis',!cfg.spec.sand);
  GAME.tut=cfg.tutorial?{step:0,t:0}:null;tutShow();
  if(!cfg.tutorial)later(1.2,()=>radio(RNG.make(Date.now()|0).pick(DATA.RADIO.start)));
  SV.D.stats.shifts++;SV.save();
}
function startCareer(){const c=SV.D.career;const lots=careerLots(c);
  startShift({spec:DATA.spec(c.up),open:new Set(c.open),lots,seed:c.seed+c.day,mode:'career',tutorial:!c.tut&&c.day===1,towFree:c.towFree>0});}
function startDaily(){startShift(dailyCfg(RNG.today()));}
GAME.startCareer=startCareer;GAME.startDaily=startDaily;GAME.startShift=startShift;
// ---------- controls
function setThr(n,silent){const o=S.ctl.thr;S.ctl.thr=n;if(!silent&&n>o){GAME.puff=.35;}IN.levers.lvThr&&IN.levers.lvThr.draw();}
function setBrk(v,silent){S.ctl.brk=v;IN.levers.lvBrake&&IN.levers.lvBrake.draw();}
function setRev(r,silent){if(!silent&&r!==S.ctl.rev&&Math.abs(S.train?S.train.v:0)>.6){$('rev').classList.remove('shake');void $('rev').offsetWidth;$('rev').classList.add('shake');toast('Stop first, then change direction','bad');AU.play('busy');return false;}
  if(r!==S.ctl.rev&&!silent)AU.play('rev');S.ctl.rev=r;$('bFwd').classList.toggle('on',r>0);$('bRev').classList.toggle('on',r<0);GAME.nextSw=null;return true;}
GAME.setThr=setThr;GAME.setBrk=setBrk;GAME.setRev=setRev;
function points(id){id=id||(GAME.nextSw&&GAME.nextSw.id);if(!id){toast('No points ahead');return;}const r=SIM.throwSwitch(id);
  if(r==='busy'){AU.play('busy');toast('Can\'t throw points under a train','bad');if(!GAME.flags.locked){GAME.flags.locked=1;radio(DATA.RADIO.locked[0]);}return;}
  AU.play('points');buzz(15);const n=TK.N[id];RD.burst('dust',n.x,n.y,3,8);hudNow();}
GAME.points=points;
function buzz(ms){if(SV.D.set.buzz&&navigator.vibrate)try{navigator.vibrate(ms);}catch(e){}}
// ---------- world taps: points, then wagons
GAME.tap=(x,y)=>{if(GAME.state!=='play')return;let best=null,bd=34;
  for(const id in TK.N){const n=TK.N[id];if(!TK.isSwitch(id))continue;for(const [px,py] of [[n.x,n.y],[n.lx||n.x,n.ly||n.y]]){const [sx,sy]=RD.toScreen(px,py);const d=Math.hypot(sx-x,sy-y);if(d<bd){bd=d;best=id;}}}
  if(best){points(best);return;}
  const [wx,wy]=RD.toWorld(x,y);let hit=null;
  for(const c of TN.cons)for(const v of c.veh){const dx=wx-v.x,dy=wy-v.y,ca=Math.cos(-v.h),sa=Math.sin(-v.h);const lx=dx*ca-dy*sa,ly=dx*sa+dy*ca;const m=6/RD.cam.z;if(Math.abs(lx)<v.len/2+m&&Math.abs(ly)<6+m)hit={v,c};}
  if(hit){showCard(hit.v,hit.c);AU.play('ui');}else{GAME.sel=null;$('card').classList.add('hidden');}
};
function showCard(v,c){GAME.sel=v;const el=$('card');el.classList.remove('hidden');
  if(v.loco){$('cardName').textContent='D4071, the shunter';$('cardDesc').textContent='Built 1961. Overhauled 1979. Talked to most days since.';
    $('cardStats').innerHTML=`<span>${v.mass} t</span><span>${S.spec.Fmax} kN pull</span><span>Fuel ${Math.round(S.fuel)} of ${S.tank}</span>`;$('cardBtns').innerHTML='<button class="lite" id="cbClose">Close</button>';}
  else{$('cardName').textContent=v.name;$('cardDesc').textContent=v.desc;
    const loc=DATA.LOC[v.loc]?DATA.LOC[v.loc].short:'';
    $('cardStats').innerHTML=`<span>${v.mass} t</span><span>$${Math.round(v.value*(v.wanted?1.5:1))}${v.wanted?' wanted':''}</span><span>Condition ${Math.round(v.cond*100)}%</span>${v.fr?`<span class="fr">Fragile</span>`:''}${v.lo?`<span class="lo">Loose load</span>`:''}<span>${v.kind==='mail'?'Mail van':v.kind} No. ${v.num}</span>${loc?`<span>${loc}</span>`:''}`;
    let btn='';if(c===S.train){const i=c.veh.indexOf(v),li=c.veh.indexOf(S.loco);const n=i<li?i+1:c.veh.length-i;btn=`<button id="cbLeave">${n>1?'Leave these '+n+' wagons':'Leave this wagon'}</button>`;}
    $('cardBtns').innerHTML=btn+'<button class="lite" id="cbClose">Close</button>';
    const lb=$('cbLeave');if(lb)lb.onclick=()=>{if(Math.abs(S.train.v)>.3){toast('Stop the train first','bad');return;}const i=c.veh.indexOf(v),li=c.veh.indexOf(S.loco);SIM.uncouple(i<li?i:i-1);$('card').classList.add('hidden');GAME.sel=null;};}
  $('cbClose').onclick=()=>{$('card').classList.add('hidden');GAME.sel=null;};
}
// ---------- messages
function toast(t,cls){const d=document.createElement('div');d.className='toast '+(cls||'');d.textContent=t;const box=$('toasts');box.appendChild(d);while(box.children.length>3)box.firstChild.remove();setTimeout(()=>d.remove(),2600);}
function radio(t){$('radioTxt').textContent=t;$('radio').classList.remove('hidden');radioT=Math.max(4,t.length*.075);AU.play('radio');}
function banner(t,sub){const b=$('banner');b.classList.remove('hidden');b.innerHTML=`<b>${t}</b>${sub?`<i>${sub}</i>`:''}`;b.style.animation='none';void b.offsetWidth;b.style.animation='';}
const timers=[];function later(s,f){timers.push({t:s,f});}
GAME.toast=toast;GAME.radio=radio;
// ---------- tutorial
const TUT=[
 {t:'Let the brake off. Slide the red BRAKE lever all the way up.',hl:'lvBrake',ok:()=>S.ctl.brk<.05},
 {t:'Now push the POWER lever up to notch 2.',hl:'lvThr',ok:()=>S.ctl.thr>=2||Math.abs(S.train.v)>8},
 {t:'Points ahead. Tap the POINTS button until it says Brickfield.',hl:'bPoints',ok:()=>{const n=TK.N.J1,sw=n.p.length===2?n.p:n.m;return TK.E[sw[n.sw]].route==='Brickfield'||S.loco.e===SIM.edgeBy('J1','BF0')||S.loco.e===SIM.edgeBy('BF0','BFb');},
   alt:()=>S.loco.e===SIM.edgeBy('J1','K1')&&TN.end(S.train,1).s>40?'Missed it. Stop, pick REV, back up past the points and set them for Brickfield.':null},
 {t:'The wagon is up the siding. Ease off and roll into it gently, under 4 mph.',sub:'The bar on the track ahead shows where full brake would stop you.',hl:'lvThr',ok:()=>S.couplings>0},
 {t:'Coupled. Stop, switch to REV and take it home.',hl:'rev',ok:()=>S.ctl.rev<0&&Math.abs(S.train.v)>3},
 {t:'Points you run through from behind set themselves. Head back to the depot.',sub:'Heavier now. Start braking earlier than you think.',ok:()=>S.loco.e===0&&TN.end(S.train,0).s<300},
 {t:'Stop with everything past the yellow board, then press DELIVER.',hl:'ctx',ok:()=>false}
];
function tutShow(){const el=$('tut');document.querySelectorAll('.flash').forEach(e=>e.classList.remove('flash'));if(!GAME.tut){el.classList.add('hidden');return;}
  const st=TUT[GAME.tut.step];if(!st){el.classList.add('hidden');return;}const alt=st.alt&&st.alt();el.innerHTML=(alt||st.t)+(st.sub&&!alt?`<small>${st.sub}</small>`:'');el.classList.remove('hidden');if(st.hl)$(st.hl).classList.add('flash');GAME.tut.alt=alt;}
function tutTick(dt){const tu=GAME.tut;if(!tu)return;tu.t+=dt;const st=TUT[tu.step];if(!st)return;
  if(st.ok()){tu.step++;tu.t=0;AU.play('ui');tutShow();return;}const alt=st.alt&&st.alt();if(!!alt!==!!tu.alt)tutShow();}
// ---------- events from the sim
function events(){while(S.ev.length){const e=S.ev.shift();
  if(e.type==='couple'){AU.play('couple',e.q);buzz(e.q==='soft'?20:60);RD.cam.shake=e.q==='soft'?.8:e.q==='hard'?3:6;
    const v=e.cars[0];RD.burst('dust',v.x,v.y,e.q==='soft'?4:10,e.q==='soft'?10:30);
    const nm=e.n>1?e.n+' wagons':e.cars[0].name;
    if(e.q==='soft'){toast('Coupled: '+nm,'good');SV.D.stats.soft++;if(!GAME.flags.soft){GAME.flags.soft=1;later(.4,()=>radio(DATA.RADIO.soft[(Math.random()*2)|0]));}}
    else{toast((e.q==='crash'?'Smashed into ':'Hard coupling: ')+nm,'bad');SV.D.stats.hard++;later(.3,()=>radio(DATA.RADIO.hard[(Math.random()*2)|0]));}
    if(GAME.sel)showCard(GAME.sel,S.train);}
  else if(e.type==='bump'){AU.play('bump',e.hard);if(e.hard){buzz(80);RD.cam.shake=5;toast('Hit the buffers','bad');}else if(e.soft)buzz(15);}
  else if(e.type==='crash'){AU.play('crash');buzz([100,50,200]);RD.cam.shake=12;SV.D.stats.derails++;later(1.2,()=>endShift());}
  else if(e.type==='bar'){if(e.key&&DATA.RADIO.bar[e.key]&&!GAME.flags['bar'+e.key]){GAME.flags['bar'+e.key]=1;radio(DATA.RADIO.bar[e.key]);}}
  else if(e.type==='radio'){const l=DATA.RADIO[e.k];radio(Array.isArray(l)?l[(Math.random()*l.length)|0]:l);}
  else if(e.type==='area'){const L=DATA.LOC[e.a];if(L&&e.a!=='depot'){banner(L.name.toUpperCase(),'');const k='area_'+e.a;if(!SV.D[k]){SV.D[k]=1;SV.save();later(1,()=>radio(DATA.RADIO.area[e.a]));}}
    if(e.a==='viaduct'&&!GAME.areaSeen.has('v')){GAME.areaSeen.add('v');}}
  else if(e.type==='stranded'){AU.play('fail');radio('Out of diesel. Radio for a tow and the breakdown gang will fetch you.');}
  else if(e.type==='uncouple'){AU.play('couple','soft');toast(e.n>1?'Left '+e.n+' wagons':'Left a wagon');}
  else if(e.type==='sand'){AU.play('sand');}
}}
// ---------- logbook notes found by driving past
function notes(){for(const n of DATA.NOTES){if(SV.D.notes.includes(n.id))continue;if(Math.hypot(S.loco.x-n.x,S.loco.y-n.y)<70){SV.D.notes.push(n.id);SV.save();AU.play('found');toast('Logbook: '+n.t,'good');}}}
// ---------- HUD
function grade(){const L=S.loco,e=TK.E[L.e];const sg=Math.abs(S.train.v)>.3?Math.sign(S.train.v):SIM.dirSign();return e.grade*-L.pd*sg;}
function hudNow(){hudT=1;}
function hud(dt){hudT+=dt;if(hudT<.08)return;hudT=0;const v=Math.abs(S.train.v);$('spd').textContent=Math.round(v*MPH);$('gSpeed').classList.toggle('over',S.over>2);
  const cars=SIM.carsOn().length;$('wt').textContent=`${Math.round(SIM.mass())} t · ${cars?cars+(cars>1?' wagons':' wagon'):'engine only'}`;
  const fr=S.fuel/S.tank;$('fuelBar').firstChild.style.width=(fr*100)+'%';$('fuelBar').classList.toggle('low',fr<.2);
  const gr=grade();let st=Math.abs(gr)>.004?(gr>0?'Uphill ':'Downhill ')+(Math.abs(gr)*100).toFixed(1)+'%':'Level';
  const m=GAME.marker;const sx=$('stopTxt');if(m&&SV.D.set.marker){if(!isFinite(m.d)){st='Can\'t stop on this bank';}else st+=' · stop '+Math.round(m.d*YD)+' yd';}
  if(S.loco.slip>.3)st='Wheelslip! Ease the power';sx.textContent=st;sx.classList.toggle('danger',!!(m&&m.danger)||S.loco.slip>.3);
  // points
  const nx=SIM.nextSwitch();GAME.nextSw=nx;const bp=$('bPoints');
  if(nx){const n=TK.N[nx.id],sw=n.p.length===2?n.p:n.m;const label=routeLabel(nx.id,sw[n.sw],sw);$('pDist').textContent='Points in '+Math.round(nx.at*YD)+' yd';$('pSet').textContent='Set: '+label;$('pSet').style.fontSize=label.length>9?'14px':'';
    const busy=TN.occupied(nx.id);bp.classList.toggle('busy',busy);bp.classList.toggle('live',nx.at<260&&!busy);const left=isLeft(nx.id,sw[n.sw],sw);$('pA').classList.toggle('on',left);$('pB').classList.toggle('on',!left);}
  else{$('pDist').textContent='No points ahead';$('pSet').textContent='';bp.classList.remove('live','busy');$('pA').classList.remove('on');$('pB').classList.remove('on');}
  $('bSand').textContent=S.spec.sand?('SAND '+S.sand):'SAND';$('bSand').classList.toggle('dis',!S.spec.sand||!S.sand);
  // context buttons
  const ctx=$('ctx');let want='';
  if(S.fail==='fuel')want='tow';else if(SIM.canDeliver()&&cars)want='deliver';else if(SIM.canDeliver()&&!cars&&S.t>8&&!GAME.tut)want='clock';
  if(ctx.dataset.k!==want){ctx.dataset.k=want;ctx.innerHTML=want==='deliver'?`<button class="cbtn" id="bDeliver">Deliver ${cars} wagon${cars>1?'s':''}</button>`:want==='clock'?`<button class="cbtn alt" id="bClock">Clock off</button>`:want==='tow'?`<button class="cbtn" id="bTowCtx">Radio for a tow</button>`:'';
    const d=$('bDeliver');if(d)d.onclick=()=>endShift();const c=$('bClock');if(c)c.onclick=()=>endShift();const t=$('bTowCtx');if(t)t.onclick=()=>tow();}
  // targets
  const tg=[];for(const c of TN.cons){if(c===S.train||!c.veh.some(v=>v.value))continue;const v=c.veh[0];const d=Math.hypot(v.x-S.loco.x,v.y-S.loco.y);tg.push({x:v.x,y:v.y,label:(DATA.LOC[v.loc]?DATA.LOC[v.loc].short+' ':'')+Math.round(d*YD)+' yd'});}
  if(cars||S.t>2&&!tg.length){const d=TK.pt(0,40);tg.push({x:d.x,y:d.y,home:1,label:'Depot '+Math.round(Math.hypot(d.x-S.loco.x,d.y-S.loco.y)*YD)+' yd'});}
  GAME.targets=tg;
}
function routeLabel(id,ei,sw){const lbl=e=>{let cur=e,guard=0;const st={e:ei};const E=TK.E[ei];if(E.route)return E.route;
    // walk on to find a named route or a place
    const w=TK.walk(ei,E.a===id?0:E.L,E.a===id?1:-1,400,false);for(const p of w.pieces){if(TK.E[p.e].route)return TK.E[p.e].route;}return null;};
  const nm=lbl(ei);if(nm&&nm!=='Main line')return nm;const left=isLeft(id,ei,sw);if(nm)return nm;return left?'Left road':'Right road';}
function isLeft(id,ei,sw){const other=sw[0]===ei?sw[1]:sw[0];const n=TK.N[id];const q=(e)=>{const E=TK.E[e];return TK.pt(e,E.a===id?Math.min(50,E.L):E.L-Math.min(50,E.L));};
  const a=q(ei),b=q(other);const E=TK.E[ei];const hh=(E.a===id?E.as:E.bs)>0?n.h:n.h+Math.PI;const hx=Math.cos(hh),hy=Math.sin(hh);
  const ca=hx*(a.y-n.y)-hy*(a.x-n.x),cb=hx*(b.y-n.y)-hy*(b.x-n.x);return ca<cb;}
// minimap
function mini(){const c=$('mini'),g=c.getContext('2d');const sc=Math.min(c.width/MAP.W,c.height/MAP.H)*.94,ox=(c.width-MAP.W*sc)/2,oy=(c.height-MAP.H*sc)/2;
  if(!mini.bg||mini.rev!==ART.rev){mini.rev=ART.rev;const b=document.createElement('canvas');b.width=c.width;b.height=c.height;const bg=b.getContext('2d');bg.fillStyle='#2c3322';bg.fillRect(0,0,b.width,b.height);UI.drawNet(bg,sc,ox,oy,3);mini.bg=b;}
  g.drawImage(mini.bg,0,0);for(const cn of TN.cons){if(cn===S.train)continue;const v=cn.veh[0];g.fillStyle='#ff9a3a';g.fillRect(ox+v.x*sc-3,oy+v.y*sc-3,6,6);}
  g.fillStyle='#ffd76a';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.arc(ox+S.loco.x*sc,oy+S.loco.y*sc,5,0,7);g.stroke();g.fill();
  const [x0,y0]=RD.toWorld(0,RD.view.top),[x1,y1]=RD.toWorld(RD.W,RD.H-RD.view.bot);g.strokeStyle='rgba(255,240,200,.5)';g.lineWidth=1;g.strokeRect(ox+x0*sc,oy+y0*sc,(x1-x0)*sc,(y1-y0)*sc);}
GAME.mini=mini;
// ---------- shift end
function tow(){if(GAME.state!=='play'&&GAME.state!=='pause')return;S.fail=S.fail||'tow';SV.D.stats.tows++;endShift();}
GAME.tow=tow;
function endShift(){if(GAME.state==='result')return;AU.hornOff();const r=SIM.results();S.done=true;S.on=false;GAME.state='result';$('hud').classList.add('hidden');GAME.tut=null;tutShow();
  const st=SV.D.stats;st.wagons+=r.fail?0:r.cars;st.earned+=r.total;st.dist+=r.dist;st.bestShift=Math.max(st.bestShift,r.total);if(!r.fail){st.heaviest=Math.max(st.heaviest,Math.round(SIM.mass()));st.longest=Math.max(st.longest,r.cars);st.tonnes+=Math.round(SIM.mass()-S.loco.mass);}
  if(GAME.mode==='career'){const c=SV.D.career;c.cash+=r.total;if(r.fail&&r.fail!=='derail'&&c.towFree>0&&GAME.cfg.towFree)c.towFree--;c.day++;c.tut=1;c.lots=null;if(r.last)c.ended=1;}
  else if(GAME.mode==='daily'){const d=SV.D.daily[GAME.cfg.date]||{best:0,tries:0};d.tries++;d.best=Math.max(d.best,r.total);d.last=r.total;SV.D.daily[GAME.cfg.date]=d;}
  SV.save();r.fail?AU.play('fail'):r.cars?(AU.play('deliver'),setTimeout(()=>AU.play('coin'),700)):0;UI.result(r);}
function abandon(){S.on=false;S.done=true;GAME.state='menu';$('hud').classList.add('hidden');GAME.tut=null;tutShow();AU.hornOff();if(GAME.mode==='career')UI.depot();else UI.daily();}
GAME.endShift=endShift;GAME.abandon=abandon;
function pause(){if(GAME.state!=='play')return;GAME.state='pause';AU.hornOff();UI.show('sPause');$('pauseHint').textContent=S.fail==='fuel'?'You are out of fuel.':(GAME.mode==='career'?(SV.D.career.towFree>0?'A tow is free this time. Dobbs owes you one.':'A tow costs $40 and half the value of what you are hauling.'):'A tow ends the run at half value.');}
function resume(){if(GAME.state!=='pause')return;UI.show(null);GAME.state='play';last=performance.now();AU.resume();}
GAME.pause=pause;GAME.resume=resume;
// ---------- loop
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.1,(now-last)/1000);last=now;
  try{tick(dt,now);}catch(err){GAME.errors=(GAME.errors||0)+1;console.error(err);}}
function tick(dt,now){
  if(GAME.state==='play'){acc+=dt;let n=0;while(acc>=1/60&&n<8){SIM.step(1/60);acc-=1/60;n++;}if(n===8)acc=0;events();notes();tutTick(dt);hud(dt);
    for(let i=timers.length-1;i>=0;i--){timers[i].t-=dt;if(timers[i].t<=0){const f=timers[i].f;timers.splice(i,1);f();}}
    if(radioT>0){radioT-=dt;if(radioT<=0)$('radio').classList.add('hidden');}
    RD.follow(dt);miniT+=dt;if(miniT>.12){miniT=0;mini();}}
  else if(GAME.state==='title'||GAME.state==='menu'){titleCam(dt);}
  AU.update(dt);RD.frame(dt,now/1000);}
let tcT=0;function titleCam(dt){tcT+=dt;const c=RD.cam;const y=3300-((tcT*14)%2600);c.x+=(760+Math.sin(tcT*.05)*120-c.x)*Math.min(1,dt*.5);c.y=y;c.z=1.1;}
// ---------- boot
function boot(){SV.load();AU.setOn(!!SV.D.set.snd);AU.setVol(SV.D.set.vol);TK.build(MAP);ART.init();RD.init($('cv'));
  // idle scene behind the title
  SIM.start({spec:DATA.spec({}),open:new Set(),lots:genLots(7,[], {}),seed:7});S.on=true;
  IN.lever('lvThr',{notches:5,get:()=>S.ctl.thr/5,set:v=>{const n=Math.round(v*5);if(n!==S.ctl.thr)setThr(n);},onNotch:()=>{AU.play('notch');buzz(8);}});
  IN.lever('lvBrake',{down:1,get:()=>S.ctl.brk,set:v=>setBrk(v)});
  IN.press('bFwd',()=>setRev(1));IN.press('bRev',()=>setRev(-1));IN.press('bPoints',()=>points());
  IN.press('bHorn',()=>AU.hornOn(),()=>AU.hornOff());IN.press('bSand',()=>{if(!S.spec.sand){toast('No sanders fitted. The engine shed sells them.');return;}if(!SIM.useSand())toast(S.sand?'Already sanding':'Out of sand','bad');});
  $('bPause').onclick=pause;$('bMap').onclick=()=>{if(GAME.state==='play'){GAME.state='pause';UI.map(true);}};
  IN.world($('cv'));IN.keys();UI.init();
  window.addEventListener('resize',()=>{RD.resize();IN.levers.lvThr.draw();IN.levers.lvBrake.draw();layout();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(GAME.state==='play')pause();AU.suspend();}else last=performance.now();});
  window.addEventListener('pagehide',()=>SV.save());
  layout();requestAnimationFrame(t=>{last=t;IN.levers.lvThr.draw();IN.levers.lvBrake.draw();loop(t);});
}
function layout(){const top=$('top').getBoundingClientRect(),pan=$('panel').getBoundingClientRect();RD.view.top=top.bottom;RD.view.bot=window.innerHeight-pan.top;}
GAME.layout=layout;
window.addEventListener('DOMContentLoaded',boot);
})();
