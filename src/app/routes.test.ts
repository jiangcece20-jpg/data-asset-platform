import { describe, expect, it } from 'vitest';
import { getProductLineFromHash, getRouteFromHash, productLines } from './routes';

describe('table-builder product routes', () => {
  it('resolves product lines from hash', () => {
    expect(getProductLineFromHash('#table-builder')).toBe('table-builder');
    expect(getProductLineFromHash('#data-standard')).toBe('data-standard');
    expect(getProductLineFromHash('#data-standard/draft')).toBe('data-standard');
  });

  it('resolves routes from hash', () => {
    expect(getRouteFromHash('#table-builder')).toBe('table-builder');
    expect(getRouteFromHash('#data-standard')).toBe('data-standard');
    expect(getRouteFromHash('#data-standard/draft')).toBe('data-standard-draft');
  });

  it('registers both product lines as 建设中', () => {
    expect(productLines.find((p) => p.key === 'table-builder')?.status).toBe('建设中');
    expect(productLines.find((p) => p.key === 'data-standard')?.status).toBe('建设中');
  });
});
