# A longer play-through by a touch-driven bot: the tutorial shift, then normal shifts where it picks the nearest
# freight, plans a route, sets each set of points with the POINTS button as it comes up, couples, brings it home,
# delivers, then spends the money in the engine shed by tapping. Everything is real touches; state is only read.
from drive import *
async def drive_to(pg,dr,tc,goal_edge,cond,slow_xy=None,target=34,timeout=150,side=None):
  E=pg.evaluate
  async def tick(x):
    plan=await E(f"FIX.plan({goal_edge},SIM.lead().side)")
    nx=x['nx']
    if plan and nx and nx['id'] in plan and nx['at']<300:
      cur=await E(f"FIX.setExit('{nx['id']}')")
      if cur!=int(plan[nx['id']]) and not await E(f"TN.occupied('{nx['id']}')"):
        await tc.tapel('#bPoints');await pg.wait_for_timeout(80)
  def slow(x):
    if not slow_xy:return None
    p=slow_xy();d=math.hypot(x['x']-p[0],x['y']-p[1])-45
    return d if d<300 else None
  return await dr.run(cond,target=target,timeout=timeout,slow_when=slow,slow=6,on_tick=tick)
async def main():
  t=T('career')
  async with async_playwright() as p:
    b,c,pg,errs=await page(p);await fixture(pg);tc=await Touch(pg).init();dr=Driver(pg,tc);E=pg.evaluate
    await tc.tapel('#bStart');await pg.wait_for_timeout(200)
    total=0
    for shift in range(3):
      await tc.tapel('#bGo');await pg.wait_for_timeout(600)
      day=await E("SV.D.career.day")
      # pick the nearest freight by straight line
      tgt=await E("(()=>{const L=SIM.S.loco;let b=null,bd=1e9;for(const c of TN.cons){if(c===SIM.S.train)continue;const v=c.veh[0];const d=Math.hypot(v.x-L.x,v.y-L.y);if(d<bd){bd=d;b=c;}}return {e:b.pieces[0].e,id:b.id,n:b.veh.length,name:b.veh[0].name}})()")
      sx=f"(()=>{{const c=TN.cons.find(c=>c.id=={tgt['id']});const v=c?c.veh[0]:SIM.S.loco;return [v.x,v.y]}})()"
      pos=[await E(sx)]
      async def upd():pos[0]=await E(sx);return pos[0]
      await dr.set_brk(0);await dr.set_thr(2)
      x=await drive_to(pg,dr,tc,tgt['e'],lambda x:x['coup']>0,slow_xy=lambda:pos[0])
      t.chk(f'day {day}: reached and coupled {tgt["n"]} wagon(s) ({tgt["name"]})',x['coup']>0 and x['cars']==tgt['n'],x['cars'],x['e'])
      await dr.stop();await dr.rev(-1);await dr.set_brk(0)
      home=lambda:[800,3500]
      x=await drive_to(pg,dr,tc,0,lambda x:x['e']==0 and x['endA']['s']<70 and x['endA']['e']==0 or x['endB']['e']==0 and x['endB']['s']<70 and x['e']==0,slow_xy=home,target=36,timeout=200)
      await dr.stop();await pg.wait_for_timeout(500);x=await st(pg)
      if x['ctx']!='deliver':
        # inch back into the goods road
        for k in range(10):
          await dr.set_brk(0);await dr.set_thr(1);await pg.wait_for_timeout(700);await dr.stop();x=await st(pg)
          if x['ctx']=='deliver':break
      t.chk(f'day {day}: home in the goods road with everything, Deliver offered',x['ctx']=='deliver',x['ctx'],x['endA'],x['endB'])
      c0=await E("SV.D.career.cash");await tc.tapel('#bDeliver');await pg.wait_for_timeout(500)
      r=await E("GAME.lastResult");c1=await E("SV.D.career.cash")
      t.chk(f'day {day}: paid {r["total"]} for {r["cars"]} wagon(s), condition {[round(l["cond"],2) for l in r["lines"]]}',r['total']>0 and c1-c0==r['total'] and not r['fail'])
      total+=r['total']
      await tc.tapel('#bResOk');await pg.wait_for_timeout(300)
    t.chk('three shifts banked money',await E("SV.D.career.cash")==total and await E("SV.D.career.day")==4,total)
    await tc.tapel('.tab[data-tab="shed"]');await pg.wait_for_timeout(150)
    buy=await E("(()=>{const b=[...document.querySelectorAll('#tbShed [data-buy]')].find(b=>!b.disabled);return b?b.dataset.buy:null})()")
    if buy:
      lv0=await E(f"SV.D.career.up['{buy}']|0");await tc.tapel(f'#tbShed [data-buy="{buy}"]');await pg.wait_for_timeout(150)
      t.chk(f'bought an upgrade with earned money ({buy})',await E(f"SV.D.career.up['{buy}']")==lv0+1 and await E("SV.D.career.cash")<total)
    else:t.chk('earned enough for an upgrade',False,total)
    await pg.screenshot(path=str(SHOTS/'upgrades_after_play.png'))
    await b.close()
  t.done(errs)
asyncio.run(main())
