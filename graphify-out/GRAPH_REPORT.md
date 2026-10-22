# Graph Report - stemkit  (2026-10-21)

## Corpus Check
- 77 files · ~135,208 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .lock 1, .npy 1)

## Summary
- 784 nodes · 1541 edges · 34 communities (28 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- React Renderer UI
- Electron Main Process
- Python Environment & GPU Bootstrap
- BS-RoFormer Model Architecture
- Project Config & Build
- Embed Test & Utility Scripts
- Core Concepts & Documentation
- Website Marketing & Features
- Python Separation CLI Entrypoints
- StemKit API (IPC Bridge)
- YouTube Player Integration
- CI/CD Release Pipeline
- Run Script & FFmpeg Discovery
- Audio Engine & Stem Processing
- StemEngine Core
- TSConfig Node
- Tiny Desk Search UI
- TSConfig Web
- Lyrics Display & Sync
- Transport Controls
- Hero Image: Bohemian Rhapsody Demo
- PanKnob & StemLane Components
- Stems Image: 6-Stem Separation
- Embed Test HTML & CSP
- OG Image: Karaoke & Lyrics
- Docs: StemKit Screenshot
- Fetch FFmpeg (Shell)
- Telemetry Worker
- Export Image: Music Player
- TSConfig Root
- App Icon: Equalizer Visualization
- Telemetry Stats Script

## God Nodes (most connected - your core abstractions)
1. `StemKitApi` - 36 edges
2. `StemKit` - 21 edges
3. `runSmoke()` - 19 edges
4. `userDataDir()` - 18 edges
5. `ensureGpuEngine()` - 18 edges
6. `runSeparation()` - 18 edges
7. `StemEngine` - 17 edges
8. `venvPython()` - 16 edges
9. `startJob()` - 16 edges
10. `App()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Fetch FFmpeg Scripts` --conceptually_related_to--> `FFmpeg Audio Processing`  [INFERRED]
  .github/workflows/linux-smoke.yml → README.md
- `macOS Smoke Test Workflow` --references--> `Metal Performance Shaders (MPS)`  [EXTRACTED]
  .github/workflows/macos-smoke.yml → README.md
- `Mel-Band RoFormer Vocals Engine` --conceptually_related_to--> `Vendored Model Code`  [INFERRED]
  README.md → python/vendor/README.md
- `Demucs HTDemucs Engine` --conceptually_related_to--> `Vendored Model Code`  [INFERRED]
  README.md → python/vendor/README.md
- `Metal Performance Shaders (MPS)` --conceptually_related_to--> `MPS Inference Patches`  [INFERRED]
  README.md → python/vendor/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Smoke Tests Across All Platforms** — github_workflows_linux_smoke, github_workflows_macos_smoke, github_workflows_windows_smoke, concept_smoke_test_mode, concept_smoke_regression_gate [INFERRED 0.85]
- **Source Separation Engine Pipeline** — concept_mel_band_roformer, concept_demucs_htdemucs, concept_vendored_model_code, concept_mps_patches, concept_ffmpeg [INFERRED 0.85]
- **Release Build and Sign Pipeline** — github_workflows_release, concept_release_matrix, concept_electron_builder, concept_developer_id_signing, concept_notarization, concept_draft_release [EXTRACTED 1.00]
- **Six Stem Types** — website_index_vocals_stem, website_index_drums_stem, website_index_bass_stem, website_index_guitar_stem, website_index_piano_stem, website_index_other_stem [EXTRACTED 1.00]
- **Supported DAWs** — website_index_ableton, website_index_logic, website_index_fl_studio, website_index_garageband [EXTRACTED 1.00]
- **GPU Acceleration Backends** — website_index_cuda, website_index_rocm, website_index_mps, website_index_cpu_fallback [EXTRACTED 1.00]
- **Music player UI panel group** — website_media_export_music_player, website_media_export_song_library, website_media_export_audio_stems [EXTRACTED 0.75]
- **Six Stems of Bohemian Rhapsody** — website_media_hero_stem_vocals, website_media_hero_stem_drums, website_media_hero_stem_bass, website_media_hero_stem_guitar, website_media_hero_stem_piano, website_media_hero_stem_other [EXTRACTED 1.00]
- **StemKit karaoke stem player flow** — website_media_og_stemkit_app, website_media_og_stem_separation, website_media_og_karaoke_mode, website_media_og_lyrics_sync [EXTRACTED 1.00]
- **Multi-stem audio source separation** — website_media_stems_vocals, website_media_stems_drums, website_media_stems_bass, website_media_stems_guitar, website_media_stems_piano, website_media_stems_other [INFERRED 0.85]
- **Instrument filter chips participate in filter group** — website_media_yt_search_vocals_filter, website_media_yt_search_drums_filter, website_media_yt_search_bass_filter, website_media_yt_search_guitar_filter, website_media_yt_search_piano_filter, website_media_yt_search_other_filter [EXTRACTED 0.95]

## Communities (34 total, 6 thin omitted)

### Community 0 - "React Renderer UI"
Cohesion: 0.06
Nodes (73): react, react-dom, api, App(), EnvLog, LastStart, stageLabel(), withoutKey() (+65 more)

### Community 1 - "Electron Main Process"
Cohesion: 0.06
Nodes (69): electron, electron-updater, gpuAccelerationInfo(), gpuVendorInfo(), ytDlpRuntimeArgs(), createWindow(), fetchLyrics(), installApplicationMenu() (+61 more)

### Community 2 - "Python Environment & GPU Bootstrap"
Cohesion: 0.08
Nodes (68): applyGpuOverride(), bootstrap(), bundledFfmpeg(), canCreateVenv(), cleanVersion(), cmpVersions(), cudaVersionAtLeast(), detectAmdGpu() (+60 more)

### Community 3 - "BS-RoFormer Model Architecture"
Cohesion: 0.06
Nodes (19): Attend, default(), exists(), once(), Attention, BandSplit, default(), exists() (+11 more)

### Community 4 - "Project Config & Build"
Cohesion: 0.04
Nodes (47): author, dependencies, electron-updater, description, devDependencies, electron, electron-builder, electron-vite (+39 more)

### Community 5 - "Embed Test & Utility Scripts"
Cohesion: 0.05
Nodes (23): { app, BrowserWindow }, { createReadStream, existsSync, readFileSync }, { createServer }, { join, normalize, extname }, MIME, server, { chmodSync, renameSync, writeFileSync, existsSync }, default() (+15 more)

### Community 6 - "Core Concepts & Documentation"
Cohesion: 0.05
Nodes (44): After Pack Script, App ID: com.stemkit.app, ASAR Archive, BS-RoFormer (lucidrains), Complex Mask Math in Real/Imag Components, NVIDIA CUDA, DEB Package Dependencies, Demucs HTDemucs Engine (+36 more)

### Community 7 - "Website Marketing & Features"
Cohesion: 0.05
Nodes (45): Ableton, Linux .AppImage Download, Backing Track Practice, Bass Stem, Collapsible Testimonials Wall, CPU Fallback, CUDA (NVIDIA), DAW Integration (+37 more)

### Community 8 - "Python Separation CLI Entrypoints"
Cohesion: 0.10
Nodes (21): crash_message(), download_checkpoint(), emit(), fail(), load_model(), load_wav(), main(), on_progress() (+13 more)

### Community 10 - "YouTube Player Integration"
Cohesion: 0.12
Nodes (6): loadYTApi(), STATE_MAP, Window, YouTubeHost, YTPlayerLike, YTState

### Community 11 - "CI/CD Release Pipeline"
Cohesion: 0.17
Nodes (20): Ad-Hoc Signing Fallback, Both Engines (htdemucs + RoFormer), CUDA Fail-Fast Paths, Developer ID Signing (macOS), Draft GitHub Release, electron-builder Packaging, electron-vite Build, Fetch FFmpeg Scripts (+12 more)

### Community 12 - "Run Script & FFmpeg Discovery"
Cohesion: 0.19
Nodes (17): cleanVersion(), cmpSemver(), ensureFfmpeg(), ffmpegBin(), findNode(), fs, main(), majorOf() (+9 more)

### Community 13 - "Audio Engine & Stem Processing"
Cohesion: 0.21
Nodes (11): bufferCache, BufferCacheMap, getDecoded(), Player(), STEM_KEYS, BufferMap, decodePayload(), engine (+3 more)

### Community 15 - "TSConfig Node"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, esModuleInterop, lib, module, moduleResolution, noUnusedLocals, resolveJsonModule (+5 more)

### Community 16 - "Tiny Desk Search UI"
Cohesion: 0.14
Nodes (14): Bass filter chip, Drums filter chip, 4-source engine 4 stems, Guitar filter chip, Instrument filter group, NPR Music, Other filter chip, Piano filter chip (+6 more)

### Community 17 - "TSConfig Web"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noUnusedLocals, skipLibCheck (+4 more)

### Community 18 - "Lyrics Display & Sync"
Cohesion: 0.32
Nodes (9): LyricsDisplay(), Props, formatTime(), getCurrentLine(), getUpcomingLines(), lyricsCache, saveLyrics(), LyricsData (+1 more)

### Community 19 - "Transport Controls"
Cohesion: 0.29
Nodes (10): ExternalIcon(), PauseIcon(), PlayIcon(), PresetId, PRESETS, Props, SeekBar(), SkipButton() (+2 more)

### Community 20 - "Hero Image: Bohemian Rhapsody Demo"
Cohesion: 0.29
Nodes (11): Karaoke Mode, Queen, Queen – Bohemian Rhapsody (Official Video Remastered), Bass, Drums, Guitar, StemKit Library, Other (+3 more)

### Community 21 - "PanKnob & StemLane Components"
Cohesion: 0.33
Nodes (7): DownloadIcon(), PanKnob(), Props, computePeaks(), Props, StemLane(), StemMeta

### Community 22 - "Stems Image: 6-Stem Separation"
Cohesion: 0.29
Nodes (7): Bass stem, Drums stem, Guitar stem, Other stem, Piano stem, Stem isolation UI screenshot (stems.jpg), Vocals stem

### Community 23 - "Embed Test HTML & CSP"
Cohesion: 0.40
Nodes (6): Content Security Policy Header, Origin Parameter for YouTube Player, React Entry Point (main.tsx), YouTube Iframe API, YouTube Iframe API Test Page, Renderer HTML Entry Point

### Community 24 - "OG Image: Karaoke & Lyrics"
Cohesion: 0.70
Nodes (5): karaoke mode, lyrics synchronization, audio stem separation, StemKit karaoke stem player app, StemKit Open Graph preview image

### Community 25 - "Docs: StemKit Screenshot"
Cohesion: 0.50
Nodes (4): Karaoke Mode, Stem Separation, StemKit, YouTube Sync

### Community 26 - "Fetch FFmpeg (Shell)"
Cohesion: 1.00
Nodes (3): build_mac_ffmpeg(), mac_ffmpeg_is_usable(), fetch-ffmpeg.sh script

### Community 27 - "Telemetry Worker"
Cohesion: 0.83
Nodes (3): fetch(), json(), today()

### Community 28 - "Export Image: Music Player"
Cohesion: 0.67
Nodes (4): Audio stem separation tracks, Music / media player interface, piano.wav audio track, Song library sidebar

### Community 30 - "App Icon: Equalizer Visualization"
Cohesion: 1.00
Nodes (3): Audio equalizer, Frequency spectrum, App icon

## Knowledge Gaps
- **93 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `electron-builder`, `tailwindcss` (+88 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 293 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StemKitApi` connect `StemKit API (IPC Bridge)` to `React Renderer UI`, `Audio Engine & Stem Processing`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _93 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `React Renderer UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05518925518925519 - nodes in this community are weakly interconnected._
- **Why does `electron` connect `Electron Main Process` to `React Renderer UI`, `Python Environment & GPU Bootstrap`, `Project Config & Build`, `Embed Test & Utility Scripts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `Electron Main Process` be split into smaller, more focused modules?**
  _Cohesion score 0.06327160493827161 - nodes in this community are weakly interconnected._
- **Why does `react` connect `React Renderer UI` to `Project Config & Build`, `Audio Engine & Stem Processing`, `Lyrics Display & Sync`, `Transport Controls`, `PanKnob & StemLane Components`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `Python Environment & GPU Bootstrap` be split into smaller, more focused modules?**
  _Cohesion score 0.07629107981220658 - nodes in this community are weakly interconnected._