# Served over http: manifest + icons load, the service worker installs, the game loads and plays offline.
# Also: the single-file dist/index.html boots from disk, loads nothing else, and a shift can be driven.
from drive import *
import subprocess,socket,time,urllib.request
def free():
  s=socket.socket();s.bind(('127.0.0.1',0));p=s.getsockname()[1];s.close();return p
async def main():
  t=T('http');port=free()
  srv=subprocess.Popen([sys.executable,'-m','http.server',str(port),'--bind','127.0.0.1'],cwd=str(ROOT),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(.8)
  base=f'http://127.0.0.1:{port}/';errs=[]
  try:
    m=json.loads(urllib.request.urlopen(base+'manifest.webmanifest').read())
    t.chk('manifest: name, standalone, portrait, 2 icons',m['name']=='Dead Freight' and m['display']=='standalone' and m['orientation']=='portrait' and len(m['icons'])==2)
    for ic in m['icons']:t.chk('icon serves: '+ic['src'],urllib.request.urlopen(base+ic['src']).status==200)
    sw=urllib.request.urlopen(base+'sw.js').read().decode()
    import re;files=re.findall(r"'([^']+\.(?:js|css|html|png|webmanifest))'",sw)
    t.chk('every file the service worker precaches exists',all((ROOT/f).exists() for f in files) and len(files)>=15,[f for f in files if not (ROOT/f).exists()])
    idx=(ROOT/'index.html').read_text();scripts=re.findall(r'src="(js/[^"]+)"',idx)
    t.chk('service worker precaches every script index.html loads',all(s in files for s in scripts),[s for s in scripts if s not in files])
    async with async_playwright() as p:
      b,c,pg,e1=await page(p,url=base)
      await pg.wait_for_function("navigator.serviceWorker.ready.then(()=>true)",timeout=10000)
      await pg.reload();await pg.wait_for_timeout(800)
      t.chk('service worker controls the page after a reload',await pg.evaluate("!!navigator.serviceWorker.controller"))
      await c.set_offline(True);await pg.reload();await pg.wait_for_timeout(1000)
      t.chk('offline reload still loads the game',await pg.is_visible('#bStart') and await pg.evaluate("typeof SIM==='object'&&TK.E.length>20"))
      tc=await Touch(pg).init();dr=Driver(pg,tc)
      await tc.tapel('#bStart');await tc.tapel('#bGo');await pg.wait_for_timeout(500)
      await dr.set_brk(0);await dr.set_thr(2);await pg.wait_for_timeout(1500)
      t.chk('offline: a shift starts and the loco moves',(await st(pg))['V']>2)
      await c.set_offline(False);errs+=e1;await b.close()
      reqs=[]
      b,c,pg,e2=await page(p,url='file://'+str(ROOT/'dist/index.html'))
      pg.on('request',lambda r:reqs.append(r.url))
      await pg.reload();await pg.wait_for_timeout(600)
      t.chk('dist: loads nothing but itself',all(u.endswith('dist/index.html') or u.startswith('data:') for u in reqs),reqs[:5])
      tc=await Touch(pg).init();dr=Driver(pg,tc)
      t.chk('dist/index.html boots from disk to the title',await pg.is_visible('#bStart'))
      await tc.tapel('#bStart');await tc.tapel('#bGo');await pg.wait_for_timeout(500)
      await dr.set_brk(0);await dr.set_thr(2);await pg.wait_for_timeout(1500)
      t.chk('dist: the loco drives',(await st(pg))['V']>2)
      errs+=e2;await b.close()
  finally:srv.terminate()
  t.done(errs)
asyncio.run(main())
