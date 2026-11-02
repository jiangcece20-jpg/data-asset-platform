import { describe, expect, it } from 'vitest'
import { createDemoConversation } from './demoConversation'

const batch = '找煤炭运价，必须按天查看、每天更新；再找山东货运量，必须按区县查看'
const storage = () => { const data = new Map<string,string>(); return { getItem: (k:string) => data.get(k) || null, setItem: (k:string,v:string) => { data.set(k,v) } } }

describe('已确认功能规则对齐', () => {
  it('stages single selection and correction until one submission', async () => {
    const d = createDemoConversation()
    await d.send('找2025年苹果销量')
    expect(d.current.clarification?.mode).toBe('single')
    d.selectClarification('fruit')
    expect(d.current.kind).toBe('clarify')
    expect(d.current.products).toHaveLength(0)
    d.current.clarification!.text = '不是水果，只要iPhone手机销量'
    await d.submitClarification()
    expect(d.tasks[0].name).toBe('iPhone手机销量')
    expect(d.current.conditions.join(' ')).toContain('2025')
    expect(d.session.frames[0].clarification?.submitted).toBe(true)
  })
  it('allows multi-selection, toggling and custom text-only submission', async () => {
    const d = createDemoConversation()
    await d.send('找汽车销量，必须覆盖我们公司定义的华东业务区')
    expect(d.current.clarification?.mode).toBe('multiple')
    d.selectClarification('上海'); d.selectClarification('江苏'); d.selectClarification('上海')
    expect(d.current.clarification?.selected).toEqual(['江苏'])
    d.current.clarification!.text = '还包括湖北'
    await d.submitClarification()
    expect(d.current.conditions.join(' ')).toContain('江苏')
    expect(d.current.conditions.join(' ')).toContain('湖北')
    d.newSession(); await d.send('找2025年苹果销量')
    d.current.clarification!.text = '水果'
    await d.submitClarification()
    expect(d.current.kind).toBe('results')
  })
  it('uses text-only clarification for a company-specific standard and rejects empty input', async () => {
    const d = createDemoConversation()
    await d.send('找一个和我们公司销售量口径一致的数据')
    expect(d.current.clarification?.mode).toBe('text')
    expect(d.current.clarification?.options).toEqual([])
    expect(await d.submitClarification()).toBe(false)
    d.current.clarification!.text = '按开票日期统计实际开票销售量，不含退货'
    await d.submitClarification()
    expect(d.current.conditions.join(' ')).toContain('不含退货')
  })
  it('restores unsubmitted options and text and preserves both after a send failure', async () => {
    const store = storage(), d = createDemoConversation(undefined, {storage: store})
    await d.send('找2025年苹果销量'); d.selectClarification('brand')
    d.current.clarification!.text = '只要手机'
    d.state.nextFailure = 'send'; expect(await d.submitClarification()).toBe(false)
    const restored = createDemoConversation(undefined, {storage: store})
    expect(restored.current.clarification).toMatchObject({selected:['brand'],text:'只要手机',submitted:false})
    expect(restored.state.busy).toBe(false)
  })
  it('publishes all results with factual suggestions without a decision gate', async () => {
    const d = createDemoConversation(); await d.send(batch)
    expect(d.current.kind).toBe('empty')
    expect(d.current.tasks).toHaveLength(2)
    expect(d.current.suggestions).toHaveLength(2)
    expect(d.current.plans).toHaveLength(0)
    const before = JSON.stringify(d.current)
    await d.send('煤炭运价按月查看可以，但仍要每天更新')
    expect(d.tasks[0]).toMatchObject({grain:'按月查看',frequency:'每天更新'})
    expect(d.current.taskIds).toHaveLength(2)
    expect(d.current.searchedTaskIds).toEqual([d.tasks[0].id])
    expect(d.current.products).toHaveLength(0)
    expect(d.current.tasks[0].status).toBe('无合适商品')
    expect(JSON.stringify(d.session.frames[0])).toBe(before)
  })
  it('accepts an unambiguous suggestion directly, but clarifies multiple directions', async () => {
    const d = createDemoConversation(); await d.send('找煤炭运价，必须按天查看、每天更新')
    await d.send('可以')
    expect(d.tasks[0]).toMatchObject({grain:'按月查看',frequency:'每周更新'})
    expect(d.current.kind).toBe('results')
    d.newSession(); await d.send(batch); await d.send('可以')
    expect(d.current.kind).toBe('clarify-edit')
    expect(d.tasks[0].grain).toBe('按天查看')
  })
  it('keeps other task facts when removing and modifying demands in one utterance', async () => {
    const d = createDemoConversation(); await d.send(batch)
    await d.send('货运量不找了，煤炭运价改查2024年')
    expect(d.session.pending).toEqual([d.tasks[0].id])
    expect(d.tasks[0].year).toBe('2024 年')
    expect(d.current.suggestions.every(p=>p.taskId === d.tasks[0].id)).toBe(true)
    await d.send('全部不找了')
    expect(d.current.kind).toBe('notice'); expect(d.current.products).toHaveLength(0)
    expect(d.current.message).not.toContain('无合适')
  })
  it('keeps supplemental collection text in its own draft and does not edit search conditions', async () => {
    const d = createDemoConversation(); await d.send('找2025年矿区内部专用线路的逐车运价，预算5000元；再找山东货运量，必须按区县查看')
    const [a,b] = d.tasks; d.openCollection([a.id])
    expect(d.state.collection.conditions.join(' ')).toContain('专用线路')
    expect(d.state.collection.conditions.join(' ')).toContain('逐车')
    d.state.collection.description = '请增加车牌脱敏说明'; d.state.collection.price = '0-4000'
    d.openCollection([b.id]); expect(d.state.collection.description).toBe(''); expect(d.state.collection.price).toBe('')
    d.openCollection([a.id]); expect(d.state.collection.description).toBe('请增加车牌脱敏说明'); expect(d.state.collection.price).toBe('0-4000')
    expect(d.tasks[0].note).not.toContain('车牌')
  })
})

