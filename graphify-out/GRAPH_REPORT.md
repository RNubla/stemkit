# Graph Report - stemkit  (2026-10-22)

## Corpus Check
- 60 files · ~138,266 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .lock 1, .npy 1)

## Summary
- 665 nodes · 1432 edges · 23 communities (17 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0427bcb1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- env.ts
- Player.tsx
- mel_band_roformer.py
- package.json
- roformer.py
- StemKitApi
- YouTubeHost
- ref_path
- types.ts
- pipeline.ts
- StemKit
- Security Policy
- run.cjs
- StemKit telemetry worker
- vendor/README.md
- compilerOptions
- compilerOptions
- build_mac_ffmpeg
- worker.js
- tsconfig.json
- stats.sh

## God Nodes (most connected - your core abstractions)
1. `StemKitApi` - 38 edges
2. `Player()` - 22 edges
3. `runSmoke()` - 19 edges
4. `userDataDir()` - 18 edges
5. `ensureGpuEngine()` - 18 edges
6. `runSeparation()` - 18 edges
7. `StemEngine` - 17 edges
8. `react` - 16 edges
9. `venvPython()` - 16 edges
10. `startJob()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `load_model()` --uses--> `MelBandRoformer`  [INFERRED]
  python/roformer.py → python/vendor/models/bs_roformer/mel_band_roformer.py
- `Attention` --uses--> `Attend`  [INFERRED]
  python/vendor/models/bs_roformer/mel_band_roformer.py → python/vendor/models/bs_roformer/attend.py
- `LinearAttention` --uses--> `Attend`  [INFERRED]
  python/vendor/models/bs_roformer/mel_band_roformer.py → python/vendor/models/bs_roformer/attend.py
- `userDataDir()` --calls--> `resolveDataDir()`  [EXTRACTED]
  src/main/env.ts → src/main/data-dir.ts
- `libraryFile()` --calls--> `userDataDir()`  [EXTRACTED]
  src/main/library.ts → src/main/env.ts

## Import Cycles
- None detected.

## Communities (23 total, 6 thin omitted)

### Community 0 - "env.ts"
Cohesion: 0.08
Nodes (63): applyGpuOverride(), bootstrap(), bundledFfmpeg(), canCreateVenv(), cleanVersion(), cmpVersions(), cudaVersionAtLeast(), detectAmdGpu() (+55 more)

### Community 1 - "Player.tsx"
Cohesion: 0.06
Nodes (49): DownloadIcon(), ExternalIcon(), PauseIcon(), PlayIcon(), LyricsDisplay(), Props, PanKnob(), Props (+41 more)

### Community 2 - "mel_band_roformer.py"
Cohesion: 0.06
Nodes (19): Attend, default(), exists(), once(), Attention, BandSplit, default(), exists() (+11 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (47): author, dependencies, electron-updater, description, devDependencies, electron, electron-builder, electron-vite (+39 more)

### Community 4 - "roformer.py"
Cohesion: 0.09
Nodes (21): crash_message(), download_checkpoint(), emit(), fail(), load_model(), load_wav(), main(), on_progress() (+13 more)

### Community 6 - "YouTubeHost"
Cohesion: 0.11
Nodes (5): STATE_MAP, Window, YouTubeHost, YTPlayerLike, YTState

### Community 7 - "ref_path"
Cohesion: 0.05
Nodes (27): { app, BrowserWindow }, { createReadStream, existsSync, readFileSync }, { createServer }, { join, normalize, extname }, MIME, server, electron, electron-updater (+19 more)

### Community 8 - "types.ts"
Cohesion: 0.05
Nodes (78): react, react-dom, extractVideoId(), api, App(), EnvLog, LastStart, stageLabel() (+70 more)

### Community 9 - "pipeline.ts"
Cohesion: 0.06
Nodes (71): detectGpuVendor(), engineStatus(), ensureVocalsEngine(), getStatus(), modelsDir(), vocalsEnginePath(), ytDlpRuntimeArgs(), cleanTitle() (+63 more)

### Community 10 - "StemKit"
Cohesion: 0.17
Nodes (11): Build & release, Develop, Download, Features, How it works, Layout, Notes, Privacy (+3 more)

### Community 11 - "Security Policy"
Cohesion: 0.29
Nodes (6): Coordinated Disclosure, Known considerations, Reporting a Vulnerability, Scope, Security Policy, Supported Versions

### Community 12 - "run.cjs"
Cohesion: 0.18
Nodes (17): cleanVersion(), cmpSemver(), ensureFfmpeg(), ffmpegBin(), findNode(), fs, main(), majorOf() (+9 more)

### Community 13 - "StemKit telemetry worker"
Cohesion: 0.40
Nodes (4): Deploy, Point the app at it, StemKit telemetry worker, View stats

### Community 17 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, esModuleInterop, lib, module, moduleResolution, noUnusedLocals, resolveJsonModule (+5 more)

### Community 19 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noUnusedLocals, skipLibCheck (+4 more)

### Community 23 - "build_mac_ffmpeg"
Cohesion: 1.00
Nodes (3): build_mac_ffmpeg(), mac_ffmpeg_is_usable(), fetch-ffmpeg.sh script

### Community 24 - "worker.js"
Cohesion: 0.83
Nodes (3): fetch(), json(), today()

## Knowledge Gaps
- **7 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `electron-builder`, `tailwindcss` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 229 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StemKitApi` connect `StemKitApi` to `types.ts`, `Player.tsx`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Player()` (e.g. with `.mount()` and `.pause()`) actually correct?**
  _`Player()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `env.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Why does `electron` connect `ref_path` to `env.ts`, `pipeline.ts`, `package.json`, `types.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `Player.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.060764587525150904 - nodes in this community are weakly interconnected._
- **Why does `react` connect `types.ts` to `Player.tsx`, `package.json`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._