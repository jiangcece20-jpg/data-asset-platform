import { describe, expect, it } from 'vitest'
import { createDemoConversation } from './demoConversation'

function memoryStorage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
}
const pending = () => new Promise<void>(() => {})

describe('通用问答规则', () => {
  it('clears only the submitted clarification draft and preserves the unsent composer draft', async () => {
    const demo = createDemoConversation()
    await demo.send('找2025年苹果销量')
    demo.session.draft = '找2024年汽车销量'
    demo.session.clarificationDraft = '水果'
    await demo.send(demo.session.clarificationDraft, 'clarification')
    expect(demo.session.draft).toBe('找2024年汽车销量')
    expect(demo.session.clarificationDraft).toBe('')
  })

  it('does not clear an existing draft when a preset example is sent', async () => {
    const demo = createDemoConversation()
    demo.session.draft = '尚未发送的内容'
    await demo.send('找2025年煤炭运价', 'external')
    expect(demo.session.draft).toBe('尚未发送的内容')
  })

  it('does not repeat a resolved keep-original decision on re-search', async () => {
    const demo = createDemoConversation()
    await demo.send('找煤炭运价，必须按天查看、每天更新')
    demo.choose(demo.tasks[0].id, 'keep'); await demo.confirm()
    const conditions = [...demo.current.conditions]
    await demo.retry()
    expect(demo.current.kind).toBe('empty')
    expect(demo.current.conditions).toEqual(conditions)
  })
  it('stops the entire batch and rejects late results without changing conditions', async () => {
    let release!: () => void
    const demo = createDemoConversation(() => new Promise(resolve => { release = resolve }))
    const run = demo.send('找2025年煤炭运价和山东货运路线，按月查看')
    const conditions = [...demo.current.conditions]
    demo.stop()
    release(); await run
    expect(demo.current.kind).toBe('stopped')
    expect(demo.current.conditions).toEqual(conditions)
    expect(demo.current.products).toHaveLength(0)
    expect(demo.state.busy).toBe(false)
  })

  it('rejects a second send or condition edit while preserving the draft', async () => {
    const demo = createDemoConversation(pending)
    void demo.send('找2025年煤炭运价')
    demo.session.draft = '改成2024年'
    expect(await demo.send(demo.session.draft)).toBe(false)
    await demo.edit(demo.tasks[0].id, { year: '2024 年' })
    expect(demo.session.frames).toHaveLength(1)
    expect(demo.tasks[0].year).toBe('2025 年')
    expect(demo.session.draft).toBe('改成2024年')
    demo.stop()
  })

  it('continues a running session after switching to a new session', async () => {
    const releases: (() => void)[] = []
    const demo = createDemoConversation(() => new Promise(resolve => releases.push(resolve)))
    const run = demo.send('找2025年煤炭运价')
    const firstId = demo.session.id
    demo.newSession()
    demo.session.draft = '第二个会话的草稿'
    for (let stage = 0; stage < 4; stage++) { releases.shift()!(); await Promise.resolve(); await Promise.resolve() }
    await run
    expect(demo.session.draft).toBe('第二个会话的草稿')
    demo.activate(firstId)
    expect(demo.current.kind).toBe('results')
    expect(demo.current.conditions.join(' ')).toContain('2025')
  })

  it('restores per-session drafts, completed answers and rating after refresh', async () => {
    const storage = memoryStorage(), options = { storage, storageKey: 'test' }
    const demo = createDemoConversation(undefined, options)
    await demo.send('找2025年煤炭运价')
    const firstId = demo.session.id, frameId = demo.current.id
    demo.rate(frameId, 'down')
    demo.session.draft = '改成2024年'
    demo.newSession(); demo.session.draft = '尚未发送'
    const restored = createDemoConversation(undefined, options)
    expect(restored.session.frames).toHaveLength(0)
    expect(restored.session.draft).toBe('尚未发送')
    restored.activate(firstId)
    expect(restored.current.id).toBe(frameId)
    expect(restored.current.rating).toBe('down')
    expect(restored.session.draft).toBe('改成2024年')
  })

  it('restores a pending unified choice without applying or searching', async () => {
    const storage = memoryStorage(), options = { storage, storageKey: 'choice' }
    const demo = createDemoConversation(undefined, options)
    await demo.send('找煤炭运价，必须按天查看、每天更新')
    demo.choose(demo.tasks[0].id, '0')
    const restored = createDemoConversation(undefined, options)
    expect(restored.current.kind).toBe('relax')
    expect(restored.current.choices[restored.tasks[0].id]).toBe('0')
    expect(restored.tasks[0].grain).toBe('按天查看')
    expect(restored.current.products).toHaveLength(0)
  })

  it('restores a running task under the same frame id and finishes it once', async () => {
    const storage = memoryStorage(), options = { storage, storageKey: 'running' }
    const demo = createDemoConversation(pending, options)
    void demo.send('找2025年煤炭运价')
    const id = demo.current.id
    const restored = createDemoConversation(undefined, options)
    for (let n = 0; n < 12; n++) await Promise.resolve()
    expect(restored.current.id).toBe(id)
    expect(restored.current.kind).toBe('results')
    expect(restored.session.frames).toHaveLength(1)
    demo.stop()
  })

  it('keeps a stopped task stopped after restoration', () => {
    const storage = memoryStorage(), options = { storage, storageKey: 'stopped' }
    const demo = createDemoConversation(pending, options)
    void demo.send('找2025年煤炭运价'); demo.stop()
    const restored = createDemoConversation(undefined, options)
    expect(restored.current.kind).toBe('stopped')
    expect(restored.state.busy).toBe(false)
  })

  it('re-searches accepted conditions, keeping the previous answer and its feedback', async () => {
    const demo = createDemoConversation()
    await demo.send('找煤炭运价，必须按天查看、每天更新')
    demo.choose(demo.tasks[0].id, '0'); await demo.confirm()
    const oldId = demo.current.id, conditions = [...demo.current.conditions]
    demo.rate(oldId, 'up'); await demo.retry()
    expect(demo.current.conditions).toEqual(conditions)
    expect(demo.current.kind).toBe('results')
    expect(demo.current.rating).toBe('')
    expect(demo.session.frames.find(f => f.id === oldId)?.rating).toBe('up')
  })

  it('makes downvotes immediate and optional reasons independent of cancelling feedback', async () => {
    const demo = createDemoConversation()
    await demo.send('找海底火山观测数据')
    const id = demo.current.id
    demo.rate(id, 'down'); expect(demo.current.rating).toBe('down')
    demo.feedback(id, '推荐不相关', '说明')
    demo.rate(id, 'up')
    expect(demo.current.rating).toBe('up')
    expect(demo.current.feedbackType).toBe('')
    demo.rate(id, 'up'); expect(demo.current.rating).toBe('')
  })

  it('deletes a whole running session without losing favorite products or resurrecting it', async () => {
    let release!: () => void
    const storage = memoryStorage(), options = { storage, storageKey: 'delete' }
    const demo = createDemoConversation(undefined, options)
    await demo.send('找2025年煤炭运价')
    const product = demo.current.products[0]
    demo.toggleFavorite(product.id)
    const id = demo.session.id
    demo.deleteSession(id)
    expect(demo.state.sessions.some(s => s.id === id)).toBe(false)
    expect(demo.state.favorites).toContain(product.id)
    expect(demo.favoriteProducts.some(p => p.id === product.id)).toBe(true)
    const running = createDemoConversation(() => new Promise(resolve => { release = resolve }), { storage, storageKey: 'late' })
    const run = running.send('找2025年煤炭运价'), runningId = running.session.id
    running.deleteSession(runningId); release(); await run
    expect(running.state.sessions.some(s => s.id === runningId)).toBe(false)
    const restored = createDemoConversation(undefined, { storage, storageKey: 'late' })
    expect(restored.state.sessions.some(s => s.id === runningId)).toBe(false)
  })

  it('preserves a failed send draft and accepts exactly one retry', async () => {
    const demo = createDemoConversation()
    demo.session.draft = '找2025年煤炭运价'
    demo.state.nextFailure = 'send'
    expect(await demo.send(demo.session.draft)).toBe(false)
    expect(demo.session.draft).toContain('煤炭')
    expect(demo.session.frames).toHaveLength(0)
    await demo.send(demo.session.draft)
    expect(demo.session.draft).toBe('')
    expect(demo.session.frames).toHaveLength(1)
  })
})
