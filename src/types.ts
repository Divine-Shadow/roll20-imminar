// src/types.ts

import { Option } from 'fp-ts/Option'

export interface StaticModifier {
  name:  string
  value: number
}

export interface RollParams {
  characterName:   string
  skillName:       string
  customTitle:     string
  useLuck:         boolean
  advantage:       boolean
  staticModifiers: StaticModifier[]
}

export type RollPair = {
  base: number
  luck: Option<number>
}

export interface RollOutcome {
  chosenBase:       number
  chosenLuck:       Option<number>
  chosenSum:        number
  advantageDetails: Option<string>
}
