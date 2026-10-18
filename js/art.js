'use strict';
// Everything drawn: ground, track, scenery (cached in world chunks) and vehicle sprites.
const ART=(()=>{
const CH=256,RES=2,LRU=44;
const AREAS=[
 {id:'depot',x:820,y:3360,r:290,c:'#5d564b'},{id:'brick',x:1230,y:2720,r:290,c:'#8a5a43'},
 {id:'mercy',x:190,y:1640,r:360,c:'#a58d4e'},{id:'glass',x:1190,y:1210,r:270,c:'#a69c80'},
 {id:'larch',x:260,y:760,r:330,c:'#3e4a30'},{id:'quarry',x:1190,y:410,r:300,c:'#8d8a82'},
 {id:'ferrow',x:700,y:260,r:250,c:'#62754a'},{id:'viaduct',x:712,y:1775,r:120,c:null}
];
let R=null; // rng
const items=[];let grid=null,noiseC=null,gravelC=null,grassC=null;const cache=new Map();
let rev=0;
function areaAt(x,y){let best=null,bd=1e9;for(const a of AREAS){const d=Math.hypot(x-a.x,y-a.y);if(d<a.r*.85&&d<bd){bd=d;best=a.id;}}return best;}
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function noiseTex(sz,n,cols,alpha){const c=mkCanvas(sz,sz),g=c.getContext('2d');const r=RNG.make(sz*7+n);
  for(let i=0;i<n;i++){g.globalAlpha=alpha*(.4+r()*.6);g.fillStyle=cols[Math.floor(r()*cols.length)];const s=r()*2.2+.6;g.fillRect(r()*sz,r()*sz,s,s);}return c;}
// ---------- track helpers
function along(a,b,s,off){const ei=SIM.edgeBy(a,b),e=TK.E[ei];const ss=e.a===a?s:e.L-s;const p=TK.pt(ei,ss);const h=e.a===a?p.h:p.h+Math.PI;
  return {x:p.x+Math.cos(h+Math.PI/2)*off,y:p.y+Math.sin(h+Math.PI/2)*off,h};}
function buildGrid(){grid=new Map();for(const e of TK.E){for(let i=0;i<e.n;i+=2){const x=e.pts[i*2],y=e.pts[i*2+1],k=((x/40)|0)+','+((y/40)|0);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(x,y);}}}
function nearTrack(x,y,d){const cx=(x/40)|0,cy=(y/40)|0,r=Math.ceil(d/40);for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++){const a=grid.get((cx+i)+','+(cy+j));if(!a)continue;for(let k=0;k<a.length;k+=2)if(Math.hypot(a[k]-x,a[k+1]-y)<d)return true;}return false;}
function blocked(x,y,pad){for(const it of items){if(it.solid&&x>it.bb[0]-pad&&x<it.bb[2]+pad&&y>it.bb[1]-pad&&y<it.bb[3]+pad)return true;}return false;}
function add(t,o){const it=Object.assign({t},o);if(!it.bb){const r=it.r||Math.max(it.w||10,it.h||10);it.bb=[it.x-r,it.y-r,it.x+r,it.y+r];}items.push(it);return it;}
function rect(t,x,y,w,h,a,o){const c=Math.abs(Math.cos(a||0)),s=Math.abs(Math.sin(a||0)),hw=(w*c+h*s)/2+8,hh=(w*s+h*c)/2+8;return add(t,Object.assign({x,y,w,h,a:a||0,bb:[x-hw,y-hw-0,x+hw,y+hh+12],solid:1},o||{}));}
// place a building beside track: along edge a->b at s, offset off (positive = right of travel), aligned with track
function beside(t,a,b,s,off,w,h,o){const p=along(a,b,s,off);const flat=t==='sign'||t==='board'||t==='grade'||t==='limit';return rect(t,p.x,p.y,w,h,flat?0:p.h,o);}
// ---------- scenery
function buildScenery(){
 items.length=0;R=RNG.make(4071);
 // river and reservoir (Kesh Water), under the viaduct and away east
 add('lake',{x:520,y:1730,pts:[[400,1640],[520,1600],[640,1640],[680,1730],[640,1810],[520,1840],[420,1800],[380,1720]],bb:[370,1590,700,1850]});
 const riv=[[660,1760],[712,1772],[800,1790],[900,1760],[1000,1785],[1120,1810],[1250,1780],[1380,1800],[1520,1790]];
 add('river',{pts:riv,bb:[640,1700,1520,1860]});
 // cuttings on Kesh Bank
 add('cutting',{edge:['J1','K1'],s0:160,s1:560,bb:[700,2480,860,3000]});
 // fields
 const fields=[[1020,2250,220,160,.15,'#8f9a52'],[1260,2300,180,200,-.1,'#b0a05a'],[1100,1980,260,140,.05,'#7b8b48'],[1300,2040,170,150,.2,'#a99452'],
  [300,2250,240,170,-.2,'#9a9f58'],[420,2480,260,180,.1,'#b39d5c'],[160,2700,220,200,.05,'#7f8f4a'],[440,2800,200,160,-.15,'#a89a58'],
  [130,1900,160,140,.3,'#b9a35a'],[300,1450,150,120,-.25,'#c0a75e'],[160,1180,180,130,.1,'#b8a45c'],[1050,880,200,160,.12,'#8d9a54'],[1300,860,170,150,-.1,'#a59755'],
  [380,1250,200,120,.0,'#9a9c58'],[1000,2600,160,130,-.1,'#93975a'],[560,2900,170,190,.1,'#8a9450'],[180,3100,240,200,0,'#a39656'],[1180,3150,200,190,.1,'#9c9a5c']];
 for(const f of fields)add('field',{x:f[0],y:f[1],w:f[2],h:f[3],a:f[4],c:f[5],bb:[f[0]-f[2],f[1]-f[2],f[0]+f[2],f[1]+f[2]]});
 // ---- depot
 beside('goods','DB','J1',90,-38,170,46,{label:'GOODS'});
 beside('dock','DB','J1',90,-16,180,10);
 beside('shed','DB','J1',300,52,120,54,{roads:1});
 beside('tank','DB','J1',200,30,40,14);
 beside('water','DB','J1',255,26,0,0,{r:11});
 beside('sbox','J1','K1',30,-24,26,18,{label:'HALLOW JN'});
 beside('board','DB','J1',DEPOT_BOARD(),-16,0,0,{text:'STOP: ALL WAGONS INSIDE',col:'#d9b23a'});
 beside('sign','DB','J1',20,18,0,0,{text:'HALLOW JUNCTION GOODS'});
 beside('wreck','DB','J1',140,60,30,10,{c:'#6b4a35'});beside('wreck','DB','J1',176,70,28,10,{c:'#5b5f60',rot:.3});
 beside('crates','DB','J1',30,-28,24,14);beside('drums','DB','J1',335,-24,0,0,{r:9});
 // ---- brickfield
 {const k1=along('BF0','BFa',120,82),k2=along('BF0','BFa',215,86),ch=along('BF0','BFa',170,120);add('kiln',{x:k1.x,y:k1.y,r:30,solid:1});add('kiln',{x:k2.x,y:k2.y,r:28,solid:1});add('chimney',{x:ch.x,y:ch.y,r:8,solid:1});}
 beside('drying','BF0','BFa',150,26,170,26);beside('drying','BF0','BFb',190,-30,160,26);
 add('pond',{x:1400,y:2990,r:55,bb:[1320,2920,1480,3060],c:'#6d5a45'});
 beside('pallets','BF0','BFa',240,20,40,20);beside('pallets','BF0','BFb',80,-22,30,18);
 beside('sign','J1','BF0',300,-18,0,0,{text:'BRICKFIELD SIDINGS'});
 // ---- mercy
 add('elevator',{x:40,y:1420,w:46,h:90,a:0,solid:1,bb:[10,1370,70,1470]});
 for(let i=0;i<3;i++)add('silo',{x:142+i*0,y:1300+i*-36,r:15,solid:1});
 add('silo',{x:175,y:1290,r:15,solid:1});add('silo',{x:175,y:1255,r:15,solid:1});
 beside('barn','M0','J2',120,-40,70,36);
 add('cottage',{x:300,y:2060,w:34,h:26,a:.3,solid:1,bb:[275,2035,325,2090]});
 beside('sign','J2','M0',250,16,0,0,{text:'MERCY'});beside('grade','J2','M0',40,14,0,0,{text:'1 IN 24'});
 // ---- viaduct
 beside('sign','J2','V0',200,18,0,0,{text:'KESH VIADUCT'});
 // ---- glassworks
 add('cone',{x:1180,y:1380,r:42,solid:1});add('cone',{x:1290,y:1350,r:34,solid:1});
 beside('works','G0','GB',260,-36,180,44);beside('works','G0','GA',230,30,140,34,{c:'#7d7466'});
 beside('cullet','G0','GA',120,24,0,0,{r:16});beside('crates','G0','GB',120,-22,26,16);
 beside('sign','J3','G0',220,18,0,0,{text:'HARL & SONS'});
 // ---- larch cut
 beside('sawmill','L0','LB',150,-34,90,40);beside('logs','L0','LA',150,22,60,24);beside('logs','L0','LB',230,22,50,22);
 beside('dust','L0','LA',240,-20,0,0,{r:14});beside('sign','J4','L0',200,-18,0,0,{text:'LARCH CUT'});
 // ---- quarry
 add('face',{x:1420,y:380,pts:[[1380,230],[1500,200],[1500,600],[1420,580],[1395,500],[1405,400]],bb:[1370,190,1510,610],solid:1});
 add('heap',{x:1200,y:520,r:30,c:'#9b968c',solid:1});add('heap',{x:1250,y:290,r:26,c:'#b1aca0',solid:1});add('heap',{x:1110,y:470,r:18,c:'#8a857b',solid:1});
 beside('crusher','Q0','QB',200,-34,60,46);beside('sign','J5','Q0',180,18,0,0,{text:'COBBLE HILL'});
 beside('grade','J5','Q0',70,-14,0,0,{text:'1 IN 30'});
 // ---- upper ferrow
 beside('platform','UF0','UFa',180,-16,200,14);beside('station','UF0','UFa',190,-40,90,34,{label:'UPPER FERROW'});
 beside('canopy','UF0','UFa',190,-17,120,16);beside('gshed','UF0','UFb',220,30,70,40);
 add('church',{x:560,y:120,w:70,h:32,a:-.1,solid:1,bb:[515,85,605,160]});
 add('cottage',{x:880,y:300,w:30,h:24,a:.2,solid:1,bb:[860,280,900,320]});add('cottage',{x:900,y:220,w:34,h:24,a:-.1,solid:1,bb:[880,200,925,245]});
 add('cottage',{x:560,y:400,w:30,h:22,a:.4,solid:1,bb:[540,380,580,420]});add('green',{x:840,y:420,r:50,bb:[790,370,890,470]});
 // lanes, with level crossings wherever they meet the line
 const roads=[[[0,2690],[300,2720],[560,2770],[790,2800],[960,2880],[1120,2960],[1250,3010]],[[600,560],[740,600],[860,560],[980,640],[1100,700]],[[0,2010],[160,2040],[300,2070],[420,2140],[520,2300],[560,2600]],[[860,300],[890,380],[860,470],[760,520],[640,470],[560,400]]];
 for(const r of roads){add('road',{pts:r,bb:[Math.min(...r.map(p=>p[0]))-20,Math.min(...r.map(p=>p[1]))-20,Math.max(...r.map(p=>p[0]))+20,Math.max(...r.map(p=>p[1]))+20]});
   for(let i=0;i<r.length-1;i++){const [ax,ay]=r[i],[bx,by]=r[i+1];for(const e of TK.E){for(let j=0;j<e.n-1;j++){const cx=e.pts[j*2],cy=e.pts[j*2+1],dx=e.pts[j*2+2],dy=e.pts[j*2+3];
     const den=(bx-ax)*(dy-cy)-(by-ay)*(dx-cx);if(Math.abs(den)<1e-9)continue;const t=((cx-ax)*(dy-cy)-(cy-ay)*(dx-cx))/den,u=((cx-ax)*(by-ay)-(cy-ay)*(bx-ax))/den;
     if(t>=0&&t<=1&&u>=0&&u<=1){const x=ax+(bx-ax)*t,y=ay+(by-ay)*t;add('xing',{x,y,h:Math.atan2(dy-cy,dx-cx),bb:[x-30,y-30,x+30,y+30]});}}}}}
 beside('sleepers','DB','J1',150,-22,30,12);beside('sleepers','BF0','BFa',60,-18,26,10);beside('pump','DB','J1',230,14,0,0,{r:4});
 // telegraph poles along the main line
 const main=[['DB','J1'],['J1','K1'],['K1','J2'],['J2','V0'],['V1','J3'],['J3','J4'],['J4','J5'],['J5','UF0']];
 const poles=[];for(const [a,b] of main){const e=TK.E[SIM.edgeBy(a,b)];for(let s=30;s<e.L-20;s+=78){const p=along(a,b,s,-26);if(!blocked(p.x,p.y,4))poles.push(p);}}
 add('poles',{pts:poles,bb:[0,0,MAP.W,MAP.H]});
 // mileposts / grade posts on Kesh bank
 beside('grade','J1','K1',20,14,0,0,{text:'1 IN 30'});beside('grade','K1','J2',12,14,0,0,{text:'LEVEL'});
 beside('limit','J1','BF0',10,14,0,0,{text:'15'});beside('limit','J2','M0',10,-14,0,0,{text:'15'});beside('limit','J3','G0',8,14,0,0,{text:'15'});beside('limit','J4','L0',8,-14,0,0,{text:'10'});
 // hedges
 for(let k=0;k<26;k++){const x=R()*MAP.W,y=R()*MAP.H,a=R()*Math.PI,l=80+R()*160;const pts=[];let ok=true;for(let i=0;i<=8;i++){const px=x+Math.cos(a)*l*i/8,py=y+Math.sin(a)*l*i/8+Math.sin(i)*6;if(nearTrack(px,py,26)||blocked(px,py,6)||areaAt(px,py)==='quarry'){ok=false;break;}pts.push([px,py]);}if(ok)add('hedge',{pts,bb:[Math.min(x,x+Math.cos(a)*l)-10,Math.min(y,y+Math.sin(a)*l)-10,Math.max(x,x+Math.cos(a)*l)+10,Math.max(y,y+Math.sin(a)*l)+10]});}
 // trees: dense in larch, scattered elsewhere
 for(let k=0;k<2200;k++){const x=R()*MAP.W,y=R()*MAP.H,ar=areaAt(x,y);let p=ar==='larch'?1:ar==='depot'||ar==='quarry'||ar==='glass'?.04:ar==='mercy'?.08:ar==='brick'?.12:.5;
   if(R()>p)continue;const r=ar==='larch'?10+R()*9:7+R()*10;if(nearTrack(x,y,r+16)||blocked(x,y,r+2)||inLake(x,y,r)||onRoad(x,y,r+8))continue;
   add('tree',{x,y,r,k:ar==='larch'?1:0,c:R(),bb:[x-r-8,y-r-8,x+r+12,y+r+12]});}
 // sheep, because there are always sheep
 for(let k=0;k<40;k++){const f=fields[(k*5)%fields.length];add('sheep',{x:f[0]+(R()-.5)*f[2]*.7,y:f[1]+(R()-.5)*f[3]*.7,a:R()*6.28,bb:[f[0]-f[2],f[1]-f[2],f[0]+f[2],f[1]+f[2]]});}
 // log notes markers
 for(const n of DATA.NOTES)add('note',{x:n.x,y:n.y,r:6,id:n.id});
 items.sort((a,b)=>(ORDER[a.t]||5)-(ORDER[b.t]||5));
}
function DEPOT_BOARD(){return SIM.DEPOT_ZONE+6;}
const ORDER={road:1.5,xing:3.5,field:0,lake:1,river:1,pond:1,green:1,cutting:1,hedge:2,dock:3,platform:3,sheep:3,note:9,tree:8,poles:7,chimney:7.5};
function onRoad(x,y,r){for(const it of items){if(it.t!=='road')continue;for(let i=0;i<it.pts.length-1;i++){const [ax,ay]=it.pts[i],[bx,by]=it.pts[i+1];const L2=(bx-ax)**2+(by-ay)**2;let t=((x-ax)*(bx-ax)+(y-ay)*(by-ay))/L2;t=Math.max(0,Math.min(1,t));if(Math.hypot(x-ax-(bx-ax)*t,y-ay-(by-ay)*t)<r+9)return true;}}return false;}
function inLake(x,y,r){return x>370-r&&x<700+r&&y>1590-r&&y<1850+r||(y>1730-r&&y<1840+r&&x>640);}
// ---------- drawing primitives
function poly(g,pts){g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();}
function smooth(g,pts,closed){g.beginPath();const n=pts.length;g.moveTo((pts[0][0]+pts[1][0])/2,(pts[0][1]+pts[1][1])/2);
  for(let i=1;i<(closed?n+1:n-1);i++){const p=pts[i%n],q=pts[(i+1)%n];g.quadraticCurveTo(p[0],p[1],(p[0]+q[0])/2,(p[1]+q[1])/2);}if(closed)g.closePath();}
function roofRect(g,w,h,base,ridge){ // corrugated roof centered at 0,0
  g.fillStyle='rgba(0,0,0,.28)';g.fillRect(-w/2+3,-h/2+4,w,h);
  g.fillStyle=base;g.fillRect(-w/2,-h/2,w,h);
  g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=.6;for(let x=-w/2+2;x<w/2;x+=2.4){g.beginPath();g.moveTo(x,-h/2);g.lineTo(x,h/2);g.stroke();}
  if(ridge){g.fillStyle='rgba(255,255,255,.12)';g.fillRect(-w/2,-h/2,w,h/2);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(-w/2,-.6,w,1.2);}
}
function rust(g,w,h,n,seed){const r=RNG.make(seed);for(let i=0;i<n;i++){g.fillStyle=`rgba(${120+r()*40|0},${60+r()*20|0},30,${.25+r()*.35})`;const s=2+r()*7;g.beginPath();g.ellipse(-w/2+r()*w,-h/2+r()*h,s,s*.6,r()*3,0,7);g.fill();}}
function txt(g,t,x,y,sz,col,font){g.font=`bold ${sz}px ${font||"'Arial Narrow','Roboto Condensed',Arial,sans-serif"}`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=col;g.fillText(t,x,y);}
function drawItem(g,it){
 const t=it.t;
 if(t==='field'){g.save();g.translate(it.x,it.y);g.rotate(it.a);g.fillStyle=it.c;g.fillRect(-it.w/2,-it.h/2,it.w,it.h);g.strokeStyle='rgba(60,50,20,.18)';g.lineWidth=1.4;for(let y=-it.h/2+3;y<it.h/2;y+=5){g.beginPath();g.moveTo(-it.w/2,y);g.lineTo(it.w/2,y);g.stroke();}
   g.strokeStyle='rgba(50,60,30,.5)';g.lineWidth=3;g.strokeRect(-it.w/2,-it.h/2,it.w,it.h);g.restore();return;}
 if(t==='road'){g.lineCap='round';g.lineJoin='round';g.strokeStyle='rgba(40,30,20,.35)';g.lineWidth=20;smooth(g,it.pts);g.stroke();g.strokeStyle='#8a7a5c';g.lineWidth=17;smooth(g,it.pts);g.stroke();
   g.strokeStyle='#9d8c6a';g.lineWidth=5;g.setLineDash([]);for(const k of [-4,4]){g.save();g.translate(k*.3,k*.3);smooth(g,it.pts);g.stroke();g.restore();}g.strokeStyle='#6f7a44';g.lineWidth=2.2;smooth(g,it.pts);g.stroke();return;}
 if(t==='xing'){g.save();g.translate(it.x,it.y);g.rotate(it.h);g.fillStyle='#6b5a44';g.fillRect(-9,-6,18,12);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=.5;for(let x=-9;x<9;x+=2.2){g.beginPath();g.moveTo(x,-6);g.lineTo(x,6);g.stroke();}
   g.strokeStyle='#2d2a26';g.lineWidth=1.6;for(const k of [-2.6,2.6]){g.beginPath();g.moveTo(-10,k);g.lineTo(10,k);g.stroke();}g.strokeStyle='#b8b2a4';g.lineWidth=.7;for(const k of [-2.6,2.6]){g.beginPath();g.moveTo(-10,k);g.lineTo(10,k);g.stroke();}
   for(const sd of [-1,1]){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(sd*13+1,-12+2,2.5,24);g.fillStyle='#e8e2d0';g.fillRect(sd*13,-12,2.5,24);g.fillStyle='#b03a2a';for(let y=-12;y<12;y+=6)g.fillRect(sd*13,y,2.5,3);}
   g.restore();return;}
 if(t==='sleepers'){g.save();g.translate(it.x,it.y);g.rotate(it.a||0);for(let i=0;i<5;i++){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(-it.w/2+2,-it.h/2+i*2.4+2,it.w,2.2);g.fillStyle=SLEEP[i%SLEEP.length];g.fillRect(-it.w/2+(i%2)*2,-it.h/2+i*2.4,it.w,2.2);}g.restore();return;}
 if(t==='pump'){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(it.x-1,it.y-1,7,7);g.fillStyle='#8a2a22';g.fillRect(it.x-3,it.y-3,6,6);g.fillStyle='#222';g.fillRect(it.x-1,it.y-1,2,2);g.strokeStyle='#111';g.lineWidth=.8;g.beginPath();g.moveTo(it.x+3,it.y);g.quadraticCurveTo(it.x+9,it.y+4,it.x+4,it.y+9);g.stroke();return;}
 if(t==='lake'){g.fillStyle='#4f5d4e';smooth(g,it.pts.map(p=>[p[0]*1.03-15,p[1]*1.03-50]),1);g.fill();g.fillStyle='#3d5560';smooth(g,it.pts,1);g.fill();g.fillStyle='#4a6672';smooth(g,it.pts.map(p=>[(p[0]-520)*.75+520,(p[1]-1720)*.7+1720]),1);g.fill();
   g.strokeStyle='rgba(200,220,220,.15)';g.lineWidth=1;for(let i=0;i<14;i++){const x=440+(i*37)%200,y=1650+(i*53)%160;g.beginPath();g.moveTo(x,y);g.lineTo(x+14,y);g.stroke();}return;}
 if(t==='river'){g.lineCap='round';g.lineJoin='round';g.strokeStyle='#5a5a42';g.lineWidth=58;smooth(g,it.pts);g.stroke();g.strokeStyle='#3d5560';g.lineWidth=46;smooth(g,it.pts);g.stroke();g.strokeStyle='#4a6672';g.lineWidth=22;smooth(g,it.pts);g.stroke();
   g.strokeStyle='rgba(220,230,230,.13)';g.lineWidth=1;for(let i=0;i<it.pts.length-1;i++){const p=it.pts[i];for(let k=0;k<3;k++){g.beginPath();g.moveTo(p[0]+k*30,p[1]-8+k*7);g.lineTo(p[0]+k*30+16,p[1]-8+k*7);g.stroke();}}return;}
 if(t==='pond'){g.fillStyle=it.c;g.beginPath();g.ellipse(it.x,it.y,it.r*1.2,it.r*.9,.3,0,7);g.fill();g.fillStyle='#55605a';g.beginPath();g.ellipse(it.x,it.y,it.r*1.0,it.r*.72,.3,0,7);g.fill();return;}
 if(t==='green'){g.fillStyle='#6f8a4c';g.beginPath();g.ellipse(it.x,it.y,it.r*1.3,it.r,0,0,7);g.fill();g.strokeStyle='#8a7f63';g.lineWidth=5;g.stroke();return;}
 if(t==='cutting'){const ei=SIM.edgeBy(it.edge[0],it.edge[1]);for(const side of [-1,1]){g.lineCap='round';for(const [w,c] of [[60,'#4a4232'],[44,'#5b5140'],[30,'#3f3a2e']]){g.strokeStyle=c;g.lineWidth=w*.5;g.beginPath();for(let s=it.s0;s<=it.s1;s+=8){const p=along(it.edge[0],it.edge[1],s,side*(14+w*.25));s===it.s0?g.moveTo(p.x,p.y):g.lineTo(p.x,p.y);}g.stroke();}}return;}
 if(t==='hedge'){g.lineCap='round';g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=11;g.beginPath();it.pts.forEach((p,i)=>i?g.lineTo(p[0]+3,p[1]+4):g.moveTo(p[0]+3,p[1]+4));g.stroke();g.strokeStyle='#3c4a2a';g.lineWidth=10;g.beginPath();it.pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();
   g.fillStyle='#4f5f36';for(const p of it.pts){g.beginPath();g.arc(p[0]-1,p[1]-1,4,0,7);g.fill();}return;}
 if(t==='tree'){const r=it.r;g.fillStyle='rgba(20,25,15,.3)';g.beginPath();g.ellipse(it.x+r*.3+2,it.y+r*.35+3,r*.85,r*.75,0,0,7);g.fill();
   if(it.k){ // larch / conifer: star of needles
     g.fillStyle=it.c>.5?'#2d3b24':'#34442a';g.beginPath();for(let i=0;i<14;i++){const a=i/14*6.283,rr=i%2?r*.55:r;g.lineTo(it.x+Math.cos(a)*rr,it.y+Math.sin(a)*rr);}g.fill();
     g.fillStyle='#4d5e36';g.beginPath();for(let i=0;i<10;i++){const a=i/10*6.283+.3,rr=i%2?r*.3:r*.62;g.lineTo(it.x-1+Math.cos(a)*rr,it.y-1+Math.sin(a)*rr);}g.fill();
     g.fillStyle='#8a6b3a';g.beginPath();g.arc(it.x-1,it.y-1,1.2,0,7);g.fill();
   }else{const cols=it.c>.66?['#3d4f2c','#526b39','#6b8446']:it.c>.33?['#46562f','#5d7238','#788c4a']:['#4c4a2b','#6a6634','#8a8442'];
     for(let i=0;i<3;i++){g.fillStyle=cols[i];const rr=r*(1-i*.25);g.beginPath();for(let k=0;k<9;k++){const a=k/9*6.283,q=rr*(.85+.15*Math.sin(k*2.3+it.c*9));g.lineTo(it.x-i*1.5+Math.cos(a)*q,it.y-i*1.8+Math.sin(a)*q);}g.fill();}}return;}
 if(t==='sheep'){g.save();g.translate(it.x,it.y);g.rotate(it.a);g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(1,1.5,3.2,2.2,0,0,7);g.fill();g.fillStyle='#ddd6c4';g.beginPath();g.ellipse(0,0,3.2,2.2,0,0,7);g.fill();g.fillStyle='#2a2622';g.beginPath();g.arc(3.2,0,1.1,0,7);g.fill();g.restore();return;}
 if(t==='poles'){g.strokeStyle='rgba(20,20,20,.35)';g.lineWidth=.5;for(let k=-1;k<=1;k+=2){g.beginPath();it.pts.forEach((p,i)=>{const x=p.x+Math.cos(p.h+1.57)*k*2.5,y=p.y+Math.sin(p.h+1.57)*k*2.5;i&&Math.hypot(p.x-it.pts[i-1].x,p.y-it.pts[i-1].y)<120?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();}
   for(const p of it.pts){g.fillStyle='rgba(0,0,0,.3)';g.save();g.translate(p.x,p.y);g.rotate(p.h);g.fillRect(2,3,14,1.4);g.fillStyle='#5b4632';g.fillRect(-.5,-4,1.6,8);g.fillStyle='#3a2c20';g.beginPath();g.arc(.3,0,1.6,0,7);g.fill();g.restore();}return;}
 if(t==='note'){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(it.x-3,it.y-2,9,7);g.fillStyle='#d8cfb2';g.fillRect(it.x-4,it.y-4,8,6);g.fillStyle='#8a7f63';g.fillRect(it.x-3,it.y-2.6,6,.6);g.fillRect(it.x-3,it.y-1.2,5,.6);return;}
 if(t==='face'){g.fillStyle='#6f6a62';poly(g,it.pts);g.fill();g.save();g.clip();g.strokeStyle='rgba(40,38,34,.5)';g.lineWidth=3;for(let i=0;i<8;i++){g.beginPath();g.moveTo(1380+i*14,200);g.lineTo(1395+i*14,610);g.stroke();}
   g.fillStyle='rgba(255,255,255,.08)';for(let i=0;i<5;i++)g.fillRect(1400,240+i*80,120,20);g.restore();g.strokeStyle='#4f4b45';g.lineWidth=4;poly(g,it.pts);g.stroke();return;}
 if(t==='heap'){const r=it.r;g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(it.x+5,it.y+6,r,r*.85,0,0,7);g.fill();const gr=g.createRadialGradient(it.x-r*.3,it.y-r*.3,1,it.x,it.y,r);gr.addColorStop(0,'#d9d4c8');gr.addColorStop(1,it.c);g.fillStyle=gr;g.beginPath();g.ellipse(it.x,it.y,r,r*.85,0,0,7);g.fill();
   g.fillStyle='rgba(0,0,0,.15)';const rr=RNG.make(it.x|0);for(let i=0;i<40;i++){g.fillRect(it.x+(rr()-.5)*r*1.6,it.y+(rr()-.5)*r*1.3,1.3,1.3);}return;}
 if(t==='kiln'){const r=it.r;g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.arc(it.x+6,it.y+8,r,0,7);g.fill();const gr=g.createRadialGradient(it.x-r*.3,it.y-r*.3,2,it.x,it.y,r);gr.addColorStop(0,'#b5694a');gr.addColorStop(1,'#6e3a2a');g.fillStyle=gr;g.beginPath();g.arc(it.x,it.y,r,0,7);g.fill();
   g.strokeStyle='rgba(40,20,10,.35)';g.lineWidth=1;for(let k=1;k<5;k++){g.beginPath();g.arc(it.x,it.y,r*k/5,0,7);g.stroke();}g.fillStyle='#1d1612';g.beginPath();g.arc(it.x,it.y,r*.25,0,7);g.fill();g.strokeStyle='#3a2a20';g.lineWidth=1.5;g.beginPath();g.arc(it.x,it.y,r*.25,0,7);g.stroke();return;}
 if(t==='chimney'){g.fillStyle='rgba(0,0,0,.25)';g.save();g.translate(it.x,it.y);g.rotate(.9);g.fillRect(0,-5,70,10);g.restore();g.fillStyle='#7a3f2c';g.fillRect(it.x-7,it.y-7,14,14);g.fillStyle='#1d1612';g.fillRect(it.x-4,it.y-4,8,8);g.strokeStyle='#4a2a1e';g.lineWidth=1.5;g.strokeRect(it.x-7,it.y-7,14,14);return;}
 if(t==='silo'||t==='water'){const r=it.r;g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.arc(it.x+5,it.y+7,r,0,7);g.fill();const gr=g.createRadialGradient(it.x-r*.4,it.y-r*.4,1,it.x,it.y,r);gr.addColorStop(0,t==='silo'?'#d2cbb8':'#8c8f8a');gr.addColorStop(1,t==='silo'?'#8a8474':'#4c4f4c');g.fillStyle=gr;g.beginPath();g.arc(it.x,it.y,r,0,7);g.fill();
   g.strokeStyle='rgba(0,0,0,.2)';g.lineWidth=.7;for(let a=0;a<6.28;a+=.52){g.beginPath();g.moveTo(it.x,it.y);g.lineTo(it.x+Math.cos(a)*r,it.y+Math.sin(a)*r);g.stroke();}g.fillStyle='#5a564c';g.beginPath();g.arc(it.x,it.y,2.5,0,7);g.fill();if(t==='silo')rustCirc(g,it);return;}
 if(t==='cone'){const r=it.r;g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.arc(it.x+8,it.y+10,r,0,7);g.fill();const gr=g.createRadialGradient(it.x-r*.35,it.y-r*.35,2,it.x,it.y,r);gr.addColorStop(0,'#a8705a');gr.addColorStop(1,'#5a3428');g.fillStyle=gr;g.beginPath();g.arc(it.x,it.y,r,0,7);g.fill();
   g.strokeStyle='rgba(30,15,10,.3)';g.lineWidth=1;for(let a=0;a<6.28;a+=.3){g.beginPath();g.moveTo(it.x+Math.cos(a)*r*.2,it.y+Math.sin(a)*r*.2);g.lineTo(it.x+Math.cos(a)*r,it.y+Math.sin(a)*r);g.stroke();}
   g.fillStyle='#231a16';g.beginPath();g.arc(it.x,it.y,r*.2,0,7);g.fill();g.fillStyle='rgba(120,160,200,.35)';g.beginPath();g.arc(it.x,it.y,r*.12,0,7);g.fill();return;}
 if(t==='crates'){g.save();g.translate(it.x,it.y);g.rotate(it.a||0);const r=RNG.make(it.x|0);for(let i=0;i<5;i++){const x=(r()-.5)*it.w,y=(r()-.5)*it.h,s=5+r()*3;g.fillStyle='rgba(0,0,0,.3)';g.fillRect(x+1.5,y+2,s,s);g.fillStyle=['#8a6a42','#9b7a4d','#76593a'][i%3];g.fillRect(x,y,s,s);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=.5;g.strokeRect(x,y,s,s);g.beginPath();g.moveTo(x,y);g.lineTo(x+s,y+s);g.stroke();}g.restore();return;}
 if(t==='pallets'){g.save();g.translate(it.x,it.y);g.rotate(it.a||0);for(let i=0;i<3;i++)for(let j=0;j<2;j++){const x=-it.w/2+i*it.w/3,y=-it.h/2+j*it.h/2;g.fillStyle='rgba(0,0,0,.3)';g.fillRect(x+2,y+2,it.w/3-2,it.h/2-2);g.fillStyle='#9a4f37';g.fillRect(x,y,it.w/3-2,it.h/2-2);g.strokeStyle='rgba(60,25,15,.5)';g.lineWidth=.5;for(let k=1;k<4;k++){g.beginPath();g.moveTo(x,y+k*(it.h/2-2)/4);g.lineTo(x+it.w/3-2,y+k*(it.h/2-2)/4);g.stroke();}}g.restore();return;}
 if(t==='drums'||t==='cullet'||t==='dust'){const r=RNG.make(it.x|0);const n=t==='drums'?6:30;for(let i=0;i<n;i++){const x=it.x+(r()-.5)*it.r*2,y=it.y+(r()-.5)*it.r*1.6;
   if(t==='drums'){g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.arc(x+1.5,y+2,3,0,7);g.fill();g.fillStyle=['#6b3a2a','#3f5a4a','#5b5a52'][i%3];g.beginPath();g.arc(x,y,3,0,7);g.fill();g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=.5;g.stroke();}
   else if(t==='cullet'){g.fillStyle=['#3b5f8a','#4f8a5a','#c9c2a0','#8a5a3a','#6aa0b0'][i%5];g.fillRect(x,y,2.5,1.8);}else{g.fillStyle=i%2?'#c9a874':'#b89060';g.beginPath();g.arc(x,y,it.r*.5*r(),0,7);g.fill();}}return;}
 if(t==='church'){g.save();g.translate(it.x,it.y);g.rotate(it.a);g.fillStyle='rgba(0,0,0,.3)';g.fillRect(-it.w/2+5,-it.h/2+6,it.w,it.h);g.fillRect(-8+5,-it.h/2-14+6,24,it.h+28);
   roofRect(g,it.w,it.h,'#5a5d63',1);g.fillStyle='#5a5d63';g.fillRect(-8,-it.h/2-14,22,it.h+28);g.fillStyle='rgba(255,255,255,.1)';g.fillRect(-8,-it.h/2-14,11,it.h+28);g.fillStyle='#6e6a5e';g.fillRect(it.w/2-6,-8,16,16);g.fillStyle='#3a3a3e';g.beginPath();g.moveTo(it.w/2+2,-8);g.lineTo(it.w/2+10,0);g.lineTo(it.w/2+2,8);g.lineTo(it.w/2-6,0);g.fill();g.restore();return;}
 if(t==='board'||t==='sign'||t==='grade'||t==='limit'){g.save();g.translate(it.x,it.y);
   if(t==='limit'){g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.arc(1.5,2,6,0,7);g.fill();g.fillStyle='#e8e2cf';g.beginPath();g.arc(0,0,6,0,7);g.fill();g.strokeStyle='#8a3a2a';g.lineWidth=1.4;g.stroke();txt(g,it.text,0,.3,6.5,'#2a2420');g.restore();return;}
   const sz=t==='sign'?7:t==='grade'?5:5.5;g.font=`bold ${sz}px 'Arial Narrow','Roboto Condensed',Arial,sans-serif`;const w=g.measureText(it.text).width+6,h=sz+4;
   g.rotate(it.a||0);
   g.fillStyle='rgba(0,0,0,.35)';g.fillRect(-w/2+2,-h/2+3,w,h);g.fillStyle=t==='board'?it.col:t==='grade'?'#e1dbc7':'#1f2a22';g.fillRect(-w/2,-h/2,w,h);
   g.strokeStyle=t==='sign'?'#d6ccb0':'#2a2420';g.lineWidth=.7;g.strokeRect(-w/2+.8,-h/2+.8,w-1.6,h-1.6);txt(g,it.text,0,.4,sz,t==='sign'?'#e6dcc0':'#1e1a16');g.restore();return;}
 // rectangular buildings and structures
 g.save();g.translate(it.x,it.y);g.rotate(it.a||0);const w=it.w,h=it.h,seed=(it.x*7+it.y)|0;
 if(t==='goods'||t==='works'||t==='drying'||t==='sawmill'||t==='gshed'||t==='barn'||t==='crusher'){
   const base={goods:'#6b625a',works:it.c||'#7a5444',drying:'#6a645c',sawmill:'#5d5248',gshed:'#6e5a4a',barn:'#7a4a3a',crusher:'#5f6266'}[t];
   roofRect(g,w,h,base,1);rust(g,w,h,t==='drying'?8:5,seed);
   if(t==='drying'){g.fillStyle='rgba(20,15,10,.25)';for(let x=-w/2+10;x<w/2;x+=20)g.fillRect(x,-h/2,2,h);}
   if(t==='crusher'){g.fillStyle='#3d3f42';g.fillRect(-w/2-6,-6,14,12);g.fillStyle='#8f8c84';g.beginPath();g.moveTo(-w/2-6,-6);g.lineTo(-w/2-30,-2);g.lineTo(-w/2-30,2);g.lineTo(-w/2-6,6);g.fill();}
   if(it.label){g.save();g.rotate(0);txt(g,it.label,0,0,Math.min(h*.45,11),'rgba(230,220,200,.55)');g.restore();}
 }else if(t==='shed'){roofRect(g,w,h,'#4f4a46',1);rust(g,w,h,7,seed);g.fillStyle='rgba(0,0,0,.4)';g.fillRect(-w/2-24,-h/4-3,26,6);g.fillRect(-w/2-24,h/4-3,26,6);
   g.strokeStyle='#8a8478';g.lineWidth=.8;for(const yy of [-h/4,h/4])for(const k of [-2.5,2.5]){g.beginPath();g.moveTo(-w/2-40,yy+k);g.lineTo(-w/2,yy+k);g.stroke();}
   g.fillStyle='rgba(0,0,0,.2)';for(let x=-w/2+12;x<w/2;x+=24){g.fillRect(x,-h/2+4,10,4);g.fillRect(x,h/2-8,10,4);}
   txt(g,'ENGINE SHED',0,0,9,'rgba(230,220,200,.45)');
 }else if(t==='dock'||t==='platform'){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(-w/2+2,-h/2+3,w,h);g.fillStyle=t==='dock'?'#8b8478':'#9d978a';g.fillRect(-w/2,-h/2,w,h);g.fillStyle='#d9c65a';g.fillRect(-w/2,h/2-1.6,w,1.2);
   g.strokeStyle='rgba(0,0,0,.15)';g.lineWidth=.5;for(let x=-w/2;x<w/2;x+=8){g.beginPath();g.moveTo(x,-h/2);g.lineTo(x,h/2);g.stroke();}
 }else if(t==='canopy'){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(-w/2+3,-h/2+4,w,h);roofRect(g,w,h,'#3f5a4e',1);g.fillStyle='#c9b98f';g.fillRect(-w/2,h/2-1.2,w,1.2);
 }else if(t==='station'||t==='sbox'){roofRect(g,w,h,t==='sbox'?'#6c3a2e':'#5a4a44',1);g.fillStyle='rgba(0,0,0,.15)';for(let y=-h/2+2;y<h/2;y+=2.4)g.fillRect(-w/2,y,w,.7);
   if(t==='sbox'){g.fillStyle='#d8c88a';g.fillRect(-w/2+3,h/2-3,w-6,2);g.fillStyle='#2b2a28';g.fillRect(w/2-4,-h/2+3,2,2);}
   if(it.label)txt(g,it.label,0,0,t==='sbox'?4.5:8,'rgba(240,230,210,.6)');
   if(t==='sbox'){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(-w/2-6,-h/2-4,4,8);g.fillStyle='#c0b090';g.fillRect(-w/2-7,-h/2-5,4,8);}
 }else if(t==='tank'){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(-w/2+3,-h/2+5,w,h);const gr=g.createLinearGradient(0,-h/2,0,h/2);gr.addColorStop(0,'#53604f');gr.addColorStop(.4,'#7d8a76');gr.addColorStop(1,'#3a4237');g.fillStyle=gr;g.beginPath();g.roundRect(-w/2,-h/2,w,h,h/2);g.fill();rust(g,w,h,4,seed);txt(g,'DIESEL',0,0,5,'rgba(230,230,210,.6)');
 }else if(t==='elevator'){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(-w/2+10,-h/2+14,w,h);g.fillStyle='#a49a82';g.fillRect(-w/2,-h/2,w,h);g.fillStyle='#8c8270';g.fillRect(-w/2,-h/2,w/2,h);
   g.fillStyle='#7a6f5c';g.fillRect(-w/4,-h/2-14,w/2,22);g.fillStyle='rgba(0,0,0,.2)';for(let y=-h/2+6;y<h/2;y+=10)g.fillRect(-w/2,y,w,1);txt(g,'MERCY',0,10,9,'rgba(60,40,20,.55)');rust(g,w,h,5,seed);
 }else if(t==='cottage'){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(-w/2+4,-h/2+5,w,h);g.fillStyle='#8a4a34';g.fillRect(-w/2,-h/2,w,h);g.fillStyle='#a35a40';g.fillRect(-w/2,-h/2,w,h/2);g.fillStyle='rgba(0,0,0,.2)';for(let y=-h/2+2;y<h/2;y+=2.2)g.fillRect(-w/2,y,w,.5);g.fillStyle='#5a504a';g.fillRect(w/4,-h/2-2,4,5);
 }else if(t==='logs'){for(let i=0;i<3;i++){const y=-h/2+i*h/3+h/6;g.fillStyle='rgba(0,0,0,.3)';g.fillRect(-w/2+2,y-h/6+2,w,h/3);g.fillStyle=['#6b4a2e','#7a5634','#5e4128'][i];g.fillRect(-w/2,y-h/6,w,h/3-1);
   g.fillStyle='#c8a46a';g.beginPath();g.arc(w/2,y,h/6-.5,0,7);g.fill();g.strokeStyle='#8a6a40';g.lineWidth=.5;g.beginPath();g.arc(w/2,y,h/12,0,7);g.stroke();}
 }else if(t==='wreck'){g.rotate(it.rot||0);g.fillStyle='rgba(0,0,0,.3)';g.fillRect(-w/2+3,-h/2+4,w,h);g.fillStyle=it.c;g.fillRect(-w/2,-h/2,w,h);rust(g,w,h,6,seed);g.fillStyle='rgba(60,80,40,.6)';g.fillRect(-w/2,-h/2,w*.3,h);g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=.6;for(let x=-w/2+4;x<w/2;x+=4){g.beginPath();g.moveTo(x,-h/2);g.lineTo(x,h/2);g.stroke();}}
 g.restore();
}
function rustCirc(g,it){const r=RNG.make(it.x|0);for(let i=0;i<3;i++){g.fillStyle='rgba(130,70,30,.3)';g.beginPath();g.arc(it.x+(r()-.5)*it.r,it.y+(r()-.5)*it.r,2+r()*3,0,7);g.fill();}}
// ---------- track drawing into a chunk
function drawTrack(g,bb){
  const inb=(x,y,m)=>x>bb[0]-m&&x<bb[2]+m&&y>bb[1]-m&&y<bb[3]+m;
  // ballast
  for(const pass of [0,1]){for(const e of TK.E){if(!e.bb||e.bb[2]<bb[0]-20||e.bb[0]>bb[2]+20||e.bb[3]<bb[1]-20||e.bb[1]>bb[3]+20)continue;
    if(e.kind==='bridge'&&pass===0){bridge(g,e);continue;}
    g.lineCap='round';g.lineJoin='round';g.strokeStyle=pass?gravelPat(g):(e.kind==='siding'||e.kind==='loop'?'#5e574a':'#625a4c');g.lineWidth=pass?12:17;g.globalAlpha=pass?.9:1;
    g.beginPath();for(let i=0;i<e.n;i++){const x=e.pts[i*2],y=e.pts[i*2+1];i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();g.globalAlpha=1;}}
  const r=RNG.make(91);
  for(const e of TK.E){if(!e.bb||e.bb[2]<bb[0]-20||e.bb[0]>bb[2]+20||e.bb[3]<bb[1]-20||e.bb[1]>bb[3]+20)continue;
    const gap=brokenGap(e);
    // sleepers
    for(let i=1;i<e.n-1;i+=2){const x=e.pts[i*2],y=e.pts[i*2+1];const rv=r();if(!inb(x,y,10))continue;if(gap&&i*2>gap[0]&&i*2<gap[1])continue;
      if(e.kind==='siding'&&rv<.06)continue;
      const h=Math.atan2(e.pts[i*2+3]-e.pts[i*2-1],e.pts[i*2+2]-e.pts[i*2-2]);g.save();g.translate(x,y);g.rotate(h+(rv-.5)*.12);
      g.fillStyle='rgba(0,0,0,.25)';g.fillRect(-1,-5.4,2.4,11.6);g.fillStyle=SLEEP[(rv*SLEEP.length)|0];g.fillRect(-1.3,-5.8,2.4,11.6);g.restore();}
    // weeds
    if(e.weeds){for(let i=0;i<e.n;i+=1){if(r()>e.weeds*.5)continue;const x=e.pts[i*2]+(r()-.5)*14,y=e.pts[i*2+1]+(r()-.5)*14;if(!inb(x,y,6))continue;g.fillStyle=r()<.5?'#5d6e34':'#77843f';g.beginPath();g.arc(x,y,1+r()*2.2,0,7);g.fill();}}
    // rails
    const rustC=e.kind==='siding'||e.kind==='loop'?'#7b5a42':'#9b958a';
    for(const k of [-2.6,2.6]){g.lineCap='butt';
      for(const [w,c] of [[1.8,'#2d2a26'],[.8,rustC]]){g.strokeStyle=c;g.lineWidth=w;g.beginPath();let pen=false;
        for(let i=0;i<e.n;i++){if(gap&&i*2>gap[0]&&i*2<gap[1]){pen=false;continue;}const i0=Math.max(0,i-1),i1=Math.min(e.n-1,i+1);const h=Math.atan2(e.pts[i1*2+1]-e.pts[i0*2+1],e.pts[i1*2]-e.pts[i0*2]);
          const x=e.pts[i*2]+Math.cos(h+1.5708)*k,y=e.pts[i*2+1]+Math.sin(h+1.5708)*k;if(!pen){g.moveTo(x,y);pen=true;}else g.lineTo(x,y);}g.stroke();}}
  }
  // buffer stops and barriers
  for(const id in TK.N){const n=TK.N[id];if(n.p.length+n.m.length!==1)continue;if(!inb(n.x,n.y,20))continue;const ei=(n.p[0]??n.m[0]),e=TK.E[ei];const p=TK.pt(ei,e.a===id?0:e.L);const h=e.a===id?p.h:p.h+Math.PI;
    g.save();g.translate(n.x,n.y);g.rotate(h);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(-6,-6,6,14);g.fillStyle='#5a4030';g.fillRect(-8,-7,5,14);g.fillStyle='#b03a2a';g.fillRect(-4,-6.5,3,13);g.fillStyle='#e8e0cc';g.fillRect(-4,-2,3,4);g.restore();}
}
const SLEEP=['#4a3a2c','#53412f','#43352a','#5a4834','#3e3128','#4f4232'];
let _gp=null;function gravelPat(g){if(!_gp)_gp=g.createPattern(gravelC,'repeat');return _gp;}
function brokenGap(e){if(e.kind!=='bridge')return null;const b=e.bars[0];if(!b||b.open)return null;return [ (b.s+40)/TK.DS*2, (b.s+120)/TK.DS*2 ];}
function bridge(g,e){ // stone viaduct deck with parapets
  const gap=brokenGap(e);
  for(const [w,c] of [[34,'rgba(0,0,0,.35)'],[30,'#6e675c'],[24,'#857d70'],[16,'#625a4c']]){g.strokeStyle=c;g.lineWidth=w;g.lineCap='butt';g.beginPath();let pen=false;
    for(let i=0;i<e.n;i++){if(gap&&i*2>gap[0]&&i*2<gap[1]){pen=false;continue;}const x=e.pts[i*2]+(w===34?5:0),y=e.pts[i*2+1]+(w===34?6:0);if(!pen){g.moveTo(x,y);pen=true;}else g.lineTo(x,y);}g.stroke();}
  // piers
  for(let s=30;s<e.L;s+=50){const p=TK.pt(e.id,s);if(gap&&s/TK.DS*2>gap[0]-20&&s/TK.DS*2<gap[1]+20)continue;g.fillStyle='#5d564c';g.fillRect(p.x-19,p.y-3,38,6);}
  if(gap){const a=TK.pt(e.id,gap[0]*TK.DS/2),b=TK.pt(e.id,gap[1]*TK.DS/2);g.fillStyle='#6e675c';for(const q of [a,b]){g.beginPath();g.moveTo(q.x-15,q.y);for(let k=0;k<6;k++)g.lineTo(q.x-15+k*6,q.y+(k%2?5:-3)*(q===a?1:-1));g.lineTo(q.x+15,q.y);g.fill();}}
}
// ---------- chunks
function chunk(cx,cy){const k=cx+','+cy;let c=cache.get(k);if(c){cache.delete(k);cache.set(k,c);return c;}
  c=mkCanvas(CH*RES,CH*RES);const g=c.getContext('2d');g.scale(RES,RES);g.translate(-cx*CH,-cy*CH);const bb=[cx*CH,cy*CH,cx*CH+CH,cy*CH+CH];
  g.fillStyle='#66733f';g.fillRect(bb[0],bb[1],CH,CH);
  g.fillStyle=g.createPattern(grassC,'repeat');g.fillRect(bb[0],bb[1],CH,CH);
  for(const a of AREAS){if(!a.c)continue;if(a.x+a.r<bb[0]||a.x-a.r>bb[2]||a.y+a.r<bb[1]||a.y-a.r>bb[3])continue;const gr=g.createRadialGradient(a.x,a.y,a.r*.25,a.x,a.y,a.r);
    gr.addColorStop(0,a.c);gr.addColorStop(.62,a.c);gr.addColorStop(1,a.c+'00');g.fillStyle=gr;g.fillRect(bb[0],bb[1],CH,CH);}
  g.globalAlpha=.55;g.fillStyle=g.createPattern(noiseC,'repeat');g.fillRect(bb[0],bb[1],CH,CH);g.globalAlpha=1;
  decals(g,bb,cx,cy);
  const vis=it=>!(it.bb[2]<bb[0]||it.bb[0]>bb[2]||it.bb[3]<bb[1]||it.bb[1]>bb[3]);
  for(const it of items){if((ORDER[it.t]??5)>2)continue;if(vis(it))drawItem(g,it);}
  drawTrack(g,bb);
  for(const it of items){if((ORDER[it.t]??5)<=2)continue;if(vis(it))drawItem(g,it);}
  drawBars(g,bb);
  cache.set(k,c);if(cache.size>LRU){cache.delete(cache.keys().next().value);}return c;
}
function drawBars(g,bb){for(const e of TK.E)for(const b of e.bars){if(b.open)continue;const p=TK.pt(e.id,b.s);if(p.x<bb[0]-60||p.x>bb[2]+60||p.y<bb[1]-60||p.y>bb[3]+60)continue;
  const k=e.barKey;g.save();g.translate(p.x,p.y);g.rotate(p.h);
  if(k==='larch'){g.translate(18,0);g.fillStyle='rgba(0,0,0,.35)';g.save();g.rotate(1.2);g.fillRect(-40,-3,80,9);g.restore();g.save();g.rotate(1.1);g.fillStyle='#5a4230';g.fillRect(-42,-4,84,8);g.fillStyle='#c9a46a';g.beginPath();g.arc(-42,0,4,0,7);g.fill();
    g.fillStyle='#34442a';for(let i=0;i<9;i++){g.beginPath();g.arc(10+i*4,(i%2?-7:7),6,0,7);g.fill();}g.restore();}
  else if(k==='quarry'){g.translate(26,0);g.fillStyle='#6f6553';g.beginPath();g.ellipse(0,0,28,20,0,0,7);g.fill();g.fillStyle='#857a64';g.beginPath();g.ellipse(-4,-3,20,14,0,0,7);g.fill();g.fillStyle='#5f5848';for(let i=0;i<8;i++){g.beginPath();g.arc(Math.cos(i)*14,Math.sin(i*1.7)*10,3,0,7);g.fill();}}
  // barrier beam
  g.fillStyle='rgba(0,0,0,.3)';g.fillRect(2,-9,4,20);g.fillStyle='#e9e2cc';g.fillRect(0,-10,3.5,20);g.fillStyle='#b03a2a';for(let y=-10;y<10;y+=5)g.fillRect(0,y,3.5,2.5);
  g.restore();}}
function decals(g,bb,cx,cy){const r=RNG.make(cx*92821+cy*68917+3);
  for(let i=0;i<70;i++){const x=bb[0]+r()*CH,y=bb[1]+r()*CH,ar=areaAt(x,y)||'country',k=r(),sz=r();if(inLake(x,y,4))continue;
    if(ar==='country'||ar==='ferrow'||ar==='mercy'){if(k<.45){g.fillStyle=sz<.5?'rgba(40,55,20,.12)':'rgba(170,180,90,.1)';g.beginPath();g.ellipse(x,y,12+sz*40,8+sz*26,r()*3,0,7);g.fill();}
      else if(k<.6){const c=r()<.5?'#e8e0c8':'#e0c040';g.fillStyle=c;for(let j=0;j<7;j++)g.fillRect(x+(r()-.5)*14,y+(r()-.5)*14,1.1,1.1);}
      else if(k<.85){g.strokeStyle='rgba(40,55,25,.5)';g.lineWidth=.8;for(let j=0;j<4;j++){g.beginPath();g.moveTo(x+j*1.5,y);g.lineTo(x+j*1.5+(r()-.5)*3,y-3-r()*3);g.stroke();}}
      else if(!nearTrack(x,y,16)){g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.arc(x+2,y+2.5,3+sz*3,0,7);g.fill();g.fillStyle=sz<.5?'#4c5e30':'#5a6b36';g.beginPath();g.arc(x,y,3+sz*3,0,7);g.fill();}}
    else if(ar==='depot'){if(k<.2){g.fillStyle='rgba(15,12,10,.22)';g.beginPath();g.ellipse(x,y,3+sz*8,2+sz*5,r()*3,0,7);g.fill();}
      else if(k<.3){g.fillStyle='rgba(60,70,75,.38)';g.beginPath();g.ellipse(x,y,3+sz*7,2+sz*4,r()*3,0,7);g.fill();g.fillStyle='rgba(200,210,215,.15)';g.beginPath();g.ellipse(x-2,y-1,2+sz*4,1+sz*2,0,0,7);g.fill();}
      else if(k<.8){g.fillStyle=r()<.5?'rgba(25,22,20,.55)':'rgba(110,100,85,.5)';for(let j=0;j<10;j++)g.fillRect(x+(r()-.5)*16,y+(r()-.5)*16,1.2,1.2);}
      else{g.fillStyle='rgba(80,90,40,.45)';g.beginPath();g.arc(x,y,2+sz*4,0,7);g.fill();}}
    else if(ar==='brick'){if(k<.35){g.fillStyle='rgba(70,35,25,.2)';g.beginPath();g.ellipse(x,y,6+sz*18,4+sz*10,r()*3,0,7);g.fill();}
      else if(k<.7){for(let j=0;j<5;j++){g.fillStyle=['#9a4f37','#7a3a28','#b0603e'][j%3];g.save();g.translate(x+(r()-.5)*12,y+(r()-.5)*12);g.rotate(r()*3);g.fillRect(-1.3,-.7,2.6,1.4);g.restore();}}
      else{g.strokeStyle='rgba(60,30,20,.3)';g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(x+20+sz*30,y+8);g.stroke();}}
    else if(ar==='quarry'){if(k<.5){g.fillStyle=r()<.5?'rgba(200,195,185,.4)':'rgba(70,65,60,.35)';for(let j=0;j<8;j++)g.fillRect(x+(r()-.5)*14,y+(r()-.5)*14,1.5,1.2);}
      else if(k<.75&&!nearTrack(x,y,16)){g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.arc(x+2,y+3,2+sz*5,0,7);g.fill();g.fillStyle='#9a958c';g.beginPath();g.arc(x,y,2+sz*5,0,7);g.fill();g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.arc(x-1,y-1,1+sz*2,0,7);g.fill();}
      else{g.fillStyle='rgba(220,215,200,.15)';g.beginPath();g.ellipse(x,y,10+sz*25,8+sz*16,r()*3,0,7);g.fill();}}
    else if(ar==='glass'){if(k<.4){g.fillStyle='rgba(220,210,180,.25)';g.beginPath();g.ellipse(x,y,8+sz*22,6+sz*12,r()*3,0,7);g.fill();}
      else if(k<.75){g.fillStyle=['#5f8fbf','#6fbf8a','#e8e8d8','#3b5f8a'][(r()*4)|0];g.fillRect(x,y,1.2,1);}
      else{g.fillStyle='rgba(60,70,40,.3)';g.beginPath();g.arc(x,y,2+sz*4,0,7);g.fill();}}
    else if(ar==='larch'){if(k<.5){g.fillStyle='rgba(140,90,40,.25)';g.beginPath();g.ellipse(x,y,8+sz*20,6+sz*12,r()*3,0,7);g.fill();}
      else if(k<.8){g.strokeStyle='#4f6a32';g.lineWidth=.8;for(let j=0;j<6;j++){const a=j/6*6.28+r();g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*5,y+Math.sin(a)*5);g.stroke();}}
      else if(!nearTrack(x,y,14)){g.fillStyle='#6b4a2e';g.beginPath();g.arc(x,y,2.5+sz*2,0,7);g.fill();g.fillStyle='#b08a5a';g.beginPath();g.arc(x,y,1.6+sz*1.2,0,7);g.fill();}}
  }}
function invalidate(){cache.clear();rev++;}
// ---------- vehicle sprites (drawn along +x, front at +x)
const SPR=new Map(),PX=4;
function sprite(v){const key=v.loco?'L':(v.kind+v.ld+(v.var||0)+(v.num||0));let s=SPR.get(key);if(s)return s;
  const L=v.len,W=11;const c=mkCanvas((L+4)*PX,(W+4)*PX),g=c.getContext('2d');g.scale(PX,PX);g.translate(L/2+2,W/2+2);
  if(v.loco)drawLoco(g,L);else drawCar(g,v,L);SPR.set(key,c);return c;}
function drawLoco(g,L){const W=10.5,h=W/2;
  g.fillStyle='#1d1b19';g.fillRect(-L/2+1.5,-h-.2,L-3,W+.4); // frame
  for(const x of [-L/2+1,L/2-1]){g.fillStyle='#2a2826';g.fillRect(x-1,-h+1,2,W-2);g.fillStyle='#9b958a';g.beginPath();g.arc(x+(x>0?1.2:-1.2),-h+2.2,1.2,0,7);g.arc(x+(x>0?1.2:-1.2),h-2.2,1.2,0,7);g.fill();
    g.fillStyle='#d6b23a';g.fillRect(x-1,-h+.6,2,W-1.2);g.fillStyle='#1d1b19';for(let y=-h+1;y<h-1;y+=2.4){g.beginPath();g.moveTo(x-1,y);g.lineTo(x+1,y+1.2);g.lineTo(x+1,y+2.2);g.lineTo(x-1,y+1);g.fill();}}
  // walkways
  g.fillStyle='#4a4743';g.fillRect(-L/2+3,-h,L-6,W);
  // hood (front, +x side) and cab (rear)
  const body='#48654a',dark='#344c37',lite='#6a8a62';
  g.fillStyle='rgba(0,0,0,.35)';g.fillRect(-L/2+4,-h+1.6,L-8,W-2.4);
  g.fillStyle=body;g.beginPath();g.roundRect(-L/2+12,-h+1.4,L-15.5,W-2.8,1.4);g.fill();
  g.fillStyle=lite;g.fillRect(-L/2+12,-h+1.4,L-15.5,1.4);g.fillStyle=dark;g.fillRect(-L/2+12,h-2.6,L-15.5,1.2);
  for(let x=-L/2+15;x<L/2-4;x+=4){g.fillStyle='rgba(0,0,0,.28)';g.fillRect(x,-h+1.4,.5,W-2.8);}
  g.fillStyle='#262624';g.fillRect(L/2-9,-h+2.6,5,W-5.2);g.strokeStyle='#555';g.lineWidth=.3;for(let y=-h+3;y<h-2.6;y+=.9){g.beginPath();g.moveTo(L/2-9,y);g.lineTo(L/2-4,y);g.stroke();}
  g.fillStyle='#1a1a1a';g.beginPath();g.arc(-L/2+19,0,1.3,0,7);g.fill();g.fillStyle='#333';g.beginPath();g.arc(-L/2+19,0,.7,0,7);g.fill();
  // cab
  g.fillStyle='rgba(0,0,0,.4)';g.fillRect(-L/2+3.2,-h+.4,10,W-.4);
  g.fillStyle='#3f5a42';g.beginPath();g.roundRect(-L/2+3,-h+.5,9.6,W-1,1.6);g.fill();g.fillStyle='#5d7d58';g.beginPath();g.roundRect(-L/2+4,-h+1.4,7.6,W-2.8,1.2);g.fill();
  g.fillStyle='rgba(255,255,255,.18)';g.fillRect(-L/2+4.5,-h+1.8,6.6,1.8);g.fillStyle='#d6b23a';g.fillRect(-L/2+3,-h+.5,1,W-1);
  g.fillStyle='#2a2826';g.fillRect(-L/2+12,-h+.8,.8,W-1.6);
  // handrails
  g.strokeStyle='#cfc8b4';g.lineWidth=.35;g.beginPath();g.moveTo(-L/2+13,-h+.4);g.lineTo(L/2-3,-h+.4);g.moveTo(-L/2+13,h-.4);g.lineTo(L/2-3,h-.4);g.stroke();
  rust(g,L-8,W-3,7,4071);
  g.save();g.scale(.9,1);txt(g,'D4071',(-L/2+24)/.9,0,3,'rgba(230,220,190,.75)');g.restore();
}
const LOADC={bricks:['#9a4f37','#a85c40','#8a4630'],pots:['#b0603a','#9a5030'],pipes:['#6b4a30','#7a5434'],plate:['#3b3c3e','#4a4b4d'],weights:['#6a6c6e','#55585a'],cullet:['#3b5f8a','#4f8a5a','#c9c2a0','#6aa0b0'],
 setts:['#77746e','#8a877f','#6a675f'],grain:['#c9a85a','#b8964a'],ballast:['#8a857b','#9b968c'],dust:['#c9a874','#b89060'],logs:['#6b4a2e','#7a5634'],poles:['#5a4432','#4e3a2a'],posts:['#8a6a46','#7a5c3c'],machine:['#b8962e','#8a7020'],
 sacks:['#c2b28a','#a8986e'],crates:['#8a6a42','#9b7a4d'],parcels:['#a88a5a','#8f7449'],mail:['#7a2a24']};
function drawCar(g,v,L){const W=10,h=W/2,r=RNG.make(v.num||7);
  const bodyC=['#5a4636','#4e4a44','#5f3c30','#4a5048'][v.var%4];
  g.fillStyle='#1d1b19';g.fillRect(-L/2+1,-h,L-2,W); for(const x of [-L/2+.6,L/2-.6]){g.fillStyle='#8f897e';g.beginPath();g.arc(x,-h+2,1.1,0,7);g.arc(x,h-2,1.1,0,7);g.fill();}
  const k=v.kind,lc=LOADC[v.ld]||['#777'];
  if(k==='open'){g.fillStyle=bodyC;g.fillRect(-L/2+2,-h,L-4,W);g.fillStyle='rgba(0,0,0,.45)';g.fillRect(-L/2+3.2,-h+1.2,L-6.4,W-2.4);
    const x0=-L/2+3.4,w=L-6.8,y0=-h+1.4,hh=W-2.8;
    if(v.ld==='bricks'||v.ld==='setts'||v.ld==='weights'){const bw=v.ld==='bricks'?2.6:v.ld==='setts'?2:4.4,bh=v.ld==='bricks'?1.3:2;for(let y=y0;y<y0+hh-.2;y+=bh+.25)for(let x=x0+((y*3|0)%2)*bw/2;x<x0+w-.2;x+=bw+.25){g.fillStyle=lc[(r()*lc.length)|0];g.fillRect(x,y,Math.min(bw,x0+w-x),Math.min(bh,y0+hh-y));}}
    else if(v.ld==='pots'){for(let x=x0+1.8;x<x0+w;x+=3.4)for(let y=y0+1.8;y<y0+hh;y+=3.4){g.fillStyle=lc[(r()*2)|0];g.beginPath();g.arc(x,y,1.5,0,7);g.fill();g.fillStyle='#2a1a12';g.beginPath();g.arc(x,y,.7,0,7);g.fill();}}
    else if(v.ld==='pipes'){for(let y=y0+.9;y<y0+hh;y+=1.8){g.fillStyle=lc[(r()*2)|0];g.fillRect(x0,y-.8,w,1.6);g.fillStyle='#2a1a12';g.beginPath();g.arc(x0+w-.6,y,.5,0,7);g.fill();}}
    else if(v.ld==='cullet'){for(let i=0;i<160;i++){g.fillStyle=lc[(r()*lc.length)|0];g.fillRect(x0+r()*w,y0+r()*hh,.9,.7);}}
    else {g.fillStyle=lc[0];g.fillRect(x0+1,y0+1,w-2,hh-2);}
    g.fillStyle='rgba(255,255,255,.1)';g.fillRect(-L/2+2,-h,L-4,.9);
  }else if(k==='hopper'){g.fillStyle=bodyC==='#5f3c30'?'#6b6a62':'#7a766c';g.fillRect(-L/2+2,-h,L-4,W);g.fillStyle='rgba(0,0,0,.25)';for(let x=-L/2+4;x<L/2-3;x+=3.4)g.fillRect(x,-h,.6,W);
    for(let i=0;i<3;i++){const x=-L/2+5+i*(L-10)/3;g.fillStyle='#222';g.fillRect(x,-h+2.4,(L-14)/3-1,W-4.8);g.fillStyle=lc[0];g.fillRect(x+.4,-h+2.8,(L-14)/3-1.8,W-5.6);g.fillStyle='rgba(255,255,255,.15)';g.fillRect(x+.4,-h+2.8,(L-14)/3-1.8,1);}
  }else if(k==='van'||k==='mail'){const c=k==='mail'?'#7a2a24':['#7a6a52','#5b4a3e','#6c6458','#4d5550'][v.var%4];g.fillStyle=c;g.beginPath();g.roundRect(-L/2+1.6,-h,L-3.2,W,1.2);g.fill();
    const gr=g.createLinearGradient(0,-h,0,h);gr.addColorStop(0,'rgba(255,255,255,.22)');gr.addColorStop(.5,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(0,0,0,.3)');g.fillStyle=gr;g.fillRect(-L/2+1.6,-h,L-3.2,W);
    g.fillStyle='rgba(0,0,0,.25)';for(let x=-L/2+4;x<L/2-2;x+=3)g.fillRect(x,-h,.45,W);g.fillStyle='#2b2a28';g.fillRect(-1.5,-h+3.5,3,3);
    if(k==='mail'){txt(g,'M2204',0,0,3,'rgba(240,210,120,.85)');g.fillStyle='#d4b04a';g.fillRect(-L/2+1.6,-h,L-3.2,.6);g.fillRect(-L/2+1.6,h-.6,L-3.2,.6);}
  }else if(k==='flat'){g.fillStyle='#4a3a2c';g.fillRect(-L/2+2,-h+.5,L-4,W-1);g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=.3;for(let y=-h+1.5;y<h-.5;y+=1.6){g.beginPath();g.moveTo(-L/2+2,y);g.lineTo(L/2-2,y);g.stroke();}
    g.fillStyle='#2a2826';for(const x of [-L/2+3,-L/2+12,L/2-12,L/2-3])g.fillRect(x-.4,-h,.8,W);
    if(v.ld==='logs'||v.ld==='poles'){const d=v.ld==='logs'?2.6:1.9;for(let y=-h+1+d/2;y<h-.8;y+=d+.15){g.fillStyle=lc[(r()*2)|0];const off=(r()-.5)*2;g.fillRect(-L/2+2+off,y-d/2,L-4,d);g.fillStyle='#c8a46a';g.beginPath();g.arc(L/2-2+off,y,d/2,0,7);g.fill();g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=.2;g.stroke();}
      g.fillStyle='#222';g.fillRect(-6,-h-.2,.8,W+.4);g.fillRect(6,-h-.2,.8,W+.4);}
    else if(v.ld==='posts'){for(let i=0;i<4;i++){const x=-L/2+3+i*6.4;g.fillStyle=lc[i%2];g.fillRect(x,-h+1,5.6,W-2);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=.25;for(let y=-h+1.6;y<h-1;y+=1.2){g.beginPath();g.moveTo(x,y);g.lineTo(x+5.6,y);g.stroke();}}}
    else if(v.ld==='machine'){g.fillStyle='#8a7020';g.fillRect(-L/2+4,-h+1,L-8,W-2);g.fillStyle='#b8962e';g.fillRect(-L/2+4,-h+1,L-8,3);g.fillStyle='#3a3020';for(let x=-L/2+6;x<L/2-5;x+=2.5)g.fillRect(x,h-3,1.2,2);g.fillStyle='#555';g.fillRect(-2,-h+3,8,3);}
    else {g.fillStyle='#3b3c3e';g.fillRect(-L/2+5,-h+1.4,L-10,W-2.8);g.fillStyle='rgba(255,255,255,.1)';g.fillRect(-L/2+5,-h+1.4,L-10,1);g.fillStyle='#777';for(let x=-L/2+6;x<L/2-5;x+=3){g.beginPath();g.arc(x,-h+2.2,.35,0,7);g.arc(x,h-2.2,.35,0,7);g.fill();}}
  }
  rust(g,L-4,W,k==='van'?3:5,v.num||1);
}
function init(){
  noiseC=noiseTex(128,2600,['#000','#fff','#3a3020','#20301a'],.18);
  gravelC=noiseTex(64,900,['#8f8676','#6d6658','#a49b8a','#4f4a40','#7e705c'],.9);
  const gc=mkCanvas(64,64),gg=gc.getContext('2d');gg.fillStyle='#6a7641';gg.fillRect(0,0,64,64);const r=RNG.make(5);for(let i=0;i<500;i++){gg.fillStyle=['#5d6a39','#77834a','#6f7a40','#808a4f'][i%4];gg.fillRect(r()*64,r()*64,1+r()*1.5,1+r()*2.5);}grassC=gc;
  for(const e of TK.E){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let i=0;i<e.n;i++){const x=e.pts[i*2],y=e.pts[i*2+1];x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}e.bb=[x0-20,y0-20,x1+20,y1+20];}
  buildGrid();buildScenery();
}
return {has:(x,y)=>cache.has(x+','+y),CH,RES,init,chunk,sprite,areaAt,invalidate,items,along,AREAS,drawItem,LOADC,get rev(){return rev;}};
})();
