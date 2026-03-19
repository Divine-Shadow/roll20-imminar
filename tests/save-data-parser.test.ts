import { readFileSync } from 'fs'
import { parseSaveData, getSkillModifierFromSaveData } from '../src/save-data-parser'

function loadSampleSave(): string {
  return readFileSync('documentation/sample-save.json', 'utf8')
}

test('parseSaveData extracts character, attributes, corruption, and skills', () => {
  const parsed = parseSaveData(loadSampleSave())

  expect(parsed.characterName).toBe('Veil Vectis')
  expect(parsed.playerName).toBe('Bill- DivineShadow')
  expect(parsed.attributes).toEqual(['Might', 'Speed', 'Intellect', 'Magic'])
  expect(parsed.corruptionLevels).toEqual([11])

  expect(parsed.skills.Tech).toBe(14)
  expect(parsed.skills['Sleight Of Hand']).toBe(8)
  expect(parsed.skills['Large Weapons']).toBe(1)
  expect(parsed.skills.Faith).toBe(11)
  expect(parsed.skills.Corruption).toBe(11)
  expect(parsed.skills.Intellect).toBe(40)
})

test('getSkillModifierFromSaveData matches exact and normalized skill names', () => {
  const parsed = parseSaveData(loadSampleSave())

  expect(getSkillModifierFromSaveData(parsed, 'Tech')).toBe(14)
  expect(getSkillModifierFromSaveData(parsed, 'Sleight of Hand')).toBe(8)
  expect(getSkillModifierFromSaveData(parsed, 'sleight_of_hand')).toBe(8)
  expect(getSkillModifierFromSaveData(parsed, 'Unknown Skill')).toBeUndefined()
})
