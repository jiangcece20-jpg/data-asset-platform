export const UPDATE_FREQUENCIES = [
  '实时更新',
  '每日更新',
  '每周更新',
  '每月更新',
  '每季度更新',
  '不定期'
] as const

export type UpdateFrequency = (typeof UPDATE_FREQUENCIES)[number]

export function isUpdateFrequency(value: string): value is UpdateFrequency {
  return (UPDATE_FREQUENCIES as readonly string[]).includes(value)
}

/** 把历史自由文案收口到枚举；「待定」和空值表示尚未选择。 */
export function coerceUpdateFrequency(raw: string | undefined | null): UpdateFrequency | '' {
  const text = (raw ?? '').trim()
  if (!text || text === '待定') return ''
  if (isUpdateFrequency(text)) return text
  if (/实时/.test(text)) return '实时更新'
  if (/每季度|季度/.test(text)) return '每季度更新'
  if (/每月|月更|月度/.test(text)) return '每月更新'
  if (/每周|周更/.test(text)) return '每周更新'
  if (/每日|每天|日更/.test(text)) return '每日更新'
  if (/不定期|按需|变更|事件|T\s*\+\s*1/.test(text)) return '不定期'
  return '不定期'
}
