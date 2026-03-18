# Parse Roll20 Save JSON as Direct Roll Data Source

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document follows `../ouroboros-ide/.agent/PLANS.md` guidance and is maintained locally in this repository as requested.

## Purpose / Big Picture

After this change, the overlay can consume the new exported save JSON structure as a direct source of skill modifiers, attributes, and corruption levels. A user can run standard rolls without relying on Roll20 inline lookup syntax like `@{character|skill}` when parsed save data is present. This is observable by running tests that parse `documentation/sample-save.json` and produce chat templates containing numeric modifiers for each skill.

## Progress

- [x] (2026-03-18 23:02Z) Read plan requirements from `../ouroboros-ide/.agent/PLANS.md` and mapped current roll pipeline (`form-builder.js` -> `rollSkillCheck.ts`).
- [x] (2026-03-18 23:02Z) Inspected `documentation/sample-save.json` schema and identified extraction targets for skills (`*_total`), attributes (`attributes1..3`), and corruption (`pact_modal_corruption`, `__pacts`).
- [x] (2026-03-18 23:05Z) Implemented `src/save-data-parser.ts` plus unit tests (`tests/save-data-parser.test.ts`) for skills, attributes, and corruption extraction.
- [x] (2026-03-18 23:05Z) Integrated optional save-data source into `src/rollSkillCheck.ts` and `src/form-builder.js`, preserving Roll20 lookup fallback.
- [x] (2026-03-18 23:05Z) Added end-to-end validation test `tests/save-data-roll-e2e.test.ts` iterating all parsed skills and generating rolls.
- [x] (2026-03-18 23:05Z) Ran full test suite and updated `Arcitecture_Guide_README.md` with new parser module and data-source behavior.
- [x] (2026-03-18 23:05Z) Updated ExecPlan outcomes, discoveries, and artifacts with implementation evidence.
- [x] (2026-03-18 23:12Z) Added widget data-source UX: file selection, character-name auto-fill, and dynamic selection options for skills, attributes, and corruption-level entries from loaded save data.

## Surprises & Discoveries

- Observation: The user-referenced `documentation/example-save.json` does not exist in this working tree; the only available save export is `documentation/sample-save.json`.
  Evidence: `ls -la documentation` output showed `sample-save.json` and no `example-save.json`.
- Observation: Save JSON stores many numeric fields as strings and includes custom skill slots (`ms1..ms23`) where the display name comes from companion `*_name` keys.
  Evidence: `ms1_total` paired with `ms1_name: "Faith"` in `documentation/sample-save.json`.
- Observation: Standard roll formatting can safely use inline numeric modifiers from parsed save data while preserving existing output structure.
  Evidence: `tests/rollSkillCheck.test.ts` assertion `{{Tech Modifier=14}}` and total expression `{{Total=[[9 + 14 + 0]]}}`.
- Observation: Save-driven roll option list can be broadened safely by augmenting `saveData.skills` with attribute and corruption-level labels at submit time.
  Evidence: `tests/form-builder.test.ts` asserts `skills` contains `Tech`, `Analytical`, and `Corruption Level 11`.

## Decision Log

- Decision: Treat `documentation/sample-save.json` as the canonical fixture for this implementation and tests.
  Rationale: It is the only save-format JSON currently present in the repo, and implementing against existing checked-in data keeps tests reproducible.
  Date/Author: 2026-03-18 / Codex
- Decision: Keep existing Roll20 lookup behavior as default and add an opt-in parsed-save data source path.
  Rationale: This preserves backwards compatibility for current users while enabling the new source format.
  Date/Author: 2026-03-18 / Codex
- Decision: In save-data mode, support fuzzy skill matching by normalizing names (case/spacing/punctuation-insensitive).
  Rationale: Fixture uses keys like `sleight_of_hand_total` while UI option is `Sleight of Hand`; normalization avoids brittle exact-name coupling.
  Date/Author: 2026-03-18 / Codex

## Outcomes & Retrospective

