// src/outcome.ts

import { rollPair } from './rollPair'
import { RollOutcome, RollPair } from './types'
import { some, none, fold } from 'fp-ts/Option'

/** Helper: sum of base + luck (0 if none) */
const total = (p: RollPair): number =>
  fold(
    () => p.base,
    (luck) => p.base + luck
  )(p.luck)

/** Helper: format advantage details */
const formatAdvantageDetails = (
  chosen: RollPair,
  other: RollPair,
  label: string
): string => {
  const sumChosen = total(chosen)
  const sumOther  = total(other)
  const luckChosen = fold(() => 0, (l) => l)(chosen.luck)
  const luckOther  = fold(() => 0, (l) => l)(other.luck)

  return `Advantage: ${label} used ` +
    `(Base: ${chosen.base}, Luck: ${luckChosen} = ${sumChosen}; ` +
    `Other: ${other.base} + ${luckOther} = ${sumOther})`
}

/** No‐advantage: wrap a single RollPair into a RollOutcome */
function resolveSingle(p: RollPair): RollOutcome {
  return {
    chosenBase:       p.base,
    chosenLuck:       p.luck,
    chosenSum:        total(p),
    advantageDetails: none
  }
}

/** Advantage: pick the better of two RollPairs */
function resolveAdvantage(p1: RollPair, p2: RollPair): RollOutcome {
  const t1 = total(p1)
  const t2 = total(p2)

  if (t1 >= t2) {
    return {
      chosenBase:       p1.base,
      chosenLuck:       p1.luck,
      chosenSum:        t1,
      advantageDetails: some(formatAdvantageDetails(p1, p2, '1st'))
    }
  } else {
    return {
      chosenBase:       p2.base,
      chosenLuck:       p2.luck,
      chosenSum:        t2,
      advantageDetails: some(formatAdvantageDetails(p2, p1, '2nd'))
    }
  }
}

/**
 * Compute the final roll outcome given useLuck & advantage flags.
 * Delegates to resolveSingle or resolveAdvantage for clarity.
 */
export function getRollOutcome(
  useLuck: boolean,
  advantage: boolean
): RollOutcome {
  const first = rollPair(useLuck)
  return advantage
    ? resolveAdvantage(first, rollPair(useLuck))
    : resolveSingle(first)
}
