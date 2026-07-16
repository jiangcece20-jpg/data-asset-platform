import { defineStore } from 'pinia'
import type { AnswerSession } from '@/types/domain'
import { genId, now } from '@/utils/id'
import { useEntitlementStore } from './entitlements'
import { useCatalogStore } from './catalog'

interface QaEntry {
  keywords: string[]
  productId: string
  teaser: string
  fullFacts: string[]
  followUps: string[]
}

// 固定演示问答库：覆盖“问货运价格趋势”等核心链路
const qaBank: QaEntry[] = [
  {
    keywords: ['货运', '运价', '价格趋势', '货运价格'],
    productId: 'prod-freight-index',
    teaser: '近期全国公路货运价格指数整体呈温和上涨趋势，公开摘要显示环比涨幅收窄。',
    fullFacts: [
      '本周全国货运价格指数为 108.6，环比上涨 0.4%，同比上涨 3.1%。',
      '华东至华南通道涨幅最为明显，环比 +1.2%；华北区域基本持平。',
      '冷藏车型价格指数上涨快于普通车型，反映冷链需求季节性上升。'
    ],
    followUps: ['近 3 个月华东区域的详细走势是什么？', '哪些城市对涨幅最大？']
  },
  {
    keywords: ['物流月报', '公路物流', '行业月报', '物流行业'],
    productId: 'prod-logistics-monthly',
    teaser: '公开摘要显示，本月公路物流行业整体运行平稳，细分赛道分化明显。',
    fullFacts: [
      '本月公路物流景气指数为 52.3，连续 3 个月位于扩张区间。',
      '快运赛道增速领先，同比增长 8.6%；大宗商品运输增速放缓。',
      '政策层面新出台的通行费减免细则预计将利好中小承运商。'
    ],
    followUps: ['大宗商品运输放缓的具体原因是什么？', '下月展望中提到了哪些重点？']
  }
]

export const useAiStore = defineStore('ai', {
  state: () => ({
    sessions: [] as AnswerSession[]
  }),
  getters: {
    byId(state) {
      return (id: string) => state.sessions.find((s) => s.id === id)
    }
  },
  actions: {
    ask(question: string, mode: 'auto' | 'answer' | 'search'): AnswerSession {
      const entitlements = useEntitlementStore()
      const catalog = useCatalogStore()
      const q = question.trim().toLowerCase()
      const matched = qaBank.find((e) => e.keywords.some((k) => q.includes(k.toLowerCase())))

      let session: AnswerSession

      if (matched) {
        const product = catalog.byId(matched.productId)
        const access = product ? entitlements.accessLevel(product) : 'none'
        const unlocked = access !== 'none'
        session = {
          id: genId('answer'),
          question,
          mode,
          answerText: unlocked ? [matched.teaser, ...matched.fullFacts].join(' ') : matched.teaser,
          lockedFollowUps: unlocked ? [] : matched.followUps,
          sources: [{ title: product?.name || matched.productId, productId: matched.productId, locked: !unlocked }],
          paywalled: !unlocked,
          unlockedProductId: unlocked ? matched.productId : undefined,
          createdAt: now()
        }
      } else {
        // 未命中问答库：无公开依据，不拼凑答案，转为商品推荐或需求提交
        const candidates = catalog.search(question)
        session = {
          id: genId('answer'),
          question,
          mode,
          answerText: '',
          lockedFollowUps: [],
          sources: candidates.slice(0, 3).map((p) => ({ title: p.name, productId: p.id, locked: false })),
          paywalled: false,
          createdAt: now()
        }
      }
      this.sessions.push(session)
      return session
    },
    unlock(sessionId: string) {
      const session = this.sessions.find((s) => s.id === sessionId)
      if (!session) return
      const matched = qaBank.find((e) => e.productId === session.unlockedProductId || session.sources.some((s) => s.productId === e.productId))
      if (!matched) return
      session.paywalled = false
      session.lockedFollowUps = []
      session.answerText = [matched.teaser, ...matched.fullFacts].join(' ')
      session.sources = session.sources.map((s) => ({ ...s, locked: false }))
    }
  }
})
