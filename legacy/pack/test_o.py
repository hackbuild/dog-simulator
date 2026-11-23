import asyncio, json, os, sys
from playwright.async_api import async_playwright
ROOT='/home/claude/dog/lib/node_modules/'
async def main():
    args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=args, headless=True)
        ctx = await b.new_context(viewport={'width':int(os.environ.get('VW','1360')),'height':int(os.environ.get('VH','860'))})
        async def jsd(route):
            u=route.request.url.split('cdn.jsdelivr.net/npm/')[1]
            pkg,_,path = u.partition('/') if not u.startswith('@') else ('/'.join(u.split('/')[:2]),'/', '/'.join(u.split('/')[2:]))
            name=pkg.rsplit('@',1)[0]; f=os.path.join(ROOT,name,path)
            if os.path.exists(f): await route.fulfill(path=f, headers={'content-type':'application/javascript' if f.endswith(('js','mjs')) else 'application/wasm','access-control-allow-origin':'*'})
            else: await route.fulfill(status=404)
        await ctx.route('https://cdn.jsdelivr.net/**', jsd)
        def gh(r):
            u=r.request.url
            if 'quadruped.json' in u: return r.fulfill(path='/home/claude/dog/nn/quadruped.json', headers={'access-control-allow-origin':'*','content-type':'application/json'})
            if 'quadruped.bin' in u: return r.fulfill(path='/home/claude/dog/nn/quadruped.bin', headers={'access-control-allow-origin':'*','content-type':'application/octet-stream'})
            return r.fulfill(path='/home/claude/dog/models/yolov8n.onnx', headers={'access-control-allow-origin':'*'})
        await ctx.route('https://raw.githubusercontent.com/**', gh)
        await ctx.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, body='', headers={'content-type':'text/css'}))
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)[:400]))
        pg.on('console', lambda m: errs.append(m.text[:300]) if m.type in ('error','warning') and 'GL Driver' not in m.text and 'onnxruntime' not in m.text else None)
        await pg.goto('file:///home/claude/dog/hackle.html'); await pg.wait_for_timeout(9000)
        await pg.evaluate("()=>{document.getElementById('netOn').checked=false}")
        st="()=>{const h=window.__hackle,H=h.HUM,b=h.brain; return [H.task&&H.task.name, H.pos.x.toFixed(1),H.pos.z.toFixed(1), H.v.toFixed(2), 'dog', b.cur, b.sub, b.stage, h.dog.pos.x.toFixed(2), h.dog.pos.z.toFixed(2), h.dog.v.toFixed(2), 'nn', h.NG.state, h.NG.active, h.NG.guidance, h.NG.ms.toFixed(0), 'clk', h.CLOCK.h.toFixed(2), 'att', h.attention.label, 'pend', b.pending&&b.pending.b, 'tgt', h.motor.target.x.toFixed(1), h.motor.target.z.toFixed(1), h.motor.mode, h.motor.done].join(' | ')}"
        steps=sys.argv[1].split('~') if len(sys.argv)>1 else []
        for i,stp in enumerate(steps):
            if stp.startswith('js:'): await pg.evaluate("()=>{"+stp[3:]+"}")
            elif stp.startswith('w'): 
                for k in range(int(stp[1:])): await pg.wait_for_timeout(1000); print(await pg.evaluate(st))
            elif stp.startswith('shot:'):
                nm,cam=stp[5:].split('@')
                await pg.evaluate("(c)=>{const h=window.__hackle,H=h.HUM; h.setCam(1); const [d,hh,side]=c.split('/').map(Number); const s=Math.sin(H.yaw),co=Math.cos(H.yaw); h.controls.target.set(H.pos.x, H.root.position.y+0.9, H.pos.z); h.camera.position.set(H.pos.x+s*d+co*side, H.root.position.y+hh, H.pos.z+co*d-s*side); h.controls.update();}", cam)
                await pg.wait_for_timeout(300); await pg.screenshot(path=nm+'.png', clip={'x':0,'y':52,'width':980,'height':808})
            elif stp.startswith('dshot:'):
                nm,cam=stp[6:].split('@')
                await pg.evaluate("(c)=>{const h=window.__hackle,D=h.dog; h.setCam(1); const [d,hh,side]=c.split('/').map(Number); const s=Math.sin(D.yaw),co=Math.cos(D.yaw); h.controls.target.set(D.pos.x, D.root.position.y+0.35, D.pos.z); h.camera.position.set(D.pos.x+s*d+co*side, D.root.position.y+hh, D.pos.z+co*d-s*side); h.controls.update();}", cam)
                await pg.wait_for_timeout(250); await pg.screenshot(path=nm+'.png', clip={'x':0,'y':52,'width':980,'height':808})
            elif stp.startswith('full:'): await pg.screenshot(path=stp[5:]+'.png')
            elif stp.startswith('eval:'): print('EVAL', await pg.evaluate('async()=>{'+stp[5:]+'}'))
            elif stp.startswith('soak:'):
                n=int(stp[5:]); cnt={}; gd={}; hum={}
                for k in range(n*2):
                    await pg.wait_for_timeout(500)
                    r=await pg.evaluate("()=>{const h=window.__hackle;return [h.brain.cur,h.NG.active?h.NG.guidance:'cpg',h.HUM.task?h.HUM.task.name:'-']}")
                    cnt[r[0]]=cnt.get(r[0],0)+1; gd[r[1]]=gd.get(r[1],0)+1; hum[r[2]]=hum.get(r[2],0)+1
                print('BEH',sorted(cnt.items(),key=lambda x:-x[1])); print('GAIT',sorted(gd.items(),key=lambda x:-x[1])); print('HUM',sorted(hum.items(),key=lambda x:-x[1]))
            elif stp.startswith('tab:'): await pg.click(f'[data-p={stp[4:]}]')
        print('\n'.join(errs[:15])); await b.close()
asyncio.run(main())
