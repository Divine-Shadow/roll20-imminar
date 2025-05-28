// src/rollPair.ts

import { rollDie } from './random'
import { RollPair } from './types'
import { some, none } from 'fp-ts/Option'

/** Produce one (base d20, optional luck d4) pair */
export function rollPair(useLuck: boolean): RollPair {
  return {
    base: rollDie(20),
    luck: useLuck ? some(rollDie(4)) : none
  }
}
