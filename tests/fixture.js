// Test fixtures: lay out a scenario (where the train stands, which wagons it has). Driving is still done with touches.
window.FIX={
 // start a career shift with a custom lot list and upgrades, skipping the tutorial
 shift(o){o=o||{};const c=SV.D.career||(SV.D.career=SV.newCareer());c.tut=1;c.day=Math.max(2,c.day);c.up=o.up||{};c.open=o.open||[];c.lots=o.lots||[];c.lotsDay=c.day;if(o.cash!=null)c.cash=o.cash;SV.save();GAME.startCareer();return true;},
 // rebuild the active train at edge (a->b) offset s from a, heading toward b, with wagons (cargo picks) in front of the loco
 train(a,b,s,wagons,opts){opts=opts||{};const S=SIM.S;const ei=SIM.edgeBy(a,b),e=TK.E[ei];const fromA=e.a===a;
  TN.cons.splice(TN.cons.indexOf(S.train),1);
  const cars=(wagons||[]).map(w=>{const c=Object.assign({},w);const k=SIM.KINDS[c.k];return {loco:0,len:30,kind:c.k,ld:c.ld,name:c.n,desc:c.d||'',load:c.m,mass:k.t+c.m,value:c.v,fr:c.fr||0,lo:c.lo||0,cond:1,brk:180*k.b,num:12345+TN.cons.length,loc:'brick',var:0};});
  // loco at the rear (toward a), wagons ahead toward b, loco facing b
  const veh=cars.slice().reverse().concat([S.loco]);
  // place from the far end so the loco sits at s
  const total=veh.reduce((t,v)=>t+v.len,0);
  const s0=fromA?s:e.L-s;
  S.train=TN.place(ei,fromA?s0+total:s0-total,fromA?-1:1,veh);S.train.loco=S.loco;
  // place() lays end A at the start point, so end A is the far front; loco is at end B. Face toward A.
  S.loco.face=0;S.train.v=opts.v||0;S.ctl.rev=1;document.getElementById('bFwd').classList.add('on');document.getElementById('bRev').classList.remove('on');
  if(opts.fuel!=null)S.fuel=opts.fuel;TN.layout(S.train);RD.follow(0,true);return SIM.carsOn().length;},
 cargo:k=>{for(const l in DATA.CARGO)for(const c of DATA.CARGO[l])if(c.n.startsWith(k))return c;}
};
// Read-only route planner for the test driver: which way each facing set of points must be set to reach edge `goal`
// from the end of the train that leads in direction `dirSide` (0 = end A, 1 = end B). Returns {nodeId: exitEdge}.
FIX.plan=function(goal,dirSide){const S=SIM.S;const en=TN.end(S.train,dirSide);const start={e:en.e,d:en.d};
  const key=s=>s.e+':'+s.d;const prev=new Map();prev.set(key(start),null);const q=[start];let found=null;
  while(q.length){const s=q.shift();if(s.e===goal){found=s;break;}const E=TK.E[s.e];const {nd,ex,back}=TK.exitsFrom(s.e,s.d>0);
    for(const x of ex){if(TK.E[x].bars.some(b=>!b.open))continue;const n2=TK.enter(x,nd);const k=key(n2);if(prev.has(k))continue;prev.set(k,{s,node:nd.id,exit:x,facing:ex.length===2});q.push({e:n2.e,d:n2.d});}}
  if(!found)return null;const plan={};let k=key(found);while(prev.get(k)){const p=prev.get(k);if(p.facing)plan[p.node]=p.exit;k=key(p.s);}return plan;};
FIX.setExit=id=>{const n=TK.N[id];const sw=n.p.length===2?n.p:n.m;return sw[n.sw];};
