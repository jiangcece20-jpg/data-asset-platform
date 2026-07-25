import { defineStore } from 'pinia'
import type { AnswerSession } from '@/types/domain'
import type { ChatMessage, ChatIntent, ChatRole, GuideQuestion, MessageBlock, RoleOption } from '@/types/aiChat'
import { genId, now } from '@/utils/id'
import { useEntitlementStore } from './entitlements'
import { useCatalogStore } from './catalog'

interface QaEntry {
  keywords: string[]
  productId: string
  teaser: string
  fullFacts: string[]
  followUps: string[]
  metrics?: { label: string; value: string; change: string; dir: 'up' | 'down'; period: string }[]
}

// ── 引导问题（每条对应一个找数场景，均可在演示中返回内容） ──────
// 场景 → 示例问题 → 意图 → 落到的商品：
//   运价趋势研判      货运价格趋势如何          answer        全国货运价格指数
//   指标速查          本周货运价格指数是多少    metric_query  全国货运价格指数
//   行业研究/采购决策  公路物流行业月报          answer        中国公路物流行业月报
//   港口运营分析      港口吞吐量看板            search        港口吞吐量免费看板
//   司机合规核验      司机资格核验 API          search        道路运输从业人员资格核验 API
//   供应商准入/资质比对 企业资质核验 API         search        企业资质隐私核验 API
//   企业画像/风险评估  企业物流活跃度数据集      search        企业物流活跃度数据集
//   行业政策速递(免费)  有没有物流政策速递        search        物流行业政策速递（免费）
export const guideQuestions: GuideQuestion[] = [
  { icon: '📈', text: '货运价格趋势如何', intent: 'answer' },
  { icon: '🔢', text: '本周货运价格指数是多少', intent: 'metric_query' },
  { icon: '📊', text: '公路物流行业月报', intent: 'answer' },
  { icon: '📦', text: '港口吞吐量看板', intent: 'search' },
  { icon: '🪪', text: '司机资格核验 API', intent: 'search' },
  { icon: '🏢', text: '企业资质核验 API', intent: 'search' },
  { icon: '🗂️', text: '企业物流活跃度数据集', intent: 'search' },
  { icon: '📰', text: '有没有物流政策速递', intent: 'search' },
]

// ── 角色选项 ──────────────────────────────────────────
export const roleOptions: RoleOption[] = [
  { value: '业务运营', label: '业务运营', icon: '📊' },
  { value: '产品经理', label: '产品经理', icon: '🎯' },
  { value: '管理层', label: '管理层', icon: '👤' },
  { value: '数据分析师', label: '数据分析师', icon: '🔬' },
  { value: '数仓开发', label: '数仓开发', icon: '⚙️' },
]

// ── 意图识别（统一输入 → 意图分类） ────────────────────
function recognizeIntent(text: string): ChatIntent {
  const q = text.toLowerCase().trim()
  if (/(多少|几个|数量|指数|gmv|是多少|统计|查询)/.test(q)) return 'metric_query'
  if (/(趋势|表现|如何|怎么|是什么|为什么|分析|走势|情况|月报)/.test(q)) return 'answer'
  if (/(找|搜索|哪些|有没有|推荐|需要|想要|可以提供|看板|数据集|接口|api)/.test(q)) return 'search'
  return 'unknown'
}

// ── 通用追问 ──────────────────────────────────────────
const genericFollowUps: Record<ChatIntent, string[]> = {
  answer: ['切换到找数据看更多商品', '提交需求'],
  search: ['换一组关键词试试', '查看全部商品', '提交需求'],
  metric_query: ['查看完整指标看板', '近 30 天趋势', '按城市分布'],
  unknown: ['换个关键词试试', '查看全部商品', '提交需求'],
}

