import { ParsedSaveData } from './types'

type SavePayload = Record<string, unknown>

function parseJsonLikePayload(input: string | SavePayload): SavePayload {
  if (typeof input === 'string') {
    return JSON.parse(input) as SavePayload
  }

  return input
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return null
    }

    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toDisplaySkillName(skillKey: string): string {
  if (skillKey === 'int') {
    return 'Intellect'
  }

  return skillKey
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeSkillName(skillName: string): string {
  return skillName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '')
}

function parseCorruptionLevels(payload: SavePayload): number[] {
  const levels: number[] = []
  const direct = toNumber(payload.pact_modal_corruption)
  if (direct !== null) {
    levels.push(direct)
  }

  if (typeof payload.__pacts === 'string') {
    try {
      const parsed = JSON.parse(payload.__pacts)
      if (Array.isArray(parsed)) {
        parsed.forEach(entry => {
          if (entry && typeof entry === 'object') {
            const corruption = toNumber((entry as Record<string, unknown>).corruption)
            if (corruption !== null) {
              levels.push(corruption)
            }
          }
        })
      }
    } catch {
      // Ignore malformed pact payloads and keep direct corruption values.
    }
  }

  return Array.from(new Set(levels))
}

function parseAttributes(payload: SavePayload): string[] {
  const attributes: string[] = []
  const might = toNumber(payload.might_total)
  const speed = toNumber(payload.speed_total)
  const intellect = toNumber(payload.int_total)
  const magic = toNumber(payload.magic_total)

  if (might !== null) {
    attributes.push('Might')
  }
  if (speed !== null) {
    attributes.push('Speed')
  }
  if (intellect !== null) {
    attributes.push('Intellect')
  }
  if (magic !== null) {
    attributes.push('Magic')
  }

  return attributes
}

function parseSkills(payload: SavePayload, corruptionLevels: number[]): Record<string, number> {
  const skills: Record<string, number> = {}

  Object.keys(payload)
    .filter(key => key.endsWith('_total'))
    .forEach(totalKey => {
      const value = toNumber(payload[totalKey])
      if (value === null) {
        return
      }

      const skillKey = totalKey.slice(0, -'_total'.length)
      const customName = toNonEmptyString(payload[`${skillKey}_name`])
      const displayName = customName ?? toDisplaySkillName(skillKey)
      skills[displayName] = value
    })

  if (!("Corruption" in skills) && corruptionLevels.length > 0) {
    skills.Corruption = Math.max(...corruptionLevels)
  }
  if (!("Int" in skills) && typeof skills.Intellect === 'number') {
    skills.Int = skills.Intellect
  }

  return skills
}

export function parseSaveData(input: string | SavePayload): ParsedSaveData {
  const payload = parseJsonLikePayload(input)
  const corruptionLevels = parseCorruptionLevels(payload)

  return {
    characterName: toNonEmptyString(payload.char_name) ?? '',
    playerName: toNonEmptyString(payload.player_name) ?? '',
    skills: parseSkills(payload, corruptionLevels),
    attributes: parseAttributes(payload),
    corruptionLevels
  }
}

export function getSkillModifierFromSaveData(
  data: ParsedSaveData,
  skillName: string
): number | undefined {
  const exact = data.skills[skillName]
  if (typeof exact === 'number') {
    return exact
  }

  const normalizedTarget = normalizeSkillName(skillName)
  if (!normalizedTarget) {
    return undefined
  }

  const matched = Object.entries(data.skills).find(([name]) => {
    return normalizeSkillName(name) === normalizedTarget
  })

  return matched?.[1]
}
