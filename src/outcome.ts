// src/outcome.ts

import { rollPair } from './rollPair'
import { RollOutcome, RollResult } from './types'
import { some, none, fold } from 'fp-ts/Option'

/** Helper: sum of base + luck (0 if none) */
const total = (p: RollResult): number =>
  fold<number, number>(
    () => p.base,
    (luck) => p.base + luck
  )(p.luck)

/** Helper: format advantage details */
const formatAdvantageDetails = (
  chosen: RollResult,
  other: RollResult,
  label: string
): string => {
  const sumChosen = total(chosen)
  const sumOther  = total(other)
  const luckChosen = fold<number, number>(() => 0, (l) => l)(chosen.luck)
  const luckOther  = fold<number, number>(() => 0, (l) => l)(other.luck)

  return `Advantage: ${label} used ` +
    `(Base: ${chosen.base}, Luck: ${luckChosen} = ${sumChosen}; ` +
    `Other: ${other.base} + ${luckOther} = ${sumOther})`
}

/** No‐advantage: wrap a single RollPair into a RollOutcome */
function resolveSingle(p: RollResult): RollOutcome {
  return {
    chosen: p,
    chosenSum: total(p),
    advantageDetails: none
  }
}

/** Advantage: pick the better of two RollPairs */
function resolveAdvantage(p1: RollResult, p2: RollResult): RollOutcome {
  const rating = (p: RollResult): number => {
    if (p.base === 20) return Infinity
    if (p.base === 1) return -Infinity
    return total(p)
  }

  const r1 = rating(p1)
  const r2 = rating(p2)

  if (r1 >= r2) {
    return {
      chosen: p1,
      chosenSum: total(p1),
      advantageDetails: some(formatAdvantageDetails(p1, p2, '1st'))
    }
  } else {
    return {
      chosen: p2,
      chosenSum: total(p2),
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