// 固定演示问答库：覆盖“问货运价格趋势”等核心链路
const qaBank: QaEntry[] = [
  {
    keywords: ['货运', '运价', '价格趋势', '货运价格'],
    productId: 'prod-freight-index',
    teaser: '近期全国公路货运价格指数整体温和上涨、环比涨幅收窄；结构上冷链车型强于普通车型、华东通道相对领先。',
    fullFacts: [
      '本周全国货运价格指数为 108.6，环比上涨 0.4%，同比上涨 3.1%。',
      '华东至华南通道涨幅最为明显，环比 +1.2%；华北区域基本持平。',
      '冷藏车型价格指数上涨快于普通车型，反映冷链需求季节性上升。'
    ],
    followUps: ['近 3 个月华东区域的详细走势是什么？', '哪些城市对涨幅最大？'],
    metrics: [
      { label: '货运价格指数', value: '108.6', change: '+0.4%', dir: 'up', period: '环比' },
      { label: '同比涨幅', value: '+3.1%', change: '+1.2%', dir: 'up', period: '同比' },
      { label: '冷藏车型指数', value: '115.2', change: '+1.8%', dir: 'up', period: '环比' },
    ],
  },
  {
    keywords: ['物流月报', '公路物流', '行业月报', '物流行业'],
    productId: 'prod-logistics-monthly',
    teaser: '本月公路物流行业整体运行平稳、细分赛道分化明显；快运赛道相对领先，大宗商品运输有所放缓。',
    fullFacts: [
      '本月公路物流景气指数为 52.3，连续 3 个月位于扩张区间。',
      '快运赛道增速领先，同比增长 8.6%；大宗商品运输增速放缓。',
      '政策层面新出台的通行费减免细则预计将利好中小承运商。'
    ],
    followUps: ['大宗商品运输放缓的具体原因是什么？', '下月展望中提到了哪些重点？'],
    metrics: [
      { label: '物流景气指数', value: '52.3', change: '+0.8', dir: 'up', period: '环比' },
      { label: '快运增速', value: '+8.6%', change: '+2.1%', dir: 'up', period: '同比' },
    ],
  }
]

