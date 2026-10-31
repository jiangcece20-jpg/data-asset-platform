import { describe, expect, it } from 'vitest'
import { createDemoConversation } from './demoConversation'
const batch='找2025年煤炭运价，必须按天查看、每天更新；再找山东货运量，必须按区县查看'
describe('通过对话修改条件',()=>{
 it('updates one frequency and records the actual user request without rewriting history',async()=>{
  const d=createDemoConversation();await d.send('找2025年煤炭运价，按月查看');const before=JSON.stringify(d.current)
  await d.send('煤炭运价改成每天更新');expect(d.tasks[0].frequency).toBe('每天更新');expect(d.current.query).toBe('煤炭运价改成每天更新');expect(JSON.stringify(d.session.frames[0])).toBe(before)
 })
 it('changes two named demands and leaves an unmentioned third unchanged',async()=>{
  const d=createDemoConversation();await d.send('找2025年煤炭运价，按月查看；再找山东货运量；再找水果苹果销量')
  await d.send('煤炭运价和货运量都改查2024年');expect(d.tasks.map(t=>t.year)).toEqual(['2024 年','2024 年','']);expect(d.current.searchedTaskIds).toHaveLength(2)
 })
 it('can change all shared conditions and retains other fields',async()=>{
  const d=createDemoConversation();await d.send('找2025年煤炭运价，按月查看；再找2025年水果苹果销量')
  await d.send('两项都改成按天查看');expect(d.tasks.every(t=>t.grain==='按天查看'&&t.year==='2025 年')).toBe(true)
 })
 it('asks scope and then applies the remembered change',async()=>{
  const d=createDemoConversation();await d.send('找煤炭运价，按月查看；再找山东货运量')
  await d.send('改成每天更新');expect(d.current.kind).toBe('clarify-edit');expect(d.tasks.every(t=>!t.frequency)).toBe(true)
  await d.send('煤炭运价');expect(d.tasks[0].frequency).toBe('每天更新');expect(d.tasks[1].frequency).toBe('');expect(d.tasks).toHaveLength(2)
 })
 it('keeps pending choices during scope clarification and applies only after confirmation',async()=>{
  const d=createDemoConversation();await d.send(batch);const [a,b]=d.tasks;d.choose(a.id,'0');d.choose(b.id,'keep')
  const original=JSON.stringify(d.current);await d.send('年份改为2024年');expect(d.current.kind).toBe('clarify-edit')
  await d.send('只改煤炭运价');expect(d.current.kind).toBe('relax');expect(d.current.proposed[a.id]).toMatchObject({year:'2024 年',grain:'按月查看'});expect(d.current.choices[b.id]).toBe('keep')
  expect(a.year).toBe('2025 年');expect(d.current.products).toHaveLength(0);expect(JSON.stringify(d.session.frames[0])).toBe(original)
  await d.confirm();expect(a.year).toBe('2024 年');expect(a.grain).toBe('按月查看')
 })
 it('changes an existing demand while a newly added one is being clarified',async()=>{
  const d=createDemoConversation();await d.send(batch);const a=d.tasks[0];d.choose(a.id,'0')
  await d.send('再找苹果销量');await d.send('煤炭运价年份改成2024年');expect(a.year).toBe('2025 年');await d.send('水果');expect(d.current.proposed[a.id].year).toBe('2024 年')
 })
 it('understands district grain and weekly frequency changes',async()=>{
  const d=createDemoConversation();await d.send('找山东货运量');await d.send('货运量改为按区县查看、每周更新');expect(d.tasks[0]).toMatchObject({grain:'按区县查看',frequency:'每周更新'})
 })
 it('updates a budget and product type through dialogue',async()=>{
  const d=createDemoConversation();await d.send('找煤炭运价，按月查看');await d.send('煤炭运价改成只要API，单商品预算改为5000元');expect(d.tasks[0].productType).toBe('API');expect(d.tasks[0].budget).toBe('单商品预算5000元')
 })
 it('does not silently create a task when a change field is unrecognized',async()=>{
  const d=createDemoConversation();await d.send('找煤炭运价');await d.send('把那个改得合适一点');expect(d.tasks).toHaveLength(1);expect(d.current.message).toContain('修改');expect(d.session.pending).toHaveLength(1)
 })
 it('does not change a different sole task when another topic is named',async()=>{
  const d=createDemoConversation();await d.send('找煤炭运价，按月查看');await d.send('汽车销量改成2024年');expect(d.tasks[0].year).toBe('');expect(d.tasks).toHaveLength(1)
 })
 it('still treats a changed core target as a new demand',async()=>{
  const d=createDemoConversation();await d.send('找煤炭运价');await d.send('改找汽车销量');expect(d.tasks.at(-1)?.topic).toBe('vehicle');expect(d.current.taskIds).toHaveLength(1)
 })
 it('rejects an edit while processing and preserves the draft',async()=>{
  let resolve!:()=>void;const d=createDemoConversation(()=>new Promise(r=>{resolve=r}));const run=d.send('找煤炭运价');d.session.draft='改成每天更新';await d.send(d.session.draft);expect(d.tasks[0].frequency).toBe('');expect(d.session.draft).toBe('改成每天更新');d.stop();resolve();await run
 })
})

