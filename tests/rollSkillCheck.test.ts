import { rollSkillCheck } from '../src/rollSkillCheck'
import { getRollOutcome } from '../src/outcome'
import { none } from 'fp-ts/Option'
import { JSDOM } from 'jsdom'
import { StaticModifier } from '../src/types'

jest.mock('../src/outcome')
const mockGetRollOutcome = getRollOutcome as jest.MockedFunction<typeof getRollOutcome>

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
