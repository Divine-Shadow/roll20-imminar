import {
  parseStaticModifierExpression,
  evaluateParsedStaticModifier
} from '../src/static-modifier-parser'

const stubRollDie = jest.fn((sides: number) => {
  if (sides <= 0) throw new Error('invalid sides')
  return sides
})

beforeEach(() => {
  stubRollDie.mockClear()
})

test('parses plain numeric expressions', () => {
  const result = parseStaticModifierExpression(' 5 + 7 - 2 ')
  expect(result).toEqual({
    ok: true,
    value: expect.objectContaining({
      containsDice: false,
      source: '5 + 7 - 2'
    })
  })

  if (!result.ok) throw new Error('expected parse success')
  const evaluated = evaluateParsedStaticModifier(result.value, stubRollDie)
  expect(evaluated).toEqual({
    kind: 'constant',
    total: 10,
    value: 10
  })
  expect(stubRollDie).not.toHaveBeenCalled()
})

test('parses and evaluates dice expressions with whitespace and parentheses', () => {
  const result = parseStaticModifierExpression(' (2 d8) + ( -1d4 + 3 ) ')
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error('expected parse success')

  const evaluated = evaluateParsedStaticModifier(result.value, stubRollDie)
  if (evaluated.kind !== 'dice') {
    throw new Error('expected dice evaluation variant')
  }
  const normalized = '(2 d8) + ( -1d4 + 3 )'.trim().replace(/\s+/g, ' ')
  expect(evaluated.total).toBe(8 + 8 - 4 + 3) // sides returned by stub
  expect(evaluated.expression).toBe(normalized)
  expect(evaluated.dice).toEqual([
    { count: 2, sides: 8, rolls: [8, 8], sign: 1 },
    { count: 1, sides: 4, rolls: [4], sign: -1 }
  ])
  expect(stubRollDie).toHaveBeenCalledTimes(3)
})

test('returns descriptive errors for invalid expressions', () => {
  const result = parseStaticModifierExpression('d')
  expect(result).toEqual({
    ok: false,
    error: 'Dice sides must follow the d (e.g. d6)'
  })
})

test('supports tight dice expressions without spaces', () => {
  const result = parseStaticModifierExpression('2d6+1')
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error('expected parse success')

  stubRollDie.mockImplementationOnce(() => 2).mockImplementationOnce(() => 5)
  const evaluated = evaluateParsedStaticModifier(result.value, stubRollDie)
  if (evaluated.kind !== 'dice') throw new Error('expected dice variant')

  expect(evaluated.expression).toBe('2d6+1')
  expect(evaluated.total).toBe(2 + 5 + 1)
  expect(evaluated.dice).toEqual([
    { count: 2, sides: 6, rolls: [2, 5], sign: 1 }
  ])
})
