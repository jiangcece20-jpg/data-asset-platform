import { defineStore } from 'pinia'
import { genId } from '@/utils/id'
import type { ConfigVersion, ConfigDomain } from '@/types/configGovernance'
import { resolveReviewRequirement } from '@/domain/configVersionPolicy'

export interface PublishConfigInput {
  domain: ConfigDomain
  before: unknown
  after: unknown
  editor: string
  reviewer?: string
  effectiveScope: string
  affectedProductIds: string[]
  allUserEntrance?: boolean
}

// AI 引导问题引用失效商品时的安全兜底
function sanitizeAiGuide(domain: ConfigDomain, after: unknown): unknown {
  if (domain === 'ai_guide' && after && typeof after === 'object' && (after as any).invalidReference) {
    return { question: '暂无可用来源，请描述你的具体需求', fallback: true }
  }
  return after
}

export const useConfigVersionStore = defineStore('configVersions', {
  state: () => ({
    list: [] as ConfigVersion[]
  }),
  getters: {
    forDomain(state) {
      return (domain: ConfigDomain) => state.list.filter((v) => v.domain === domain).sort((a, b) => b.version - a.version)
    },
    currentPublished(state) {
      return (domain: ConfigDomain) => state.list.find((v) => v.domain === domain && v.status === 'published')
    },
    byId(state) {
      return (id: string) => state.list.find((v) => v.id === id)
    }
  },
  actions: {
    publish(input: PublishConfigInput): ConfigVersion {
      const reviewRequirement = resolveReviewRequirement({
        domain: input.domain,
        affectedProductCount: input.affectedProductIds.length,
        allUserEntrance: input.allUserEntrance ?? false
      })
      if (reviewRequirement === 'two_person' && (!input.reviewer || input.reviewer === input.editor)) {
        throw new Error('该配置需第二名审核人')
      }

      const versions = this.list.filter((v) => v.domain === input.domain)
      const nextVersion = versions.reduce((m, v) => Math.max(m, v.version), 0) + 1
      // 上一个已发布版本置为 superseded，但不删除。
      versions.filter((v) => v.status === 'published').forEach((v) => (v.status = 'superseded'))

      const record: ConfigVersion = {
        id: genId('cfgver'),
        domain: input.domain,
        version: nextVersion,
        before: input.before,
        after: sanitizeAiGuide(input.domain, input.after),
        editor: input.editor,
        reviewer: input.reviewer,
        reviewRequirement,
        effectiveScope: input.effectiveScope,
        affectedProductIds: [...input.affectedProductIds],
        publishedAt: new Date().toISOString(),
        status: 'published',
        createdAt: new Date().toISOString()
      }
      this.list.push(record)
      return record
    },

    // 回滚：生成新版本，after 等于目标版本；保留错误版本可查。仅恢复配置，不动商品。
    rollback(domain: ConfigDomain, targetVersion: number, actor: string, reason: string): ConfigVersion {
      const target = this.list.find((v) => v.domain === domain && v.version === targetVersion)
      if (!target) throw new Error('回滚目标版本不存在')
      const current = this.list.find((v) => v.domain === domain && v.status === 'published')
      const nextVersion = this.list.filter((v) => v.domain === domain).reduce((m, v) => Math.max(m, v.version), 0) + 1
      // 错误版本保留为 rolled_back，可查询。
      if (current) current.status = 'rolled_back'

      const record: ConfigVersion = {
        id: genId('cfgver'),
        domain,
        version: nextVersion,
        before: current?.after,
        after: target.after,
        editor: actor,
        reviewRequirement: target.reviewRequirement,
        effectiveScope: target.effectiveScope,
        affectedProductIds: [...target.affectedProductIds],
        publishedAt: new Date().toISOString(),
        rolledBackFromVersion: targetVersion,
        rollbackReason: reason,
        status: 'published',
        createdAt: new Date().toISOString()
      }
      this.list.push(record)
      return record
    }
  }
})
