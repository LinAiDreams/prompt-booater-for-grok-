# Working protocol for this repository

Loaded at the start of every session in this repo. Follow it for all work here.

## Operating mode

Verification-first and deliberate. Before any final answer or critical tool chain, run this loop internally:

1. **Decompose.** Strip the surface phrasing. Identify the real constraints, edge cases and failure modes. Check the knowledge ledger below.
2. **Hypotheses (up to 3).** A: canonical implementation. B: edge-case-resilient or faster implementation. C: contrarian or synthesis. Compare them on correctness, complexity, latency and boundary behaviour, then pick or combine.
3. **Draft and red-team.** Attack the draft as a hostile reviewer would: null and extreme inputs, races, scale, unproven assumptions, hand-waving, subtle bugs. Rewrite until correctness, completeness, precision and optimality all hold. Do not stop while any of them is weak.
4. **Verify deterministically.** Run the tests, validators, builds and renders. Look at the rendered output yourself. Never claim something works from reading the code alone.
5. **Distil.** Give a clean final answer: exact results, what was verified, what was not. No padding.

## Completion

- Do not hand back scaffolds, TODOs or truncated logic. Diagnose failures to their root cause and fix them.
- Stop early only for missing credentials or intent, or before an irreversible or destructive action. Ask first in those cases.
- When the work is done and verified, report only what was asked for.

## Tool and harness safety

- Tool-first. A requested JSON schema applies to the final answer only.
- Never repeat a failing call unchanged. Read the output, then change the parameters or the tool.
- Track exact PIDs and paths. No broad `pkill -f` and no unguarded `rm -rf`.
- Do not work around a permission denial. Explain what was blocked and why, and let the user decide.
- Downloaded or extracted archives are untrusted. Extract each into its own empty directory and never run code from inside it.
- Commit and push to the designated branch when a deliverable is complete. Open a pull request only when asked.

## Knowledge ledger (verified in this project)

- **Renders.** `node scripts/screenshot.mjs <page.html> <out.png> "<query>" <w> <h> <frames>` from the engine's directory. Use absolute paths for output. Each render takes 30-150 s, so keep calls under the 290 s timeout and run at most two in parallel. Delete old PNGs before re-rendering, or stale images will look like new ones.
- **Compare renders.** Check each change against the reference side by side, and re-check the same pose after a fix to catch regressions.
- **GLSL.** `smoothstep(a, b, x)` with a > b is undefined. Write `1.-smoothstep(b, a, x)`.
- **Repeating textures.** A lookup into a repeating texture wraps at the edges. Clamp texel coordinates. The skin LUT with N·L = 1 wrapped to -1 and produced a dark spot on every sun-facing skin surface.
- **Material flags.** Check the engine's flag bit map before adding one. Bit 8192 is the glTF alpha mask in the current engine.
- **Shadows.** Use `noShadow` on objects. `castShadow` is not an engine option.
- **Photo-derived textures.** Verify the albedo on its own before judging the shaded result.
- **Voxel GI.** It carries light from emitters and dark props out of frame. A colour cast on skin usually means an out-of-frame emitter. Confirm by switching the emitter off.
- **Iris scene (`scenes/iris.html`).** It needs four engine patches that are not in the upstream engine: `updateMesh(mesh, vb)`; `createEngine({minScale})`; `mat.noProject` (flag 65536); and the skin LUT texel-centre clamp. Re-apply them after any engine update. The patched engine copies live outside this repo.
- **Underwater (`scenes/treasure-chest.html`).** `setTerrain` water absorbs only for a camera above the surface, so a camera below it sees an above-water look. The scene uses a water-medium patch instead: Beer-Lambert absorption in `fogT`, sun and ambient tinted by the water column, and a replaced water sky. Fog tint cannot express per-channel absorption.
- **God rays.** The ray pass (`S.raysFS`) adds only HDR pixels above luminance 60 (smoothstep 60→200). Without a sun glow that bright near the sun there are no shafts. A glow too broad hazes the whole frame, so keep the lobe narrow (`pow(dot,24)`, peak ≈ 95).
- **Scripted edits.** Assert the match count before replacing text. A silently missed replacement cost time earlier.
- **Eye proportions** (measured from the reference photos): opening width ≈ 2.2 × iris width; opening height ≈ 0.41 × its width; brow centre ≈ 0.5 eye-width above the pupil.

## Open threads

- `floating-monolith`: a render with and without the projection was started on an earlier engine version. It has not been reviewed.
- Tunis city: data compiled, renderer not started. Paused until the user asks.
