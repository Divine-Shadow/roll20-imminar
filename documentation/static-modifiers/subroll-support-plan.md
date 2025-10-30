# Static Modifier Subroll Support Plan

## Concept Summary
- Current static modifiers accept only numeric literals because the UI restricts input to numbers and the submit handler coerces values with the unary `+`. Everything downstream (types, renderer) expects `number`, so any dice-style syntax like `2d6 + 3` is rejected.
- We want modifiers to optionally include their own dice expression (e.g. `2d6 + 3`). A lightweight parser should classify each entry as either a resolved constant or a dice expression. Invalid text should be surfaced immediately by highlighting the offending input and attaching a tooltip.
- Downstream consumers should receive a discriminated union that preserves the parsed intent. Rendering logic can then decide how to evaluate or present each variant without needing ad-hoc string checks.

## Parser & Evaluation Requirements
- Grammar: multiple additive terms with whitespace, parentheses, and negative literals allowed. Terms can be plain integers or dice rolls of the form `NdM`, `dM`, or variations like `N d%`. We will normalize whitespace and enforce explicit operators between terms.
- Validation: parsing failures keep the row in an error state (red border + tooltip) and exclude it from submission until corrected.
- Evaluation: we resolve dice expressions within the app (no reliance on Roll20 inline rolls). Dice terms should produce both the total and the individual die results to allow downstream display if needed.

## Planned Changes
- **UI (`form-builder.js`)**
  - Switch modifier value input to plain text, attach validation styles, and surface error tooltips on parse failure.
  - Update the submit handler to run the parser, discard invalid rows, and pass along the typed variant rather than a raw number.
- **Types (`types.ts`)**
  - Introduce a discriminated union, e.g. `StaticModifierConstant` vs `StaticModifierDice`, plus an evaluated payload (total, breakdown).
  - Update `RollParams.staticModifiers` and any consumers accordingly.
- **Parser Module (new)**
  - Build a small parser that tokenizes numbers, dice terms, operators, and parentheses.
  - Output an AST that can be evaluated deterministically (using existing RNG utilities where possible for dice rolls).
  - Expose helper functions for validation, evaluation, and tooltip messaging.
- **Roll Logic (`rollSkillCheck.ts`)**
  - Adjust static modifier handling to accept the union type, evaluate dice rolls, and emit the resolved totals into the template.
  - Ensure totals include the fully evaluated modifier sum, while still supporting optional detailed chat output if desired later.

## Open Items (Resolved)
- **RNG integration:** Reuse the existing dice outcome utilities (shared RNG) so chat output remains consistent with other roll paths and supports deterministic testing.
- **Tooltip styling:** Centralize tooltip copy and CSS tokens alongside other form validation helpers (create `ui-validation.ts` if none exists) for consistent UX across future input validators.

## Implementation Seams & Refactors
- **New Modules**
  - `static-modifier-parser.ts`: tokenize, parse, and evaluate expressions; export `parseStaticModifier` returning a `Result` type with success payload or validation error description.
  - `static-modifier-types.ts`: define discriminated unions (`StaticModifierConstant`, `StaticModifierDice`) plus evaluated payload (`evaluatedTotal`, `terms`, optional `diceBreakdown`).
  - `ui-validation.ts`: shared helpers for applying error styles, tooltips, and clearing validation states on inputs.
- **Updated Modules**
  - `types.ts`: re-export or import the new static modifier union and update `RollParams`.
  - `form-builder.js`: switch modifier value inputs to text, plug in validation helpers, invoke the parser on blur and on submit, forward typed results.
  - `rollSkillCheck.ts`: consume the union, aggregate totals via the parser’s evaluated output, and include dice breakdowns if needed later.
  - `outcome` utilities (if required): expose public RNG hooks to support parser evaluation.
- **Refactors**
  - Replace numeric coercion logic in `form-builder.js` with parser integration.
  - Adjust tests (unit + integration) to cover parsing edge cases, validation states, and rendered chat output.