it('keeps product consultation and platform questions separate from find authorization',async()=>{
 const d=createDemoConversation();await d.send('你能做什么？')
 expect(d.current.kind).toBe('faq');expect(d.tasks).toHaveLength(0)
 await d.send('找2025年煤炭运价，按月查看');const ids=[...d.session.pending],old=JSON.stringify(d.current)
 await d.send('这个商品多少钱？')
 expect(d.current.kind).toBe('consult');expect(d.current.message).toContain('2,400');expect(d.current.consultProduct?.id).toBe('preview-coal')
 expect(d.session.pending).toEqual(ids);expect(JSON.stringify(d.session.frames[1])).toBe(old)
 await d.send('这个商品的数据每天更新吗？')
 expect(d.current.message).toContain('待核实');expect(d.current.message).not.toContain('不能可靠确认这个商品的具体内容')
})
it('keeps an unanswered clarification available while answering an unrelated FAQ',async()=>{
 const d=createDemoConversation();await d.send('找苹果销量')
 d.selectClarification('fruit');d.current.clarification!.text='只看鲜果'
 await d.send('平台的数据怎么买？')
 expect(d.current.clarification).toMatchObject({selected:['fruit'],text:'只看鲜果',submitted:false})
 expect(d.current.purchaseGuide).toContain('商品详情')
 await d.submitClarification();expect(d.current.kind).toBe('results')
})
it('supports text corrections to selected demand scopes without changing other tasks',async()=>{
 const d=createDemoConversation();await d.send('找煤炭运价，按月查看；再找山东货运量；再找水果苹果销量')
 await d.send('改成2024年');d.selectClarification(d.tasks[0].id);d.selectClarification(d.tasks[1].id)
 d.current.clarification!.text='不改货运量，只改煤炭运价'
 await d.submitClarification();expect(d.tasks.map(t=>t.year)).toEqual(['2024 年','',''])
})
it('preserves each demand when a clarification response also adds another demand',async()=>{
 const d=createDemoConversation();await d.send('找2025年苹果销量');d.selectClarification('fruit')
 d.current.clarification!.text='再找煤炭运价'
 await d.submitClarification();expect(d.current.kind).toBe('results');expect(d.current.taskIds).toHaveLength(2)
 expect(d.tasks[0].name).toBe('水果苹果销量');expect(d.tasks[1].topic).toBe('coal')
})
it('does not turn a clarified user standard into verified product coverage',async()=>{
 const d=createDemoConversation();await d.send('找汽车销量，必须与我们现有报表的统计口径一致');d.current.clarification!.text='按开票日期统计，不含退货';await d.submitClarification()
 expect(d.current.products[0].evidence.some(e=>e.state==='unknown'&&e.fact.includes('口径'))).toBe(true)
 expect(d.current.products[0].best).toBeFalsy();expect(d.current.tasks[0].status).toBe('部分匹配')
})

