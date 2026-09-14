# Hexterra

A hex terrain editor built with React, TypeScript, Tailwind CSS, React Three Fiber, and Three.js WebGPURenderer.

## Development

```sh
npm install
npm run dev
npm run build
npm run lint
npm test
```

Tests use Node.js 22.6+ TypeScript stripping. The production build checks TypeScript before bundling.

## GitHub Pages

Set **Settings → Pages → Source** to **GitHub Actions**. The workflow in
`.github/workflows/deploy.yml` builds and publishes `dist` after pushes to
`main`, or manually through **Actions → Deploy to GitHub Pages → Run workflow**
with `main` selected. The deploy job skips all other branches, including manual runs.
If the release branch changes, update both `push.branches` and the deploy job's branch guard.

The workflow uses Node.js 24 and `npm ci`, and reads the base path from GitHub
Pages so assets work under the repository URL or a configured custom domain.
The default site URL is https://masudafsar.github.io/bit-battalions-client/.

To check a repository-path build locally:

```sh
npm run build -- --base /bit-battalions-client/
npm run preview -- --base /bit-battalions-client/
```

Open `http://localhost:4173/bit-battalions-client/` for that preview.

## Editing and generated terrain

**Edit grid** shows a flat hex grid. Select Water, Land, or Mountain and click or drag to paint. Brushes cover 1, 7, or 19 hexes, clipped at the boundary.

**Terrain mesh** generates a continuous terrain surface plus a separate water mesh. Seeded multi-octave noise warps material boundaries and varies ground elevation. Mountain cells create jittered peaks connected by a ridge network with steep angular flanks, fracture detail, rocky colors, and a varying snow line. Shared terrain vertices avoid cracks.

Water triangles are clipped against the terrain/sea-level intersection. Coastlines blend broad, gently sloping sandy beaches with narrower rocky sections using a spatial noise mask. The beach coverage and width are adjustable. The seabed uses the same noise field as the land, with independent depth and relief strength.

Water is a static transparent material with configurable opacity. There are no wave shaders, animation timers, or continuous render loops. Terrain is an open surface, not a closed solid.

## Render settings

Open **Render settings** from the app bar. Set the seed, noise size, randomness, land elevation and variation, minimum/maximum mountain peak heights and roughness, sandy coastline coverage, beach width, sea depth, seabed variation, and water opacity. **Save & rebuild** applies the draft and opens the rebuilt preview. Closing the panel discards unapplied changes; **Defaults** resets the draft. Settings are validated, persisted locally, and included in JSON exports. The same applied settings drive preview and OBJ generation. Map undo/redo covers painted cells, not render settings.

Terrain size is a hex radius from 7 to 30. Resizing preserves shared cells, fills new cells with water, and supports undo/redo. The seed can be randomized before saving. Painting controls appear only in paint mode.

**Generate new landscape** in the app bar uses domain-warped multi-scale noise for continents and separate mountain belts. Coverage and feature scales vary with the seed and map size, without the old periodic sine pattern.

Randomness is seeded (default 731), so the same cells and settings reproduce the same result.

**Export mesh** downloads terrain and water as separate OBJ objects with positions and normals. OBJ does not include preview colors or transparent material. **Save JSON** exports version-2 data containing both cells and applied settings. Local storage saves the current map and settings automatically. Undo/redo history is kept in memory, with one step per stroke and up to 50 past states.

## Controls

- `1`, `2`, `3`: select terrain and return to editing
- `B`: paint grid; `H`: orbit; `P`: pan
- Right drag: orbit; middle drag: pan; scroll: zoom
- Left drag in preview follows the selected Orbit or Pan tool
- `Ctrl/Cmd + Z`: undo; add Shift to redo
- Touch: one finger paints in paint mode or orbits or pans with the selected camera tool; two fingers pan and zoom

## Structure

- `src/App.tsx`: editor composition
- `src/components/editor/`: header, floating painting palette, brush settings, viewport, toolbar, camera controls, help, status, render settings
- `src/hooks/useTerrainEditor.ts`: map editing, undo/redo, keyboard shortcuts, local persistence
- `src/components/scene/`: flat editable grid, procedural terrain, static transparent water, camera rig, renderer error boundary
- `src/geometry/`: seeded noise, terrain height/color field, shared terrain triangulation, and water clipping
- `src/utils/exportWorld.ts`: JSON and OBJ downloads
- `src/renderSettings.ts`: defaults, slider ranges, and validation
- `src/terrain.ts`: axial coordinates and initial map generation
- `src/index.css`: Tailwind import, theme tokens, and minimal global defaults; component styling uses Tailwind utilities

## Rendering and validation

WebGPU initializes asynchronously on HTTPS or localhost, with an explicitly labeled WebGL2 fallback. Rendering is on demand, pixel ratio is capped at 1.75, and generated geometry is disposed on replacement/unmount. Preview geometry is generated when entering preview or changing the map or applying settings, not on camera motion.

Geometry tests verify shared vertices, connectivity, manifold edges, disk topology (no internal cracks/holes), upward normals, level water rest pose, cell-controlled elevation, repeatable seeded variation, connected ridges, steep mountain gradients, parameter effects, settings validation, and beach slopes relative to cliffs.

Render settings are grouped into Terrain, Mountains, Coast, and Water tabs. **Save & rebuild** persists applied settings locally; closing the dialog discards draft edits. Mountain peak relief is sampled between the minimum and maximum heights (slopes and saddles are lower). Legacy height multipliers migrate automatically. Adjacent mountains use a seeded, curved spanning forest of ridges with blended junctions, avoiding triangular connection loops.

## Paths and preview overlays

The compact **Add paths** tool enables River; Road and Rail are disabled placeholders. Start at a mountain corner, then drag through adjacent corners to draw the exact route (individual clicks also work). Release and resume to continue an unfinished path. No route is chosen automatically and skipped corners are rejected. Every selected edge must have two non-water cells beside it; coastline edges and map-boundary edges are forbidden. The mouth ends at a coastal corner (touching boundary-connected sea water), without drawing an edge along or inside water. A tributary may finish at an existing valid river.

A thick violet draft with a white border and a large endpoint marker shows the unfinished path. Click the previous corner to remove the last edge, or press Escape / use Cancel to discard the draft. The river is saved as one undoable action only when it reaches the coast or a valid river. Select the eraser in Path tools and click a river to delete it; tributaries that lose their sea outlet are also removed. One Undo restores the entire deletion. Painting water beside an existing edge invalidates that route instead of rerouting it.

Seeded edge meanders vary the path while preserving corner junctions. A shared, descending water profile controls both the river surface and a carved bed with blended banks. Streams taper from a very narrow spring to a modestly wider mouth, with a small extra contribution from tributaries. The channel replaces terrain noise with a descending bed and a curved bank section; only triangles near rivers are refined so narrow channels also exist in the exported terrain mesh. This is procedural drainage and terrain carving, not a fluid simulation. Explicit corner paths persist separately from terrain materials, support undo/redo, and export with the carved terrain and a separate river OBJ object. Legacy automatic source routes and center-to-center marks no longer render; redraw their paths manually.

The **Grid** button in Terrain mesh toggles hex borders draped over land and water. Material descriptions appear in a small lower-left panel on hover or keyboard focus. Fullscreen is available in the app bar.
