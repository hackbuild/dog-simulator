import asyncio, json
from playwright.async_api import async_playwright
NAMES=['Idle_Loop','Idle_Talking_Loop','Walk_Loop','Walk_Formal_Loop','Jog_Fwd_Loop','Sprint_Loop','Crouch_Idle_Loop','Crouch_Fwd_Loop','Fixing_Kneeling','PickUp_Table','Interact','Dance_Loop','Sitting_Enter','Sitting_Idle_Loop','Sitting_Talking_Loop','Sitting_Exit']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'], headless=True)
        pg = await b.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)[:400])); pg.on('console', lambda m: errs.append(m.text[:200]) if m.type=='error' else None)
        await pg.goto('http://localhost:8765/_ual/bake.html')
        await pg.wait_for_function('window.READY===true', timeout=120000)
        info = await pg.evaluate('window.INFO'); print(json.dumps(info)[:1500])
        data = await pg.evaluate(f'window.bakeAll({json.dumps(NAMES)})')
        json.dump(data, open('work/hanims.json','w'))
        print({k:(v['dur'],v['n'],v['speed']) for k,v in data['clips'].items()})
        print(errs[:5]); await b.close()
asyncio.run(main())
