// src/rollSkillCheck.ts

import { getRollOutcome } from './outcome'
import { RollParams }      from './types'

/**
 * Assemble a generic skill-check template and inject into chat.
 * (Previously named `rollTechCheck`.)
 */
export function rollSkillCheck(params: RollParams): void {
  const { characterName, skillName, customTitle, useLuck, advantage, staticModifiers } = params

  const generatedTitle =
    `${skillName} Check` +
    (useLuck ? ' with Luck' : '') +
    (advantage ? ' (Advantage)' : '')

  const { chosen, chosenSum, advantageDetails } =
    getRollOutcome(useLuck, advantage)
  const { base: chosenBase, luck: chosenLuck, confirmations } = chosen

  const staticSum = staticModifiers.reduce((acc, m) => acc + m.total, 0)

  const lines: string[] = [
    customTitle
      ? `{{name=${customTitle}}}{{Roll=${generatedTitle}}}`
      : `{{name=${generatedTitle}}}`,
    `{{Base Roll=[[${chosenBase}]]}}`,
    ...(chosenLuck._tag === 'Some'
      ? [`{{Luck=[[${chosenLuck.value}]]}}`]
      : []),
    ...confirmations.map((c, i) => `{{Confirm ${i + 1}=[[${c}]]}}`),
    ...staticModifiers.map(m => `{{${m.name}=[[${m.total}]]}}`),
    `{{${skillName} Modifier=@{${characterName}|${skillName}}}}`,
    `{{Total=[[${chosenSum} + @{${characterName}|${skillName}} + ${staticSum}]]}}`,
    ...(advantageDetails._tag === 'Some'
      ? [`{{Advantage Details=${advantageDetails.value}}}`]
      : [])
  ]

  const msg = `&{template:default} ${lines.join('')}`

  const chatInput = document.querySelector<HTMLTextAreaElement>('#textchat-input textarea')!
  chatInput.value = msg
  chatInput.dispatchEvent(new Event('input', { bubbles: true }))
  chatInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
  document.querySelector<HTMLButtonElement>('#chatSendBtn')!.click()
}
