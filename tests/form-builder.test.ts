jest.mock('../src/random', () => ({
  rollDie: jest.fn(() => 3)
}))
jest.mock('../src/save-data-parser', () => ({
  parseSaveData: jest.fn()
}))

// @ts-ignore
import { buildRollForm } from '../src/form-builder.js'
import { rollSkillCheck } from '../src/rollSkillCheck'
import { rollDie } from '../src/random'
import { parseSaveData } from '../src/save-data-parser'
import { JSDOM } from 'jsdom'

jest.mock('../src/rollSkillCheck')
const mockRollSkillCheck = rollSkillCheck as jest.MockedFunction<typeof rollSkillCheck>
const mockRollDie = rollDie as jest.MockedFunction<typeof rollDie>
const mockParseSaveData = parseSaveData as jest.MockedFunction<typeof parseSaveData>

let dom: JSDOM
beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' })
  ;(global as any).window = dom.window
  ;(global as any).document = dom.window.document
  ;(global as any).Event = dom.window.Event
  ;(global as any).MouseEvent = dom.window.MouseEvent
  document.body.innerHTML = ''
  mockRollSkillCheck.mockClear()
  mockRollDie.mockClear()
  mockParseSaveData.mockReset()
  mockRollDie.mockReturnValue(3)
  window.localStorage.clear()
})

test('buildRollForm creates fields and submits params', () => {
  buildRollForm([{ label: 'Atk', default: 2 }])

  const form = document.getElementById('customRollForm') as HTMLFormElement
  expect(form).toBeTruthy()
  expect(document.getElementById('skillList')).toBeTruthy()
  expect((document.getElementById('dataSourcePanel') as HTMLDivElement).style.display).toBe('none')

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
    rollType: 'standard',
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

test('semigroup selection hides standard settings and bypasses modifiers', () => {
  buildRollForm([{ label: 'Atk', default: 0 }])

  const form = document.getElementById('customRollForm') as HTMLFormElement
  const rollType = document.getElementById('rollType') as HTMLSelectElement
  const standardSettings = document.getElementById('standardSettings') as HTMLDivElement

  ;(document.getElementById('characterName') as HTMLInputElement).value = 'Sem'
  ;(document.getElementById('customTitle') as HTMLInputElement).value = 'Tier Check'
  rollType.value = 'semigroup'
  rollType.dispatchEvent(new Event('change', { bubbles: true }))

  const row = document.querySelector('.static-modifier-row')!
  ;(row.querySelector('.mod-name') as HTMLInputElement).value = 'Bad'
  ;(row.querySelector('.mod-value') as HTMLInputElement).value = '2d'

  expect(standardSettings.style.display).toBe('none')

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

  expect(mockRollSkillCheck).toHaveBeenCalledWith(
    expect.objectContaining({
      rollType: 'semigroup',
      skillName: '',
      staticModifiers: []
    })
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

test('passes parsed save data to rollSkillCheck when provided', () => {
  const saveData = {
    characterName: 'Veil Vectis',
    playerName: 'Bill',
    skills: { Tech: 14 },
    attributes: ['Analytical'],
    corruptionLevels: [11]
  }

  buildRollForm([], saveData)

  const form = document.getElementById('customRollForm') as HTMLFormElement
  ;(document.getElementById('characterName') as HTMLInputElement).value = 'Veil Vectis'
  ;(document.getElementById('skillName') as HTMLInputElement).value = 'Tech'

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

  expect(mockRollSkillCheck).toHaveBeenCalledWith(
    expect.objectContaining({
      saveData: expect.objectContaining({
        characterName: 'Veil Vectis',
        playerName: 'Bill',
        attributes: ['Analytical'],
        corruptionLevels: [11],
        skills: expect.objectContaining({
          Tech: 14,
          Analytical: 0,
          'Corruption Level 11': 11
        })
      })
    })
  )
})

test('data source controls are moved into a toggle panel', () => {
  buildRollForm([])

  const panel = document.getElementById('dataSourcePanel') as HTMLDivElement
  const dataButton = Array.from(document.querySelectorAll('button')).find(
    button => button.textContent === 'Data'
  ) as HTMLButtonElement

  expect(panel.style.display).toBe('none')
  dataButton.click()
  expect(panel.style.display).toBe('block')

  const okBtn = document.getElementById('dataSourcePanelOk') as HTMLButtonElement
  okBtn.click()
  expect(panel.style.display).toBe('none')
})

test('main panel can be dragged by header', () => {
  buildRollForm([])

  const panel = document.getElementById('roll-helper-form') as HTMLDivElement
  const heading = panel.querySelector('h3') as HTMLHeadingElement

  expect(panel.style.left).toBe('10px')
  expect(panel.style.top).toBe('10px')

  heading.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 20, clientY: 20 }))
  document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 80, clientY: 90 }))
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

  expect(panel.style.left).toBe('70px')
  expect(panel.style.top).toBe('80px')
})

