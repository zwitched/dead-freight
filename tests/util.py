# Shared test helpers. Every game action in the tests goes through real touch events on the real on-screen controls
# (CDP Input.dispatchTouchEvent -> the same Pointer Event handlers a phone uses). page.evaluate is only used to READ state.
import asyncio,pathlib,json,sys,math
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
URL='file://'+str(ROOT/'index.html')
SHOTS=ROOT/'screenshots'
class T:
  def __init__(s,name):s.name=name;s.bad=[];s.n=0
  def chk(s,label,ok,*info):
    s.n+=1;print(('PASS ' if ok else 'BAD  ')+label,*[json.dumps(i,default=str)[:300] for i in info],flush=True)
    if not ok:s.bad.append(label)
  def done(s,errs):
    print('ERRORS',errs if errs else 'none');print(f'SUMMARY {s.name}: {s.n-len(s.bad)}/{s.n} passed',flush=True)
    if errs or s.bad:sys.exit(1)
async def page(p,dev='Pixel 7',url=URL,clear=True,ctx_kw=None):
  b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
  kw=dict(p.devices[dev]) if isinstance(dev,str) else dict(dev)
  if ctx_kw:kw.update(ctx_kw)
  c=await b.new_context(**kw);pg=await c.new_page();errs=[]
  pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
  await pg.goto(url);await pg.wait_for_timeout(400)
  if clear:
    await pg.evaluate("localStorage.clear()");await pg.reload();await pg.wait_for_timeout(600)
  return b,c,pg,errs
class Touch:
  def __init__(s,pg):s.pg=pg;s.cdp=None
  async def init(s):s.cdp=await s.pg.context.new_cdp_session(s.pg);return s
  async def send(s,kind,pts):await s.cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in pts]})
  async def drag(s,a,b,steps=8,dt=16,pid=0):
    await s.send('touchStart',[(pid,a)])
    for k in range(1,steps+1):
      t=k/steps;await s.send('touchMove',[(pid,(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))]);await s.pg.wait_for_timeout(dt)
    await s.send('touchEnd',[])
  async def tap(s,a,hold=40):
    await s.send('touchStart',[(0,a)]);await s.pg.wait_for_timeout(hold);await s.send('touchEnd',[])
  async def center(s,sel):
    r=await s.pg.evaluate(f"(()=>{{const r=document.querySelector('{sel}').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,r.width,r.height]}})()")
    return r
  async def tapel(s,sel):
    c=await s.center(sel);await s.tap((c[0],c[1]));await s.pg.wait_for_timeout(60)
  # move a lever with a real finger: grab the handle, slide to the spot for value v (0..1)
  async def lever(s,lid,v):
    g=await s.pg.evaluate(f"""(()=>{{const el=document.getElementById('{lid}'),h=el.querySelector('.handle');const r=el.getBoundingClientRect(),hr=h.getBoundingClientRect();
      return {{x:r.x+r.width/2,top:r.top,range:r.height-hr.height,hh:hr.height,hy:hr.top+hr.height/2,down:'{lid}'==='lvBrake'}}}})()""")
    off=v*g['range'] if g['down'] else (1-v)*g['range']
    ty=g['top']+off+g['hh']/2
    await s.drag((g['x'],g['hy']),(g['x'],ty),steps=6,dt=12)
    await s.pg.wait_for_timeout(30)
ST="""(()=>{const S=SIM.S;if(!S.train)return null;const L=S.loco;return {v:S.train.v,V:Math.abs(S.train.v),thr:S.ctl.thr,brk:S.ctl.brk,rev:S.ctl.rev,e:L.e,x:L.x,y:L.y,
 cars:SIM.carsOn().length,coup:S.couplings,fuel:S.fuel,fail:S.fail,state:GAME.state,nx:GAME.nextSw,stop:SIM.stopDist(),mass:SIM.mass(),
 endA:TN.end(S.train,0),endB:TN.end(S.train,1),deliver:SIM.canDeliver(),ctx:document.getElementById('ctx').dataset.k||'',pset:document.getElementById('pSet').textContent,t:S.t}})()"""
async def st(pg):return await pg.evaluate(ST)
