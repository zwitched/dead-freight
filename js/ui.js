'use strict';
// Menus and between-shift screens: title, menu, depot board / engine shed / line repairs, daily, results, logbook, map, settings.
const UI=(()=>{
const $=id=>document.getElementById(id);let back=null,tab='board',confirmFn=null;
const SCREENS=['sTitle','sMenu','sDepot','sDaily','sPause','sResult','sSettings','sLog','sHelp','sMap','sEnd','sConfirm'];
function show(id){for(const s of SCREENS)$(s).classList.toggle('hidden',s!==id);}
function click(id,f){$(id).addEventListener('click',e=>{AU.resume();AU.play('ui');f(e);});}
function money(n){return '$'+Math.round(n).toLocaleString('en-US');}
function confirm(t,b,yes){$('cfT').textContent=t;$('cfB').textContent=b;confirmFn=yes;const prev=SCREENS.find(s=>!$(s).classList.contains('hidden'));back=prev;show('sConfirm');}
// ---------- menu
function menu(){GAME.state='menu';show('sMenu');const c=SV.D.career;$('bCareer').textContent=c?'Career · day '+c.day:'Career';$('bNewCareer').classList.toggle('hidden',!c);}
// ---------- depot (career hub)
function depot(){const c=SV.D.career;GAME.state='menu';show('sDepot');$('dTitle').textContent='Hallow Junction';$('dSub').textContent=`Day ${c.day} · ${c.open.length?'Line open to '+c.open.length+' more place'+(c.open.length>1?'s':''):'Two places open'}`;
  $('dCash').textContent=money(c.cash);setTab(tab);}
function setTab(t){tab=t;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));for(const [k,id] of [['board','tbBoard'],['shed','tbShed'],['repair','tbRepair']])$(id).classList.toggle('hidden',k!==t);
  if(t==='board')board();if(t==='shed')shed();if(t==='repair')repairs();}
function lotHtml(lots,spec){const by={};for(const l of lots){(by[l.loc]=by[l.loc]||[]).push(l);}let h='';let tot=0,tt=0;
  for(const loc in by){const L=DATA.LOC[loc];h+=`<div class="lot"><h3>${L.name}<i>${'·'.repeat(L.tier)}</i></h3>`;
    for(const l of by[loc])for(const c of l.cars){const m=c.m+SIM.KINDS[c.k].t;tot+=c.v*(c.wanted?1.5:1);tt+=m;
      h+=`<div class="w"><span>${c.n}${c.fr?'<span class="tag fr">fragile</span>':''}${c.lo?'<span class="tag lo">loose</span>':''}${c.wanted?'<span class="tag wa">wanted +50%</span>':''}${c.last?'<span class="tag wa">the last one</span>':''}</span><span>${m} t</span><span>${money(c.v*(c.wanted?1.5:1))}</span></div>`;}h+='</div>';}
  return {h,tot,tt};}
function board(){const c=SV.D.career;const lots=GAME.careerLots(c);const sp=DATA.spec(c.up);const {h,tot,tt}=lotHtml(lots,sp);
  const tip=!c.tut?'First shift. Dot will talk you through it.':c.day<4?'Take what you can bring back in one piece. You don\'t have to take everything.':'Deeper sidings pay more. The trip back is the hard part.';
  const nw=lots.reduce((a,l)=>a+l.cars.length,0);$('tbBoard').innerHTML=`<canvas id="boardMap" width="400" height="230"></canvas><div class="note">Out on the line today: ${nw} wagon${nw>1?'s':''}, ${money(tot)} if it all comes home perfect. Fuel: ${sp.tank} gal.</div>${h}<div class="note">${tip}</div>`;
  boardMap($('boardMap'),lots,new Set(c.open));}
