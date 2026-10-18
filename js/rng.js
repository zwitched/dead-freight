'use strict';
// Small seeded RNG (mulberry32) for shifts and the daily run.
const RNG=(()=>{
function make(seed){let a=seed>>>0;const f=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
  f.int=(lo,hi)=>lo+Math.floor(f()*(hi-lo+1));f.pick=a=>a[Math.floor(f()*a.length)];
  f.shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(f()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};return f;}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
return {make,hash,today};
})();
