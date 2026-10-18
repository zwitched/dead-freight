'use strict';
// One shift: lays out the network, drives the loco from the control inputs, handles coupling, damage, fuel and delivery.
const SIM=(()=>{
const C=TN.C,DEPOT_ZONE=370;
const S={on:false,t:0,ctl:{thr:0,brk:0,rev:1},ev:[],spec:null,train:null,loco:null};
function edgeBy(a,b){return TK.E.findIndex(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a));}
function resetSwitches(){
  for(const id in TK.N){const n=TK.N[id],sw=n.p.length===2?n.p:n.m.length===2?n.m:null;if(!sw)continue;
    // default to the straightest route
    let best=0,bd=9;sw.forEach((ei,i)=>{const e=TK.E[ei],st=e.a===id?0:e.L,q=TK.pt(ei,Math.abs(st-Math.min(e.L,60))),dh=Math.abs(Math.atan2(q.y-n.y,q.x-n.x)-0);
      const hh=e.a===id?e.as:e.bs,dir=n.h+(hh>0?0:Math.PI);let d=Math.atan2(q.y-n.y,q.x-n.x)-dir;d=Math.abs(Math.atan2(Math.sin(d),Math.cos(d)));if(d<bd){bd=d;best=i;}});
    n.sw=best;n.def=best;}
}
const KINDS={open:{t:11,b:.85},hopper:{t:12,b:.8},van:{t:12,b:.9},flat:{t:10,b:.75},tank:{t:12,b:.8},mail:{t:14,b:1}};
function mkCar(c,rng){
  const kinds=KINDS;
  const k=kinds[c.k]||kinds.open;const r=rng?rng():.5;
  return {loco:0,len:30,kind:c.k,ld:c.ld,name:c.n,desc:c.d,load:c.m,mass:k.t+c.m,value:c.v,fr:c.fr||0,lo:c.lo||0,cond:1,
    brk:180*(k.b*(.75+r*.5)),num:(rng?Math.floor(rng()*90000)+10000:40001),last:c.last||0,loc:c.loc,wanted:0,var:Math.floor((rng?rng():0)*4),hits:0};
}
// cfg: {spec, open:Set of repair keys, lots:[{slot:[end,toward,off], cars:[cargo]}], fuel, mode}
function start(cfg){
  TN.reset();resetSwitches();S.cfg=cfg;S.spec=cfg.spec;S.on=true;S.t=0;S.ev.length=0;S.ctl.thr=0;S.ctl.brk=.6;S.ctl.rev=1;
  for(const e of TK.E)for(const b of e.bars)b.open=cfg.open.has(e.barKey||'');
  const rng=RNG.make(cfg.seed||1);
  S.loco={loco:1,len:36,mass:cfg.spec.mass,face:1,name:'D4071',wheel:0,slip:0,cond:1};
  S.train=TN.place(0,24,1,[S.loco]);S.train.loco=S.loco;
  S.cars=[];
  for(const lot of cfg.lots){const [en,tw,off]=lot.slot;const ei=edgeBy(en,tw),e=TK.E[ei];const fromA=e.a===en;
    const veh=lot.cars.map(c=>{const v=mkCar(c,rng);v.loc=lot.loc;v.wanted=c.wanted||0;S.cars.push(v);return v;});
    TN.place(ei,fromA?off:e.L-off,fromA?1:-1,veh,{lot:lot.loc});}
  S.fuel=cfg.fuel||cfg.spec.tank;S.tank=cfg.spec.tank;S.sand=cfg.spec.sand;S.sandT=0;
  S.fail=null;S.done=false;S.acc=0;S.aSm=0;S.dmgLog=[];S.couplings=0;S.hardHits=0;S.slipT=0;S.stallT=0;S.overT=0;S.maxV=0;S.dist=0;
  S.stopT=0;S.bumped=0;S.lastBuf=0;S.flags={};S.fuelUsed=0;S.rollT=0;S.visited=new Set();
  return S;
}
function mass(){let m=0;for(const v of S.train.veh)m+=v.mass;return m;}
function carsOn(){return S.train.veh.filter(v=>!v.loco);}
function dirSign(){return S.ctl.rev*(S.loco.face===0?1:-1);} // +1 = toward end A
function brakeForce(){let f=S.spec.Bl;for(const v of S.train.veh)if(!v.loco)f+=v.brk*S.spec.cb;return f;}
function gradeForce(){let f=0;for(const v of S.train.veh){const e=TK.E[v.e];f+=v.mass*C.G*v.pd*e.grade;}return f;}
function emit(type,o){S.ev.push(Object.assign({type},o||{}));}
function damage(v,amt,why){if(amt<=0||v.loco)return;const before=v.cond;v.cond=Math.max(0,v.cond-amt);if(before-v.cond>.004){S.dmgLog.push({car:v.name,amt:before-v.cond,why});}}
function step(dt){
  if(!S.on||S.done)return;
  S.t+=dt;const T=S.train,L=S.loco,sp=S.spec;const M=mass();const v=T.v;const sg=dirSign();
  // traction
  const notch=S.ctl.thr;let Ftr=0,slip=false;
  const le=TK.E[L.e];const wet=le.wet||0;
  const mu=(1-.32*wet)*(S.sandT>0?1.45:1);const Fad=sp.ADH*mu;
  if(notch>0&&S.fuel>0){
    let Fd=notch/5*Math.min(sp.Fmax,sp.P/Math.max(Math.abs(v),1));
    if(Math.abs(v)>C.VMAX&&Math.sign(v)===sg)Fd*=Math.max(0,1-(Math.abs(v)-C.VMAX)/6);
    if(Fd>Fad){slip=true;Ftr=.55*Fad;}else Ftr=Fd;
    Ftr*=sg;
    const pw=Math.abs(slip?notch/5*sp.Fmax*Math.max(Math.abs(v),8):Ftr*Math.max(Math.abs(v),6));
    const use=(C.FUEL_IDLE+C.FUEL_K*pw)*dt;S.fuel=Math.max(0,S.fuel-use);S.fuelUsed+=use;
  }else{S.fuel=Math.max(0,S.fuel-C.FUEL_IDLE*.5*dt);}
  if(S.sandT>0)S.sandT-=dt;
  L.slip=slip?Math.min(1,L.slip+dt*4):Math.max(0,L.slip-dt*3);
  if(slip){S.slipT+=dt;if(S.slipT>.6&&!S.flags.slip){S.flags.slip=1;emit('radio',{k:'slip'});}}else S.slipT=Math.max(0,S.slipT-dt);
  const Fg=gradeForce(),Fb=S.ctl.brk*brakeForce(),Fdrive=Ftr+Fg;
  let nv;
  if(Math.abs(v)<.25&&Math.abs(Fdrive)<=Fb+M*C.R0){nv=0;}
  else{const dirn=Math.abs(v)<.25?Math.sign(Fdrive):Math.sign(v);const Fres=Fb+M*(C.R0+C.R2*v*v);
    nv=v+(Fdrive-dirn*Fres)/M*dt;if(Math.sign(nv)!==dirn&&Math.abs(v)>=.25)nv=0;}
  // wheel slip: spin wheels visually
  L.wheel+=(nv*dt+(slip?sg*dt*60:0))/4;
  const aInst=(nv-v)/dt;S.aSm+=(aInst-S.aSm)*Math.min(1,dt*8);
  // move
  const r=TN.move(T,nv*dt);T.v=nv;S.dist+=Math.abs(r.moved);
  if(r.hit){const imp=Math.abs(nv);
    if(r.hit.type==='car'&&r.hit.which>=0){
      const o=r.hit.c,Mo=o.veh.reduce((a,b)=>a+b.mass,0),side=nv>0?0:1;
      const firstNew=o.veh;TN.couple(T,side,o,r.hit.which);T.v=nv*M/(M+Mo);S.couplings++;
      const safe=sp.safe,ex=imp-safe;let q='soft';
      if(ex>0){q=ex>14?'crash':'hard';S.hardHits++;for(const c of firstNew)damage(c,ex*.011*(1+c.fr*2.2),'coupling');
        // the wagon we hit hardest is the one at the joint
        const j=side===0?T.veh.indexOf(firstNew[firstNew.length-1]):T.veh.indexOf(firstNew[0]);const adj=T.veh[side===0?j+1:j-1];if(adj&&!adj.loco)damage(adj,ex*.006*(1+adj.fr*2),'coupling');}
      emit('couple',{q,imp,n:firstNew.length,cars:firstNew});
      if(q==='crash')T.v*=.3;
    }else{ // buffer stop, barrier or the side of a wagon
      S.lastBuf=imp;
      if(imp>C.DERAIL){S.fail='derail';for(const c of carsOn())damage(c,.5,'derailed');emit('crash',{imp});T.v=0;S.done=true;}
      else{if(imp>C.BUMP){S.bumped++;for(const c of carsOn())damage(c,(imp-C.BUMP)*.012*(1+c.fr*2),'buffers');emit('bump',{imp,hard:1});}
        else emit('bump',{imp,hard:0,soft:imp>2});
        T.v=-nv*.12;if(Math.abs(T.v)<1)T.v=0;
        if(r.hit.type==='bar'){const e=TK.E[TN.end(T,nv>0?0:1).e];emit('bar',{key:e.barKey});}}
    }
  }
  const V=Math.abs(T.v);S.maxV=Math.max(S.maxV,V);
  // curves
  let over=0;for(const c of T.veh){const lim=TK.limAt(c.e,c.s);if(V>lim){over=Math.max(over,V-lim);if(!c.loco&&c.lo)damage(c,(V-lim)*.0045*c.lo*dt*(1+c.lo),'curve');if(!c.loco&&V>lim*1.35)damage(c,(V-lim*1.35)*.003*dt,'curve');}}
  S.over=over;if(over>4&&carsOn().length){S.overT+=dt;if(S.overT>.5&&!S.flags.curve){S.flags.curve=1;emit('radio',{k:'curve'});}}else S.overT=0;
  // harsh braking or lurching hurts fragile loads
  const ah=Math.abs(S.aSm);if(ah>7){for(const c of carsOn())if(c.fr){damage(c,(ah-7)*.006*c.fr*dt,'braking');}if(!S.flags.brakeHard&&carsOn().some(c=>c.fr>.5)&&ah>9){S.flags.brakeHard=1;emit('radio',{k:'brakeHard'});}}
  // stall / roll back on a bank
  if(notch>0&&V<2&&Math.sign(Fg)===-sg&&Math.abs(Fg)>Fad*.8&&carsOn().length){S.stallT+=dt;if(S.stallT>2.5&&!S.flags.stall){S.flags.stall=1;emit('radio',{k:'stall'});}}else S.stallT=0;
  if(V>3&&Math.sign(T.v)===-sg&&notch>0&&S.ctl.brk<.2){S.rollT+=dt;if(S.rollT>1&&!S.flags.roll){S.flags.roll=1;emit('radio',{k:'roll'});}}else S.rollT=0;
  // fuel
  const fr=S.fuel/S.tank;if(fr<.25&&!S.flags.f25){S.flags.f25=1;emit('radio',{k:'fuel25'});}if(fr<.1&&!S.flags.f10){S.flags.f10=1;emit('radio',{k:'fuel10'});}
  if(S.fuel<=0&&V<.3&&!inDepot()){S.stopT+=dt;if(S.stopT>1.5&&!S.fail){S.fail='fuel';emit('stranded');}}
  // areas
  const ar=areaAt(L.x,L.y);if(ar&&!S.visited.has(ar)){S.visited.add(ar);emit('area',{a:ar});}
  if(carsOn().length>=3&&!S.flags.heavy){S.flags.heavy=1;emit('radio',{k:'heavy'});}
  if(carsOn().length&&!S.flags.home&&L.e===0&&V>25){S.flags.home=1;emit('radio',{k:'home'});}
}
function areaAt(x,y){if(typeof ART==='undefined')return null;return ART.areaAt(x,y);}
function inDepot(){return S.train.veh.every(v=>v.e===0&&v.s-v.len/2>=-1&&v.s+v.len/2<=DEPOT_ZONE);}
function canDeliver(){return S.on&&!S.done&&Math.abs(S.train.v)<.3&&inDepot()&&S.ctl.thr===0;}
// stopping distance with full brake from now
function stopDist(){const M=mass(),v=S.train.v,V=Math.abs(v);if(V<.5)return 0;
  const Fg=gradeForce()*Math.sign(v);const dec=(brakeForce()+M*(C.R0+C.R2*V*V)-Fg)/M;if(dec<=.2)return Infinity;return V*V/(2*dec);}
function lead(){const v=S.train.v,sg=Math.abs(v)>.3?(v>0?0:1):(dirSign()>0?0:1);return {side:sg,end:TN.end(S.train,sg)};}
function ahead(dist){const {end}=lead();return TK.walk(end.e,end.s,end.d,dist,false);}
// next facing switch in the direction of travel
function nextSwitch(range=520){const w=ahead(range);for(const n of w.nodes){if(n.facing)return {id:n.id,at:n.at};}return null;}
function throwSwitch(id){const n=TK.N[id];const sw=n.p.length===2?n.p:n.m;if(!sw||sw.length<2)return 'none';
  if(TN.occupied(id))return 'busy';n.sw=1-n.sw;return 'ok';}
function uncouple(k){ // split after vehicle k
  if(Math.abs(S.train.v)>.3)return null;const n=TN.split(S.train,k);emit('uncouple',{n:n.veh.length});return n;}
function useSand(){if(S.sand>0&&S.sandT<=0){S.sand--;S.sandT=4;emit('sand');return true;}return false;}
function results(){
  const cars=carsOn(),delivered=!S.fail;let pay=0;const lines=[];
  for(const c of cars){let p=Math.round(c.value*c.cond*(c.wanted?1.5:1));if(S.fail)p=Math.round(p*.5);pay+=p;lines.push({name:c.name,cond:c.cond,pay:p,wanted:c.wanted,last:c.last,num:c.num,kind:c.kind});}
  const bonus=[];
  if(!S.fail&&cars.length){
    if(cars.every(c=>c.cond>.995))bonus.push({n:'Not a scratch',v:Math.round(pay*.15)});
    const front=TN.end(S.train,0);if(front.e===0&&front.s<14&&S.lastBuf<=C.BUMP&&!S.bumped)bonus.push({n:'Stopped on the buffers',v:20+cars.length*10});
    if(cars.length>=5)bonus.push({n:'Long train',v:cars.length*15});
  }
  let fee=0;if(S.fail)fee=S.cfg.towFree?0:40;
  const total=Math.max(0,pay+bonus.reduce((a,b)=>a+b.v,0)-fee);
  return {fail:S.fail,lines,pay,bonus,fee,total,cars:cars.length,fuelUsed:S.fuelUsed,dist:S.dist,maxV:S.maxV,couplings:S.couplings,hard:S.hardHits,last:cars.some(c=>c.last)};
}
return {KINDS,S,start,step,mass,carsOn,dirSign,stopDist,ahead,lead,nextSwitch,throwSwitch,uncouple,useSand,canDeliver,inDepot,results,brakeForce,gradeForce,edgeBy,DEPOT_ZONE,emit};
})();
