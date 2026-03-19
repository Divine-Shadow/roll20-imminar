# Codebase Architecture Guide

This document provides an overview of the project layout and explains how the main pieces fit together.  It is intended for new contributors or AI agents so they can easily navigate the repository and understand where specific functionality lives.

## High Level Overview

Veil Vectis is a Roll20 overlay written primarily in TypeScript with functional programming helpers from **fp-ts**.  The build process bundles the source into a single bookmarklet script using **esbuild**.

Key points from the style guide in `Agents.md`:

- Prefer strong types and `fp-ts` constructs such as `Option` over raw `null` or `undefined` values.
- Source files live under the `src/` directory and are transpiled to ES6.

## Directory Layout

```
roll20-imminar/
├── build-bookmarklet.js  - Creates the final bookmarklet string.
├── package.json          - NPM configuration and build scripts.
├── tsconfig.json         - TypeScript compiler settings.
├── src/                  - Source files (TypeScript/JavaScript modules).
└── README.md             - Basic build instructions.
```

`dist/` is generated after running the build and contains the bundled `bookmarklet.js`, minified `bookmarklet.txt`, and generated installer page `install.html`. A GitHub Pages-ready installer is also generated at `docs/install.html`.

## Build Pipeline

1. `npm run build` – Bundles `src/main.ts` via esbuild and outputs `dist/bookmarklet.js`.
2. `npm run bookmarklet` – Runs `build-bookmarklet.js` to produce a compact bookmarklet in `dist/bookmarklet.txt`, installer page `dist/install.html`, and publishable installer page `docs/install.html`.
3. `npm run bookmarklet:copy` / `npm run bookmarklet:open` / `npm run bookmarklet:install` – Convenience flows for copying bookmarklet URL and opening installer page.

## Source Modules

Below is a short description of each file inside `src/`:

- **main.ts** – Entrypoint. Performs a Roll20 page preflight check before launching the overlay UI with default static modifiers; on non-Roll20 pages it shows a friendly instruction message instead of initializing.
- **form-builder.js** – Builds the in-page form, exposes toggles for roll type (`Standard` vs `Semigroup`) and data source (`Roll20 Sheet` vs `Save File`), splits the UI into a collapsible `Roll Setup` section plus a bottom `Quick Roll` section (title, skill, submit), persists data-source selection via `localStorage`, defaults to the save-file prompt when no source preference has been persisted, hides the main rolling controls until a source is explicitly selected/confirmed on first run, initializes first-run prompt state near the center of the viewport, supports dragging the main panel by header with viewport clamping, provides a separate data-source popover with loaded-state indicators and an in-panel `OK` dismiss action, includes a Roll20 character selector field in that popover (used for `@{character|skill}` lookups), loads/parses selected save JSON files, auto-fills character name from loaded save data, dynamically refreshes the selectable roll list (skills + attributes + corruption levels), validates static modifiers for standard rolls, and wires the "Roll" button to `rollSkillCheck`.
- **skill-options.js** – Defines the hard coded list of skills shown in the form.
- **ui-styles.js** – Contains visual styles and helpers like `injectDarkThemeStyles` used by the form builder.
- **ui-validation.ts** – Applies shared error styling and tooltips for invalid inputs.
- **random.ts** – Utility to roll a die of a specified size.
- **rollPair.ts** – Generates a roll result (base d20, optional luck) and any confirmation chain for critical values.
- **outcome.ts** – Resolves the final roll with natural 20/1 overrides and returns a `RollOutcome` including confirmations.
- **rollSkillCheck.ts** – Formats and posts chat output for two paths: standard d20 skill checks (with optional luck/advantage/modifiers) and Semigroup d100 tier rolls.
- **save-data-parser.ts** – Parses exported save JSON into normalized skill totals, primary stat attributes (`Might`, `Speed`, `Intellect`, `Magic`), corruption levels, and exposes skill lookup helpers for roll-time modifier resolution.
- **static-modifier-parser.ts** – Parses modifier text, builds an AST, and evaluates dice expressions using the shared RNG.
- **static-modifier-types.ts** – Defines the discriminated union (`StaticModifier`) consumed throughout the roll pipeline.
- **types.ts** – Shared type definitions and re-exports for roll parameters, static modifier unions, and roll outcomes.

### Data Flow

1. `main.ts` calls `buildRollForm()`.
2. The generated form collects input and on submit calls `rollSkillCheck()` with a `RollParams` object.
3. For `Standard` rolls, static modifiers are parsed and evaluated via `static-modifier-parser.ts`, producing strongly typed entries with precalculated totals.
4. `rollSkillCheck()` branches on `RollParams.rollType`:
   - `standard`: invokes `getRollOutcome()` from `outcome.ts` and includes skill/modifier math in the template. If parsed save data is provided, skill modifiers are read directly from that data source; otherwise it falls back to Roll20 attribute lookups (`@{character|skill}`).
   - `semigroup`: rolls a d100 directly and maps the result to tier (`Standard`, `Great`, `Master`) without skill, luck, advantage, or static modifiers.
5. `outcome.ts` relies on `rollPair.ts` and `random.ts` for standard d20 roll values and critical confirmations.
6. The formatted string is injected into the Roll20 chat interface.

## Development Tips

- All TypeScript is compiled with `strict` mode enabled as configured in `tsconfig.json`.
- When adding new features keep the preference for functional patterns from `fp-ts` in mind (e.g. use `Option` instead of `null`).
- After modifying TypeScript files, run `npm run build` and `npm run bookmarklet` to regenerate the bookmarklet output.


## Testing

See `Testing_Plan_README.md` for recommended libraries and example checks. Jest with `fast-check` is used for property based tests.
Unit test files reside in the `tests/` directory and can be executed with `npm test` which runs Jest using the configuration in `jest.config.js`.
Additional planning around critical roll logic is documented in `Critical_Roll_Plan_README.md`.
