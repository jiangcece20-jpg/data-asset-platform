import { describe, expect, it } from 'vitest'
import { resolveReviewRequirement, resolveRollbackRule } from './configVersionPolicy'

describe('resolveReviewRequirement', () => {
  it('requires two-person review for price and AI-source configs', () => {
    expect(resolveReviewRequirement({ domain: 'member_price', affectedProductCount: 1, allUserEntrance: false })).toBe('two_person')
    expect(resolveReviewRequirement({ domain: 'ai_guide', affectedProductCount: 1, allUserEntrance: false })).toBe('two_person')
  })
  it('requires two-person for >=100 products or all-user entrances', () => {
    expect(resolveReviewRequirement({ domain: 'hot_word', affectedProductCount: 100, allUserEntrance: false })).toBe('two_person')
    expect(resolveReviewRequirement({ domain: 'recommend_slot', affectedProductCount: 1, allUserEntrance: true })).toBe('two_person')
  })
  it('allows single confirm for ordinary hot words / slots / channels', () => {
    expect(resolveReviewRequirement({ domain: 'hot_word', affectedProductCount: 3, allUserEntrance: false })).toBe('single_confirm')
    expect(resolveReviewRequirement({ domain: 'channel', affectedProductCount: 2, allUserEntrance: false })).toBe('single_confirm')
  })
})

describe('resolveRollbackRule', () => {
  it('maps each §12.2 scenario to its action', () => {
    expect(resolveRollbackRule('paused_recommended_product')).toBe('withdraw_and_backup')
    expect(resolveRollbackRule('no_result_hot_word')).toBe('stop_or_switch_demand')
    expect(resolveRollbackRule('invalid_ai_reference')).toBe('safe_fallback')
    expect(resolveRollbackRule('mispriced')).toBe('stop_new_and_dispose_by_time')
    expect(resolveRollbackRule('wrong_channel')).toBe('rollback_keep_erroneous')
  })
})
