import { buildRollForm } from '../src/form-builder.js'

jest.mock('../src/form-builder.js', () => ({
  buildRollForm: jest.fn()
}))

const mockBuildRollForm = buildRollForm as jest.MockedFunction<typeof buildRollForm>

describe('main bootstrap', () => {
  const originalDocument = (global as any).document
  const originalAlert = (global as any).alert

  afterEach(() => {
    jest.resetModules()
    mockBuildRollForm.mockReset()
    ;(global as any).document = originalDocument
    ;(global as any).alert = originalAlert
  })

  test('builds form when Roll20 chat elements are present', () => {
    const fakeDocument = {
      querySelector: jest.fn((selector: string) => {
        if (selector === '#textchat-input textarea') return {}
        if (selector === '#chatSendBtn') return {}
        return null
      })
    }
    const alertSpy = jest.fn()
    ;(global as any).document = fakeDocument
    ;(global as any).alert = alertSpy

    jest.isolateModules(() => {
      require('../src/main.ts')
    })

    expect(mockBuildRollForm).toHaveBeenCalledTimes(1)
    expect(alertSpy).not.toHaveBeenCalled()
  })

  test('shows friendly message and skips build outside Roll20', () => {
    const fakeDocument = {
      querySelector: jest.fn(() => null)
    }
    const alertSpy = jest.fn()
    ;(global as any).document = fakeDocument
    ;(global as any).alert = alertSpy

    jest.isolateModules(() => {
      require('../src/main.ts')
    })

    expect(mockBuildRollForm).not.toHaveBeenCalled()
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Open your Roll20 game')
    )
  })
})
