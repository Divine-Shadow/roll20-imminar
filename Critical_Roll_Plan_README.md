# Critical Roll Handling Update Plan

This document outlines the steps to update the codebase to support more nuanced critical roll behaviour.

## Goals
- **Natural 20 wins, natural 1 loses**: When rolling with advantage, if either d20 shows a 20 the roll automatically succeeds. Likewise a 1 automatically fails. Luck dice do not override this rule.
- **Recursive confirmations**: Every time a d20 lands on a 1 or 20 a new d20 confirmation roll is required. This applies to confirmations themselves, forming a chain until a non‑critical result appears.
- **Chat templates include confirmations**: All confirmation rolls should be displayed in the Roll20 chat output so players see the full sequence.
- **Improved types**: Introduce clearer types to model confirmations and critical outcomes while keeping the functional style using `Option`.

## Proposed Type Additions
- `RollResult` – result of one d20 plus optional luck.
- `CriticalChain` – array of d20 values produced during confirmation.
- `ResolvedRoll` – combines the chosen roll, its confirmations and advantage details.

## Implementation Sketch
1. **Extend `rollPair.ts`** to return an initial `RollResult` and perform recursive confirmations whenever the d20 is 1 or 20.
2. **Update `outcome.ts`** to honour the auto‑win/auto‑lose logic when advantage is active. The chosen result should incorporate the full `CriticalChain` from step 1.
3. **Modify `rollSkillCheck.ts`** so the chat template lists each confirmation roll. This may involve mapping over `CriticalChain` and formatting `{{Confirm=N}}` fields.
4. **Adjust existing tests and add new ones** in `tests/` verifying the natural 20/1 override and the confirmation chain behaviour.

These changes will make critical roll resolution explicit and ensure the chat output reflects every step of the process.
