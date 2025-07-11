import { rollPair } from '../src/rollPair'
import fc from 'fast-check'

test('rollPair respects useLuck flag and ranges', () => {
  fc.assert(
    fc.property(fc.boolean(), useLuck => {
      const pair = rollPair(useLuck)
      expect(pair.base).toBeGreaterThanOrEqual(1)
      expect(pair.base).toBeLessThanOrEqual(20)
      if (useLuck) {
        expect(pair.luck._tag).toBe('Some')
        const value = (pair.luck as any).value
        expect(value).toBeGreaterThanOrEqual(1)
        expect(value).toBeLessThanOrEqual(4)
      } else {
        expect(pair.luck._tag).toBe('None')
      }
      pair.confirmations.forEach((c, i) => {
        expect(c).toBeGreaterThanOrEqual(1)
        expect(c).toBeLessThanOrEqual(20)
        if (i < pair.confirmations.length - 1) {
          expect(c === 1 || c === 20).toBe(true)
        } else {
          expect(c === 1 || c === 20).toBe(false)
        }
      })
    })
  )
})
