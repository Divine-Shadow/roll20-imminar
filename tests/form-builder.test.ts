jest.mock('../src/random', () => ({
  rollDie: jest.fn(() => 3)
}))

// @ts-ignore
import { buildRollForm } from '../src/form-builder.js'
import { rollSkillCheck } from '../src/rollSkillCheck'
import { rollDie } from '../src/random'
import { JSDOM } from 'jsdom'

jest.mock('../src/rollSkillCheck')
const mockRollSkillCheck = rollSkillCheck as jest.MockedFunction<typeof rollSkillCheck>
const mockRollDie = rollDie as jest.MockedFunction<typeof rollDie>

let dom: JSDOM
beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  ;(global as any).window = dom.window
  ;(global as any).document = dom.window.document
  ;(global as any).Event = dom.window.Event
  document.body.innerHTML = ''
  mockRollSkillCheck.mockClear()
  mockRollDie.mockClear()
  mockRollDie.mockReturnValue(3)
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
    staticModifiers: [
      { name: 'Atk', kind: 'constant', total: 2, value: 2 }
    ]
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

test('allows dice expressions in modifier values', () => {
  mockRollDie.mockReturnValueOnce(4).mockReturnValueOnce(5)

  buildRollForm([{ label: 'Atk', default: 0 }])

  const form = document.getElementById('customRollForm') as HTMLFormElement
  ;(document.getElementById('characterName') as HTMLInputElement).value = 'Cara'
  ;(document.getElementById('skillName') as HTMLInputElement).value = 'Insight'
  ;(document.getElementById('customTitle') as HTMLInputElement).value = ''

  const row = document.querySelector('.static-modifier-row')!
  ;(row.querySelector('.mod-name') as HTMLInputElement).value = 'Bless'
  ;(row.querySelector('.mod-value') as HTMLInputElement).value = '2d6 + 3'
  row.querySelector('.mod-value')!.dispatchEvent(new Event('input', { bubbles: true }))

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

  expect(mockRollSkillCheck).toHaveBeenCalled()
  const args = mockRollSkillCheck.mock.calls[0][0]
  expect(args.staticModifiers).toEqual([{
    name: 'Bless',
    kind: 'dice',
    total: 12,
    expression: '2d6 + 3',
    dice: [
      { count: 2, sides: 6, rolls: [4, 5], sign: 1 }
    ]
  }])
})

test('handles dice expression without spaces', () => {
  mockRollDie
    .mockReturnValueOnce(6)
    .mockReturnValueOnce(1)

  buildRollForm([{ label: 'Atk', default: 0 }])

  const form = document.getElementById('customRollForm') as HTMLFormElement
  ;(document.getElementById('characterName') as HTMLInputElement).value = 'Dane'
  ;(document.getElementById('skillName') as HTMLInputElement).value = 'Insight'

  const row = document.querySelector('.static-modifier-row')!
  ;(row.querySelector('.mod-name') as HTMLInputElement).value = 'Bless'
  ;(row.querySelector('.mod-value') as HTMLInputElement).value = '2d6+1'
  row.querySelector('.mod-value')!.dispatchEvent(new Event('input', { bubbles: true }))

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

  expect(mockRollSkillCheck).toHaveBeenCalled()
  const { staticModifiers } = mockRollSkillCheck.mock.calls[0][0]
  expect(staticModifiers).toEqual([{
    name: 'Bless',
    kind: 'dice',
    total: 6 + 1 + 1,
    expression: '2d6+1',
    dice: [
      { count: 2, sides: 6, rolls: [6, 1], sign: 1 }
    ]
  }])
})
