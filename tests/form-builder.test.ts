// @ts-ignore
import { buildRollForm } from '../src/form-builder.js'
import { rollSkillCheck } from '../src/rollSkillCheck'
import { JSDOM } from 'jsdom'

jest.mock('../src/rollSkillCheck')
const mockRollSkillCheck = rollSkillCheck as jest.MockedFunction<typeof rollSkillCheck>

let dom: JSDOM
beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  ;(global as any).window = dom.window
  ;(global as any).document = dom.window.document
  ;(global as any).Event = dom.window.Event
  document.body.innerHTML = ''
  mockRollSkillCheck.mockClear()
})

test('buildRollForm creates fields and submits params', () => {
  buildRollForm([{ label: 'Atk', default: 2 }])

  const form = document.getElementById('customRollForm') as HTMLFormElement
  expect(form).toBeTruthy()
  expect(document.getElementById('skillList')).toBeTruthy()

  ;(document.getElementById('characterName') as HTMLInputElement).value = 'Bob'
  ;(document.getElementById('skillName') as HTMLInputElement).value = 'Arcana'
  ;(document.getElementById('customTitle') as HTMLInputElement).value = 'Spell'
  ;(document.getElementById('useluck') as HTMLInputElement).checked = true
  ;(document.getElementById('advantage') as HTMLInputElement).checked = false

  const row = document.querySelector('.static-modifier-row')!
  ;(row.querySelector('.mod-name') as HTMLInputElement).value = 'Atk'
  ;(row.querySelector('.mod-value') as HTMLInputElement).value = '2'

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

  expect(mockRollSkillCheck).toHaveBeenCalledWith({
    characterName: 'Bob',
    skillName: 'Arcana',
    customTitle: 'Spell',
    useLuck: true,
    advantage: false,
    staticModifiers: [{ name: 'Atk', value: 2 }]
  })
})

test('selecting Other uses custom skill name', () => {
  buildRollForm([])

  const form = document.getElementById('customRollForm') as HTMLFormElement
  ;(document.getElementById('characterName') as HTMLInputElement).value = 'Ann'
  const skillInput = document.getElementById('skillName') as HTMLInputElement
  const customInput = document.getElementById('customSkillName') as HTMLInputElement

  skillInput.value = 'Other'
  skillInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
  customInput.value = 'Athletics'

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

  expect(mockRollSkillCheck).toHaveBeenCalledWith(
    expect.objectContaining({ skillName: 'Athletics' })
  )
})