Implemented parser-backed save-data support end-to-end for standard rolls. The system now extracts skills, attributes, and corruption levels from `documentation/sample-save.json`, passes parsed save data from form submit to roll execution, and uses numeric skill modifiers directly in chat templates when available. Legacy Roll20 lookup behavior remains intact as fallback. Remaining gap: runtime ingestion of an external file in-browser is not added in this change; tests validate parser and roll execution using fixture-driven input.

## Context and Orientation

Current roll flow is centered in `src/form-builder.js` and `src/rollSkillCheck.ts`. `buildRollForm` gathers user input, then calls `rollSkillCheck` with `RollParams`. Standard rolls currently always generate a chat expression with `@{character|skill}` interpolation. The save export (`documentation/sample-save.json`) is a flat key/value object where skills are mostly represented as `<skill>_total`, traits are in `attributes1..3`, and corruption appears as a direct field (`pact_modal_corruption`) and inside serialized JSON (`__pacts`).

The new parser must normalize these keys into a stable in-memory structure so the roll formatter can retrieve numeric skill values by selected skill name.

## Plan of Work

Create `src/save-data-parser.ts` that accepts either a parsed object or JSON string and returns a normalized shape including:
- `skills`: map of display skill names to numeric totals.
- `attributes`: ordered string array from `attributes1`, `attributes2`, `attributes3` (excluding blanks).
- `corruptionLevels`: numeric array merged from direct and pact sources.
- identity fields (`characterName`, `playerName`) when present.

Update `src/types.ts` to include parser output type and to allow `RollParams` to optionally carry parsed save data.

Update `src/rollSkillCheck.ts` so standard roll formatting uses numeric modifier values when parsed save data is present and falls back to Roll20 `@{...}` lookups otherwise.

Update `src/form-builder.js` to accept an optional second argument for parsed save data and pass it into `rollSkillCheck` on submit.

Add tests in `tests/save-data-parser.test.ts` and extend `tests/rollSkillCheck.test.ts` / `tests/form-builder.test.ts` to verify the save-source behavior and end-to-end roll generation coverage across parsed skills.

## Concrete Steps

Working directory: `/home/bayesartre/dev/roll20-imminar`

1. Implement parser and type updates.
2. Integrate parser output into roll path and form builder.
3. Add parser, integration, and end-to-end tests.
4. Run:
   - `npm test`
5. Update `Arcitecture_Guide_README.md` to document new parser module and save-source roll behavior.
6. Record final evidence snippets and completion notes in this file.

## Validation and Acceptance

Acceptance is met when:
- Parsing tests prove skills, attributes, and corruption are extracted from `documentation/sample-save.json`.
- Roll tests prove standard rolls can resolve modifiers from parsed save data without `@{character|skill}` placeholders.
- End-to-end test proves a roll can be generated for every parsed skill in the fixture.
- Full `npm test` passes.

## Idempotence and Recovery

All edits are additive and safe to rerun. Tests are read-only against fixture data. If a parser mapping is wrong, recovery is to adjust normalization logic and rerun `npm test` until acceptance criteria pass.

## Artifacts and Notes

`npm test` output summary:

  > typescript-bookmarklet@1.0.0 test
  > jest
  PASS tests/save-data-parser.test.ts
  PASS tests/save-data-roll-e2e.test.ts
  PASS tests/rollSkillCheck.test.ts
  PASS tests/form-builder.test.ts
  ...
  Test Suites: 9 passed, 9 total
  Tests:       24 passed, 24 total

## Interfaces and Dependencies

No new external packages are required. Implementation uses existing TypeScript/Jest stack and current modules:
- `src/form-builder.js`
- `src/rollSkillCheck.ts`
- `src/types.ts`
- new `src/save-data-parser.ts`

Revision Note (2026-03-18): Initial local ExecPlan created to satisfy requested PLANS.md process and to guide implementation/testing of save-json parsing and roll integration.
Revision Note (2026-03-18): Updated plan after implementation to mark completed milestones, capture design decisions and discoveries, and embed test evidence proving end-to-end behavior.
Revision Note (2026-03-18): Extended the plan record with UX follow-up work for in-widget save file selection and dynamic roll-option population.
