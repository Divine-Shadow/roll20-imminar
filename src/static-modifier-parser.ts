// src/static-modifier-parser.ts

import { DiceRollDetail, DiceRollSign } from './static-modifier-types'

type BinaryOperator = 'add' | 'sub'

interface NumberNode {
  kind: 'number'
  value: number
}

interface DiceNode {
  kind: 'dice'
  count: number
  sides: number
}

interface UnaryNode {
  kind: 'negate'
  expr: ExprNode
}

interface BinaryNode {
  kind: BinaryOperator
  left: ExprNode
  right: ExprNode
}

type ExprNode = NumberNode | DiceNode | UnaryNode | BinaryNode

export interface ParsedStaticModifier {
  ast: ExprNode
  source: string
  containsDice: boolean
}

export type ParseResult =
  | { ok: true; value: ParsedStaticModifier }
  | { ok: false; error: string }

export type EvaluatedModifierValue =
  | { kind: 'constant'; total: number; value: number }
  | { kind: 'dice'; total: number; expression: string; dice: DiceRollDetail[] }

class Parser {
  private pos = 0
  private readonly length: number
  private seenDice = false

  constructor(private readonly input: string) {
    this.length = input.length
  }

  parse(): ParsedStaticModifier {
    const expr = this.parseExpression()
    this.skipWhitespace()
    if (!this.isAtEnd()) {
      throw new Error('Unexpected characters at end of expression')
    }

    return {
      ast: expr,
      source: this.normalizedSource(),
      containsDice: this.seenDice
    }
  }

  private parseExpression(): ExprNode {
    let node = this.parseUnary()

    while (true) {
      this.skipWhitespace()
      const ch = this.peek()
      if (ch === '+' || ch === '-') {
        this.pos += 1
        const right = this.parseUnary()
        const op: BinaryOperator = ch === '+' ? 'add' : 'sub'
        node = { kind: op, left: node, right }
      } else {
        break
      }
    }

    return node
  }

  private parseUnary(): ExprNode {
    this.skipWhitespace()

    let sign: DiceRollSign = 1
    while (true) {
      const ch = this.peek()
      if (ch === '+') {
        this.pos += 1
      } else if (ch === '-') {
        this.pos += 1
        sign = (sign * -1) as DiceRollSign
      } else {
        break
      }
      this.skipWhitespace()
    }

    const primary = this.parsePrimary()
    return sign === 1 ? primary : { kind: 'negate', expr: primary }
  }

  private parsePrimary(): ExprNode {
    this.skipWhitespace()
    const ch = this.peek()

    if (ch === '(') {
      this.pos += 1
      const expr = this.parseExpression()
      this.skipWhitespace()
      if (this.peek() !== ')') {
        throw new Error('Missing closing parenthesis')
      }
      this.pos += 1
      return expr
    }

    const start = this.pos
    const digitsBefore = this.readDigits()
    const afterDigits = this.pos

    this.skipWhitespace()
    const maybeDie = this.peekLower()

    if (maybeDie === 'd') {
      this.pos += 1
      this.skipWhitespace()

      const count = digitsBefore.length === 0 ? 1 : parseInt(digitsBefore, 10)
      if (!Number.isSafeInteger(count) || count <= 0) {
        throw new Error('Dice count must be a positive integer')
      }

      let sides: number
      if (this.peek() === '%') {
        this.pos += 1
        sides = 100
      } else {
        const sidesDigits = this.readDigits()
        if (sidesDigits.length === 0) {
          throw new Error('Dice sides must follow the d (e.g. d6)')
        }
        sides = parseInt(sidesDigits, 10)
      }

      if (!Number.isSafeInteger(sides) || sides <= 0) {
        throw new Error('Dice sides must be a positive integer')
      }

      this.seenDice = true
      return { kind: 'dice', count, sides }
    }

    // No dice notation, reset to after number
    this.pos = afterDigits

    if (digitsBefore.length === 0) {
      throw new Error('Expected a number or dice expression')
    }

    const value = parseInt(digitsBefore, 10)
    if (!Number.isSafeInteger(value)) {
      throw new Error('Number is too large')
    }

    return { kind: 'number', value }
  }

  private readDigits(): string {
    let digits = ''
    while (!this.isAtEnd()) {
      const ch = this.peek()
      if (ch >= '0' && ch <= '9') {
        digits += ch
        this.pos += 1
      } else {
        break
      }
    }
    return digits
  }

  private peek(): string {
    return this.input[this.pos] ?? ''
  }

  private peekLower(): string {
    const ch = this.peek()
    return ch.toLowerCase()
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const ch = this.peek()
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.pos += 1
      } else {
        break
      }
    }
  }

  private isAtEnd(): boolean {
    return this.pos >= this.length
  }

  private normalizedSource(): string {
    return this.input.trim().replace(/\s+/g, ' ')
  }
}

export function parseStaticModifierExpression(input: string): ParseResult {
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    return { ok: false, error: 'Enter a number or dice expression' }
  }

  try {
    const parser = new Parser(trimmed)
    return { ok: true, value: parser.parse() }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid modifier expression'
    return { ok: false, error: message }
  }
}

interface EvalResult {
  total: number
  dice: DiceRollDetail[]
}

function evaluateNode(node: ExprNode, rollDie: (sides: number) => number): EvalResult {
  switch (node.kind) {
    case 'number':
      return { total: node.value, dice: [] }
    case 'dice': {
      const rolls: number[] = []
      let subtotal = 0
      for (let i = 0; i < node.count; i += 1) {
        const roll = rollDie(node.sides)
        rolls.push(roll)
        subtotal += roll
      }
      const detail: DiceRollDetail = {
        count: node.count,
        sides: node.sides,
        rolls,
        sign: 1
      }
      return { total: subtotal, dice: [detail] }
    }
    case 'negate': {
      const inner = evaluateNode(node.expr, rollDie)
      return {
        total: -inner.total,
        dice: inner.dice.map(detail => ({
          ...detail,
          sign: (detail.sign * -1) as DiceRollSign
        }))
      }
    }
    case 'add': {
      const left = evaluateNode(node.left, rollDie)
      const right = evaluateNode(node.right, rollDie)
      return {
        total: left.total + right.total,
        dice: left.dice.concat(right.dice)
      }
    }
    case 'sub': {
      const left = evaluateNode(node.left, rollDie)
      const right = evaluateNode({ kind: 'negate', expr: node.right }, rollDie)
      return {
        total: left.total + right.total,
        dice: left.dice.concat(right.dice)
      }
    }
    default: {
      const exhaustive: never = node
      return exhaustive
    }
  }
}

export function evaluateParsedStaticModifier(
  parsed: ParsedStaticModifier,
  rollDie: (sides: number) => number
): EvaluatedModifierValue {
  const { total, dice } = evaluateNode(parsed.ast, rollDie)

  if (parsed.containsDice) {
    return {
      kind: 'dice',
      total,
      expression: parsed.source,
      dice
    }
  }

  return {
    kind: 'constant',
    total,
    value: total
  }
}
