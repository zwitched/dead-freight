'use strict';
// All sound is synthesized with Web Audio: diesel engine, rail joints, brakes, flange squeal, couplings, points, horn, radio.
const AU=(()=>{
let ac=null,master=null,eng=null,noiseBuf=null,on=true,vol=.8;const st={clickAcc:0,last:0,bird:3};
function ensure(){if(ac)return ac;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;ac=new AC();master=ac.createGain();master.gain.value=on?vol:0;
  const comp=ac.createDynamicsCompressor();master.connect(comp);comp.connect(ac.destination);
  noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  buildEngine();return ac;}
function resume(){const a=ensure();if(a&&a.state==='suspended')a.resume();}
function noise(){const n=ac.createBufferSource();n.buffer=noiseBuf;n.loop=true;return n;}
function buildEngine(){
  const out=ac.createGain();out.gain.value=0;out.connect(master);
  const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=260;lp.Q.value=4;lp.connect(out);
  const o1=ac.createOscillator();o1.type='sawtooth';o1.frequency.value=34;const o2=ac.createOscillator();o2.type='square';o2.frequency.value=51;
  const g2=ac.createGain();g2.gain.value=.35;o2.connect(g2);
  const am=ac.createGain();am.gain.value=.6;o1.connect(am);g2.connect(am);am.connect(lp);
  const lfo=ac.createOscillator();lfo.type='square';lfo.frequency.value=9;const lg=ac.createGain();lg.gain.value=.4;lfo.connect(lg);lg.connect(am.gain);
  // turbo / exhaust hiss
  const nz=noise(),bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1400;bp.Q.value=.8;const ng=ac.createGain();ng.gain.value=0;nz.connect(bp);bp.connect(ng);ng.connect(master);
  // brake squeal
  const sq=ac.createOscillator();sq.type='triangle';sq.frequency.value=2650;const sqg=ac.createGain();sqg.gain.value=0;sq.connect(sqg);sqg.connect(master);
  const vib=ac.createOscillator();vib.frequency.value=5.5;const vg=ac.createGain();vg.gain.value=30;vib.connect(vg);vg.connect(sq.frequency);
  // flange squeal on curves
  const fl=ac.createOscillator();fl.type='sine';fl.frequency.value=3700;const flg=ac.createGain();flg.gain.value=0;fl.connect(flg);flg.connect(master);
  // wheel slip whine
  const sl=ac.createOscillator();sl.type='sawtooth';sl.frequency.value=180;const slf=ac.createBiquadFilter();slf.type='bandpass';slf.frequency.value=900;const slg=ac.createGain();slg.gain.value=0;sl.connect(slf);slf.connect(slg);slg.connect(master);
  // rolling rumble
  const rn=noise(),rlp=ac.createBiquadFilter();rlp.type='lowpass';rlp.frequency.value=180;const rg=ac.createGain();rg.gain.value=0;rn.connect(rlp);rlp.connect(rg);rg.connect(master);
  // wind bed
  const wn=noise(),wlp=ac.createBiquadFilter();wlp.type='bandpass';wlp.frequency.value=500;wlp.Q.value=.4;const wg=ac.createGain();wg.gain.value=.012;wn.connect(wlp);wlp.connect(wg);wg.connect(master);
  [o1,o2,lfo,nz,sq,vib,fl,sl,rn,wn].forEach(o=>o.start());
  eng={out,lp,o1,o2,lfo,ng,sqg,sq,flg,fl,slg,sl,rg,wg,bp};
}
function set(p,v,t){p.setTargetAtTime(v,ac.currentTime,t||.08);}
// called every frame while a shift is running
function update(dt){if(!ac||!eng)return;const S=SIM.S;if(!S.on||GAME.state!=='play'){set(eng.out.gain,0,.2);set(eng.ng.gain,0);set(eng.sqg.gain,0);set(eng.flg.gain,0);set(eng.slg.gain,0);set(eng.rg.gain,0);return;}
  const n=S.fuel>0?S.ctl.thr:0,v=Math.abs(S.train.v),L=S.loco;
  const rpm=n/5;set(eng.o1.frequency,30+rpm*26,.25);set(eng.o2.frequency,45+rpm*39,.25);set(eng.lfo.frequency,7+rpm*13,.25);set(eng.lp.frequency,240+rpm*900,.3);
  set(eng.out.gain,S.fuel>0?.16+rpm*.14:.0,.2);set(eng.ng.gain,rpm*rpm*.03,.3);set(eng.bp.frequency,900+rpm*1400,.3);
  const sq=S.ctl.brk>.15&&v>3&&v<45?Math.min(1,S.ctl.brk)*Math.min(1,(45-v)/30)*Math.min(1,v/8)*.035:0;set(eng.sqg.gain,sq,.1);
  set(eng.flg.gain,S.over>2?Math.min(.03,S.over*.003):0,.1);set(eng.fl.frequency,3500+Math.sin(S.t*7)*160,.05);
  set(eng.slg.gain,L.slip*.06,.05);set(eng.sl.frequency,140+L.slip*500+v*3,.1);
  set(eng.rg.gain,Math.min(.25,v*.004),.2);
  // rail joints: two clacks per bogie pair
  st.clickAcc+=v*dt;const seg=36;if(st.clickAcc>seg){st.clickAcc-=seg;clack(Math.min(1,v/50));setTimeout(()=>clack(Math.min(1,v/50)*.8),Math.max(30,1000*12/Math.max(v,1)));}
  st.bird-=dt;if(st.bird<0){st.bird=4+Math.random()*9;if(v<40)bird();}
}
function env(g,t,a,peak,dec){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+dec);}
function burst(f,q,peak,dec,type,delay){if(!ac||!on)return;const t=ac.currentTime+(delay||0);const n=noise(),fl=ac.createBiquadFilter();fl.type=type||'bandpass';fl.frequency.value=f;fl.Q.value=q;const g=ac.createGain();n.connect(fl);fl.connect(g);g.connect(master);env(g,t,.003,peak,dec);n.start(t);n.stop(t+dec+.05);}
function tone(f,type,peak,dec,delay,slide){if(!ac||!on)return;const t=ac.currentTime+(delay||0);const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+dec);const g=ac.createGain();o.connect(g);g.connect(master);env(g,t,.004,peak,dec);o.start(t);o.stop(t+dec+.05);}
function clack(k){burst(2400,1.2,.05*k+.01,.04,'bandpass');burst(160,1,.08*k+.02,.07,'lowpass');}
function bird(){const f=2200+Math.random()*1800;for(let i=0;i<3;i++)tone(f+i*120,'sine',.012,.08,i*.11,f*1.3);}
const sfx={
 couple(q){const k=q==='soft'?.5:q==='hard'?1:1.4;burst(120,1,.5*k,.25,'lowpass');[420,690,1130,1580].forEach((f,i)=>tone(f*(.97+Math.random()*.06),'square',.05*k,.25+i*.05));burst(3000,2,.12*k,.08);if(q!=='soft')burst(800,.6,.25*k,.35);},
 bump(h){burst(90,1,h?.6:.25,.3,'lowpass');burst(1500,1,h?.15:.05,.1);},
 crash(){burst(70,.7,1,1.2,'lowpass');burst(900,.5,.5,.9);[230,410,770].forEach((f,i)=>tone(f,'sawtooth',.1,.8,i*.05,f*.6));},
 points(){burst(300,2,.25,.08,'bandpass');burst(1800,3,.12,.05,'bandpass',.05);tone(140,'square',.06,.06,.02);},
 busy(){tone(180,'square',.08,.12);tone(150,'square',.08,.14,.13);},
 notch(){burst(3500,4,.05,.025);tone(600,'square',.015,.03);},
 rev(){burst(500,2,.2,.07);burst(2000,3,.08,.04,'bandpass',.04);},
 radio(){burst(2500,.5,.03,.25,'highpass');tone(1250,'sine',.05,.07,.02);tone(1650,'sine',.04,.07,.1);},
 deliver(){[988,1319,1568].forEach((f,i)=>tone(f,'sine',.13,1.1,i*.14));tone(2637,'triangle',.05,.4,.5);},
 coin(){tone(1568,'square',.04,.08);tone(2093,'square',.04,.2,.07);},
 sand(){burst(4000,.5,.1,.6,'highpass');},
 found(){tone(660,'triangle',.08,.25);tone(880,'triangle',.08,.35,.12);},
 ui(){tone(900,'triangle',.04,.05);},
 fail(){tone(330,'sawtooth',.06,.4);tone(247,'sawtooth',.06,.6,.25);}
};
let horn=null;
function hornOn(){if(!ensure()||!on)return;if(horn)return;const t=ac.currentTime;const g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.16,t+.06);
  const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=900;bp.Q.value=.7;bp.connect(g);g.connect(master);
  const os=[311,370,466].map(f=>{const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=f*(1+(Math.random()-.5)*.004);o.connect(bp);o.start();return o;});horn={g,os};}
function hornOff(){if(!horn)return;const t=ac.currentTime;horn.g.gain.cancelScheduledValues(t);horn.g.gain.setTargetAtTime(0,t,.06);const h=horn;horn=null;setTimeout(()=>h.os.forEach(o=>o.stop()),400);}
function play(n,a){if(!ac||!on)return;try{sfx[n]&&sfx[n](a);}catch(e){}}
function setOn(v){on=v;if(master)master.gain.value=on?vol:0;if(!on)hornOff();}
function setVol(v){vol=v;if(master&&on)master.gain.value=vol;}
function suspend(){if(ac&&ac.state==='running')ac.suspend();}
return {ensure,resume,update,play,hornOn,hornOff,setOn,setVol,suspend,get on(){return on},get ctx(){return ac}};
})();
