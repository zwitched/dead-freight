// Consists (a run of coupled vehicles laid along the track) and the locomotive physics.
// A consist is a list of track pieces from end A to end B plus its vehicles in the same order.
'use strict';
const TN=(()=>{
const C={G:32,R0:.25,R2:.00012,SAFE:9,BUMP:12,DERAIL:46,VMAX:85,FUEL_IDLE:.006,FUEL_K:4.2e-5};
const cons=[];let uid=1;
const plen=p=>Math.abs(p.s1-p.s0);
function len(c){let l=0;for(const p of c.pieces)l+=plen(p);return l;}
function vlen(c){let l=0;for(const v of c.veh)l+=v.len;return l;}
function end(c,side){if(side===0){const p=c.pieces[0];return {e:p.e,s:p.s0,d:-p.d};}const p=c.pieces[c.pieces.length-1];return {e:p.e,s:p.s1,d:p.d};}
function extend(c,side,walked){
  if(side===1){for(const w of walked)if(plen(w)>1e-9)c.pieces.push({e:w.e,s0:w.s0,s1:w.s1,d:w.d});}
  else for(const w of walked)if(plen(w)>1e-9)c.pieces.unshift({e:w.e,s0:w.s1,s1:w.s0,d:-w.d});
  merge(c);
}
function merge(c){const P=c.pieces;for(let i=P.length-1;i>0;i--){const a=P[i-1],b=P[i];if(a.e===b.e&&a.d===b.d&&Math.abs(a.s1-b.s0)<1e-6){a.s1=b.s1;P.splice(i,1);}}}
function trim(c,side,x){
  const P=c.pieces;
  while(x>1e-9&&P.length){
    const p=side===0?P[0]:P[P.length-1],l=plen(p);
    if(l<=x+1e-9&&P.length>1){x-=l;side===0?P.shift():P.pop();continue;}
    if(side===0)p.s0+=p.d*Math.min(x,l);else p.s1-=p.d*Math.min(x,l);x=0;
  }
}
function reverse(c){c.pieces.reverse();for(const p of c.pieces){const t=p.s0;p.s0=p.s1;p.s1=t;p.d=-p.d;}c.veh.reverse();if(c.loco)c.loco.face=1-c.loco.face;}
// point at offset from end A
const tmp={};
function at(c,off,out){
  let acc=0;const P=c.pieces;
  for(let i=0;i<P.length;i++){const p=P[i],l=plen(p);if(off<=acc+l||i===P.length-1){const s=p.s0+p.d*Math.min(l,Math.max(0,off-acc));out=TK.pt(p.e,s,out);out.e=p.e;out.s=s;out.d=p.d;out.pi=i;return out;}acc+=l;}
}
// lay a new consist on edge e starting at s, extending in direction d, from end A
function place(e,s,d,veh,opts){
  const c=Object.assign({id:uid++,pieces:[{e,s0:s,s1:s,d}],veh,v:0,loco:null},opts||{});
  const w=TK.walk(e,s,d,vlen(c),false);extend(c,1,w.pieces);c.pieces=c.pieces.filter(p=>plen(p)>1e-9);
  layout(c);cons.push(c);return c;
}
function layout(c){let o=0;for(const v of c.veh){const a=at(c,o+v.len*.2,{}),b=at(c,o+v.len*.8,{});v.x=(a.x+b.x)/2;v.y=(a.y+b.y)/2;v.h=Math.atan2(a.y-b.y,a.x-b.x);v.o=o;v.e=a.e;v.s=(a.s+b.s)/2;v.pd=a.d;o+=v.len;}}
// first contact with another consist along a walked path
function contact(self,path){
  let acc=0,best=null;
  for(const p of path){
    for(const c of cons){if(c===self)continue;
      for(const q of c.pieces){if(q.e!==p.e)continue;const lo=Math.min(q.s0,q.s1),hi=Math.max(q.s0,q.s1);
        let d=null;
        if(p.d>0){const x=Math.max(p.s0,lo);if(x<=Math.min(p.s1,hi)+1e-9)d=acc+(x-p.s0);}
        else{const x=Math.min(p.s0,hi);if(x>=Math.max(p.s1,lo)-1e-9)d=acc+(p.s0-x);}
        if(d!==null&&(!best||d<best.d)){
          const pe=p.d>0?Math.max(p.s0,lo):Math.min(p.s0,hi);
          const eA=end(c,0),eB=end(c,1);
          const which=(eA.e===p.e&&Math.abs(eA.s-pe)<.5)?0:(eB.e===p.e&&Math.abs(eB.s-pe)<.5)?1:-1;
          best={d,c,which};
        }
      }
    }
    if(best)return best;acc+=plen(p);
  }
  return best;
}
// move consist c by dx (positive toward end A). Returns {moved, hit:{type,...}}
function move(c,dx){
  if(Math.abs(dx)<1e-9)return {moved:0,hit:null};
  const side=dx>0?0:1,dist=Math.abs(dx),en=end(c,side);
  const look=TK.walk(en.e,en.s,en.d,dist,false);
  let lim=look.moved,hit=null;
  if(look.why&&look.moved<dist)hit={type:look.why};
  const ct=contact(c,look.pieces);
  if(ct&&ct.d<=lim+1e-9){lim=ct.d;hit={type:'car',c:ct.c,which:ct.which};}
  if(lim>1e-9){const real=TK.walk(en.e,en.s,en.d,lim,true);extend(c,side,real.pieces);trim(c,1-side,lim);}
  layout(c);
  return {moved:lim*(dx>0?1:-1),hit};
}
// join consist o onto c's end `side`. o touched at its end `which`.
function couple(c,side,o,which){
  // we want o's touching end to face c. For side A of c, o must be ordered so its B end touches: reverse o if it touched at A.
  if(side===0){if(which===0)reverse(o);c.pieces=o.pieces.concat(c.pieces);c.veh=o.veh.concat(c.veh);}
  else{if(which===1)reverse(o);c.pieces=c.pieces.concat(o.pieces);c.veh=c.veh.concat(o.veh);}
  merge(c);cons.splice(cons.indexOf(o),1);layout(c);
}
// split c after vehicle index k (vehicles 0..k stay on one side). Returns the new consist without the loco.
function split(c,k){
  const off=c.veh.slice(0,k+1).reduce((a,v)=>a+v.len,0);
  const A={pieces:JSON.parse(JSON.stringify(c.pieces)),veh:c.veh.slice(0,k+1)},B={pieces:JSON.parse(JSON.stringify(c.pieces)),veh:c.veh.slice(k+1)};
  trim(A,1,len(c)-off);trim(B,0,off);
  const hasLocoA=A.veh.some(v=>v.loco);
  const keep=hasLocoA?A:B,drop=hasLocoA?B:A;
  c.pieces=keep.pieces;c.veh=keep.veh;layout(c);
  const n={id:uid++,pieces:drop.pieces,veh:drop.veh,v:0,loco:null};layout(n);cons.push(n);return n;
}
// switches that any consist is sitting on (within foul distance)
function occupied(nodeId,F=14){
  for(const c of cons)for(const p of c.pieces){const e=TK.E[p.e],lo=Math.min(p.s0,p.s1),hi=Math.max(p.s0,p.s1);
    if(e.a===nodeId&&lo<F)return true;if(e.b===nodeId&&hi>e.L-F)return true;}
  return false;
}
return {C,cons,len,vlen,end,extend,trim,reverse,at,place,layout,contact,move,couple,split,occupied,reset(){cons.length=0;}};
})();