function boardMap(cv,lots,open){const g=cv.getContext('2d');g.fillStyle='#2c3322';g.fillRect(0,0,cv.width,cv.height);
  // the map is tall, so draw it on its side: north to the right
  g.save();g.translate(cv.width,0);g.rotate(Math.PI/2);const sc=Math.min(cv.height/MAP.W,cv.width/MAP.H)*.95;const ox=(cv.height-MAP.W*sc)/2,oy=(cv.width-MAP.H*sc)/2;
  g.restore();g.save();g.translate(0,cv.height);g.rotate(-Math.PI/2);
  for(const e of TK.E)for(const b of e.bars)b.open=open.has(e.barKey||'');drawNet(g,sc,ox,oy,3,0);
  g.restore();
  const P=(x,y)=>[oy+y*sc,cv.height-(ox+x*sc)];const pos={};
  for(const l of lots){const [en,tw,off]=l.slot;const n=TK.N[en];const [px,py]=P(n.x,n.y);(pos[l.loc]=pos[l.loc]||{x:px,y:py,n:0}).n+=l.cars.length;}
  g.font="bold 12px 'Arial Narrow',Arial,sans-serif";g.textAlign='center';
  for(const k in pos){const p=pos[k];g.fillStyle='#ff9a3a';g.strokeStyle='#1c1814';g.lineWidth=2;g.beginPath();g.arc(p.x,p.y,6,0,7);g.fill();g.stroke();
    const t=DATA.LOC[k].short+' ×'+p.n;const w=g.measureText(t).width+8;let ty=p.y-12;if(ty<10)ty=p.y+20;g.fillStyle='rgba(20,16,12,.8)';g.fillRect(p.x-w/2,ty-10,w,14);g.fillStyle='#ffd27a';g.fillText(t,p.x,ty+1);}
  const [dx,dy]=P(800,3500);g.fillStyle='#efe6cf';g.fillRect(dx-5,dy-5,10,10);g.fillStyle='rgba(20,16,12,.8)';g.fillRect(dx-22,dy+8,44,14);g.fillStyle='#efe6cf';g.fillText('Depot',dx,dy+19);}
function shed(){const c=SV.D.career;let h='<div class="note">Spend what the freight earns. Every upgrade is fitted overnight.</div>';
  for(const k in DATA.UP){const u=DATA.UP[k],lv=c.up[k]|0,max=u.cost.length;const cost=u.cost[lv];
    h+=`<div class="up"><h3>${u.name}<span>${u.lv[lv]}</span></h3><p>${u.desc}</p><div class="pips">${u.cost.map((_,i)=>`<i class="${i<lv?'on':''}"></i>`).join('')}</div>
      ${lv<max?`<button class="btn small ${c.cash>=cost?'primary':''}" data-buy="${k}" ${c.cash>=cost?'':'disabled'}>${u.lv[lv+1]} · ${money(cost)}</button>`:'<p>Fully fitted.</p>'}</div>`;}
  $('tbShed').innerHTML=h;$('tbShed').querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.buy,lv=c.up[k]|0,cost=DATA.UP[k].cost[lv];if(c.cash<cost)return;c.cash-=cost;c.up[k]=lv+1;SV.save();AU.play('coin');depot();setTab('shed');}));}
