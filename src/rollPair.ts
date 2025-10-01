// src/rollPair.ts

import { rollDie } from './random'
import { RollResult } from './types'
import { some, none } from 'fp-ts/Option'

/** Produce one (base d20, optional luck d4) pair */
export function rollPair(useLuck: boolean): RollResult {
  const base = rollDie(20)
  const confirmations: number[] = []

  let current = base
  while (current === 1 || current === 20) {
    current = rollDie(20)
    confirmations.push(current)
  }

  return {
    base,
    luck: useLuck ? some(rollDie(4)) : none,
    confirmations
  }
}
