# Frame pacing while driving a long train through the busiest scenery, measured with requestAnimationFrame in
# headless Chromium at Pixel 7 size with 4x CPU throttling (a rough stand-in for a mid-range phone).
from drive import *
async def main():
  t=T('perf')
  async with async_playwright() as p:
    b,c,pg,errs=await page(p);await fixture(pg);tc=await Touch(pg).init();dr=Driver(pg,tc);E=pg.evaluate
    cdp=await c.new_cdp_session(pg);await cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
    await E("FIX.shift({up:{power:3},open:['viaduct','larch','quarry','ferrow'],lots:[]})");await pg.wait_for_timeout(300)
    await E("FIX.train('DB','J1',30,[%s],{})"%','.join(["FIX.cargo('Fire bricks')"]*8));await pg.wait_for_timeout(400)
    await dr.set_brk(0);await dr.set_thr(5)
    await E("window.__ft=[];(function f(t){if(window.__lt)__ft.push(t-__lt);__lt=t;if(__ft.length<1500)requestAnimationFrame(f)})(performance.now())")
    await pg.wait_for_timeout(12000)
    ft=await E("__ft.slice(30)");ft.sort()
    med=ft[len(ft)//2];p95=ft[int(len(ft)*.95)];fps=1000/(sum(ft)/len(ft))
    x=await st(pg)
    t.chk(f'moving 9-vehicle train, CPU x4: median frame {med:.1f} ms, 95th pct {p95:.1f} ms, {fps:.0f} fps avg',med<20 and p95<40,len(ft))
    t.chk('the train covered ground during the measure',x['e']!=0 or x['endB']['s']>200,x['e'])
    await cdp.send('Emulation.setCPUThrottlingRate',{'rate':1})
    ms=await E("(()=>{const t0=performance.now();for(let i=0;i<600;i++)SIM.step(1/60);return (performance.now()-t0)/600})()")
    t.chk(f'one physics step costs {ms*1000:.0f} us',ms<1)
    await b.close()
  t.done(errs)
asyncio.run(main())
