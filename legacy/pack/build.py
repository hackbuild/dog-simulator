import base64, json, re, sys
s = open('src/hackle_src.html').read()
core = open('src/avatar_core.js').read()
ci = core.index('const PREFIX'); cj = core.index('const VRM_NAMES')
human = open('src/human.js').read().replace('/*@@CLASSIFY@@*/', core[ci:cj])
infer = open('src/nn_infer.js').read().replace("if (typeof module !== 'undefined') module.exports = { nnInferHost };", '')
gait = open('src/nn_gait.js').read().replace('/*@@NNBIND@@*/[]', json.dumps(json.load(open('nn/bind.json')), separators=(',', ':')))
mods = {'/*@@ORGANIC@@*/': open('src/organic.js').read(), '/*@@BODY@@*/': open('src/body.js').read(), '/*@@NNINFER@@*/': infer,
        '/*@@NNGAIT@@*/': gait, '/*@@SENSES@@*/': open('src/senses.js').read(), '/*@@BRAIN@@*/': open('src/brain.js').read(),
        '/*@@VOICE@@*/': open('src/voice.js').read(), '/*@@HUMAN@@*/': human}
for k, v in mods.items():
    assert s.count(k) == 1, k
    s = s.replace(k, v)
s = s.replace('@@VOICE_B64@@', base64.b64encode(open('ferrule/voice.wav', 'rb').read()).decode())
s = s.replace('@@ANIMS@@', open('work/hanims_min.json').read())
s = s.replace('@@HUMAN_GLB@@', base64.b64encode(open('work/moheeb.glb', 'rb').read()).decode())
s = s.replace('@@DOG_GLB@@', base64.b64encode(open('app/assets/dog.glb', 'rb').read()).decode())
left = re.findall(r'/\*@@[A-Z_]+@@\*/|@@[A-Z_]+@@', s)
assert not left, left
# no em or en dashes anywhere
bad = [c for c in ('–', '—') if c in s]
assert not bad, 'dash found'
open('hackle.html', 'w').write(s); print(round(len(s) / 1e6, 2), 'MB')
