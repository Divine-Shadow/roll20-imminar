import { readFileSync } from 'fs'
import { JSDOM } from 'jsdom'
import { none } from 'fp-ts/Option'
import { rollSkillCheck } from '../src/rollSkillCheck'
import { getRollOutcome } from '../src/outcome'
import { parseSaveData } from '../src/save-data-parser'

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
  mockGetRollOutcome.mockReturnValue({
    chosen: { base: 10, luck: none, confirmations: [] },
    chosenSum: 10,
    advantageDetails: none
  })
})

test('can generate standard roll templates for every parsed skill using save-data values', () => {
  const saveData = parseSaveData(readFileSync('documentation/sample-save.json', 'utf8'))
  const textarea = document.querySelector<HTMLTextAreaElement>('#textchat-input textarea')!
  const sendBtn = document.querySelector<HTMLButtonElement>('#chatSendBtn')!
  const spyClick = jest.spyOn(sendBtn, 'click')

  const entries = Object.entries(saveData.skills)
  expect(entries.length).toBeGreaterThan(0)

  entries.forEach(([skillName, value]) => {
    rollSkillCheck({
      characterName: saveData.characterName || 'Fixture',
      skillName,
      customTitle: '',
      rollType: 'standard',
      useLuck: false,
      advantage: false,
      staticModifiers: [],
      saveData
    })

    expect(textarea.value).toContain(`{{${skillName} Modifier=${value}}}`)
    expect(textarea.value).toContain(`{{Total=[[10 + ${value} + 0]]}}`)
    expect(textarea.value).not.toContain('@{')
  })

  expect(spyClick).toHaveBeenCalledTimes(entries.length)
})
