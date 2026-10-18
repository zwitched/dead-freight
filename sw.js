// Dead Freight service worker: network first so updates arrive straight away, cache as the offline fallback.
const CACHE='deadfreight-v1';
const FILES=['./','index.html','css/style.css','manifest.webmanifest','icon.png','icon-192.png',
 'js/rng.js','js/track.js','js/map.js','js/train.js','js/data.js','js/sim.js','js/art.js','js/render.js','js/audio.js','js/save.js','js/input.js','js/ui.js','js/game.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}return res;})
  .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):Response.error()))));});
