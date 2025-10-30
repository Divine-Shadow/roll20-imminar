// src/ui-validation.ts

const ERROR_COLOR = '#e74c3c'

export function showInputError(input: HTMLInputElement, message: string): void {
  input.dataset.validationState = 'error'
  input.style.borderColor = ERROR_COLOR
  input.style.boxShadow = `0 0 0 1px ${ERROR_COLOR}`
  input.title = message
}

export function clearInputError(input: HTMLInputElement): void {
  delete input.dataset.validationState
  input.style.borderColor = ''
  input.style.boxShadow = ''
  input.title = ''
}
