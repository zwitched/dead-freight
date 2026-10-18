# Never stuck: every bad situation has a way out that a player can reach by touch.
# Also save/reload: progress, upgrades, settings survive a reload and a broken save does not brick the game.
from drive import *
async def main():
  t=T('recovery')
  async with async_playwright() as p:
    b,c,pg,errs=await page(p);await fixture(pg);tc=await Touch(pg).init();dr=Driver(pg,tc);E=pg.evaluate
    # 1. out in the far north with wagons: Pause > Radio for a tow brings you home with half pay
    await E("FIX.shift({up:{},open:['viaduct'],lots:[],cash:100})");await pg.wait_for_timeout(250)
    await E("FIX.train('V1','J3',10,[FIX.cargo('Fire bricks')],{})");await pg.wait_for_timeout(200)
    await tc.tapel('#bPause');await pg.wait_for_timeout(150)
    hint=await pg.text_content('#pauseHint')
    t.chk('pause says what a tow costs',('free' in hint) or ('$40' in hint),hint)
    await tc.tapel('#bTow');await pg.wait_for_timeout(200)
    if await pg.is_visible('#sConfirm'):await tc.tapel('#cfYes');await pg.wait_for_timeout(300)
    r=await E("GAME.lastResult")
    t.chk('tow from the pause menu ends the shift with half pay and no fee while tows are free',await pg.is_visible('#sResult') and r['fail']=='tow' and r['fee']==0 and r['lines'][0]['pay']==30,r['fee'],r['lines'])
    tf=await E("SV.D.career.towFree");t.chk('a free tow is used up',tf==1,tf)
    await tc.tapel('#bResOk');await pg.wait_for_timeout(200)
    t.chk('back at the depot after a tow, next shift can start',await pg.is_visible('#sDepot') and await pg.is_visible('#bGo'))
    # 2. out of fuel: the context button offers a tow
    await E("FIX.shift({up:{},open:['viaduct'],lots:[]})");await pg.wait_for_timeout(250)
    await E("SV.D.career.towFree=0;GAME.cfg.towFree=0")
    await E("FIX.train('V1','J3',10,[FIX.cargo('Fire bricks')],{fuel:.2})");await pg.wait_for_timeout(200)
    await dr.set_brk(0);await dr.set_thr(4)
    for i in range(120):
      x=await st(pg)
      if x['ctx']=='tow':break
      if x['fuel']<=0 and x['brk']<.9:await dr.set_thr(0);await dr.set_brk(1)  # engine dead: brake to a stand
      await pg.wait_for_timeout(200)
    x=await st(pg);t.chk('out of fuel: a "Radio for a tow" button appears on the track view',x['ctx']=='tow',x['ctx'],x['fuel'])
    c0=await E("SV.D.career.cash");await tc.tapel('#bTowCtx');await pg.wait_for_timeout(300)
    r=await E("GAME.lastResult");c1=await E("SV.D.career.cash")
    t.chk('paid tow: $40 fee, cash never goes below zero',r['fee']==40 and c1>=0 and c1-c0==r['total'],r['fee'],c0,c1)
    await tc.tapel('#bResOk');await pg.wait_for_timeout(200)
    # 3. boxed in at a dead end with the brakes on and the reverser wrong: FWD/REV and the levers get you out
    await E("FIX.shift({up:{},open:[],lots:[]})");await pg.wait_for_timeout(250)
    await E("FIX.train('BF0','BFb',200,[FIX.cargo('Fire bricks'),FIX.cargo('Fire bricks')],{})");await pg.wait_for_timeout(200)
    await dr.set_brk(0);await dr.set_thr(2)
    for i in range(80):
      x=await st(pg)
      if x['V']<.2 and i>10:break
      await pg.wait_for_timeout(200)
    await dr.stop();await dr.rev(-1);await dr.set_brk(0);await dr.set_thr(3);await pg.wait_for_timeout(5000)
    x=await st(pg);t.chk('pushed up to the buffers at a dead end: REV pulls you back out',x['e']!=await E("SIM.edgeBy('BF0','BFb')") or x['V']>3,x['e'],x['V'])
    await dr.stop()
    # 4. save and reload mid-shift: career, upgrades and settings survive; the shift is lost but nothing else
    await E("SV.D.career.cash=777;SV.D.career.up={brakes:2};SV.D.set.snd=0;SV.save()")
    day=await E("SV.D.career.day")
    await pg.reload();await pg.wait_for_timeout(700);await fixture(pg);tc=await Touch(pg).init()
    t.chk('reload: title shows again',await pg.is_visible('#bStart'))
    t.chk('reload: cash, day, upgrades and settings kept',await E("SV.D.career.cash===777&&SV.D.career.day==="+str(day)+"&&SV.D.career.up.brakes===2&&SV.D.set.snd===0"))
    await tc.tapel('#bStart');await pg.wait_for_timeout(200)
    t.chk('reload: Clock on offers the main menu with the career',await pg.is_visible('#sMenu'))
    await tc.tapel('#bCareer');await pg.wait_for_timeout(200)
    t.chk('reload: Continue opens the depot of the saved career',await pg.is_visible('#sDepot') and '777' in await pg.text_content('#sDepot'))
    await tc.tapel('#bGo');await pg.wait_for_timeout(500)
    t.chk('reload: upgraded brakes are in the shift',await E("SIM.S.spec.Bl")==1450)
    # 5. a corrupt save falls back to a fresh one instead of breaking
    await E("SV.save=()=>{};localStorage.setItem('deadfreight.v1','{oops')");await pg.reload();await pg.wait_for_timeout(700);tc=await Touch(pg).init()
    await tc.tapel('#bStart');await pg.wait_for_timeout(300)
    t.chk('corrupt save: the game still starts a fresh career',await pg.is_visible('#sDepot') and await E("SV.D.career.day===1"))
    # 6. pause on background, resume on return
    await tc.tapel('#bGo');await pg.wait_for_timeout(400)
    await E("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))");await pg.wait_for_timeout(150)
    t.chk('switching apps pauses the shift',await E("GAME.state")=='pause')
    await E("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))")
    await tc.tapel('#bResume');await pg.wait_for_timeout(200);t.chk('Resume carries on',await E("GAME.state")=='play')
    t.chk('no errors caught in the game loop',await E("!GAME.errors"))
    await b.close()
  t.done(errs)
asyncio.run(main())
