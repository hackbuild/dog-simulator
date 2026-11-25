# Licences of assets and dependencies

Audit date 2026-11-22, corrected 2026-11-23 after the repository audit and again on 2026-11-23
when the clean-room motion-net was vendored: the app build is MIT throughout.
Every asset and dependency the builds use, with its source and licence. "unknown" means the pack and the package metadata do
not say, and nobody has checked. Hashes and sizes are in `assets.lock.json`.

## Code in this repository

| path | licence |
|---|---|
| `app/`, `tools/`, `scenarios/` | MIT (LICENSE) |
| `legacy/pack/src/nn_gait.js`, `legacy/pack/src/nn_infer.js`, `legacy/pack/nn/quadruped.json` | CC-BY-NC-4.0. A port of sweriko/ai4anim-webgpu, itself derived from AI4AnimationPy (Paul Starke, Sebastian Starke, Meta). Kept in `legacy/` for parity only; never moved into `app/src`. |
| `legacy/pack/nn/bind.json` | unknown; the rig binding for the network above (inferred derived) |
| `legacy/pack/nn/AI4ANIM_LICENSE.txt` | the CC-BY-NC-4.0 legal text (Creative Commons), reproduced as the licence requires |
| `legacy/pack/nn/AI4ANIM_NOTICE.txt` | sweriko's notice for the network port; its terms are CC-BY-NC-4.0 |
| `legacy/pack/ferrule/UAL_LICENSE.txt` | the CC0-1.0 text of the Universal Animation Library (Quaternius) |
| `legacy/README.md` | CC-BY-4.0 with the other docs |
| other files in `legacy/pack/` | owner authored (inferred), MIT with this repository |
| `legacy/pack/work/hanims_min.json` | clip data baked from the Universal Animation Library (CC0-1.0) onto the owner rig; embedded in the app build |
| `legacy/det/src/` | as the `legacy/pack/src/` file each one copies; `nn_gait.js` and `nn_infer.js` stay CC-BY-NC-4.0 |
| `app/src/human/placeholder.js` | MIT; capsule humanoid on the auto rig bone layout, no likeness data |
| `app/src/dog/neural.js` | MIT; the app side of the neural gait over @hackbuild/motion-net, rewritten on 2026-11-23 against the clean-room API by a builder who did not read the earlier file or the CC-BY-NC host. Holds no network data: the rest pose is computed at load from the Idle style pose in the fetched weights; `legacy/pack/nn/bind.json` is not read |
| `tools/stub-dog.mjs` and the stub dog it writes | MIT; a box dog written from code, used by the stub build (`node tools/build-html.mjs stub`) |
| `app/assets/dog.glb`, `app/assets/human.glb`, `app/assets/voice.wav` | the owner's own (the dog model, his human model, his voice reference); committed and shipped publicly by the owner's decision of 2026-11-25. Copies of the `assets-local/` files of the same sha256 (`assets.lock.json`). Not under the MIT licence of the code: reuse outside this app asks the owner |
| `vendor/tunables`, `vendor/senses`, `vendor/drives`, `vendor/cameras` | MIT; built packages of hackbuild/hackbuild-agents at the commit in `vendor/lock.json`, bundled into the app build |
| `vendor/scenario` | MIT; built package of hackbuild/hackbuild-agents, used by the scenario runner only, never bundled |
| `vendor/gait` | MIT; built package of hackbuild/hackbuild-motion at the commit in `vendor/lock.json` |
| `vendor/motion-net` | MIT, clean room. Built package of hackbuild/hackbuild-motion at babcc9f (2026-11-23), bundled into the app build. hackbuild-motion removed the earlier CC-BY-NC package in a88ea62 and wrote the replacement from a functional specification and the published paper (a509079, engine layer babcc9f), by builders who did not read the CC-BY-NC code. The package holds no weights. |

The public build embeds the three files in `app/assets/`; Pages publishes it.

## Binary assets in `assets-local/` (gitignored; three are also committed in `app/assets/`)

| file | source | licence |
|---|---|---|
| dog.glb | Meshy model reduced by `legacy/pack/tools/opt.mjs` | the owner's own; ships as `app/assets/dog.glb` (owner decision, 2026-11-25) |
| moheeb.glb | the owner's likeness | the owner's own; ships as `app/assets/human.glb` (owner decision, 2026-11-25) |
| voice.wav | the owner's voice reference | the owner's own; ships as `app/assets/voice.wav` (owner decision, 2026-11-25) |
| quadruped.bin | sweriko/ai4anim-webgpu at b539455f, public/quadruped.bin | CC-BY-NC-4.0 (vendor). The app fetches it and quadruped.json from that commit at runtime, checks the sha256 and states the licence on load; never bundled |
| yolov8n.onnx | Hyuto/yolov8-onnxruntime-web at fc4a52c4, public/model/yolov8n.onnx | AGPL-3.0 (vendor, Ultralytics YOLOv8). The app fetches it from that commit at runtime when you load it, checks the sha256 and states the licence on the load row; never bundled |
| nms-yolov8.onnx | the pack; likely the same Hyuto repository (inferred) | unknown |
| AnimationLibrary_Godot_Standard.gltf and .bin | Quaternius Universal Animation Library | CC0-1.0 (`legacy/pack/ferrule/UAL_LICENSE.txt`) |
| hackle.html | the pack's build output, for the parity check | mixed, embeds the owner likeness. Never committed. |

