// Track network. Nodes carry a heading; each edge is a cubic bezier between two nodes, resampled every DS units.
// A node joins edges on its '+' side (along the heading) and '-' side. Two edges on one side = a set of points.
'use strict';
const TK=(()=>{
const DS=2,LAT=6; // sample spacing, lateral accel used for curve limits
const N={},E=[];
let G=null;
function unit(h){return [Math.cos(h),Math.sin(h)]}
function build(def){
  for(const k in N)delete N[k];E.length=0;
  for(const id in def.nodes){const [x,y,hd,z,o]=def.nodes[id];N[id]=Object.assign({id,x,y,h:hd*Math.PI/180,z:z||0,p:[],m:[],sw:0,locked:0},o||{});}
  def.edges.forEach((ed,i)=>{
    const [ai,bi,o={}]=ed,a=N[ai],b=N[bi];if(!a||!b)throw new Error('edge '+ai+'-'+bi);
    const dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy);
    let ua=unit(a.h),ub=unit(b.h);
    const sa=o.as||(ua[0]*dx+ua[1]*dy>=0?1:-1),sb=o.bs||(ub[0]*-dx+ub[1]*-dy>=0?1:-1);
    const ka=dist*(o.ka||o.k||.38),kb=dist*(o.kb||o.k||.38);
    const P1=[a.x+ua[0]*sa*ka,a.y+ua[1]*sa*ka],P2=[b.x+ub[0]*sb*kb,b.y+ub[1]*sb*kb];
    // dense sample then resample at uniform arc length
    const dense=[];const M=Math.max(40,Math.ceil(dist*3));
    for(let j=0;j<=M;j++){const t=j/M,u=1-t;dense.push(u*u*u*a.x+3*u*u*t*P1[0]+3*u*t*t*P2[0]+t*t*t*b.x,u*u*u*a.y+3*u*u*t*P1[1]+3*u*t*t*P2[1]+t*t*t*b.y);}
    const pts=[dense[0],dense[1]];let acc=0,next=DS;
    for(let j=2;j<dense.length;j+=2){
      const x0=dense[j-2],y0=dense[j-1],x1=dense[j],y1=dense[j+1],l=Math.hypot(x1-x0,y1-y0);
      while(acc+l>=next){const f=(next-acc)/l;pts.push(x0+(x1-x0)*f,y0+(y1-y0)*f);next+=DS;}
      acc+=l;
    }
    const L=acc;const lastx=dense[dense.length-2],lasty=dense[dense.length-1];
    if(L-(next-DS)>.05)pts.push(lastx,lasty);
    const e={id:i,a:ai,b:bi,as:sa,bs:sb,L,pts:new Float32Array(pts),n:pts.length/2,za:a.z,zb:b.z,grade:(b.z-a.z)/L,
      area:o.area||'',route:o.route||'',kind:o.kind||'main',bars:(o.bars||[]).map(s=>({s:s<0?L+s:s,key:o.barKey||''})),wet:o.wet||0,weeds:o.weeds||0};
    // curve speed limit per sample
    const lim=new Float32Array(e.n);
    for(let j=0;j<e.n;j++){
      const i0=Math.max(0,j-3),i1=Math.min(e.n-1,j+3);if(i1-i0<2){lim[j]=999;continue;}
      const im=(i0+i1)>>1;
      const h0=Math.atan2(pts[im*2+1]-pts[i0*2+1],pts[im*2]-pts[i0*2]),h1=Math.atan2(pts[i1*2+1]-pts[im*2+1],pts[i1*2]-pts[im*2]);
      let dh=Math.abs(h1-h0);if(dh>Math.PI)dh=2*Math.PI-dh;
      const R=((i1-i0)*DS/2)/Math.max(dh,1e-4);lim[j]=Math.sqrt(LAT*R);
    }
    // smooth the limit so it reads as a few clear zones
    const lim2=new Float32Array(e.n);for(let j=0;j<e.n;j++){let m=999;for(let k=Math.max(0,j-12);k<=Math.min(e.n-1,j+12);k++)m=Math.min(m,lim[k]);lim2[j]=m;}
    e.lim=lim2;e.minLim=Math.min(...lim2);
    E.push(e);(sa>0?a.p:a.m).push(i);(sb>0?b.p:b.m).push(i);
  });
  G=def;return {N,E};
}
// point on edge
function pt(e,s,out){
  const E_=E[e]||e;s=Math.max(0,Math.min(E_.L,s));let f=s/DS,i=Math.floor(f);if(i>=E_.n-1){i=E_.n-2;}
  const segL=(i===E_.n-2)?(E_.L-i*DS):DS;f=(s-i*DS)/segL;
  const p=E_.pts,x0=p[i*2],y0=p[i*2+1],x1=p[i*2+2],y1=p[i*2+3];
  out=out||{};out.x=x0+(x1-x0)*f;out.y=y0+(y1-y0)*f;out.h=Math.atan2(y1-y0,x1-x0);return out;
}
function limAt(e,s){const E_=E[e];return E_.lim[Math.max(0,Math.min(E_.n-1,Math.round(s/DS)))];}
// which exits leave a node when we arrive on edge e at end 'b' (or 'a')
function exitsFrom(e,atB){
  const E_=E[e],nd=N[atB?E_.b:E_.a],side=atB?E_.bs:E_.as;
  const ex=side>0?nd.m:nd.p,back=side>0?nd.p:nd.m;
  return {nd,ex,back};
}
function enter(ei,nd){const e=E[ei];// start on edge ei at node nd
  if(e.a===nd.id&&(e.b!==nd.id))return {e:ei,s:0,d:1};return {e:ei,s:e.L,d:-1};}
// walk from (e,s) in direction d for dist; returns pieces walked, end state, and why it stopped.
// barriers and dead ends stop it. commit=true trails switches that are set against us.
function walk(e,s,d,dist,commit,stopAtNode){
  const pieces=[];let left=dist,why=null,nodesPassed=[];let guard=0;
  while(left>1e-9&&guard++<200){
    const ed=E[e];let lim=d>0?ed.L:0;
    for(const b of ed.bars){if(b.open)continue;if(d>0?(b.s>=s-1e-6&&b.s<lim):(b.s<=s+1e-6&&b.s>lim))lim=b.s;}
    const room=Math.abs(lim-s);
    if(room>=left){const s2=s+d*left;pieces.push({e,s0:s,s1:s2,d});s=s2;left=0;break;}
    pieces.push({e,s0:s,s1:lim,d});left-=room;s=lim;
    if(lim!==(d>0?ed.L:0)){why='bar';break;}
    const {nd,ex,back}=exitsFrom(e,d>0);
    if(!ex.length){why='end';break;}
    let next;
    if(ex.length===1){next=ex[0];if(back.length===2){const want=back.indexOf(e);if(commit&&nd.sw!==want){nd.sw=want;trailed.push(nd.id);}}}
    else next=ex[nd.sw];
    nodesPassed.push({id:nd.id,at:dist-left,facing:ex.length===2,from:e,to:next});
    if(stopAtNode){why='node';const en=enter(next,nd);e=en.e;s=en.s;d=en.d;break;}
    const en=enter(next,nd);e=en.e;s=en.s;d=en.d;
  }
  return {pieces,e,s,d,moved:dist-left,why,nodes:nodesPassed};
}
const trailed=[];
function sides(nd){return {sw:nd.p.length===2?nd.p:nd.m.length===2?nd.m:null}}
function isSwitch(id){return !!sides(N[id]).sw}
return {DS,N,E,build,pt,limAt,walk,exitsFrom,enter,trailed,isSwitch,sides};
})();
