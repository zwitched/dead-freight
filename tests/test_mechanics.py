# Train-handling mechanics. Scenarios are laid out with tests/fixture.js (where the train stands); every control
# action is a real touch on the levers, buttons or the track view.
from drive import *
BR="FIX.cargo('Fire bricks')";WT="FIX.cargo('Weighbridge')";GL="FIX.cargo('Cobalt')";GR="FIX.cargo('Seed barley')"
async def setup(pg,a,b,s,wag,up=None,open_=None,lots=None,fuel=None):
  await pg.evaluate(f"FIX.shift({{up:{json.dumps(up or {})},open:{json.dumps(open_ or [])},lots:{lots or '[]'}}})");await pg.wait_for_timeout(250)
  n=await pg.evaluate(f"FIX.train('{a}','{b}',{s},[{','.join([wag[0]]*wag[1]) if wag else ''}],{{fuel:{'null' if fuel is None else fuel}}})")
  await pg.wait_for_timeout(150);return n
async def timed(pg,cond,limit):
  t0=await pg.evaluate("SIM.S.t")
  for i in range(int(limit*20)):
    x=await st(pg)
    if cond(x):return x['t']-t0,x
    await pg.wait_for_timeout(50)
  x=await st(pg);return None,x
async def main():
  t=T('mechanics')
  async with async_playwright() as p:
    b,c,pg,errs=await page(p);await fixture(pg);tc=await Touch(pg).init();dr=Driver(pg,tc);E=pg.evaluate
    ALL="['viaduct','larch','quarry','ferrow']"
    # ---- acceleration falls with weight
    res={}
    for n in (0,4):
      await setup(pg,'V1','J3',10,(BR,n) if n else None,open_=['viaduct','larch','quarry','ferrow'])
      await dr.set_brk(0);await dr.set_thr(4)
      dt,x=await timed(pg,lambda x:x['V']>=30,40);res[n]=dt
    t.chk('acceleration: engine alone reaches 13 mph much faster than with 4 loaded wagons',res[0] and res[4] and res[4]>2.5*res[0],res)
    # ---- braking distance grows with weight; the stop marker predicts it
    bd={}
    for n in (0,4):
      await setup(pg,'V1','J3',10,(BR,n) if n else None,open_=['viaduct','larch','quarry','ferrow'])
      await dr.set_brk(0);await dr.set_thr(4 if n else 3)
      await timed(pg,lambda x:x['V']>=40,60);pred=(await st(pg))['stop']
      d0=await E("SIM.S.dist");await dr.set_thr(0);await tc.lever('lvBrake',1)
      await timed(pg,lambda x:x['V']<.3,40);d1=await E("SIM.S.dist");bd[n]=(pred,d1-d0)
    t.chk('braking: full brake from 17 mph takes far longer with 4 loaded wagons',bd[4][1]>1.8*bd[0][1],bd)
    t.chk('stop marker prediction within 25% of the real stopping distance',all(abs(a-b_)<.25*b_+12 for a,b_ in bd.values()),bd)
    await pg.screenshot(path=str(SHOTS/'heavy_train.png'))
    # ---- wheelslip on full power from a stand, cleared by easing off
    await setup(pg,'DB','J1',30,None)
    await dr.set_brk(0);await dr.set_thr(5);await pg.wait_for_timeout(900)
    sl=await E("SIM.S.loco.slip");txt=await pg.text_content('#stopTxt')
    t.chk('notch 5 from a stand slips the wheels and the HUD says so',sl>.5 and 'Wheelslip' in txt,sl,txt)
    await dr.set_thr(3);await pg.wait_for_timeout(1200);sl=await E("SIM.S.loco.slip")
    t.chk('easing to notch 3 stops the slip',sl<.2,sl)
    # ---- sanders
    await setup(pg,'DB','J1',30,None,up={'sand':1})
    t.chk('sanders fitted: SAND button shows 3 doses',(await pg.text_content('#bSand')).strip()=='SAND 3')
    await dr.set_brk(0);await dr.set_thr(5);await pg.wait_for_timeout(500)
    await tc.tapel('#bSand');await pg.wait_for_timeout(700)
    t.chk('SAND gives grip: no slip at notch 5 while sanding, one dose used',await E("SIM.S.sandT>0&&SIM.S.loco.slip<.3&&SIM.S.sand===2"),await E("[SIM.S.sandT,SIM.S.loco.slip,SIM.S.sand]"))
    # ---- banks: a heavy train stalls pulling up Kesh Bank, a light one climbs; leaving wagons recovers
    # loco near the top of the bank facing downhill, 7 heavy wagons below it; reverse to haul them up
    await setup(pg,'K1','J1',70,(WT,7))
    K1="(()=>{const n=TK.N['K1'],L=SIM.S.loco;return Math.hypot(n.x-L.x,n.y-L.y)})()"
    d0=await E(K1)
    await dr.rev(-1);await dr.set_brk(0);await dr.set_thr(4);await pg.wait_for_timeout(14000)
    x=await st(pg);d1=await E(K1)
    t.chk('7 x 51 t wagons stall on the 1-in-30 bank (no headway uphill)',d1>d0-15,[d0,d1],x['v'])
    t.chk('Dot warns about the stall',await E("!!SIM.S.flags.stall||!!SIM.S.flags.roll"))
    await dr.stop();await dr.set_thr(0)
    # leave the 4 lowest wagons: tap the 4th wagon from the loco, then Leave on its card
    q="(()=>{const T=SIM.S.train,li=T.veh.indexOf(SIM.S.loco);const v=T.veh[li-4];return RD.toScreen(v.x,v.y)})()"
    pt=await E(q);top=await E("RD.view.top");bot=await E("innerHeight-RD.view.bot")
    if pt[1]<top+60 or pt[1]>bot-60:  # out of the view: drag the map to bring it into sight, as a player would
      cy=(top+bot)/2;await tc.drag((200,cy),(200,cy+(cy-pt[1])),steps=12);await pg.wait_for_timeout(200);pt=await E(q)
    await tc.tap(pt);await pg.wait_for_timeout(250)
    t.chk('tapping a wagon opens its card',await pg.is_visible('#card') and await pg.is_visible('#cbLeave'),await pg.text_content('#cardName'),pt)
    await pg.screenshot(path=str(SHOTS/'wagon_card.png'))
    await tc.tapel('#cbLeave');await pg.wait_for_timeout(200)
    t.chk('Leave splits the train: 3 wagons stay coupled, 4 left on the bank',await E("SIM.carsOn().length")==3 and await E("TN.cons.some(c=>c!==SIM.S.train&&c.veh.length===4)"))
    await dr.set_brk(0);await dr.set_thr(4)
    ok=False;top_e=await E("SIM.edgeBy('K1','J2')")
    for i in range(240):
      x=await st(pg)
      if x['e']==top_e:ok=True;break
      await pg.wait_for_timeout(250)
    t.chk('lighter train climbs the bank to the top',ok,x['e'],x['V'])
    await dr.stop()
    # ---- coupling speed
    lot="[{loc:'brick',slot:['J1','DB',110],cars:[FIX.cargo('Chimney pots')]}]"
    await setup(pg,'DB','J1',30,None,lots=lot)
    await dr.set_brk(0);await dr.set_thr(4)
    _,x=await timed(pg,lambda x:x['coup']>0,30)
    q=await E("SIM.carsOn().map(v=>v.cond)");t.chk('ramming a wagon fast is a hard coupling and breaks the pots',x['coup']==1 and q[0]<.85,q,x['V'])
    await setup(pg,'DB','J1',30,None,lots=lot)
    wp=await E("(()=>{const c=TN.cons.find(c=>c!==SIM.S.train);return c.veh[0].y})()")
    x=await dr.run(lambda x:x['coup']>0,target=20,timeout=40,slow_when=lambda x:(x['y']-wp-40) if x['y']-wp<200 else None,slow=6)
    q=await E("SIM.carsOn().map(v=>v.cond)");t.chk('rolling in under 4 mph couples softly, no damage',x['coup']==1 and q[0]>.99,q)
    # ---- fragile cargo and hard braking
    for brk,label in ((1,'full brake'),(.3,'gentle brake')):
      await setup(pg,'V1','J3',10,(GL,1),open_=['viaduct','larch','quarry','ferrow'])
      await dr.set_brk(0);await dr.set_thr(4);await timed(pg,lambda x:x['V']>=40,30);await dr.set_thr(0);await tc.lever('lvBrake',brk)
      await timed(pg,lambda x:x['V']<.5,40);q=await E("SIM.carsOn()[0].cond")
      if brk==1:t.chk('fragile glass: a full-brake stop breaks some of it',q<.97,q)
      else:t.chk('fragile glass: a gentle stop keeps it whole',q>.995,q)
    # ---- loose load on a fast curve
    await setup(pg,'K1','J2',10,(GR,1))
    await dr.set_points_for('Mercy');await dr.set_brk(0);await dr.set_thr(5)
    seen=False
    for i in range(120):
      o=await E("SIM.S.over");seen=seen or o>3
      if await E(f"SIM.S.loco.e===SIM.edgeBy('M0','Ma')||SIM.S.loco.e===SIM.edgeBy('M0','Mb')"):break
      await pg.wait_for_timeout(150)
    q=await E("SIM.carsOn()[0].cond");t.chk('loose grain spills when the curve limit is exceeded',seen and q<.99,seen,q)
    # ---- points: world tap toggles; occupied points refuse
    await setup(pg,'DB','J1',150,None)
    sw0=await E("TK.N.J1.sw");pt=await E("RD.toScreen(TK.N.J1.x,TK.N.J1.y)")
    vis=await E(f"{pt[1]}>RD.view.top&&{pt[1]}<RD.H-RD.view.bot")
    if not vis:
      await dr.set_brk(0);await dr.set_thr(2);await timed(pg,lambda x:x['y']<3200,20);await dr.stop()
      pt=await E("RD.toScreen(TK.N.J1.x,TK.N.J1.y)")
    await tc.tap(pt);await pg.wait_for_timeout(200)
    t.chk('tapping the points on the track throws them',await E("TK.N.J1.sw")!=sw0)
    await setup(pg,'DB','J1',380,None)
    sw0=await E("TK.N.J1.sw");pt=await E("RD.toScreen(TK.N.J1.x,TK.N.J1.y)");await tc.tap(pt);await pg.wait_for_timeout(200)
    t.chk('points with a train on them cannot be thrown',await E("TK.N.J1.sw")==sw0 and await E("TN.occupied('J1')"))
    # ---- trailing through points sets them
    await setup(pg,'BF0','BFb',100,None)
    jset=await E("(()=>{const n=TK.N.J1,sw=n.p.length==2?n.p:n.m;return TK.E[sw[n.sw]].route})()")
    await dr.rev(-1);await dr.set_brk(0);await dr.set_thr(3)
    x=await dr.run(lambda x:x['e']==0,target=25,timeout=40)
    jset2=await E("(()=>{const n=TK.N.J1,sw=n.p.length==2?n.p:n.m;return TK.E[sw[n.sw]].route})()")
    t.chk('trailing through J1 from Brickfield sets the points behind you',jset=='Main line' and jset2=='Brickfield' and x['e']==0,jset,jset2)
    # ---- reverser refuses while moving
    t.chk('REV is refused while the train is moving',x['V']>1 and (await tc.tapel('#bFwd')) is None and await E("SIM.S.ctl.rev")==-1 and 'shake' in (await pg.get_attribute('#rev','class') or ''))
    # ---- closed viaduct stops you, repaired viaduct lets you through
    await setup(pg,'J2','V0',100,None)
    await dr.set_brk(0);await dr.set_thr(2)
    for i in range(60):
      if await E("SIM.S.flags&&GAME.flags['barviaduct']"):break
      await pg.wait_for_timeout(200)
    await pg.wait_for_timeout(1500);x=await st(pg)
    t.chk('broken viaduct: the barrier stops the train and Dot explains',await E("GAME.flags['barviaduct']===1") and x['e'] in (await E("[SIM.edgeBy('J2','V0'),SIM.edgeBy('V0','V1')]")) and await E("TN.end(SIM.S.train,0).s")<=8.5,x['e'])
    await pg.screenshot(path=str(SHOTS/'viaduct_closed.png'))
    await setup(pg,'J2','V0',100,None,open_=['viaduct'])
    await dr.set_brk(0);await dr.set_thr(3)
    ok=False
    for i in range(80):
      if await E("SIM.S.loco.e===SIM.edgeBy('V1','J3')"):ok=True;break
      await pg.wait_for_timeout(200)
    t.chk('repaired viaduct: the line north is open',ok)
    # ---- buffers: a hard knock damages, a fast one derails and ends the shift
    await setup(pg,'J1','K1',300,None)
    await dr.rev(-1);await dr.set_brk(0);await dr.set_thr(5)
    for i in range(160):
      if await E("GAME.state")=='result':break
      await pg.wait_for_timeout(150)
    t.chk('hitting the depot buffers at speed derails: shift ends "Off the rails"',await pg.is_visible('#sResult') and (await pg.text_content('#rTitle'))=='Off the rails',await E("SIM.S.lastBuf"))
    await tc.tapel('#bResOk');await pg.wait_for_timeout(200)
    # ---- out of fuel: stranded, tow, half pay
    await setup(pg,'V1','J3',10,(BR,1),open_=['viaduct'],fuel=.4)
    cash0=await E("SV.D.career.cash")
    await dr.set_brk(0);await dr.set_thr(4)
    for i in range(200):
      if await E("SIM.S.fail==='fuel'"):break
      await pg.wait_for_timeout(150)
    await pg.wait_for_timeout(300)
    t.chk('running dry strands you and offers a tow',await E("SIM.S.fail")=='fuel' and await pg.is_visible('#bTowCtx'))
    await tc.tapel('#bTowCtx');await pg.wait_for_timeout(300)
    r=await E("GAME.lastResult")
    t.chk('tow: shift fails, the wagon pays half',r['fail']=='fuel' and r['lines'][0]['pay']==30 and await pg.is_visible('#sResult'),r)
    await tc.tapel('#bResOk');await pg.wait_for_timeout(200)
    # ---- pointercancel on a lever releases it and keeps its value
    await setup(pg,'DB','J1',30,None)
    g=await E("(()=>{const h=document.querySelector('#lvThr .handle').getBoundingClientRect();return [h.x+h.width/2,h.y+h.height/2]})()")
    await tc.send('touchStart',[(0,g)]);
    for k in range(1,6):await tc.send('touchMove',[(0,(g[0],g[1]-k*12))]);await pg.wait_for_timeout(16)
    held=await E("document.getElementById('lvThr').classList.contains('held')");v=await E("SIM.S.ctl.thr")
    await tc.send('touchCancel',[]);await pg.wait_for_timeout(100)
    t.chk('touchcancel on a lever: released cleanly, notch kept',held and v>=1 and not await E("document.getElementById('lvThr').classList.contains('held')") and await E("SIM.S.ctl.thr")==v,v)
    # two fingers at once: brake and throttle together
    gb=await E("(()=>{const h=document.querySelector('#lvBrake .handle').getBoundingClientRect();return [h.x+h.width/2,h.y+h.height/2]})()")
    gt=await E("(()=>{const h=document.querySelector('#lvThr .handle').getBoundingClientRect();return [h.x+h.width/2,h.y+h.height/2]})()")
    await tc.send('touchStart',[(0,gb),(1,gt)])
    for k in range(1,8):await tc.send('touchMove',[(0,(gb[0],gb[1]+k*20)),(1,(gt[0],gt[1]-k*20))]);await pg.wait_for_timeout(16)
    await tc.send('touchEnd',[]);await pg.wait_for_timeout(100)
    t.chk('two thumbs: brake and power levers move at the same time',await E("SIM.S.ctl.brk")>.6 and await E("SIM.S.ctl.thr")>=3,await E("[SIM.S.ctl.brk,SIM.S.ctl.thr]"))
    await b.close()
  t.done(errs)
asyncio.run(main())
