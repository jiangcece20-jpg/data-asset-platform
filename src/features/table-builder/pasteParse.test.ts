import { describe, expect, it } from 'vitest';
import { parsePastedFields } from './pasteParse';

describe('parsePastedFields', () => {
  it('parses tab or comma separated rows', () => {
    const text = '客户编号\t\t客户唯一编号\n客户性别,sex,性别';
    const result = parsePastedFields(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].nameZh).toBe('客户编号');
      expect(result.rows[1].nameEn).toBe('sex');
    }
  });

  it('rejects empty paste with example hint', () => {
    const result = parsePastedFields('   ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('中文名');
  });
});