describe('对话修改的边界',()=>{
 it('does not infer a year from a budget number',async()=>{
  const d=createDemoConversation();await d.send('找煤炭运价，按月查看');await d.send('预算改为2024元');expect(d.tasks[0].year).toBe('');expect(d.tasks[0].budget).toBe('预算2024元')
 })
 it('can cancel a pending scope question without changing effective conditions or losing choices',async()=>{
  const d=createDemoConversation();await d.send(batch);const [a,b]=d.tasks;d.choose(a.id,'0');d.choose(b.id,'keep');await d.send('改成2024年');await d.send('先不改了')
  expect(d.session.conditionQuestion).toBeUndefined();expect(d.current.kind).toBe('relax');expect(d.current.choices[a.id]).toBe('0');expect(a.year).toBe('2025 年')
 })
})

it('honors an explicit frequency when only accepting part of a selected combined plan',async()=>{
 const d=createDemoConversation();await d.send('找2025年煤炭运价，必须按天查看、每天更新');d.choose(d.tasks[0].id,'0')
 await d.send('按月查看可以，但仍要每天更新');expect({...d.tasks[0],...d.current.proposed[d.tasks[0].id]}).toMatchObject({grain:'按月查看',frequency:'每天更新'})
 await d.confirm();expect(d.tasks[0].frequency).toBe('每天更新')
})

describe('最终复核回归',()=>{
 it('asks which two instead of changing all three',async()=>{
  const d=createDemoConversation();await d.send('找煤炭运价，按月查看；再找山东货运量；再找水果苹果销量')
  await d.send('这两项都改成2024年');expect(d.current.kind).toBe('clarify-edit');expect(d.tasks.every(t=>!t.year)).toBe(true)
  await d.send('煤炭运价和货运量');expect(d.tasks.map(t=>t.year)).toEqual(['2024 年','2024 年',''])
 })
 it('applies distinct values to distinct named demands atomically',async()=>{
  const d=createDemoConversation();await d.send('找煤炭运价，按月查看；再找山东货运量')
  const count=d.session.frames.length;await d.send('煤炭运价改成2024年，货运量改成2023年')
  expect(d.tasks.map(t=>t.year)).toEqual(['2024 年','2023 年']);expect(d.session.frames).toHaveLength(count+1);expect(d.current.searchedTaskIds).toHaveLength(2)
 })
 it('keeps a following unnamed field with its explicitly named clause',async()=>{
  const d=createDemoConversation();await d.send('找煤炭运价，按月查看；再找山东货运量')
  await d.send('煤炭运价改成2024年、每周更新；货运量改成2023年')
  expect(d.tasks[0]).toMatchObject({year:'2024 年',frequency:'每周更新'});expect(d.tasks[1]).toMatchObject({year:'2023 年',frequency:''})
 })
 it('stages different values per demand and still waits for one confirmation',async()=>{
  const d=createDemoConversation();await d.send(batch);const [a,b]=d.tasks;d.choose(a.id,'0')
  await d.send('煤炭运价改成2024年，货运量改成2023年');expect(a.year).toBe('2025 年');expect(b.year).toBe('')
  expect(d.current.proposed[a.id].year).toBe('2024 年');expect(d.current.proposed[b.id].year).toBe('2023 年');expect(d.current.products).toHaveLength(0)
  await d.confirm();expect(a.year).toBe('2024 年');expect(b.year).toBe('2023 年')
 })
 it('acknowledges an unchanged value and exits the scope question without searching',async()=>{
  const d=createDemoConversation();await d.send('找2025年煤炭运价，按月查看；再找山东货运量');await d.send('改成2025年');await d.send('煤炭运价')
  expect(d.session.conditionQuestion).toBeUndefined();expect(d.current.kind).not.toBe('clarify-edit');expect(d.current.query).toContain('煤炭运价');expect(d.current.message).toContain('相同');expect(d.current.steps).toHaveLength(0)
 })
})

