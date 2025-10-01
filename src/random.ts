// src/random.ts

/** Roll a die of N sides */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1
}
