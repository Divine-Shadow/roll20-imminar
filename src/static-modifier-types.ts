// src/static-modifier-types.ts

export type DiceRollSign = 1 | -1

export interface DiceRollDetail {
  count: number
  sides: number
  rolls: number[]
  sign: DiceRollSign
}

interface StaticModifierBase {
  name: string
  total: number
}

export interface StaticModifierConstant extends StaticModifierBase {
  kind: 'constant'
  value: number
}

export interface StaticModifierDice extends StaticModifierBase {
  kind: 'dice'
  expression: string
  dice: DiceRollDetail[]
}

export type StaticModifier = StaticModifierConstant | StaticModifierDice