test('blocks standard roll when save-file source selected without loaded file', () => {
  buildRollForm([])

  const form = document.getElementById('customRollForm') as HTMLFormElement
  const sourceSelect = document.getElementById('dataSource') as HTMLSelectElement
  ;(document.getElementById('characterName') as HTMLInputElement).value = 'Ann'
  ;(document.getElementById('skillName') as HTMLInputElement).value = 'Tech'
  sourceSelect.value = 'save-file'
  sourceSelect.dispatchEvent(new Event('change', { bubbles: true }))

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

  expect(mockRollSkillCheck).not.toHaveBeenCalled()
})

test('loads selected save file and uses parsed save data on submit', () => {
  const parsed = {
    characterName: 'Veil Vectis',
    playerName: 'Bill',
    skills: { Tech: 14 },
    attributes: ['Analytical'],
    corruptionLevels: [11]
  }
  mockParseSaveData.mockReturnValue(parsed as any)

  const fileReaders: Array<{ onload: null | (() => void), result: string }> = []
  ;(global as any).FileReader = class {
    public result = ''
    private loadHandler: null | (() => void) = null
    constructor() {
      fileReaders.push(this as any)
    }
    addEventListener(name: string, handler: () => void) {
      if (name === 'load') {
        this.loadHandler = handler
      }
    }
    readAsText() {
      this.result = '{"tech_total":"14"}'
      if (this.loadHandler) {
        this.loadHandler()
      }
    }
  }

  buildRollForm([])

  const sourceSelect = document.getElementById('dataSource') as HTMLSelectElement
  const fileInput = document.getElementById('saveFileInput') as HTMLInputElement
  const form = document.getElementById('customRollForm') as HTMLFormElement
  const characterNameInput = document.getElementById('characterName') as HTMLInputElement
  const datalist = document.getElementById('skillList') as HTMLDataListElement
  const dataButton = Array.from(document.querySelectorAll('button')).find(
    button => button.textContent?.startsWith('Data')
  ) as HTMLButtonElement
  sourceSelect.value = 'save-file'
  sourceSelect.dispatchEvent(new Event('change', { bubbles: true }))

  const file = new dom.window.File(['{"tech_total":"14"}'], 'character.json', { type: 'application/json' })
  Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
  fileInput.dispatchEvent(new Event('change', { bubbles: true }))

  expect(characterNameInput.value).toBe('Veil Vectis')
  expect(Array.from(datalist.querySelectorAll('option')).map(option => option.value)).toEqual(
    expect.arrayContaining(['Tech', 'Analytical', 'Corruption Level 11'])
  )
  expect(dataButton.textContent).toContain('✓')

  ;(document.getElementById('characterName') as HTMLInputElement).value = 'Veil Vectis'
  ;(document.getElementById('skillName') as HTMLInputElement).value = 'Tech'
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

  expect(mockParseSaveData).toHaveBeenCalled()
  expect(mockRollSkillCheck).toHaveBeenCalledWith(
    expect.objectContaining({
      saveData: expect.objectContaining({
        characterName: 'Veil Vectis',
        playerName: 'Bill',
        attributes: ['Analytical'],
        corruptionLevels: [11],
        skills: expect.objectContaining({
          Tech: 14,
          Analytical: 0,
          'Corruption Level 11': 11
        })
      })
    })
  )
})

test('persists data source selection across form rebuilds', () => {
  buildRollForm([])
  const sourceSelect = document.getElementById('dataSource') as HTMLSelectElement
  sourceSelect.value = 'save-file'
  sourceSelect.dispatchEvent(new Event('change', { bubbles: true }))

  const closeBtn = Array.from(document.querySelectorAll('button')).find(
    button => button.textContent === '×'
  ) as HTMLButtonElement
  closeBtn.click()

  buildRollForm([])
  const rebuiltSourceSelect = document.getElementById('dataSource') as HTMLSelectElement
  expect(rebuiltSourceSelect.value).toBe('save-file')
})