## Runtime libraries

| name | version | where it comes from | licence |
|---|---|---|---|
| three | 0.187.0 | legacy: jsDelivr; app: bundled | MIT |
| @hackbuild/gait, @hackbuild/tunables, @hackbuild/senses, @hackbuild/drives, @hackbuild/cameras | 0.1.0 | app: bundled from `vendor/` | MIT |
| @hackbuild/motion-net | 0.2.0 | app: bundled from `vendor/` | MIT (clean room, see above) |
| quadruped network weights and manifest | sweriko/ai4anim-webgpu at b539455f | fetched at run time when `L.neural` is turned on, SHA-256 checked, never in the build | CC-BY-NC-4.0 (Paul Starke and Sebastian Starke, Meta, AI4AnimationPy); the page states the licence on load |
| Rust crates inside the vendored wasm (gait, motion-net, senses, drives): libm 0.2.16, wasm-bindgen 0.2.129, cfg-if 1.0.5, once_cell 1.21.4 | as listed | compiled into the wasm the packages inline | MIT OR Apache-2.0 (vendor) |
| @dimforge/rapier3d-compat | 0.21.0 | legacy: jsDelivr; app: bundled | Apache-2.0 |
| onnxruntime-web | 1.23.2 | jsDelivr, on demand for the detector | MIT |
| @mediapipe/tasks-vision | 1.2.3 | jsDelivr, on demand for webcam gestures | Apache-2.0 (vendor, not rechecked) |
| @huggingface/transformers | 4.3.2 | jsDelivr, on demand for the cortex | Apache-2.0 (vendor, not rechecked) |
| Gemma 4 E2B, onnx-community/gemma-4-E2B-it-ONNX | n/a | Hugging Face, on demand | Gemma terms (vendor, not rechecked) |
| LFM2-VL 450M, onnx-community/LFM2-VL-450M-ONNX | n/a | Hugging Face, on demand | LFM Open License (vendor, not rechecked) |
| Pocket TTS web worker, KevinAHM/pocket-tts-web | commit d0c0c79b; `inference-worker.js` and `sentencepiece.js` checked against their SHA-256 before they run | Hugging Face space, on demand | Apache-2.0 (vendor, CODE-LICENSE in the space; the space card says CC-BY-4.0). The page states the licence on load |
| Pocket TTS model weights, KevinAHM/pocket-tts-onnx int8 bundles | the same commit, pinned by the commit, not hashed | loaded by that worker | CC-BY-NC-4.0 (vendor, onnx/ONNX-LICENSE in the space) |
| onnxruntime-web | 1.20.0 | jsDelivr, loaded by the Pocket TTS worker | MIT |

The built page carries a licence comment at its top: three.js (MIT, its own
header), Rapier (Apache-2.0), hackbuild-ui (MIT) and its five fonts (Apache-2.0 and
OFL-1.1), with the licence texts, written by `tools/build-app.mjs`.

## Fonts

| family | legacy source | app source | licence |
|---|---|---|---|
| IBM Plex Mono | Google Fonts | hackbuild-ui 0.5.0 `fonts-inline.css` (Fontsource 5.3.0, latin), embedded | OFL-1.1 |
| Permanent Marker | Google Fonts | the same | Apache-2.0 (package metadata) |
| Special Elite | Google Fonts | the same | Apache-2.0 (package metadata) |
| VT323 | Google Fonts | the same | OFL-1.1 |
| Libre Baskerville | none | the same, italic, unused by the page | OFL-1.1 |

## Design system

| name | version | source | licence |
|---|---|---|---|
| @virgilvox/hackbuild-ui | 0.5.0, commit 5211c3a, `tools/vendor/hackbuild-ui-0.5.0-5211c3a.tgz`, sha256 in `tools/vendor/SHA256SUMS` and `tools/vendor/hackbuild-ui.pin` (CI checks it) | its `tokens.css`, `hackbuild.css` and `fonts-inline.css` are inlined into the page | MIT |

## Development tools

| name | version | licence |
|---|---|---|
| puppeteer-core | 25.18.1 | Apache-2.0 |
| esbuild | 0.28.2 | MIT |
| typescript | 7.0.2 | Apache-2.0 |
| vitest | 5.0.3 | MIT |
| @types/three | 0.187.0 | MIT |

## The owner persona

The human in the app is the owner, Moheeb Zara: his name in the mind prompt
(`app/src/human/human.js`) and the UI copy ships in every build. This is the
owner's own app and the owner keeps it so (decision 2026-11-23). His human
model and voice reference ship in `app/assets/` (decision 2026-11-25); no
other likeness file is committed.

## Open owner decisions from the plan

- Neural gait host code (CC-BY-NC): kept in `legacy/` only, replaced later by
  an MIT host written from the published architecture.
- Character dialogue in `legacy/` keeps its exclamation marks as received;
  `legacy/` is outside the voice lint. The person's spoken lines in the app
  (`app/src/human/lines.js`) may use exclamation marks as the original did
  (owner decision, 2026-11-25); the voice lint exempts that file from the
  exclamation rule only. All other copy in `app/src` follows RULES.md.
