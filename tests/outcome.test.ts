import { getRollOutcome } from '../src/outcome'
import { rollPair } from '../src/rollPair'
import { some, none } from 'fp-ts/Option'

jest.mock('../src/rollPair')
const mockRollPair = rollPair as jest.MockedFunction<typeof rollPair>

test('getRollOutcome sums base and luck', () => {
  mockRollPair.mockReturnValueOnce({ base: 5, luck: some(3), confirmations: [2] })
  const result = getRollOutcome(true, false)
  expect(result.chosen.base).toBe(5)
  expect(result.chosen.luck).toEqual(some(3))
  expect(result.chosenSum).toBe(8)
  expect(result.chosen.confirmations).toEqual([2])
  expect(result.advantageDetails._tag).toBe('None')
})

test('getRollOutcome selects higher total with advantage', () => {
  mockRollPair.mockReturnValueOnce({ base: 4, luck: none, confirmations: [] })
  mockRollPair.mockReturnValueOnce({ base: 6, luck: none, confirmations: [] })
  const result = getRollOutcome(false, true)
  expect(result.chosen.base).toBe(6)
  expect(result.chosen.luck).toEqual(none)
  expect(result.chosenSum).toBe(6)
  expect(result.advantageDetails._tag).toBe('Some')
})

test('natural 20 always wins with advantage', () => {
  mockRollPair.mockReturnValueOnce({ base: 1, luck: some(3), confirmations: [] })
  mockRollPair.mockReturnValueOnce({ base: 20, luck: none, confirmations: [] })
  const result = getRollOutcome(true, true)
  expect(result.chosen.base).toBe(20)
  expect(result.chosenSum).toBe(20)
})

test('natural 1 always loses if no 20 present', () => {
  mockRollPair.mockReturnValueOnce({ base: 1, luck: some(4), confirmations: [] })
  mockRollPair.mockReturnValueOnce({ base: 5, luck: none, confirmations: [] })
  const result = getRollOutcome(true, true)
  expect(result.chosen.base).toBe(5)
})
