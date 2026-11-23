# dog-simulator

A dog and its person living in a browser tab. The dog walks, sniffs, plays fetch, sleeps and learns cues; the person runs their day around it. One self contained HTML file.

Status: 2026-11-22, the HACKLE handoff build moved here and made
deterministic. `app/src` holds the app; `legacy/` holds the pack as
received and its deterministic copy; `scenarios/` holds golden traces.

## Build

    npm run build:app      # dist/dog-simulator.html
    npm run build:legacy   # dist/hackle-legacy.html, the pack build byte for byte
    npm run build:det      # dist/hackle-det.html, the deterministic legacy build

The builds read the dog model from `assets-local/` (outside git, listed in
`assets.lock.json`). The owner's human model and voice reference are used
when `assets-local/` holds them; otherwise the app builds a placeholder
human. Licences of every asset and dependency: LICENCES.md.

## Checks in Chrome

    npm run check:boot -- dist/dog-simulator.html --offline
    npm run check:determinism
    npm run scenarios -- compare --file dist/dog-simulator.html

puppeteer-core drives the system Chrome; requests are served from pinned
local files and any other request fails the run.

## Develop

    source ~/.nvm/nvm.sh && nvm use
    npm ci
    npm test

`npm ci` sets `core.hooksPath` to `.githooks`. Rules for every change are
in RULES.md and CONTRIBUTING.md.

## What is verified, and what is not

### Verified, 2026-11-22, Chrome 150 headless on macOS 12

- `tools/build-html.mjs legacy` writes the pack's hackle.html byte for byte
  (9,315,603 bytes, measured).
- The legacy build boots with zero console errors and no unrouted request,
  and completes one fetch round trip in real time mode.
- Two lockstep runs of the deterministic legacy build with one seed give
  identical traces over 600 sim s, neural gait on.
- The app build reproduces all 18 CPG golden traces exactly (11 scenarios
  plus 7 issue seeds), opens with the network disabled, and completes a
  fetch round trip.
- The app build contains no code from the CC-BY-NC gait host (test).

### Not verified

- Motion quality: not judged. Screenshots were looked at as stills.
- simSpeed 4 against simSpeed 1 step for step: not run.
- The neural gait in the app build: absent until the MIT host lands.
- Size: dist/dog-simulator.html is 14,620,125 bytes with the owner pack
  and 13,141,035 bytes without (measured), over the 9.3 MB budget. Rapier
  is 4.3 MB of the 5.45 MB script, the dog model 7.3 MB of base64.
- CI does not run the Chrome checks; they need `assets-local/`.

## Licence

| path | licence |
|---|---|
| code | MIT (LICENSE) |
| README, CHANGELOG, docs | CC-BY-4.0 (LICENSES/CC-BY-4.0.txt), code samples also MIT |
