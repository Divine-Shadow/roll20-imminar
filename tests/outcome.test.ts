import { getRollOutcome } from '../src/outcome'
import { rollPair } from '../src/rollPair'
import { some, none } from 'fp-ts/Option'

jest.mock('../src/rollPair')
const mockRollPair = rollPair as jest.MockedFunction<typeof rollPair>

test('getRollOutcome sums base and luck', () => {
  mockRollPair.mockReturnValueOnce({ base: 5, luck: some(3) })
  const result = getRollOutcome(true, false)
  expect(result.chosenBase).toBe(5)
  expect(result.chosenLuck).toEqual(some(3))
  expect(result.chosenSum).toBe(8)
  expect(result.advantageDetails._tag).toBe('None')
})

test('getRollOutcome selects higher total with advantage', () => {
  mockRollPair.mockReturnValueOnce({ base: 4, luck: none })
  mockRollPair.mockReturnValueOnce({ base: 6, luck: none })
  const result = getRollOutcome(false, true)
  expect(result.chosenBase).toBe(6)
  expect(result.chosenLuck).toEqual(none)
  expect(result.chosenSum).toBe(6)
  expect(result.advantageDetails._tag).toBe('Some')
})
