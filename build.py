#!/usr/bin/env python3
"""Builds dist/index.html: one self-contained file (CSS, JS and icon inlined). No manifest or service worker,
so it works opened straight from disk or dropped onto any static host."""
import re,base64,pathlib
R=pathlib.Path(__file__).resolve().parent
html=(R/'index.html').read_text()
icon='data:image/png;base64,'+base64.b64encode((R/'icon-192.png').read_bytes()).decode()
html=html.replace('<link rel="manifest" href="manifest.webmanifest">\n','')
html=re.sub(r'<link rel="(icon|apple-touch-icon)" href="[^"]+">',lambda m:f'<link rel="{m.group(1)}" href="{icon}">',html)
css=(R/'css/style.css').read_text()
html=html.replace('<link rel="stylesheet" href="css/style.css">','<style>\n'+css+'\n</style>')
def js(m):
  src=(R/m.group(1)).read_text().replace('</script','<\\/script')
  return '<script>\n'+src+'\n</script>'
html=re.sub(r'<script src="([^"]+)"></script>',js,html)
html=re.sub(r"<script>if\('serviceWorker'.*?</script>",'',html,flags=re.S)
(R/'dist').mkdir(exist_ok=True);(R/'dist/index.html').write_text(html)
print('dist/index.html',len(html.encode())//1024,'KB')
