import { describe, expect, it } from 'vitest'
import { createDemoConversation } from './demoConversation'
const query = '找2025年煤炭运价，必须按天查看、每天更新；再找山东货运量，必须按区县查看'
describe('本轮范围与采数边界', () => {
  it('immediately excludes a named demand while retaining other choices and history', async () => {
    const d=createDemoConversation(); await d.send(query)
    const [a,b]=d.tasks; d.choose(a.id,'0'); const old=JSON.stringify(d.current)
    await d.send('货运量先不找了')
    expect(d.session.pending).toEqual([a.id]); expect(d.current.kind).toBe('relax')
    expect(d.current.choices[a.id]).toBe('0'); expect(d.current.plans.map(p=>p.taskId)).toEqual([a.id])
    expect(JSON.stringify(d.session.frames[0])).toBe(old); expect(d.current.products).toHaveLength(0)
    await d.confirm(); expect(d.current.taskIds).toEqual([a.id]); expect(d.tasks.find(t=>t.id===b.id)).toBeTruthy()
  })
  it('joins a new demand before publishing and keeps the old selection', async () => {
    const d=createDemoConversation(); await d.send(query); const [a,b]=d.tasks
    d.choose(a.id,'0');d.choose(b.id,'keep')
    await d.send('再找2025年水果苹果销量')
    expect(d.session.pending).toHaveLength(3); expect(d.current.kind).toBe('relax')
    expect(d.current.choices[a.id]).toBe('0'); expect(d.current.choices[b.id]).toBe('keep')
    expect(d.current.products).toHaveLength(0); expect(d.current.searchedTaskIds).toHaveLength(1)
    await d.confirm(); expect(d.current.taskIds).toHaveLength(3);expect(d.current.products.some(p=>p.name.includes('苹果'))).toBe(true)
  })
  it('retains decisions while clarifying the newly added demand', async () => {
    const d=createDemoConversation(); await d.send(query);const [a,b]=d.tasks;d.choose(a.id,'1');d.choose(b.id,'keep')
    await d.send('再找2025年苹果销量');expect(d.current.kind).toBe('clarify');expect(d.current.products).toHaveLength(0)
    await d.send('水果');expect(d.current.kind).toBe('relax');expect(d.current.choices[a.id]).toBe('1')
    expect(d.current.choices[b.id]).toBe('keep');expect(d.current.products).toHaveLength(0)
  })
  it('handles a combined exclusion and addition atomically', async () => {
    const d=createDemoConversation();await d.send(query);const [a,b]=d.tasks;d.choose(a.id,'0')
    await d.send('货运量先不找了，再找2025年水果苹果销量')
    expect(d.session.pending).not.toContain(b.id);expect(d.current.taskIds).toHaveLength(2)
    expect(d.current.choices[a.id]).toBe('0');expect(d.current.products).toHaveLength(0)
    expect(d.tasks.at(-1)?.topic).toBe('apple')
  })
  it('does not remove a different demand that shares the same name prefix', async () => {
    const d=createDemoConversation();await d.send('找山东货运路线；再找山东货运量，必须按区县查看')
    const [route,volume]=d.tasks;await d.send('山东货运量先不找了')
    expect(d.session.pending).toEqual([route.id]);expect(d.current.taskIds).not.toContain(volume.id)
  })
  it('preserves a selected relaxation when editing another field during added-demand clarification', async () => {
    const d=createDemoConversation();await d.send(query);const [a,b]=d.tasks;d.choose(a.id,'0');d.choose(b.id,'keep')
    await d.send('再找苹果销量');await d.edit(a.id,{year:'2024 年'});await d.send('水果');await d.confirm()
    expect(a.year).toBe('2024 年');expect(a.grain).toBe('按月查看');expect(a.frequency).toBe('每天更新')
  })
  it('recognizes the apple alias after its meaning has been clarified', async () => {
    const d=createDemoConversation();await d.send('找山东货运路线；再找水果苹果销量')
    const route=d.tasks[0];await d.send('苹果先不找了');expect(d.session.pending).toEqual([route.id])
  })
  it('keeps exclusions of a named topic within that topic even when saying all', async () => {
    const d=createDemoConversation();await d.send('找煤炭运价；再找水果苹果销量')
    const coal=d.tasks[0];await d.send('苹果都不找了');expect(d.session.pending).toEqual([coal.id])
  })
  it('does not remove the sole active demand when the user names another topic', async () => {
    const d=createDemoConversation();await d.send('找煤炭运价');const id=d.tasks[0].id
    await d.send('汽车先不找了');expect(d.session.pending).toEqual([id])
  })
  it('does not launch an empty batch or turn removal into no supply', async () => {
    const d=createDemoConversation();await d.send(query);await d.send('这两项都不找了')
    expect(d.session.pending).toEqual([]);expect(d.current.kind).toBe('notice');expect(d.current.tasks).toEqual([])
    expect(d.current.message).not.toContain('无合适');expect(d.state.busy).toBe(false)
  })
  it('excludes the unclear item through conversation and later reuses only clear context', async () => {
    const d=createDemoConversation();await d.send('找煤炭运价，再找2025年苹果销量')
    await d.send('苹果先不找了');expect(d.current.taskIds).toHaveLength(1)
    const old=JSON.stringify(d.current);await d.send('继续找刚才的水果苹果销量')
    expect(d.current.taskIds).toHaveLength(1);expect(d.current.conditions.join(' ')).toContain('2025')
    expect(JSON.stringify(d.session.frames[1])).toBe(old)
  })
  it('applies shared edits once and only to selected demands', async () => {
    const d=createDemoConversation();await d.send('找2025年煤炭运价，按月查看；再找山东货运路线；再找水果苹果销量')
    const [a,b,c]=d.tasks;await d.editMany([a.id,b.id],{year:'2024 年'})
    expect(a.year).toBe('2024 年');expect(b.year).toBe('2024 年');expect(c.year).toBe('')
    expect(d.current.searchedTaskIds).toEqual([a.id,b.id]);expect(d.current.taskIds).toHaveLength(3)
  })
  it('stages shared edits until unified confirmation', async () => {
    const d=createDemoConversation();await d.send(query);const [a,b]=d.tasks
    await d.editMany([a.id,b.id],{year:'2024 年'})
    expect(a.year).toBe('2025 年');expect(b.year).toBe('');expect(d.current.proposed[b.id].year).toBe('2024 年')
    await d.confirm();expect(a.year).toBe('2024 年');expect(b.year).toBe('2024 年')
  })
  it('stages edits even while clarifying an added demand', async () => {
    const d=createDemoConversation();await d.send(query);const a=d.tasks[0];d.choose(a.id,'0')
    await d.send('再找苹果销量');await d.edit(a.id,{year:'2024 年'})
    expect(a.year).toBe('2025 年');await d.send('水果');expect(d.current.proposed[a.id].year).toBe('2024 年')
  })
  it('does not reuse stale facts after a changed-demand search fails', async () => {
    const d=createDemoConversation();await d.send('找2025年煤炭运价，按月查看')
    d.state.nextFailure='search';await d.edit(d.tasks[0].id,{year:'2024 年'})
    await d.send('再找水果苹果销量');expect(d.current.products[0].evidence.some(e=>e.fact.includes('2024'))).toBe(true)
  })
  it('shows verified basis and old-to-new values for every suggested option', async () => {
    const d=createDemoConversation();await d.send(query)
    for(const plan of d.current.plans)for(const option of plan.options)expect(option.basis).toBeTruthy()
  })
  it('preserves specialized requirements in search and collection summaries', async () => {
    const d=createDemoConversation();await d.preset('empty');d.openCollection()
    expect(d.current.conditions.join(' ')).toContain('专用线路');expect(d.state.collection.conditions.join(' ')).toContain('逐车')
    expect(d.state.collection.gaps).toEqual([])
  })
  it('does not turn unknown coverage into a known gap', async () => {
    const d=createDemoConversation();await d.preset('route-coverage');d.openCollection()
    expect(d.state.collection.gaps).toEqual([]);expect(d.state.collection.unknown.join(' ')).toContain('榆林')
    expect(d.state.collection.searchFinding).toContain('候选')
  })
  it('keeps same-request drafts and re-prefills a new request without carrying another budget', async () => {
    const d=createDemoConversation();await d.send('找2025年煤炭运价，按天查看');d.openCollection()
    Object.assign(d.state.collection,{price:'0-5000',name:'张女士',contact:'demo@example.com'})
    d.state.collection.open=false;d.openCollection();expect(d.state.collection.price).toBe('0-5000')
    d.newSession();await d.send('找水果苹果销量，预算8000元');d.openCollection();expect(d.state.collection.price).toBe('8000')
    d.newSession();await d.send('找汽车销量');d.openCollection();expect(d.state.collection.price).toBe('')
  })
  it('isolates unknown evidence to the selected collection demands', async () => {
    const d=createDemoConversation();await d.send('找煤炭运价，资料未说明按天查看；再找山东货运量')
    const volume=d.tasks.find(t=>t.topic==='volume')!;d.openCollection([volume.id]);expect(d.state.collection.unknown).toEqual([])
  })
})
