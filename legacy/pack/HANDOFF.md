# HACKLE handoff

HACKLE is a browser AI dog plus an AI human (Moheeb) in one self contained HTML file. Open source experiment, non commercial. This pack has everything needed to rebuild, test and improve it. The goal of the next pass: find where it can be more believable, more efficient, simpler to use, and better grounded, then implement.

Open `hackle.html` in Chrome or Edge to see the current build. It needs WebGPU for the vision model cortex; everything else falls back to WebGL2.

## What it is

- Platform: three.js 0.187 WebGPURenderer (WebGL2 fallback), Rapier 0.21 physics, onnxruntime-web YOLOv8n on the dog's eye feed, transformers.js 4.3.2 running Gemma 4 E2B or LFM2-VL 450M in a worker as the "cortex". Libraries load from jsdelivr; the gait weights and YOLO model load from raw.githubusercontent (pinned commit) at runtime.
- Dog: Meshy GLB, procedural CPG gait plus an AI4AnimationPy quadruped codebook matching network (ported from sweriko/ai4anim-webgpu, CPU inference in a worker, validated against numpy to 6e-8), retargeted to the Meshy rig with contact locking. Switches between CPG and neural with inertialization.
- Human: Moheeb GLB (Mixamo style rig) driven by 16 baked Universal Animation Library clips plus procedural layers (gaze, aversion, foot locking, reach, throw, pointing, idle fidgets, sitting).
- Voice: Pocket TTS voice clone (ferrule/voice.wav reference), speechSynthesis fallback.

## Layout and build

```
build.py                 inlines src modules, base64 GLBs, voice and anims into hackle.html; asserts no placeholders and no em or en dashes
src/hackle_src.html      main page: scene, UI, render loop, eye pipeline, cortex worker, cameras
src/organic.js           ORG math kernel (springs, OU and pink noise, samplers) + TUNE registry, presets, personality, body clock
src/body.js              dog locomotion, gaits, Froude gait choice, steering, posture springs, tail, ears, breathing, poseDog
src/nn_gait.js           neural gait host, retarget (NG, nnRig, nnApply)
src/nn_infer.js          worker side CPU inference for the gait net
src/senses.js            saliency attention, looming, odour plume and trail, sniff search, day lighting
src/brain.js             drives, behaviour selection, learning, sleep, social signals, executors (22 behaviours)
src/human.js             human animator, gaze, motion, planner and tasks (14 tasks)
src/voice.js             TTS
src/avatar_core.js       bone classifier injected into human.js
nn/                      gait net weights + bind.json (rig binding) + AI4Anim license and notice
work/hanims_min.json     baked human clips (from app/_ual via bake.py)
work/moheeb.glb          human model
app/assets/dog.glb       optimized dog (from the Meshy original via opt.mjs)
app/_ual/                UAL animation library + bake.html (rebake clips with bake.py, serve app/ on 8765)
ferrule/voice.wav        voice clone reference
models/yolov8n.onnx      local copy for offline testing
reports/, research_notes/  the two deep research rounds that drove the design
shots/                   recent screenshots
tools/                   opt.mjs (dog GLB optimizer), fbx2glb.py
```

Build: `python3 build.py` (writes hackle.html, about 9.3 MB).

## Testing

`test_o.py` drives headless Chrome (playwright, swiftshader WebGL) against `file://.../hackle.html`, routing CDN and GitHub fetches to local files (edit ROOT and paths at the top for your machine; it expects node_modules for three, rapier, onnxruntime-web under ROOT). Steps separated by `~`:

- `w5` wait 5 s, `js:CODE` run code, `eval:CODE` print a return value
- `shot:name@dist/height/angle` dog centred shot, `dshot:` dog close shot, `full:name` full page
- `tab:NAME` open a side tab, `soak:N` run N seconds and print behaviour, gait and human task histograms plus errors
- env `VW`, `VH` set the viewport

Hooks: `window.__simSpeed` multiplies sim dt. `window.__hackle` exposes HUM, brain, dog, motor, NG, TUNE, CLOCK, attention, startTask(name, args, who), setCam(m), setEyeWho('dog'|'his'), ball(), time(), camera, controls.

Headless runs at about 5 to 20 fps, so sim time is slow and anything above simSpeed 1 makes the neural gait use stale predictions (dog slides). Judge motion quality at real frame rate in a real browser.

