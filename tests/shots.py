# Extra screenshots: driving out on the line, and a long heavy train on Mercy bank.
from drive import *
async def main():
  async with async_playwright() as p:
    b,c,pg,errs=await page(p);await fixture(pg);tc=await Touch(pg).init();dr=Driver(pg,tc);E=pg.evaluate
    await E("FIX.shift({up:{power:2},open:['viaduct'],lots:[]})");await pg.wait_for_timeout(300)
    await E("FIX.train('V1','J3',10,[FIX.cargo('Fire bricks'),FIX.cargo('Seed barley'),FIX.cargo('Cobalt')],{})");await pg.wait_for_timeout(300)
    await dr.set_brk(0);await dr.set_thr(4);await pg.wait_for_timeout(9000);await dr.set_thr(3);await pg.wait_for_timeout(1500)
    await pg.screenshot(path=str(SHOTS/'driving.png'))
    await E("FIX.shift({up:{},open:[],lots:[]})");await pg.wait_for_timeout(300)
    await E("FIX.train('J1','K1',60,[%s],{})"%','.join(["FIX.cargo('Weighbridge')"]*3+["FIX.cargo('Fire bricks')"]*4));await pg.wait_for_timeout(300)
    await dr.set_brk(0);await dr.set_thr(4);await pg.wait_for_timeout(5000)
    await pg.screenshot(path=str(SHOTS/'heavy_train_bank.png'))
    print(errs);await b.close()
asyncio.run(main())
