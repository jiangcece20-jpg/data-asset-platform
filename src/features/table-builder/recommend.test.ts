import { describe, expect, it } from 'vitest';
import { recommendFields, recommendTable } from './recommend';

describe('recommendTable', () => {
  it('recommends a standard-like English name from Chinese table name', () => {
    const result = recommendTable({ nameZh: '客户维度表', nameEn: '', description: '客户主体' });
    expect(result.nameZh).toContain('客户');
    expect(result.nameEn).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(result.rationale.length).toBeGreaterThan(0);
  });
});

describe('recommendFields', () => {
  it('matches 客户编号 to published standard with high confidence', () => {
    const [row] = recommendFields([{ id: 'f1', nameZh: '客户编号', nameEn: '', comment: '' }]);
    expect(row.status).toBe('adopted');
    expect(row.standard?.nameEn).toBe('customer_code');
    expect(row.confidence).toBe('high');
    expect(row.dataType).toBeTruthy();
    expect(row.classificationPath).toBeTruthy();
    expect(row.grade).toBeTruthy();
  });

  it('matches 客户性别 with code table', () => {
    const [row] = recommendFields([{ id: 'f2', nameZh: '客户性别', nameEn: '', comment: '' }]);
    expect(row.standard?.nameEn).toBe('customer_gender');
    expect(row.codeTable).toMatch(/性别/);
  });

  it('marks 优惠券编码 as missing with suggested English name', () => {
    const [row] = recommendFields([{ id: 'f3', nameZh: '优惠券编码', nameEn: '', comment: '' }]);
    expect(row.status).toBe('missing');
    expect(row.standard).toBeUndefined();
    expect(row.suggestedNameEn).toMatch(/coupon/i);
  });
});
