import { describe, expect, it } from 'vitest';
import { buildDdl } from './ddlTemplates';

describe('buildDdl', () => {
  it('switches dialect by engine', () => {
    const fields = [{ nameEn: 'customer_code', dataType: 'STRING', nullable: false, comment: '客户编号' }];
    const hive = buildDdl({ engine: 'Hive', database: 'dwd', tableNameEn: 'dim_customer', tableComment: '客户', fields });
    const mysql = buildDdl({ engine: 'MySQL', database: 'dwd', tableNameEn: 'dim_customer', tableComment: '客户', fields });
    expect(hive).toMatch(/CREATE TABLE/i);
    expect(hive).toContain('dwd.dim_customer');
    expect(mysql).toMatch(/`dim_customer`/);
    expect(mysql).not.toEqual(hive);
  });
});
