# Captured Clips Intake - 2026-04-14

Status: starter pack benchmark-ready

## Summary

Four local PUBG clips are registered in `tests/goldens/benchmark/captured-benchmark-draft.json` with clean and degraded tracking tiers represented.

The raw video files are intentionally ignored by git. The benchmark dataset, label templates and preview images are lightweight evidence for the intake decision.

Consent placeholders live in `tests/fixtures/captured-clips/consent.todo.v1.json`. They mark the current starter pack as private, internal-validation-only, and not trainability-authorized unless a maintainer records explicit permission for a later transition.

Public streamer/pro videos are qualitative reference only unless formal permission/trainability is verified. They must not be downloaded, frame-extracted, trained on, validated against, or promoted from this intake path without a filled consent record.

Frame label templates live in `tests/fixtures/captured-clips/labels/*.frames.todo.json`. Despite the historical `.todo` suffix, the current starter pack has enough tracking labels to run the pure benchmark path.

Validation command:

```bash
npm run validate:captured-labels
```

This command exits with a non-zero status while any clip still has missing labels. That failure is intentional: it prevents unlabeled captured clips from being treated as benchmark-ready.

Promotion command:

```bash
npm run promote:captured-clips
```

This command combines the intake manifest and label worksheet into a benchmark dataset draft only after every clip is fully labeled.

The promotion CLI also reads the consent manifest by default. A missing, withdrawn, qualitative-only, or trainability-incomplete consent record blocks promotion and is reported with field paths.

Labeling guide command:

```bash
npm run generate:captured-labeling-kit
```

This command regenerates `docs/captured-labeling-kit-2026-04-14.md` from the current intake and label worksheet.

## Auto-triage

| Clip | Preliminary tier | Evidence | Blocker before golden |
|---|---|---|---|
| `clip1.mp4` | `clean` | 1744x1080, ~143.5 fps, AUG red dot, light occlusion, frame labels present | Keep as single `golden` control with notes about inventory overlay |
| `clip2.mp4` | `degraded` | 1728x1080, ~143.7 fps, AUG red dot, moderate foreground occlusion | Keep as reviewed degraded starter clip |
| `clip3.mp4` | `clean` | 1728x1080, ~143.6 fps, AUG red dot, clear reticle samples | Keep as reviewed clean starter clip |
| `clip4.mp4` | `degraded` | 1920x1080, ~120 fps, Beryl M762 red dot, stream/HUD clutter | Keep as reviewed degraded starter clip with expected overpull |

## Required Human Labels

- `patchVersion`
- `weaponId`
- `distanceMeters`
- `stance`
- `optic`
- `attachments`
- `sprayWindow`
- `frameLabels`
- `expectedDiagnoses`

## Next Step

The starter pack can be used for local regression claims with:

```bash
npx tsx scripts/run-benchmark.ts tests/goldens/benchmark/captured-benchmark-draft.json
```

Only promote additional clips to `golden` after a second human review; `reviewed` clips are sufficient for starter coverage but should not be treated as immutable truth.

If consent is withdrawn, quarantine the clip and rebaseline any benchmark or release evidence that previously counted it.
