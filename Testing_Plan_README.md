# Testing Plan

This guide explains how to verify the functionality of the Beacon overlay modules.

## Setup

Install the following development dependencies:

```bash
npm install --save-dev jest ts-jest @types/jest fast-check jsdom @types/jsdom
```

`ts-jest` compiles TypeScript sources while `jsdom` provides a DOM for tests that
interact with browser APIs.

Add the following script to `package.json` to run the tests:

```json
"test": "jest"
```

## Property Based Testing

Use [`fast-check`](https://github.com/dubzzz/fast-check) with Jest for functions
that produce random values. Property tests help ensure the statistical behaviour
of dice rolls is correct.

## Module Guidelines

### `src/random.ts`
- Property: `rollDie(n)` always returns an integer between `1` and `n`.
- Optionally check distribution over many runs.

### `src/rollPair.ts`
- When `useLuck` is `false` the `luck` field should be `None`.
- When `useLuck` is `true` the `luck` value is between `1` and `4`.
- `base` is always between `1` and `20`.
- `confirmations` end with a value other than `1` or `20`.

### `src/outcome.ts`
- `chosenSum` equals `chosen.base` plus `chosen.luck` (or `0` if `None`).
- With advantage enabled natural 20 overrides to win and 1 to lose regardless of luck.

### `src/rollSkillCheck.ts`
- Using a `jsdom` environment, verify that calling the function creates the
  expected chat message string and triggers the appropriate DOM events.

### `src/form-builder.js`
- Ensure the form is built with all expected fields and that submitting the form
  passes correctly formatted parameters to `rollSkillCheck`.

### `src/ui-styles.js`
- Verify that `injectDarkThemeStyles` adds a `<style>` element containing the
  dark theme rules.

## Running Tests

Execute all tests with:

```bash
npm test
```

Property based checks will run alongside regular unit tests, providing confidence
that random behaviours stay within the specified bounds.
