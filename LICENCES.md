# Licences of assets and dependencies

Audit date 2026-11-22. Every asset and dependency the HACKLE build uses, with
its source and licence. "unknown" means the pack and the package metadata do
not say, and nobody has checked. Hashes and sizes are in `assets.lock.json`.

## Code in this repository

| path | licence |
|---|---|
| `app/`, `tools/`, `scenarios/` | MIT (LICENSE) |
| `legacy/pack/src/nn_gait.js`, `legacy/pack/src/nn_infer.js`, `legacy/pack/nn/quadruped.json` | CC-BY-NC-4.0. A port of sweriko/ai4anim-webgpu, itself derived from AI4AnimationPy (Paul Starke, Sebastian Starke, Meta). Kept in `legacy/` for parity only; never moved into `app/src`. |
| `legacy/pack/nn/bind.json` | unknown; the rig binding for the network above (inferred derived) |
| other files in `legacy/pack/` | owner authored (inferred), MIT with this repository |
| `legacy/pack/work/hanims_min.json` | clip data baked from the Universal Animation Library (CC0-1.0) onto the owner rig; embedded in the app build |
| `legacy/det/src/` | as the `legacy/pack/src/` file each one copies; `nn_gait.js` and `nn_infer.js` stay CC-BY-NC-4.0 |
| `app/src/human/placeholder.js` | MIT; capsule humanoid on the auto rig bone layout, no likeness data |
| `app/src/dog/neural.js` | MIT; the app side of the neural gait over @hackbuild/motion-net. Holds no network data: the bind pose is computed from the network at load, `legacy/pack/nn/bind.json` is not read |
| `vendor/gait` | MIT; built package of hackbuild/hackbuild-motion at the commit in `vendor/lock.json` |
| `vendor/motion-net` | CC-BY-NC-4.0. Built package of hackbuild/hackbuild-motion at the commit in `vendor/lock.json`. An audit on 2026-11-23 found it was adapted from the CC-BY-NC host above, and hackbuild-motion relabelled it. It is embedded in the app build, so the app build is non commercial until the clean-room MIT replacement is vendored. |

The app build embeds dog.glb, whose licence is unknown; dist/ is outside git
and no build is published until that is settled.

## Binary assets, kept out of git in `assets-local/`

| file | source | licence |
|---|---|---|
| dog.glb | Meshy model reduced by `legacy/pack/tools/opt.mjs` | unknown (Meshy output terms not checked) |
| moheeb.glb | the owner's likeness | not for redistribution; rig origin unknown. Never committed or uploaded. |
| voice.wav | the owner's voice reference | not for redistribution. Never committed or uploaded. |
| quadruped.bin | sweriko/ai4anim-webgpu at b539455f, public/quadruped.bin | CC-BY-NC-4.0 (vendor). The app fetches it and quadruped.json from that commit at runtime, checks the sha256 and states the licence on load; never bundled |
| yolov8n.onnx | Hyuto/yolov8-onnxruntime-web at fc4a52c4, public/model/yolov8n.onnx | AGPL-3.0 (vendor, Ultralytics YOLOv8) |
| nms-yolov8.onnx | the pack; likely the same Hyuto repository (inferred) | unknown |
| AnimationLibrary_Godot_Standard.gltf and .bin | Quaternius Universal Animation Library | CC0-1.0 (`legacy/pack/ferrule/UAL_LICENSE.txt`) |
| hackle.html | the pack's build output, for the parity check | mixed, embeds the owner likeness. Never committed. |

## Runtime libraries

| name | version | where it comes from | licence |
|---|---|---|---|
| three | 0.187.0 | legacy: jsDelivr; app: bundled | MIT |
| @hackbuild/gait, @hackbuild/motion-net | 0.1.0 | app: bundled from `vendor/` | MIT |
| @dimforge/rapier3d-compat | 0.21.0 | legacy: jsDelivr; app: bundled | Apache-2.0 |
| onnxruntime-web | 1.23.2 | jsDelivr, on demand for the detector | MIT |
| @mediapipe/tasks-vision | 1.2.3 | jsDelivr, on demand for webcam gestures | Apache-2.0 (vendor, not rechecked) |
| @huggingface/transformers | 4.3.2 | jsDelivr, on demand for the cortex | Apache-2.0 (vendor, not rechecked) |
| Gemma 4 E2B, onnx-community/gemma-4-E2B-it-ONNX | n/a | Hugging Face, on demand | Gemma terms (vendor, not rechecked) |
| LFM2-VL 450M, onnx-community/LFM2-VL-450M-ONNX | n/a | Hugging Face, on demand | LFM Open License (vendor, not rechecked) |
| Pocket TTS web worker, KevinAHM/pocket-tts-web | main branch, unpinned | Hugging Face space, on demand | unknown |
| Pocket TTS model weights | n/a | loaded by that worker | unknown |

## Fonts

| family | legacy source | app source | licence |
|---|---|---|---|
| IBM Plex Mono | Google Fonts | @fontsource/ibm-plex-mono 5.3.0, embedded | OFL-1.1 |
| Permanent Marker | Google Fonts | @fontsource/permanent-marker 5.3.0, embedded | Apache-2.0 (package metadata) |
| Special Elite | Google Fonts | @fontsource/special-elite 5.3.0, embedded | Apache-2.0 (package metadata) |
| VT323 | Google Fonts | @fontsource/vt323 5.3.0, embedded | OFL-1.1 |

## Development tools

| name | version | licence |
|---|---|---|
| puppeteer-core | 25.18.1 | Apache-2.0 |
| esbuild | 0.28.2 | MIT |
| typescript | 7.0.2 | Apache-2.0 |
| vitest | 5.0.3 | MIT |
| @types/three | 0.187.0 | MIT |

## Open owner decisions from the plan

- Neural gait host code (CC-BY-NC): kept in `legacy/` only, replaced later by
  an MIT host written from the published architecture.
- Provenance of dog.glb and of the human rig: unknown, to be checked before
  either ships in a public build.
- Character dialogue in `legacy/` keeps its exclamation marks as received;
  `legacy/` is outside the voice lint. Copy moved into `app/src` follows RULES.md.
