# THE VERTICAL SLICE, played with real touches on the real controls on a Pixel 7 and an iPhone 13:
# depot -> release brake, power up -> set points for Brickfield -> couple the wagon gently -> stop, REV -> home ->
# stop in the goods road -> Deliver -> results with pay -> back to depot -> next shift starts.
from drive import *
async def slice_on(p,t,dev,shots):
  b,c,pg,errs=await page(p,dev);tc=await Touch(pg).init();dr=Driver(pg,tc);E=pg.evaluate
  tag=dev.split()[0]
  t.chk(f'[{tag}] title screen shows',await pg.is_visible('#sTitle') and await pg.is_visible('#bStart'))
  if shots:await pg.screenshot(path=str(SHOTS/'title.png'))
  await tc.tapel('#bStart');await pg.wait_for_timeout(300)
  t.chk(f'[{tag}] Clock on goes to the depot board',await pg.is_visible('#sDepot'))
  if shots:await pg.screenshot(path=str(SHOTS/'depot_board.png'))
  await tc.tapel('#bGo');await pg.wait_for_timeout(700)
  x=await st(pg)
  t.chk(f'[{tag}] shift starts in the depot, brake on, engine only',x['state']=='play' and x['e']==0 and x['brk']>.5 and x['cars']==0,x)
  if shots:await pg.screenshot(path=str(SHOTS/'depot.png'))
  # tutorial step 0: release brake by dragging the lever
  await dr.set_brk(0);x=await st(pg)
  t.chk(f'[{tag}] dragging the BRAKE lever up releases the brake',x['brk']<.05,x['brk'])
  await pg.wait_for_timeout(100)
  await dr.set_thr(2);await pg.wait_for_timeout(1200);x=await st(pg)
  t.chk(f'[{tag}] POWER lever to notch 2 moves the loco',x['thr']==2 and x['V']>2,x['thr'],x['V'])
  t.chk(f'[{tag}] tutorial advanced past the levers',await E("GAME.tut&&GAME.tut.step>=2"))
  # points
  ok=await dr.set_points_for('Brickfield')
  t.chk(f'[{tag}] POINTS button sets J1 for Brickfield',ok,(await st(pg))['pset'])
  if shots:
    await pg.wait_for_timeout(600);await pg.screenshot(path=str(SHOTS/'junction.png'))
  # drive to the wagon, slow down near it
  wag="(()=>{const c=TN.cons.find(c=>c!==SIM.S.train&&c.veh.some(v=>v.value));return c?[c.veh[0].x,c.veh[0].y]:null})()"
  wp=await E(wag)
  def near(x):
    d=math.hypot(x['x']-wp[0],x['y']-wp[1])-40
    return d if d<260 else None
  sawSlow=[False]
  async def tick(x):
    if x['nx'] and x['nx']['id']=='BF0':
      # the wagon is on the BFa road; set it if needed
      await dr.set_points_for('Right road') if False else None
  x=await dr.run(lambda x:x['coup']>0,target=30,timeout=90,slow_when=near,slow=6)
  t.chk(f'[{tag}] drove to Brickfield and coupled the wagon',x['coup']==1 and x['cars']==1,x)
  q=await E("SIM.S.train.veh.filter(v=>!v.loco).map(v=>v.cond)")
  t.chk(f'[{tag}] coupling was gentle (wagon undamaged)',q and q[0]>.99,q)
  if shots:
    await pg.wait_for_timeout(200);await pg.screenshot(path=str(SHOTS/'coupling.png'))
  await dr.stop();x=await st(pg)
  t.chk(f'[{tag}] train stops with the brake lever',x['V']<.3)
  await dr.rev(-1);x=await st(pg)
  t.chk(f'[{tag}] REV selected while stopped',x['rev']==-1)
  await dr.set_brk(0)
  # head home: run until in depot edge, then stop close to the buffers
  def home_slow(x):
    if x['e']!=0:return None
    return x['endA']['s']-6 if x['endA']['e']==0 else None
  x=await dr.run(lambda x:x['e']==0 and x['endA']['s']<60,target=32,timeout=120,slow_when=home_slow,slow=6)
  t.chk(f'[{tag}] wagon brought back to the depot goods road',x['e']==0 and x['cars']==1,x)
  await dr.stop();await pg.wait_for_timeout(400);x=await st(pg)
  t.chk(f'[{tag}] Deliver button appears once stopped in the goods road',x['ctx']=='deliver' and await pg.is_visible('#bDeliver'),x['ctx'],x['endA'])
  if shots:await pg.screenshot(path=str(SHOTS/'delivery.png'))
  cash0=await E("SV.D.career.cash")
  await tc.tapel('#bDeliver');await pg.wait_for_timeout(500)
  t.chk(f'[{tag}] results screen after delivering',await pg.is_visible('#sResult'))
  r=await E("GAME.lastResult");cash1=await E("SV.D.career.cash")
  t.chk(f'[{tag}] reward paid: cash went up by the result total',cash1-cash0==r['total'] and r['total']>=60,cash0,cash1,r['total'])
  if shots:await pg.screenshot(path=str(SHOTS/'reward.png'))
  await tc.tapel('#bResOk');await pg.wait_for_timeout(300)
  t.chk(f'[{tag}] back at the depot, day 2, tutorial done',await pg.is_visible('#sDepot') and await E("SV.D.career.day===2&&SV.D.career.tut===1"))
  await tc.tapel('#bGo');await pg.wait_for_timeout(600);x=await st(pg)
  t.chk(f'[{tag}] next run begins with fresh freight out on the line',x['state']=='play' and x['e']==0 and await E("TN.cons.length")>2,await E("TN.cons.length"))
  await b.close();return errs
async def main():
  t=T('slice');errs=[]
  async with async_playwright() as p:
    errs+=await slice_on(p,t,'Pixel 7',True)
    errs+=await slice_on(p,t,'iPhone 13',False)
  t.done(errs)
asyncio.run(main())
