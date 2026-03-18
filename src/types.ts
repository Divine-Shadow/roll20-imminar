// src/types.ts

import { Option } from 'fp-ts/Option'
import {
  StaticModifier,
  StaticModifierConstant,
  StaticModifierDice,
  DiceRollDetail
} from './static-modifier-types.ts'

export type RollType = 'standard' | 'semigroup'

export interface ParsedSaveData {
  characterName: string
  playerName: string
  skills: Record<string, number>
  attributes: string[]
  corruptionLevels: number[]
}

export interface RollParams {
  characterName:   string
  skillName:       string
  customTitle:     string
  rollType:        RollType
  useLuck:         boolean
  advantage:       boolean
  staticModifiers: StaticModifier[]
  saveData?:       ParsedSaveData
}

// Result of a single d20 roll with optional luck
export interface RollResult {
  base: number
  luck: Option<number>
  confirmations: number[]
}

// Sequence of d20 values rolled after a 1 or 20
export type CriticalChain = number[]

// Final resolved roll after considering advantage
export interface RollOutcome {
  chosen: RollResult
  chosenSum: number
  advantageDetails: Option<string>
}

export type {
  StaticModifier,
  StaticModifierConstant,
  StaticModifierDice,
  DiceRollDetail
}
