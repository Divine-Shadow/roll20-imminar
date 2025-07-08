import { rollDie } from '../src/random'
import fc from 'fast-check'

test('rollDie returns value within range', () => {
  fc.assert(
    fc.property(fc.integer({min: 1, max: 100}), sides => {
      const result = rollDie(sides)
      expect(result).toBeGreaterThanOrEqual(1)
      expect(result).toBeLessThanOrEqual(sides)
    })
  )
})
