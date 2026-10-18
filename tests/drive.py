# A tiny "driver" that plays the game through the on-screen levers and buttons. It reads the HUD/state to decide,
# then acts only with touch events on #lvThr, #lvBrake, #bFwd/#bRev, #bPoints and the context buttons.
from util import *
class Driver:
  def __init__(s,pg,tc):s.pg=pg;s.tc=tc;s.thr=0;s.brk=None
  async def set_thr(s,n):
    cur=(await st(s.pg))['thr']
    if cur!=n:await s.tc.lever('lvThr',n/5)
  async def set_brk(s,v):
    cur=(await st(s.pg))['brk']
    if abs(cur-v)>.06:await s.tc.lever('lvBrake',v)
  async def stop(s,timeout=40):
    await s.set_thr(0);await s.set_brk(1)
    for i in range(int(timeout*10)):
      x=await st(s.pg)
      if x['V']<.3:return True
      await s.pg.wait_for_timeout(100)
    return False
  async def set_points_for(s,route_word,max_taps=3):
    for i in range(max_taps):
      x=await st(s.pg)
      if route_word.lower() in x['pset'].lower():return True
      await s.tc.tapel('#bPoints');await s.pg.wait_for_timeout(150)
    return route_word.lower() in (await st(s.pg))['pset'].lower()
  async def rev(s,r):
    await s.tc.tapel('#bRev' if r<0 else '#bFwd');await s.pg.wait_for_timeout(80)
  # drive along until cond(state) is true, holding about target speed (u/s) using the levers
  async def run(s,cond,target=30,timeout=90,slow_when=None,slow=7,on_tick=None):
    for i in range(int(timeout*8)):
      x=await st(s.pg)
      if cond(x):return x
      if x['state']!='play':return x
      tg=target
      if slow_when:
        d=slow_when(x)
        if d is not None:tg=min(target,max(slow,d*.35))
      if on_tick:await on_tick(x)
      if x['V']<tg-6:
        if x['brk']>.05:await s.set_brk(0)
        await s.set_thr(4 if x['V']<tg-15 else 3)
      elif x['V']>tg+4:
        await s.set_thr(0)
        await s.set_brk(min(1,.25+(x['V']-tg)/25))
      else:
        if x['brk']>.05:await s.set_brk(0)
        if x['thr']>2:await s.set_thr(1)
      await s.pg.wait_for_timeout(125)
    return await st(s.pg)