it('does not invent daily product facts after accepting only monthly viewing',async()=>{
 const d=createDemoConversation();await d.send('找煤炭运价，必须按天查看、每天更新');await d.send('按月查看可以，但仍要每天更新')
 expect(d.tasks[0]).toMatchObject({grain:'按月查看',frequency:'每天更新'})
 expect(d.current.kind).toBe('empty');expect(d.current.products).toHaveLength(0)
 expect(d.current.suggestions[0].options[0].changes).toEqual({frequency:'每周更新'})
})
it('remembers ambiguous acceptance until its demand is named',async()=>{
 const d=createDemoConversation();await d.send(batch);await d.send('可以');expect(d.current.kind).toBe('clarify-edit')
 await d.send('煤炭运价');expect(d.tasks).toHaveLength(2)
 expect(d.tasks[0]).toMatchObject({grain:'按月查看',frequency:'每周更新'});expect(d.tasks[1].grain).toBe('按区县查看')
})
it('merges an edit and new demand into one batch and one response',async()=>{
 const d=createDemoConversation();await d.send('找煤炭运价，按月查看');const count=d.session.frames.length
 await d.send('煤炭运价改查2024年；再找山东货运量')
 expect(d.tasks).toHaveLength(2);expect(d.tasks[0].year).toBe('2024 年');expect(d.current.taskIds).toHaveLength(2)
 expect(d.current.searchedTaskIds).toHaveLength(2);expect(d.session.frames).toHaveLength(count+1)
})
it('never parses dated option display labels as condition changes',async()=>{
 const d=createDemoConversation();await d.send('找2025年煤炭运价，按月查看；再找2025年山东货运量；再找2025年水果苹果销量')
 await d.send('改成2024年');d.selectClarification(d.tasks[0].id);d.selectClarification(d.tasks[1].id)
 d.current.clarification!.text='不改货运量，只改煤炭运价';await d.submitClarification()
 expect(d.tasks.map(t=>t.year)).toEqual(['2024 年','2025 年','2025 年'])
})
it('does not revive a rejected suggestion after an unrelated FAQ and generic yes',async()=>{
 const d=createDemoConversation();await d.send('找煤炭运价，必须按天查看、每天更新');await d.send('保留原要求')
 await d.send('你能做什么？');await d.send('可以')
 expect(d.tasks).toHaveLength(1);expect(d.tasks[0]).toMatchObject({grain:'按天查看',frequency:'每天更新'})
 expect(d.current.kind).toBe('notice')
})
it('applies explicit region corrections without claiming verified coverage',async()=>{
 const d=createDemoConversation();await d.send('找汽车销量，必须覆盖我们公司定义的华东业务区')
 d.selectClarification('上海');d.selectClarification('江苏');d.current.clarification!.text='不含江苏，只要上海和浙江';await d.submitClarification()
 expect(d.tasks[0].region).toBe('上海、浙江');expect(d.current.tasks[0].status).toBe('部分匹配')
 expect(d.current.products[0].evidence.some(e=>e.state==='unknown'&&e.label==='地区范围')).toBe(true)
})
it('routes full product-name consultation without searching or creating a demand',async()=>{
 const d=createDemoConversation();await d.send('找煤炭运价，按月查看');const count=d.tasks.length
 await d.send('煤炭公路运价明细数据集多少钱？')
 expect(d.tasks).toHaveLength(count);expect(d.current.kind).toBe('consult');expect(d.current.message).toContain('2,400')
 expect(d.current.products).toHaveLength(0)
})
it('clarifies condition attribution instead of assigning it to the nearest topic',async()=>{
 const d=createDemoConversation();await d.send('找煤炭运价和货运路线，其中一个要按港口筛选')
 expect(d.current.kind).toBe('clarify-edit');expect(d.current.clarification?.mode).toBe('single')
 expect(d.tasks.every(t=>t.grain==='')).toBe(true)
 d.selectClarification(d.tasks[0].id);await d.submitClarification()
 expect(d.tasks[0].grain).toBe('按港口筛选');expect(d.tasks[1].grain).toBe('')
})
it('answers a clarified product identity instead of asking its identity again',async()=>{
 const d=createDemoConversation();await d.send('这个商品多少钱？')
 expect(d.current.kind).toBe('consult');expect(d.current.clarification?.mode).toBe('text')
 d.current.clarification!.text='煤炭公路运价明细数据集';await d.submitClarification()
 expect(d.current.message).toContain('2,400');expect(d.current.clarification).toBeUndefined();expect(d.tasks).toHaveLength(0)
})
it('prefills collection contact from the active user and preserves an existing edited draft',async()=>{
 const d=createDemoConversation();d.setCollectionContact({name:'陈静',phone:'13800112201'})
 await d.send('找海底火山数据');d.openCollection();expect(d.state.collection.name).toBe('陈静');expect(d.state.collection.contact).toBe('13800112201')
 d.state.collection.contact='custom@example.com';d.state.collection.open=false;d.openCollection();expect(d.state.collection.contact).toBe('custom@example.com')
 d.newSession();d.setCollectionContact({name:'李四',phone:'138****2201'});await d.send('找海底火山数据');d.openCollection();expect(d.state.collection.name).toBe('李四');expect(d.state.collection.contact).toBe('')
})
it('merges a selected clarification answer and an explicit condition edit before one search',async()=>{
 const d=createDemoConversation();await d.send('找2025年苹果销量');d.selectClarification('fruit')
 d.current.clarification!.text='年份改成2024年';await d.submitClarification()
 expect(d.tasks[0]).toMatchObject({name:'水果苹果销量',year:'2024 年',blocked:''});expect(d.current.kind).toBe('results')
 expect(d.session.frames).toHaveLength(2)
})