## Systems in brief

- TUNE tab: 71 parameters with layer toggles (L.organic master, plus L.springs, L.noise, L.sample, L.inert, L.secondary, L.neural, L.drives, L.learn, L.sleep, L.social, L.salience, L.plume, L.day, L.hbody, L.hgaze). Canned vs organic is one switch. Personality presets (7 Jones and Gosling traits plus age), export and import, saved in localStorage.
- Brain: Keramati Gutkin homeostatic drive reward, softmax with commitment, reaction latencies, sleep pressure plus body clock with NREM and REM, Pearce Kaye Hall associability, eligibility traces, non compliance, look back during search, Fiset style spatial memory decay, greeting scaled by absence, calming signals, gaze following, pointing following. Cortex (VLM) is event driven and sets goals from a memory stream; reflexes and timing stay in JS.
- Senses: 240 degree geometric vision, Itti Koch saliency with world space inhibition of return, looming tau, odour plume plus trail grid with decide, trail, surge and cast modes, dim light acuity, mic clap and speech cues, webcam gestures, photo drop.
- Human: Eyes Alive gaze with Andrist aversion timing, Stahl head recruitment, turn in place stepping, cadence from speed, foot locking, minimum jerk reach, phased throw, Peeters pointing, Stivers 200 ms turn gap, beat gestures, idle scheduler, Sims style top 3 need based planner with repetition penalty, routines, errands (dog waits at the door), porch bench sitting.
- Cameras: Follow, Free (right drag, two fingers, WASD, Q and E, F to follow), Dog eye, Side, His eyes. Eye card switches between DOG EYE (what the perception stack uses) and HIS EYES (display only).

## Verified

Neural gait sit and lie, procedural bow, sleep cycles, throw, pointing (dog investigates), TUNE UI, errand (dog waits by the door), phone task (dog nudges), bench sit facing the right way, free camera, his eyes view, soaks in canned and organic modes with no console errors.

## Known issues and open questions

1. Fetch return when the human walks off: at simSpeed 3 the dog circled in place instead of following. Unclear if it happens at real speed. Also consider ending fetch when the human leaves.
2. Not watched end to end: crouch greeting, reunion greeting after an errand, scent trail decide phase, stroll follow, repeated cue after non compliance.
3. Human dog avoidance can stall both when the dog stands in the human's path (human slows, dog tries to reach the human).
4. Bench geometry is crude (floating backrest board).
5. HIS EYES adds a second render plus pixel readback at 10 Hz while shown.
6. 9.3 MB single file. The dog GLB is about 5.5 MB of it; the human 0.6 MB; clips 0.2 MB.
7. The VLM cortex was not exercised in headless tests (test needs WebGPU and a model download).
8. Many numbers come from different studies and are compressed to a game day; there is no blind rating of canned vs organic yet.
9. Gait weights are CC BY-NC 4.0; keep this non commercial or swap the neural gait out.
10. Neural gait inference runs on CPU in a worker (42 to 75 ms). A WebGPU compute path would cut latency.

## Directions worth exploring

- Believability: run a blind A/B of canned vs organic and use it to prune layers that add cost but not perceived life.
- Dog motion: fix neural gait drift on slow frames (extrapolate root with damping, or fall back to CPG under a frame time threshold); turning and stopping quality; tail and ear secondary motion against video reference.
- Human: richer clip set or motion matching on UAL clips; better hand contact for pet and ball; facial expression or blendshape lip sync if the model supports it.
- Cortex: smaller prompt, structured output, test LFM2-VL on low end GPUs; let the human agent use the cortex too.
- Efficiency: profile frame time per system; GPU saliency; skip work when systems are toggled off; lazy load heavy assets.
- Ease of use: first run onboarding, clearer TUNE grouping, shareable presets via URL.
- Code: split hackle_src.html (1400 lines) into modules; add a scenario test suite on top of test_o.py.

## Constraints from the owner

- Single self contained HTML output, light theme only, no em or en dashes anywhere (build.py asserts it), no emojis (inline SVG icons), concise UI text without filler phrasing.
- Keep licenses: AI4AnimationPy (CC BY-NC 4.0, nn/AI4ANIM_*), Universal Animation Library (ferrule/UAL_LICENSE.txt, CC0), YOLOv8n (AGPL 3.0 via the onnx export), three.js and Rapier (MIT, Apache 2.0).
