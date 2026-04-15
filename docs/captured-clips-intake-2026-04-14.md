# Captured Clips Intake - 2026-04-14

Status: auto-triage, pending human labels

## Summary

Two local PUBG clips were placed in `tests/fixtures/captured-clips/` and registered in `tests/fixtures/captured-clips/intake.v1.json`.

The raw video files are intentionally ignored by git. The manifest and preview images can be versioned because they are lightweight evidence for the intake decision.

The pending label worksheet is `tests/fixtures/captured-clips/labels.todo.v1.json`. It intentionally keeps uncertain game facts as `null` until a human label pass fills them.

Validation command:

```bash
npm run validate:captured-labels
```

This command exits with a non-zero status while any clip still has missing labels. That failure is intentional: it prevents unlabeled captured clips from being treated as benchmark-ready.

Promotion command:

```bash
npm run promote:captured-clips
```

This command combines the intake manifest and label worksheet into a benchmark dataset draft only after every clip is fully labeled. Until then it reports `blockedClips` and exits non-zero.

Labeling guide command:

```bash
npm run generate:captured-labeling-kit
```

This command regenerates `docs/captured-labeling-kit-2026-04-14.md` from the current intake and label worksheet.

## Auto-triage

| Clip | Preliminary tier | Evidence | Blocker before golden |
|---|---|---|---|
| `clip1.mp4` | `candidate-clean` | 1744x1080, ~143.5 fps, 15.278s, HEVC, reticle visible in ADS samples | One sampled frame has inventory open; needs spray start/end and human labels |
| `clip2.mp4` | `candidate-degraded` | 1728x1080, ~143.7 fps, 14.951s, HEVC, usable ADS samples | Moderate occlusion/foreground structure and mixed framing; needs human labels |

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

Promote these from intake candidates to real goldens only after the missing labels are filled. Until then they should not be used to claim tracking, diagnosis, or coaching accuracy.
