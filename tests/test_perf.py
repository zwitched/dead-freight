# Frame pacing while driving a long train, measured with requestAnimationFrame in headless Chromium at Pixel 7 size.
# Headless Chromium renders canvas in software, so these are pessimistic. Run unthrottled and with 4x CPU throttling.
from drive import *
async def measure(pg,ms=6000):
  await pg.evaluate("window.__ft=[];window.__lt=0;(function f(t){if(__lt)__ft.push(t-__lt);__lt=t;if(__ft.length<2000)requestAnimationFrame(f)})(performance.now())")
  await pg.wait_for_timeout(ms);ft=await pg.evaluate("__ft.slice(20)");ft.sort()
  return ft[len(ft)//2],ft[int(len(ft)*.95)],1000/(sum(ft)/len(ft))
async def main():
  t=T('perf')
  async with async_playwright() as p:
    b,c,pg,errs=await page(p);await fixture(pg);tc=await Touch(pg).init();dr=Driver(pg,tc);E=pg.evaluate
    cdp=await c.new_cdp_session(pg)
    await E("FIX.shift({up:{power:3},open:['viaduct','larch','quarry','ferrow'],lots:[]})");await pg.wait_for_timeout(300)
    await E("FIX.train('DB','J1',30,[%s],{})"%','.join(["FIX.cargo('Fire bricks')"]*8));await pg.wait_for_timeout(400)
    s0=await E("SIM.S.dist")
    await dr.set_brk(0);await dr.set_thr(4)
    med,p95,fps=await measure(pg)
    t.chk(f'moving 9-vehicle train, no throttling: median frame {med:.1f} ms, 95th pct {p95:.1f} ms, {fps:.0f} fps avg',med<20,med)
    await cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
    med,p95,fps=await measure(pg)
    t.chk(f'CPU x4 (rough mid-range phone stand-in, software canvas): median {med:.1f} ms, 95th {p95:.1f} ms, {fps:.0f} fps',med<55,med)
    await cdp.send('Emulation.setCPUThrottlingRate',{'rate':1})
    t.chk('the train covered ground during the measure',await E("SIM.S.dist")-s0>60,await E("SIM.S.dist")-s0)
    ms=await E("(()=>{const t0=performance.now();for(let i=0;i<600;i++)SIM.step(1/60);return (performance.now()-t0)/600})()")
    t.chk(f'one physics step costs {ms*1000:.0f} us',ms<1)
    await b.close()
  t.done(errs)
asyncio.run(main())
