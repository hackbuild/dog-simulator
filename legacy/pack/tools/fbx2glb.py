import asyncio, json, base64, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'], headless=True)
        pg = await b.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)[:400])); pg.on('console', lambda m: errs.append(m.text[:200]))
        await pg.goto('http://localhost:8765/_fbx.html')
        await pg.wait_for_function('window.READY===true', timeout=120000)
        info = await pg.evaluate('window.INFO'); print(json.dumps(info, indent=0)[:4000])
        if len(sys.argv)>1:
            b64 = await pg.evaluate('window.doExport()')
            open('work/moheeb_raw.glb','wb').write(base64.b64decode(b64)); print('glb bytes', len(base64.b64decode(b64)))
        print(errs[:10]); await b.close()
asyncio.run(main())