function repairs(){const c=SV.D.career;let h='<div class="note">Bits of the line the railway never got round to fixing. Opening them opens new freight.</div>';
  for(const k in DATA.REPAIR){const r=DATA.REPAIR[k];const done=c.open.includes(k),need=r.need&&!c.open.includes(r.need);
    h+=`<div class="up"><h3>${r.name}<span>${done?'Open':money(r.cost)}</span></h3><p>${r.desc}</p>${done?'':need?'<p>Needs the Kesh Viaduct first.</p>':`<button class="btn small ${c.cash>=r.cost?'primary':''}" data-fix="${k}" ${c.cash>=r.cost?'':'disabled'}>Pay for it · ${money(r.cost)}</button>`}</div>`;}
  $('tbRepair').innerHTML=h;$('tbRepair').querySelectorAll('[data-fix]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.fix,r=DATA.REPAIR[k];if(c.cash<r.cost)return;c.cash-=r.cost;c.open.push(k);c.lots=null;SV.save();AU.play('deliver');depot();setTab('repair');}));}
// ---------- daily
function daily(){GAME.state='menu';show('sDaily');const date=RNG.today();const cfg=GAME.dailyCfg(date);const d=SV.D.daily[date];$('dyDate').textContent=date+' · the same freight for everyone today';
  const {h,tot}=lotHtml(cfg.lots,cfg.spec);$('dyBody').innerHTML=`<div class="note">Whole line open. Loan engine with one of every upgrade, ${cfg.spec.tank} gal of fuel. One shift. Bring home as much value as you can.</div>
   <div class="stat"><span>Your best today</span><b>${d?money(d.best):'none yet'}</b></div><div class="stat"><span>Tries</span><b>${d?d.tries:0}</b></div>${h}`;}
// ---------- results
function result(r){show('sResult');const m=GAME.mode;
  $('rTitle').textContent=r.fail==='derail'?'Off the rails':r.fail==='fuel'?'Towed home':r.fail==='tow'?'Towed home':r.cars?'Freight delivered':'Clocked off';
  $('rSub').textContent=r.fail==='derail'?'Through the buffers. The breakdown gang put her back on, eventually.':r.fail?'The breakdown gang dragged you in. Half pay for anything you brought.':r.cars?`${r.cars} wagon${r.cars>1?'s':''} into the goods road.`:'Nothing brought home this time.';
  let h='';for(const l of r.lines)h+=`<div class="rline"><span>${l.name}</span><span><span class="cond"><i style="width:${Math.round(l.cond*100)}%;background:${l.cond>.8?'#7fae6a':l.cond>.5?'#d6b23a':'#c0603e'}"></i></span>${Math.round(l.cond*100)}%</span><span>${money(l.pay)}</span></div>`;
  for(const b of r.bonus)h+=`<div class="rline good"><span>${b.n}</span><span>+${money(b.v)}</span></div>`;
  if(r.fee)h+=`<div class="rline bad"><span>Tow</span><span>-${money(r.fee)}</span></div>`;
  h+=`<div class="rline tot"><span>Total</span><span>${money(r.total)}</span></div>`;
  h+=`<div class="stat"><span>Distance</span><b>${(r.dist*.55/1760).toFixed(2)} miles</b></div><div class="stat"><span>Fuel used</span><b>${Math.round(r.fuelUsed)} gal</b></div><div class="stat"><span>Top speed</span><b>${Math.round(r.maxV*.42)} mph</b></div><div class="stat"><span>Couplings (hard)</span><b>${r.couplings} (${r.hard})</b></div>`;
  if(m==='career'){const c=SV.D.career;h+=`<div class="stat"><span>In the tin</span><b>${money(c.cash)}</b></div>`;$('bResOk').textContent=r.last?'Read the post':'Back to the depot';}
  else{const d=SV.D.daily[GAME.cfg.date];h+=`<div class="stat"><span>Best today</span><b>${money(d.best)}</b></div>`;$('bResOk').textContent='Done';}
  $('rBody').innerHTML=h;GAME.lastResult=r;}
function ending(){show('sEnd');$('endBody').innerHTML=`<p>The mail van rolls into the goods road at Hallow Junction, twenty-nine years and some weeks late.</p><p>Inside: four hundred and twelve sacks of Christmas post, 1996. Cards, mostly. A few parcels that rattle.</p><p>Dot comes down from the signal box with a flask and reads the top envelope out loud. It is addressed to the Stationmaster, Upper Ferrow. It says "See you in the new year."</p><p><b>Dot:</b> Well. That's the last of it. I'll put the kettle on.</p><p class="note">The line stays open. There is always more freight.</p>`;}
// ---------- logbook
function logbook(){show('sLog');const D=SV.D,s=D.stats;let h='';
  for(const n of DATA.NOTES){const f=D.notes.includes(n.id);h+=f?`<div class="logn"><b>${n.t}</b>${n.b}</div>`:`<div class="logn lock"><b>Not found yet</b>Somewhere near ${DATA.LOC[n.at]?DATA.LOC[n.at].name:'the Kesh Viaduct'}.</div>`;}
  h+=`<h3>Service record</h3>`;for(const [k,l] of [['shifts','Shifts worked'],['wagons','Wagons brought home'],['tonnes','Tonnes hauled'],['earned','Money earned'],['bestShift','Best shift'],['heaviest','Heaviest train (t)'],['longest','Longest train (wagons)'],['soft','Soft couplings'],['hard','Hard couplings'],['tows','Tows'],['derails','Derailments']])
    h+=`<div class="stat"><span>${l}</span><b>${k==='earned'||k==='bestShift'?money(s[k]):s[k]}</b></div>`;
  h+=`<div class="stat"><span>Distance driven</span><b>${(s.dist*.55/1760).toFixed(1)} miles</b></div>`;$('logBody').innerHTML=h;}
// ---------- map
function drawNet(g,sc,ox,oy,lw,labels){const open=SIM.S.cfg?SIM.S.cfg.open:new Set();
  for(const a of ART.AREAS){if(!a.c)continue;g.fillStyle=a.c+'66';g.beginPath();g.arc(ox+a.x*sc,oy+a.y*sc,a.r*sc*.8,0,7);g.fill();}
  g.fillStyle='#3d5560';g.beginPath();g.ellipse(ox+530*sc,oy+1720*sc,150*sc,120*sc,0,0,7);g.fill();g.strokeStyle='#3d5560';g.lineWidth=Math.max(2,40*sc);g.beginPath();g.moveTo(ox+660*sc,oy+1760*sc);g.lineTo(ox+1000*sc,oy+1785*sc);g.lineTo(ox+1500*sc,oy+1790*sc);g.stroke();
  for(const e of TK.E){const closed=e.bars.some(b=>!b.open);let cut=1e9;if(closed)cut=e.bars[0].s;
    g.lineCap='round';g.lineWidth=lw;g.strokeStyle='#e8dcc0';g.beginPath();let pen=0;for(let i=0;i<e.n;i++){const s=i*TK.DS;const x=ox+e.pts[i*2]*sc,y=oy+e.pts[i*2+1]*sc;if(s>cut){break;}pen?g.lineTo(x,y):g.moveTo(x,y);pen=1;}g.stroke();
    if(closed){g.strokeStyle='#c8432f';g.setLineDash([lw*1.5,lw*1.5]);g.beginPath();pen=0;for(let i=0;i<e.n;i++){const s=i*TK.DS;if(s<cut)continue;const x=ox+e.pts[i*2]*sc,y=oy+e.pts[i*2+1]*sc;pen?g.lineTo(x,y):g.moveTo(x,y);pen=1;}g.stroke();g.setLineDash([]);
      // and everything beyond a closed bar, faint
    }}
  if(labels){g.font=`bold ${Math.round(13*labels)}px 'Arial Narrow',Arial,sans-serif`;g.textAlign='center';const P={depot:[800,3570],brick:[1250,2520],mercy:[160,1300],glass:[1200,1060],larch:[230,560],quarry:[1180,220],ferrow:[720,90]};
    for(const k in P){const L=DATA.LOC[k];g.fillStyle='rgba(0,0,0,.55)';const t=k==='depot'?'HALLOW JN (DEPOT)':L.name.toUpperCase();const w=g.measureText(t).width+8;g.fillRect(ox+P[k][0]*sc-w/2,oy+P[k][1]*sc-11*labels,w,15*labels);g.fillStyle='#efe4c8';g.fillText(t,ox+P[k][0]*sc,oy+P[k][1]*sc+.5);}}}
function map(fromPlay){show('sMap');const c=$('bigmap'),g=c.getContext('2d');g.fillStyle='#2c3322';g.fillRect(0,0,c.width,c.height);const sc=Math.min(c.width/MAP.W,c.height/MAP.H)*.96,ox=(c.width-MAP.W*sc)/2,oy=(c.height-MAP.H*sc)/2;
  drawNet(g,sc,ox,oy,4,1.6);const S=SIM.S;for(const cn of TN.cons){if(cn===S.train)continue;for(const v of cn.veh){g.fillStyle='#ff9a3a';g.beginPath();g.arc(ox+v.x*sc,oy+v.y*sc,5,0,7);g.fill();}}
  if(S.loco){g.fillStyle='#ffd76a';g.strokeStyle='#000';g.lineWidth=3;g.beginPath();g.arc(ox+S.loco.x*sc,oy+S.loco.y*sc,8,0,7);g.stroke();g.fill();}
  map.from=fromPlay;}
// ---------- settings
function settings(from){back=from;show('sSettings');const s=SV.D.set;$('setSnd').checked=!!s.snd;$('setVol').value=s.vol;$('setBuzz').checked=!!s.buzz;$('setMarker').checked=!!s.marker;}
function init(){
  click('bStart',()=>{AU.ensure();AU.resume();if(!SV.D.career){SV.D.career=SV.newCareer();SV.save();depot();}else menu();});
  click('bCareer',()=>{if(!SV.D.career){SV.D.career=SV.newCareer();SV.save();}depot();});
  click('bNewCareer',()=>confirm('Start a new career?','Your money, upgrades and repairs go back to nothing. The logbook stays.',()=>{SV.D.career=SV.newCareer();SV.save();depot();}));
  click('bDaily',daily);click('bLog',logbook);click('bSettings',()=>settings('sMenu'));click('bHelp',()=>{back='sMenu';show('sHelp');});
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{AU.play('ui');setTab(b.dataset.tab);}));
  click('bDepotBack',menu);click('bGo',()=>GAME.startCareer());
  click('bDailyBack',menu);click('bDailyGo',()=>GAME.startDaily());
  click('bResume',()=>GAME.resume());click('bPauseMap',()=>map(true));click('bPauseSet',()=>settings('sPause'));click('bPauseHelp',()=>{back='sPause';show('sHelp');});
  click('bTow',()=>confirm('Radio for a tow?','The shift ends. You get half value for anything coupled to you'+(GAME.mode==='career'&&SV.D.career.towFree>0?'.':' and the tow costs $40.'),()=>{GAME.state='pause';GAME.tow();}));
  click('bAbandon',()=>confirm('Abandon the shift?','Nothing earned, nothing lost. The same freight will still be out there.',()=>GAME.abandon()));
  click('bResOk',()=>{if(GAME.mode==='career'){if(GAME.lastResult&&GAME.lastResult.last){ending();return;}depot();}else daily();});
  click('bEndOk',depot);
  click('bSetBack',()=>{show(back||'sMenu');});click('bHelpBack',()=>show(back||'sMenu'));click('bLogBack',menu);
  click('bMapBack',()=>{if(map.from){show(null);GAME.state='pause';GAME.resume();}else show('sMenu');});
  click('cfNo',()=>show(back||'sMenu'));click('cfYes',()=>{const f=confirmFn;confirmFn=null;f&&f();});
  click('bWipe',()=>confirm('Erase everything?','Career, logbook, daily scores and settings. This can\'t be undone.',()=>{SV.reset();AU.setOn(true);menu();}));
  $('setSnd').addEventListener('change',e=>{SV.D.set.snd=e.target.checked?1:0;AU.setOn(!!SV.D.set.snd);SV.save();});
  $('setVol').addEventListener('input',e=>{SV.D.set.vol=+e.target.value;AU.setVol(SV.D.set.vol);SV.save();});
  $('setBuzz').addEventListener('change',e=>{SV.D.set.buzz=e.target.checked?1:0;SV.save();});
  $('setMarker').addEventListener('change',e=>{SV.D.set.marker=e.target.checked?1:0;SV.save();});
}
return {init,show,menu,depot,daily,result,logbook,map,settings,drawNet,ending,setTab};
})();
