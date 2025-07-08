import { rollSkillCheck } from '../src/rollSkillCheck'
import { getRollOutcome } from '../src/outcome'
import { none } from 'fp-ts/Option'
import { JSDOM } from 'jsdom'

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
    chosenBase: 10,
    chosenLuck: none,
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
  expect(spyInput).toHaveBeenCalled()
  expect(spyClick).toHaveBeenCalled()
})
