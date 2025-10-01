// @ts-ignore
import { injectDarkThemeStyles } from '../src/ui-styles.js'
import { JSDOM } from 'jsdom'

let dom: JSDOM
beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
  ;(global as any).window = dom.window
  ;(global as any).document = dom.window.document
  ;(global as any).Event = dom.window.Event
  document.head.innerHTML = ''
})

test('injectDarkThemeStyles inserts style element', () => {
  injectDarkThemeStyles()
  const style = document.head.querySelector('style')
  expect(style).toBeTruthy()
  expect(style!.textContent).toContain('#roll-helper-form')
})
