# Captured Clip Labeling Kit - 2026-04-14

This guide is generated from the captured clip intake manifest and the pending label worksheet.

Do not guess. The goal is to convert captured clips into benchmark goldens only when the evidence is explicit.

## Commands

```bash
npm run validate:captured-labels
npm run generate:captured-frame-labels
npm run label:captured-frames
npm run promote:captured-clips
```

## Frame Labeler UI

Run `npm run label:captured-frames`, open the printed localhost URL, select a clip, then click the video to mark `tracked` or `uncertain` coordinates. Use `occluded` or `lost` when the reticle cannot be labeled.

## Labeling Checklist

- Patch version
- Weapon
- Distance in meters
- Stance
- Optic and optic state
- Muzzle, grip, and stock
- Spray start and end timestamps
- Frame labels path
- Expected diagnosis and tracking tier

## captured-clip1-2026-04-14

- Preliminary tier: `candidate-clean`
- Video: `tests/fixtures/captured-clips/clip1.mp4`
- Metadata: 1744x1080, 143.477 fps, 15.278s, hevc
- Center preview: `tests/fixtures/captured-clips/previews/clip1_center.jpg`
- Contact sheet: `tests/fixtures/captured-clips/previews/clip1_contact.jpg`
- Suggested frame labels template: `tests/fixtures/captured-clips/labels/captured-clip1-2026-04-14.frames.todo.json`
- Ready for golden labels: `true`

Missing fields:

- No missing fields.

Labeling notes:

- Fill only facts you can verify from the clip or capture context.
- Do not guess patch, weapon, distance, attachments, or diagnoses.
- If the spray window is ambiguous, keep it null and capture a cleaner clip.
- Fill sampled frame labels before copying the template path into `labels.todo.v1.json`.
- Use `tracked`/`uncertain` with x/y coordinates, or `occluded`/`lost` without coordinates.

## captured-clip2-2026-04-14

- Preliminary tier: `candidate-degraded`
- Video: `tests/fixtures/captured-clips/clip2.mp4`
- Metadata: 1728x1080, 143.733 fps, 14.951s, hevc
- Center preview: `tests/fixtures/captured-clips/previews/clip2_center.jpg`
- Contact sheet: `tests/fixtures/captured-clips/previews/clip2_contact.jpg`
- Suggested frame labels template: `tests/fixtures/captured-clips/labels/captured-clip2-2026-04-14.frames.todo.json`
- Ready for golden labels: `true`

Missing fields:

- No missing fields.

Labeling notes:

- Fill only facts you can verify from the clip or capture context.
- Do not guess patch, weapon, distance, attachments, or diagnoses.
- If the spray window is ambiguous, keep it null and capture a cleaner clip.
- Fill sampled frame labels before copying the template path into `labels.todo.v1.json`.
- Use `tracked`/`uncertain` with x/y coordinates, or `occluded`/`lost` without coordinates.

## captured-clip3-2026-04-14

- Preliminary tier: `candidate-clean`
- Video: `tests/fixtures/captured-clips/clip3.mp4`
- Metadata: 1728x1080, 143.592 fps, 14.667s, hevc
- Center preview: `tests/fixtures/captured-clips/previews/clip3_center.jpg`
- Contact sheet: `tests/fixtures/captured-clips/previews/clip3_contact.jpg`
- Suggested frame labels template: `tests/fixtures/captured-clips/labels/captured-clip3-2026-04-14.frames.todo.json`
- Ready for golden labels: `true`

Missing fields:

- No missing fields.

Labeling notes:

- Fill only facts you can verify from the clip or capture context.
- Do not guess patch, weapon, distance, attachments, or diagnoses.
- If the spray window is ambiguous, keep it null and capture a cleaner clip.
- Fill sampled frame labels before copying the template path into `labels.todo.v1.json`.
- Use `tracked`/`uncertain` with x/y coordinates, or `occluded`/`lost` without coordinates.

## captured-clip4-2026-04-14

- Preliminary tier: `candidate-degraded`
- Video: `tests/fixtures/captured-clips/clip4.mp4`
- Metadata: 1920x1080, 119.968 fps, 15.062s, hevc
- Center preview: `tests/fixtures/captured-clips/previews/clip4_center.jpg`
- Contact sheet: `tests/fixtures/captured-clips/previews/clip4_contact.jpg`
- Suggested frame labels template: `tests/fixtures/captured-clips/labels/captured-clip4-2026-04-14.frames.todo.json`
- Ready for golden labels: `true`

Missing fields:

- No missing fields.

Labeling notes:

- Fill only facts you can verify from the clip or capture context.
- Do not guess patch, weapon, distance, attachments, or diagnoses.
- If the spray window is ambiguous, keep it null and capture a cleaner clip.
- Fill sampled frame labels before copying the template path into `labels.todo.v1.json`.
- Use `tracked`/`uncertain` with x/y coordinates, or `occluded`/`lost` without coordinates.