describe('UI整合后的连续对话兼容', () => {
 it('splits an edit and removal without removing the edited demand', async () => {
  const d=createDemoConversation();await d.send('找2025年煤炭运价，按月查看；再找山东货运量')
  const coal=d.tasks[0];await d.send('煤炭运价改成2024年，货运量先不找了')
  expect(d.session.pending).toEqual([coal.id]);expect(coal.year).toBe('2024 年')
 })
 it('preserves conditions when a change is explicitly negated', async () => {
  const d=createDemoConversation();await d.send('找2025年煤炭运价，按月查看');await d.send('煤炭运价不要改成2024年')
  expect(d.tasks[0].year).toBe('2025 年');expect(d.current.kind).toBe('notice')
 })
 it('merges remembered year and newly supplied frequency after scope clarification', async () => {
  const d=createDemoConversation();await d.send('找2025年煤炭运价，按月查看；再找山东货运量');await d.send('改成2024年');await d.send('煤炭运价，更新频率改成每周更新')
  expect(d.tasks[0]).toMatchObject({year:'2024 年',frequency:'每周更新'});expect(d.tasks[1].year).toBe('')
 })
 it('accepts a new demand while retaining an unanswered condition scope', async () => {
  const d=createDemoConversation();await d.send('找2025年煤炭运价，按月查看；再找山东货运量');await d.send('改成2024年');await d.send('再找汽车销量')
  expect(d.tasks).toHaveLength(3);expect(d.session.conditionQuestion?.changes.year).toBe('2024 年');expect(d.tasks[2].year).toBe('')
  await d.send('只改煤炭运价');expect(d.tasks[0].year).toBe('2024 年');expect(d.tasks[2].year).toBe('')
 })
 it('treats retry after a no-op reply as the same complete batch', async () => {
  const d=createDemoConversation();await d.send('找2025年煤炭运价，按月查看');await d.send('煤炭运价改成2025年');const ids=[...d.session.pending];await d.send('重新搜索')
  expect(d.tasks).toHaveLength(1);expect(d.session.pending).toEqual(ids);expect(d.current.searchedTaskIds).toEqual(ids)
 })
 it('does not reuse another demands old relaxation decision for new conditions', async () => {
  const d=createDemoConversation();await d.send('找2025年煤炭运价，必须按天查看、每天更新；再找货运路线');const [coal,route]=d.tasks
  d.choose(coal.id,'0');await d.confirm();await d.send('货运路线改成按港口筛选')
  expect(d.current.kind).toBe('relax');expect(d.current.plans.some(p=>p.taskId===route.id)).toBe(true);expect(coal.grain).toBe('按月查看')
 })
 it('completes unchanged unfinished demands after stopping and changing one demand', async () => {
  let blocked=true,release!:()=>void;const d=createDemoConversation(()=>blocked?new Promise(r=>{release=r}):Promise.resolve());const run=d.send('找2025年煤炭运价，按月查看；再找山东货运量');d.stop();blocked=false;release();await run
  const ids=[...d.session.pending];await d.send('煤炭运价改成2024年');expect(new Set(d.current.searchedTaskIds)).toEqual(new Set(ids));expect(d.current.kind).toBe('results')
 })
})

describe('整合复核的组合状态回归', () => {
 it('removes stale plan entries before a staged follow-up edit',async()=>{
  const d=createDemoConversation();await d.send(batch);const [a,b]=d.tasks;await d.send('货运量不找了，煤炭运价改成2024年')
  expect(d.current.plans.map(p=>p.taskId)).toEqual([a.id]);expect(d.current.plans.some(p=>p.taskId===b.id)).toBe(false)
  await d.confirm();expect(d.current.kind).not.toBe('relax');expect(a.year).toBe('2024 年')
 })
 it.each(['0','keep'])('searches newly queued demands before publishing confirmed choice %s',async choice=>{
  const d=createDemoConversation();await d.send(batch);await d.send('改成2024年');await d.send('再找汽车销量');const car=d.tasks[2];await d.send('只改煤炭运价');d.choose(d.tasks[1].id,choice);if(choice==='keep')d.choose(d.tasks[0].id,'keep');await d.confirm()
  expect(d.session.facts?.[car.id]).toBeDefined();expect(d.current.searchedTaskIds).toContain(car.id)
 })
 it('does not apply the remembered value when the scope reply rejects it',async()=>{
  const d=createDemoConversation();await d.send('找2025年煤炭运价，按月查看；再找山东货运量');await d.send('改成2024年');await d.send('煤炭运价不要改成2024年')
  expect(d.tasks[0].year).toBe('2025 年');expect(d.session.conditionQuestion).toBeUndefined()
 })
 it('re-evaluates matching after rolling back an accepted relaxation',async()=>{
  const d=createDemoConversation();await d.send('找煤炭运价，必须按天查看、每天更新');const a=d.tasks[0];d.choose(a.id,'0');await d.confirm();await d.rollback(a.id)
  expect(d.current.kind).toBe('relax');expect(d.current.plans.map(p=>p.taskId)).toContain(a.id)
 })
 it('preserves selected and custom decisions on explicit retry before confirmation',async()=>{
  const d=createDemoConversation();await d.send(batch);d.choose(d.tasks[0].id,'0');await d.send('煤炭运价改成2024年');d.choose(d.tasks[1].id,'keep');const choices=JSON.stringify(d.current.choices),proposed=JSON.stringify(d.current.proposed)
  await d.send('重新搜索');expect(JSON.stringify(d.current.choices)).toBe(choices);expect(JSON.stringify(d.current.proposed)).toBe(proposed);expect(d.tasks[0].year).toBe('2025 年')
 })
})
