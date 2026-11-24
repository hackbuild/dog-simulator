# Browser checks of the page

`tools/runner/ux-walk.mjs` opens the public build in the system Chrome
through puppeteer-core, headful, on the machine GPU, with a fresh
localStorage, and walks the page the way the UX design
(`web-ai-knowledge` `research/dog-sim-ux.md`) lays out its personas.

    node tools/build-html.mjs public
    node tools/runner/ux-walk.mjs shots      # screenshots into .local/ux-after, outside git
    node tools/runner/ux-walk.mjs personas   # the persona goals, pass or fail each
    node tools/runner/ux-walk.mjs frames --tab minds --seconds 20

## Widths checked

| profile | viewport | touch |
|---|---|---|
| iPhone 13 (puppeteer KnownDevices) | 390 by 844, DPR 3 | yes |
| Pixel 5 (puppeteer KnownDevices, Android user agent) | 393 by 851, DPR 3 | yes |
| w320 | 320 by 640, DPR 2 | yes |
| w390 | 390 by 844, DPR 2 | yes |
| w768 | 768 by 1024, DPR 2 | yes |
| w1024 | 1024 by 768 | no |
| w1440 | 1440 by 900 | no |

Per profile: the welcome card, play after a throw, minds, senses, body,
more, the human side of minds on a phone, the timeline and the
capability panel. Each view records the sideways scroll
(`scrollWidth - innerWidth`) and, on a coarse pointer, every visible
control under 44 px.

## Results, 2026-11-23, Chrome 150 headful, macOS 12, machine GPU

- Sideways scroll: 0 px in every view of every profile above
  (measured, `shots.json`).
- Controls under 44 px on a coarse pointer: none in play, minds,
  senses, body, more or the capability panel (measured).
- Persona goals: 29 of 29 pass (measured, `personas`, public build).
  The UX design recorded every persona as lost somewhere on the build
  before this one (read, not rerun with this tool: the old page has none
  of the ids it checks).
- Frame time at 1440 by 900, 20 s, `#seed` random, rAF intervals: the
  build before this change with its brain tab open 60 fps, p50 16.7 ms,
  p95 17.7 ms, no frame over 20 ms; this build with minds open 60 fps,
  p50 16.7 ms, p95 17.7 ms, no frame over 20 ms; the instruments
  profiler 0.1 ms average and 1 ms worst in both (measured, two runs
  each).
- Not checked: a real phone, a real screen reader (the Chrome
  accessibility tree stood in), landscape phones, a cortex model loaded
  (no model calls, so the call logs and prompts were seen empty only).
