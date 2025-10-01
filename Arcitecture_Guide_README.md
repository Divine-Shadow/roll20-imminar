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

`dist/` is generated after running the build and contains the bundled `bookmarklet.js` plus a minified `bookmarklet.txt`.

## Build Pipeline

1. `npm run build` – Bundles `src/main.ts` via esbuild and outputs `dist/bookmarklet.js`.
2. `npm run bookmarklet` – Runs `build-bookmarklet.js` to produce a compact bookmarklet in `dist/bookmarklet.txt`.

## Source Modules

Below is a short description of each file inside `src/`:

- **main.ts** – Entrypoint. Imports `buildRollForm` and launches the overlay UI with default static modifiers.
- **form-builder.js** – Builds the in-page form, handles user interactions, and wires the "Roll" button to `rollSkillCheck`.
- **skill-options.js** – Defines the hard coded list of skills shown in the form.
- **ui-styles.js** – Contains visual styles and helpers like `injectDarkThemeStyles` used by the form builder.
- **random.ts** – Utility to roll a die of a specified size.
- **rollPair.ts** – Generates a roll result (base d20, optional luck) and any confirmation chain for critical values.
- **outcome.ts** – Resolves the final roll with natural 20/1 overrides and returns a `RollOutcome` including confirmations.
- **rollSkillCheck.ts** – Formats a chat message using the outcome and posts it to Roll20 chat.
- **types.ts** – Shared type definitions for roll parameters and results, including `RollResult` and `CriticalChain`.

### Data Flow

1. `main.ts` calls `buildRollForm()`.
2. The generated form collects input and on submit calls `rollSkillCheck()` with a `RollParams` object.
3. `rollSkillCheck()` invokes `getRollOutcome()` from `outcome.ts` to compute the roll result.
4. `outcome.ts` relies on `rollPair.ts` and `random.ts` for dice values and critical confirmations.
5. The formatted string is injected into the Roll20 chat interface.

## Development Tips

- All TypeScript is compiled with `strict` mode enabled as configured in `tsconfig.json`.
- When adding new features keep the preference for functional patterns from `fp-ts` in mind (e.g. use `Option` instead of `null`).
- After modifying TypeScript files, run `npm run build` and `npm run bookmarklet` to regenerate the bookmarklet output.


## Testing

See `Testing_Plan_README.md` for recommended libraries and example checks. Jest with `fast-check` is used for property based tests.
Unit test files reside in the `tests/` directory and can be executed with `npm test` which runs Jest using the configuration in `jest.config.js`.
Additional planning around critical roll logic is documented in `Critical_Roll_Plan_README.md`.
