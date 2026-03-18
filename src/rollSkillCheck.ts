// src/rollSkillCheck.ts

import { getRollOutcome } from './outcome'
import { RollParams }      from './types'
import { rollDie } from './random'
import { getSkillModifierFromSaveData } from './save-data-parser'

/**
 * Assemble a generic skill-check template and inject into chat.
 * (Previously named `rollTechCheck`.)
 */
export function rollSkillCheck(params: RollParams): void {
  const {
    characterName,
    skillName,
    customTitle,
    rollType,
    useLuck,
    advantage,
    staticModifiers,
    saveData
  } = params

  if (rollType === 'semigroup') {
    const rolled = rollDie(100)
    const tier =
      rolled <= 20
        ? 'Standard'
        : rolled <= 50
          ? 'Great'
          : 'Master'

    const semigroupLines: string[] = [
      customTitle
        ? `{{name=${customTitle}}}{{Roll=Semigroup}}`
        : `{{name=Semigroup}}`,
      `{{Semigroup Roll=[[${rolled}]]}}`,
      `{{Tier=${tier}}}`
    ]

    const semigroupMsg = `&{template:default} ${semigroupLines.join('')}`
    const semigroupInput = document.querySelector<HTMLTextAreaElement>('#textchat-input textarea')!
    semigroupInput.value = semigroupMsg
    semigroupInput.dispatchEvent(new Event('input', { bubbles: true }))
    semigroupInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
    document.querySelector<HTMLButtonElement>('#chatSendBtn')!.click()
    return
  }

  const generatedTitle =
    `${skillName} Check` +
    (useLuck ? ' with Luck' : '') +
    (advantage ? ' (Advantage)' : '')

  const { chosen, chosenSum, advantageDetails } =
    getRollOutcome(useLuck, advantage)
  const { base: chosenBase, luck: chosenLuck, confirmations } = chosen

  const staticSum = staticModifiers.reduce((acc, m) => acc + m.total, 0)
  const saveModifier = saveData
    ? getSkillModifierFromSaveData(saveData, skillName)
    : undefined
  const skillModifierExpr = typeof saveModifier === 'number'
    ? `${saveModifier}`
    : `@{${characterName}|${skillName}}`

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
    `{{${skillName} Modifier=${skillModifierExpr}}}`,
    `{{Total=[[${chosenSum} + ${skillModifierExpr} + ${staticSum}]]}}`,
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
