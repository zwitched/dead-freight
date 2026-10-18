# Smoke test against the deployed site: loads, service worker installs, a shift starts and the loco drives by touch.
from drive import *
URL=sys.argv[1] if len(sys.argv)>1 else 'https://zwitched.github.io/dead-freight/'
async def main():
  t=T('live')
  async with async_playwright() as p:
    b,c,pg,errs=await page(p,url=URL);tc=await Touch(pg).init();dr=Driver(pg,tc)
    t.chk('live site shows the title',await pg.is_visible('#bStart'))
    await tc.tapel('#bStart');await pg.wait_for_timeout(200);await tc.tapel('#bGo');await pg.wait_for_timeout(600)
    await dr.set_brk(0);await dr.set_thr(2);await pg.wait_for_timeout(2000)
    t.chk('live: the loco drives',(await st(pg))['V']>2)
    t.chk('live: service worker registered',await pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>!!r)"))
    await pg.screenshot(path='/tmp/live.png');await b.close()
  t.done(errs)
asyncio.run(main())