export const useAiStore = defineStore('ai', {
  state: () => ({
    // 旧版问答会话（向后兼容）
    sessions: [] as AnswerSession[],
    // ── 新版聊天状态 ──
    chatMessages: [] as ChatMessage[],
    chatTyping: false,
    currentRole: '业务运营' as ChatRole,
    chatFollowUps: [] as string[],
    // 最近提问（合并入口后用于「找数」首页的最近记录）
    recentQuestions: [] as string[],
    _pendingBlocks: null as MessageBlock[] | null,
    _pendingIntent: 'unknown' as ChatIntent,
    _pendingFollowUps: [] as string[],
  }),
  getters: {
    byId(state) {
      return (id: string) => state.sessions.find((s) => s.id === id)
    },
    hasChat(state) {
      return state.chatMessages.length > 0
    },
  },
  actions: {
    // ── 聊天：发送问题（意图识别 + 混排内容生成） ────────
    sendQuestion(text: string) {
      const question = text.trim()
      if (!question) return

      // 记录最近提问（去重、置顶、上限 8 条）
      this.recentQuestions = [question, ...this.recentQuestions.filter((x) => x !== question)].slice(0, 8)

      // 1. 添加用户消息
      this.chatMessages.push({
        id: genId('chat'),
        role: 'user',
        blocks: [{ type: 'text', content: question }],
        createdAt: now(),
      })

      // 2. 意图识别
      const intent = recognizeIntent(question)
      this._pendingIntent = intent

      // 3. 生成混排内容块
      const { blocks, followUps } = this._generateResponse(question, intent)
      this._pendingBlocks = blocks
      this._pendingFollowUps = followUps

      // 4. 进入 typing 状态
      this.chatTyping = true
      this.chatFollowUps = []
    },

    // ── 聊天：刷新待响应（组件 setTimeout 后调用） ──────
    flushResponse() {
      if (!this._pendingBlocks) return
      this.chatMessages.push({
        id: genId('chat'),
        role: 'ai',
        blocks: this._pendingBlocks,
        intent: this._pendingIntent,
        createdAt: now(),
      })
      this._pendingBlocks = null
      this.chatTyping = false
      this.chatFollowUps = this._pendingFollowUps
    },

    // ── 聊天：重置 ──────────────────────────────────────
    resetChat() {
      this.chatMessages = []
      this.chatTyping = false
      this.chatFollowUps = []
      this._pendingBlocks = null
      this._pendingFollowUps = []
    },

    // ── 聊天：切换角色 ──────────────────────────────────
    setRole(role: ChatRole) {
      this.currentRole = role
    },

    // ── 内部：生成混排响应 ──────────────────────────────
    _generateResponse(question: string, intent: ChatIntent): { blocks: MessageBlock[]; followUps: string[] } {
      const entitlements = useEntitlementStore()
      const catalog = useCatalogStore()
      const q = question.toLowerCase()
      const matched = qaBank.find((e) => e.keywords.some((k) => q.includes(k.toLowerCase())))
      const role = this.currentRole

      // 命中问答库
      if (matched) {
        const product = catalog.byId(matched.productId)
        const access = product ? entitlements.accessLevel(product) : 'none'
        const unlocked = access !== 'none'
        const blocks: MessageBlock[] = []

        // 步骤指示
        blocks.push({ type: 'step', label: '解析问题', status: 'done' })
        blocks.push({ type: 'step', label: '检索元数据', status: 'done' })

        // 文本答案
        blocks.push({ type: 'text', content: `根据你的角色（${role}），为你找到了以下分析结果：` })
        blocks.push({ type: 'text', content: unlocked ? matched.teaser : matched.teaser })

        if (unlocked && matched.fullFacts.length) {
          for (const fact of matched.fullFacts) {
            blocks.push({ type: 'text', content: fact })
          }
        } else if (!unlocked) {
          blocks.push({ type: 'text', content: '🔒 精确数值与完整分析已锁定，购买后可解锁。' })
        }

        // 指标块（metric_query 意图或问答库有 metrics）
        if (intent === 'metric_query' && matched.metrics) {
          for (const m of matched.metrics) {
            blocks.push({ type: 'metric', ...m })
          }
        }

        // 商品卡片（混排核心：答案 + 商品在同一消息）
        if (product) {
          blocks.push({
            type: 'product-card',
            productId: product.id,
            reason: matched.keywords.some((k) => q.includes(k.toLowerCase()))
              ? `匹配"${matched.keywords[0]}"关键词`
              : '关联数据来源',
          })
        }

        // 来源
        blocks.push({
          type: 'source',
          title: product?.name || matched.productId,
          productId: matched.productId,
          locked: !unlocked,
        })

        return { blocks, followUps: matched.followUps }
      }

      // 未命中问答库 — 转为商品推荐
      const candidates = catalog.search(question)
      const blocks: MessageBlock[] = []

      blocks.push({ type: 'step', label: '解析问题', status: 'done' })
      blocks.push({ type: 'step', label: '检索商品库', status: 'done' })

      if (candidates.length > 0) {
        blocks.push({
          type: 'text',
          content: `没有找到直接答案，但为你推荐了 ${candidates.length} 个相关商品：`,
        })
        for (const p of candidates.slice(0, 3)) {
          blocks.push({
            type: 'product-card',
            productId: p.id,
            reason: `匹配关键词"${question}"`,
          })
        }
      } else {
        blocks.push({
          type: 'text',
          content: '暂未找到匹配的商品，你可以换个关键词试试，或提交需求由运营跟进。',
        })
      }

      return { blocks, followUps: genericFollowUps[intent] }
    },
    ask(question: string, mode: 'auto' | 'answer' | 'search'): AnswerSession {
      const entitlements = useEntitlementStore()
      const catalog = useCatalogStore()
      const q = question.trim().toLowerCase()
      const trimmed = question.trim()
      if (trimmed) {
        this.recentQuestions = [trimmed, ...this.recentQuestions.filter((x) => x !== trimmed)].slice(0, 8)
      }
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
