import type { DemoTask } from './demoConversation'

/** 固定场景的前端解析示例，不代表后台自然语言理解能力。只输出用户明确修改的字段。 */
export function isConditionChange(text: string) {
  return /改|调整|换成|不限|取消.*(?:年份|时间|更新|预算|地区)/.test(text) && !/改找|换找|改[成为]找|换成找/.test(text)
}
export function parseConditionChanges(text: string): Partial<DemoTask> {
  const changes: Partial<DemoTask> = {}
  const year = text.match(/20\d{2}\s*年/) || (!/预算/.test(text) && /年份|时间|改(?:成|为|查)?\s*20\d{2}\s*$/.test(text) ? text.match(/20\d{2}/) : null)
  if (year) changes.year = `${year[0].match(/20\d{2}/)![0]} 年`
  const grain = text.match(/按(?:天|月|地市|区县)查看|按港口(?:筛选|查看)/)?.[0]
  if (grain) changes.grain = grain === '按港口查看' ? '按港口筛选' : grain
  if (/每日更新|每天更新/.test(text)) changes.frequency = '每天更新'
  else if (/每周更新/.test(text)) changes.frequency = '每周更新'
  else if (/每月更新/.test(text)) changes.frequency = '每月更新'
  const type = text.match(/(?:只要|仅|类型(?:改成|改为)|改成|改为)\s*(API|数据集|看板)/i)?.[1]
  if (type) changes.productType = type.toUpperCase() === 'API' ? 'API' : type
  const budget = text.match(/((?:单商品|单个商品|总)?预算)\s*(?:改成|改为|调整为)?\s*(\d+(?:\.\d+)?)\s*(万|元)?\s*([/／]年|每年)?/)
  if (budget) changes.budget = `${budget[1]}${budget[2]}${budget[3] || ''}${budget[4] || ''}`
  const region = text.match(/(?:地区|范围)(?:都)?(?:改成|改为|调整为)\s*(全国|山东省?|北京市?|上海市?|天津市?|广东省?)/)?.[1]
  if (region) changes.region = region
  const unlimited: [keyof DemoTask, RegExp][] = [
    ['year', /(?:年份|时间)(?:改为|改成)?不限|取消年份限制/], ['grain', /(?:查看方式|粒度)(?:改为|改成)?不限/],
    ['frequency', /(?:更新频率)(?:改为|改成)?不限/], ['budget', /预算(?:改为|改成)?不限|取消预算限制/],
    ['region', /(?:地区|范围)(?:改为|改成)?不限/], ['productType', /(?:商品类型|类型)(?:改为|改成)?不限/]
  ]
  for (const [key, pattern] of unlimited) if (pattern.test(text)) Object.assign(changes, { [key]: '' })
  return changes
}
