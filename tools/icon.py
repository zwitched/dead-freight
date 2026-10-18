# Renders the app icons with the game's own sprite code (run once; output committed).
import asyncio,base64
from playwright.async_api import async_playwright
JS="""(()=>{const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
 const gr=g.createLinearGradient(0,0,512,512);gr.addColorStop(0,'#5a6a3a');gr.addColorStop(1,'#3c4a2a');g.fillStyle=gr;g.fillRect(0,0,512,512);
 g.save();g.translate(256,256);g.rotate(-Math.PI/4);
 g.fillStyle='#5f574a';g.fillRect(-400,-70,800,140);g.fillStyle='#6d6556';g.fillRect(-400,-52,800,104);
 for(let x=-400;x<400;x+=30){g.fillStyle='#4a3a2c';g.fillRect(x,-62,14,124);}
 for(const y of [-30,30]){g.fillStyle='#2d2a26';g.fillRect(-400,y-6,800,12);g.fillStyle='#b9b2a4';g.fillRect(-400,y-3,800,5);}
 g.fillStyle='rgba(0,0,0,.35)';g.fillRect(-150,-38,320,96);
 const s=ART.sprite({loco:1,len:36});g.drawImage(s,-170,-42,340,84);g.restore();
 const v=g.createRadialGradient(256,256,180,256,256,380);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');g.fillStyle=v;g.fillRect(0,0,512,512);
 return c.toDataURL('image/png');})()"""
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page();await pg.goto('file://'+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','index.html'))+'');await pg.wait_for_timeout(600)
    d=await pg.evaluate(JS);open(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','icon.png'),'wb').write(base64.b64decode(d.split(',')[1]))
    d=await pg.evaluate("(()=>{const i=new Image();return new Promise(r=>{i.onload=()=>{const c=document.createElement('canvas');c.width=c.height=192;c.getContext('2d').drawImage(i,0,0,192,192);r(c.toDataURL('image/png'))};i.src='"+d+"'})})()")
    open(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','icon-192.png'),'wb').write(base64.b64decode(d.split(',')[1]));await b.close()
asyncio.run(m())
