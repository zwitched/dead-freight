# Portrait layouts: every control on screen, big enough to hit, nothing overlapping, a usable view of the line, no scrolling.
from drive import *
DEVS=['iPhone SE','iPhone 13','iPhone 14 Pro Max','Pixel 7','Galaxy S9+',{'viewport':{'width':360,'height':640},'device_scale_factor':2,'is_mobile':True,'has_touch':True}]
CTRL=['#bPause','#gSpeed','#bMap','#lvBrake','#lvThr','#bFwd','#bRev','#bPoints','#bHorn','#bSand']
async def main():
  t=T('layout')
  async with async_playwright() as p:
    for dev in DEVS:
      name=dev if isinstance(dev,str) else '360x640'
      b,c,pg,errs=await page(p,dev);await fixture(pg);E=pg.evaluate;tc=await Touch(pg).init()
      t.chk(f'[{name}] title fits: start button on screen',await E("(()=>{const r=document.getElementById('bStart').getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0})()"))
      await tc.tapel('#bStart');await pg.wait_for_timeout(150)
      t.chk(f'[{name}] depot screen: Start shift button on screen',await E("(()=>{const r=document.getElementById('bGo').getBoundingClientRect();return r.bottom<=innerHeight&&r.height>=40})()"))
      await tc.tapel('#bGo');await pg.wait_for_timeout(500)
      rs=await E("(()=>{const o={};for(const s of %s){const r=document.querySelector(s).getBoundingClientRect();o[s]=[r.left,r.top,r.right,r.bottom]}return o})()"%json.dumps(CTRL))
      W,H=await E("[innerWidth,innerHeight]")
      on=all(r[0]>=0 and r[1]>=0 and r[2]<=W+.5 and r[3]<=H+.5 for r in rs.values())
      t.chk(f'[{name}] all driving controls fully on screen',on,{k:v for k,v in rs.items() if not(v[0]>=0 and v[1]>=0 and v[2]<=W and v[3]<=H)})
      big=all((r[2]-r[0])>=44 and (r[3]-r[1])>=40 for k,r in rs.items())
      t.chk(f'[{name}] every control at least 44x40 px',big,{k:[round(v[2]-v[0]),round(v[3]-v[1])] for k,v in rs.items()})
      ov=[]
      ks=list(rs)
      for i in range(len(ks)):
        for j in range(i+1,len(ks)):
          a,b_=rs[ks[i]],rs[ks[j]]
          if a[0]<b_[2]-1 and b_[0]<a[2]-1 and a[1]<b_[3]-1 and b_[1]<a[3]-1:ov.append((ks[i],ks[j]))
      t.chk(f'[{name}] no two controls overlap',not ov,ov)
      vh=await E("innerHeight-RD.view.top-RD.view.bot")
      t.chk(f'[{name}] the view of the line is at least 300 px tall',vh>=300,vh)
      lever=await E("document.querySelector('#lvThr').getBoundingClientRect().height");t.chk(f'[{name}] power lever has a long throw (>=150 px)',lever>=150,lever)
      t.chk(f'[{name}] no page scroll',await E("document.scrollingElement.scrollHeight<=innerHeight+1&&document.scrollingElement.scrollWidth<=innerWidth+1"))
      # deliver button and card don't cover the panel
      await E("FIX.train('DB','J1',30,[FIX.cargo('Fire bricks')],{})");await pg.wait_for_timeout(400)
      pt=await E("(()=>{const v=SIM.carsOn()[0];return RD.toScreen(v.x,v.y)})()");await tc.tap(pt);await pg.wait_for_timeout(200)
      cr=await E("(()=>{const a=document.getElementById('card').getBoundingClientRect(),p=document.getElementById('panel').getBoundingClientRect();return [a.bottom<=p.top+1,a.top>=0,a.height]})()")
      t.chk(f'[{name}] wagon card sits above the control panel',await pg.is_visible('#card') and cr[0] and cr[1],cr)
      await tc.tapel('#cbClose')
      await pg.wait_for_timeout(300)
      d=await E("(()=>{const a=document.getElementById('bDeliver');if(!a)return null;const r=a.getBoundingClientRect(),p=document.getElementById('panel').getBoundingClientRect();return [r.bottom<=p.top+1,r.height]})()")
      t.chk(f'[{name}] Deliver button shows above the panel',d and d[0] and d[1]>=44,d)
      if name=='iPhone SE':await pg.screenshot(path=str(SHOTS/'layout_iphone_se.png'))
      # menus fit
      for sid,op in (('sPause',"GAME.pause()"),('sHelp',"UI.show('sHelp')"),('sSettings',"UI.settings('sMenu')")):
        await E(op);await pg.wait_for_timeout(100)
        fit=await E(f"(()=>{{const r=document.querySelector('#{sid} .panel').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1}})()")
        t.chk(f'[{name}] {sid} panel fits on screen',fit)
      # rotate to landscape on phones shows the turn-upright notice
      await pg.set_viewport_size({'width':int(H),'height':int(W)});await pg.wait_for_timeout(200)
      t.chk(f'[{name}] landscape shows "turn your phone upright"',await E("getComputedStyle(document.getElementById('rotate')).display")=='flex' if H>W and W<=500 else True)
      await pg.set_viewport_size({'width':int(W),'height':int(H)});await pg.wait_for_timeout(200)
      t.chk(f'[{name}] after resize back, the view recovers',await E("RD.W")==W and await E("Math.abs(RD.view.bot-(innerHeight-document.getElementById('panel').getBoundingClientRect().top))<2"))
      errs and t.chk(f'[{name}] no errors',False,errs)
      await b.close()
  t.done([])
asyncio.run(main())
