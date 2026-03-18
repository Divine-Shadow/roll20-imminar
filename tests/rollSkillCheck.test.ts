import { rollSkillCheck } from '../src/rollSkillCheck'
import { getRollOutcome } from '../src/outcome'
import { none } from 'fp-ts/Option'
import { JSDOM } from 'jsdom'
import { StaticModifier } from '../src/types'
import { rollDie } from '../src/random'

jest.mock('../src/outcome')
jest.mock('../src/random', () => ({
  rollDie: jest.fn(() => 1)
}))
const mockGetRollOutcome = getRollOutcome as jest.MockedFunction<typeof getRollOutcome>
const mockRollDie = rollDie as jest.MockedFunction<typeof rollDie>

let dom: JSDOM
beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  ;(global as any).window = dom.window
  ;(global as any).document = dom.window.document
  ;(global as any).Event = dom.window.Event
  ;(global as any).KeyboardEvent = dom.window.KeyboardEvent
  document.body.innerHTML = `
    <div id="textchat-input"><textarea></textarea></div>
    <button id="chatSendBtn"></button>
  `
  mockGetRollOutcome.mockReset()
  mockRollDie.mockReset()
  mockRollDie.mockReturnValue(1)
})

test('rollSkillCheck sends formatted chat message', () => {
  mockGetRollOutcome.mockReturnValue({
    chosen: { base: 10, luck: none, confirmations: [18] },
    chosenSum: 10,
    advantageDetails: none
  })

  const textarea = document.querySelector<HTMLTextAreaElement>('#textchat-input textarea')!
  const spyInput = jest.spyOn(textarea, 'dispatchEvent')
  const sendBtn = document.querySelector<HTMLButtonElement>('#chatSendBtn')!
  const spyClick = jest.spyOn(sendBtn, 'click')

  rollSkillCheck({
    characterName: 'Alice',
    skillName: 'Stealth',
    customTitle: 'Sneak',
    rollType: 'standard',
    useLuck: false,
    advantage: false,
    staticModifiers: []
  })

  expect(textarea.value).toContain('&{template:default}')
  expect(textarea.value).toContain('Stealth Check')
  expect(textarea.value).toContain('Confirm 1')
  expect(spyInput).toHaveBeenCalled()
  expect(spyClick).toHaveBeenCalled()
})

test('includes static modifiers totals in output', () => {
  mockGetRollOutcome.mockReturnValue({
    chosen: { base: 12, luck: none, confirmations: [] },
    chosenSum: 12,
    advantageDetails: none
  })

  const modifiers: StaticModifier[] = [
    { name: 'Bless', kind: 'constant', total: 2, value: 2 },
    { name: 'Smite', kind: 'dice', total: 7, expression: '2d4 + 3', dice: [] }
  ]

  const textarea = document.querySelector<HTMLTextAreaElement>('#textchat-input textarea')!
  const spyInput = jest.spyOn(textarea, 'dispatchEvent')
  const sendBtn = document.querySelector<HTMLButtonElement>('#chatSendBtn')!
  const spyClick = jest.spyOn(sendBtn, 'click')

  rollSkillCheck({
    characterName: 'Lia',
    skillName: 'Religion',
    customTitle: '',
    rollType: 'standard',
    useLuck: false,
    advantage: false,
    staticModifiers: modifiers
  })

  expect(textarea.value).toContain('{{Bless=[[2]]}}')
  expect(textarea.value).toContain('{{Smite=[[7]]}}')
  expect(textarea.value).toContain('[[12 + @{Lia|Religion} + 9]]')
  expect(spyInput).toHaveBeenCalled()
  expect(spyClick).toHaveBeenCalled()
})

test('semigroup roll uses d100 tier output and ignores skill formatting', () => {
  mockRollDie.mockReturnValue(77)

  const textarea = document.querySelector<HTMLTextAreaElement>('#textchat-input textarea')!
  const sendBtn = document.querySelector<HTMLButtonElement>('#chatSendBtn')!
  const spyClick = jest.spyOn(sendBtn, 'click')

  rollSkillCheck({
    characterName: 'Lia',
    skillName: 'Religion',
    customTitle: 'Group Roll',
    rollType: 'semigroup',
    useLuck: true,
    advantage: true,
    staticModifiers: [{ name: 'Bless', kind: 'constant', total: 2, value: 2 }]
  })

  expect(mockGetRollOutcome).not.toHaveBeenCalled()
  expect(textarea.value).toContain('{{name=Group Roll}}')
  expect(textarea.value).toContain('{{Roll=Semigroup}}')
  expect(textarea.value).toContain('{{Semigroup Roll=[[77]]}}')
  expect(textarea.value).toContain('{{Tier=Master}}')
  expect(textarea.value).not.toContain('Religion')
  expect(spyClick).toHaveBeenCalled()
})

test('standard roll can use parsed save data instead of roll20 attribute lookup', () => {
  mockGetRollOutcome.mockReturnValue({
    chosen: { base: 9, luck: none, confirmations: [] },
    chosenSum: 9,
    advantageDetails: none
  })

  const textarea = document.querySelector<HTMLTextAreaElement>('#textchat-input textarea')!

  rollSkillCheck({
    characterName: 'Lia',
    skillName: 'Tech',
    customTitle: '',
    rollType: 'standard',
    useLuck: false,
    advantage: false,
    staticModifiers: [],
    saveData: {
      characterName: 'Lia',
      playerName: 'Player',
      skills: { Tech: 14 },
      attributes: ['Analytical'],
      corruptionLevels: [11]
    }
  })

  expect(textarea.value).toContain('{{Tech Modifier=14}}')
  expect(textarea.value).toContain('{{Total=[[9 + 14 + 0]]}}')
  expect(textarea.value).not.toContain('@{Lia|Tech}')
})
