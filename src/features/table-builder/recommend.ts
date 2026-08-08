import type {
  FieldInput,
  FieldRecommendResult,
  PublishedStandard,
  TableInput,
  TableRecommendResult,
} from '../../types/tableBuilder';
import { PUBLISHED_STANDARDS } from './mockStandards';

export { PUBLISHED_STANDARDS } from './mockStandards';

const TABLE_SUFFIX_MAP: Record<string, string> = {
  维度表: 'dim',
  明细表: 'dwd',
  汇总表: 'dws',
  事实表: 'fact',
};

const TABLE_ENTITY_MAP: Record<string, string> = {
  客户: 'customer',
  订单: 'order',
  商品: 'product',
  用户: 'user',
};

const MISSING_NAME_MAP: Record<string, string> = {
  优惠券: 'coupon',
  编码: 'code',
  编号: 'code',
  名称: 'name',
  类型: 'type',
  状态: 'status',
  金额: 'amount',
  时间: 'time',
  日期: 'date',
};

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

function matchStandard(field: FieldInput): { standard: PublishedStandard; confidence: 'high' | 'medium' } | null {
  const haystack = normalizeText(`${field.nameZh} ${field.nameEn} ${field.comment}`);

  for (const standard of PUBLISHED_STANDARDS) {
    for (const keyword of standard.keywords) {
      const needle = normalizeText(keyword);
      if (haystack === needle || haystack.includes(needle) || normalizeText(field.nameZh) === needle) {
        return { standard, confidence: 'high' };
      }
    }
  }

  return null;
}

function suggestEnglishName(nameZh: string): string {
  const tokens: string[] = [];

  for (const [zh, en] of Object.entries(MISSING_NAME_MAP)) {
    if (nameZh.includes(zh)) {
      tokens.push(en);
    }
  }

  if (tokens.length === 0) {
    return 'field_name';
  }

  return tokens.join('_');
}

function inferTableEnglishName(nameZh: string): string {
  let suffix = 'table';
  for (const [zh, en] of Object.entries(TABLE_SUFFIX_MAP)) {
    if (nameZh.includes(zh)) {
      suffix = en;
      break;
    }
  }

  for (const [zh, en] of Object.entries(TABLE_ENTITY_MAP)) {
    if (nameZh.includes(zh)) {
      return `${suffix}_${en}`;
    }
  }

  return 'biz_table';
}

function buildFieldResult(field: FieldInput, match: { standard: PublishedStandard; confidence: 'high' | 'medium' }): FieldRecommendResult {
  const { standard, confidence } = match;
  return {
    id: field.id,
    nameZh: field.nameZh,
    nameEn: field.nameEn || standard.nameEn,
    comment: field.comment,
    status: 'adopted',
    standard,
    confidence,
    dataType: standard.dataType,
    length: standard.length,
    precision: standard.precision,
    nullable: standard.nullable,
    primaryKey: standard.primaryKey,
    codeTable: standard.codeTable,
    classificationPath: standard.classificationPath,
    grade: standard.grade,
    rationale: `命中已发布标准 ${standard.code}（${standard.nameZh}），关键词匹配「${standard.nameZh}」。`,
  };
}

function buildMissingFieldResult(field: FieldInput): FieldRecommendResult {
  const suggestedNameEn = suggestEnglishName(field.nameZh);
  return {
    id: field.id,
    nameZh: field.nameZh,
    nameEn: field.nameEn || suggestedNameEn,
    comment: field.comment,
    status: 'missing',
    confidence: 'low',
    dataType: 'VARCHAR',
    length: 64,
    nullable: true,
    classificationPath: '待分类',
    grade: '待定',
    rationale: `未在已发布标准集中找到与「${field.nameZh}」匹配的标准，建议新建标准或手工选择。`,
    suggestedNameEn,
  };
}

export function recommendTable(input: TableInput): TableRecommendResult {
  const nameZh = input.nameZh.trim() || '未命名表';
  const nameEn = input.nameEn.trim() || inferTableEnglishName(nameZh);

  return {
    nameZh,
    nameEn,
    rationale: input.description
      ? `根据表中文名「${nameZh}」与描述「${input.description}」推断英文表名 ${nameEn}。`
      : `根据表中文名「${nameZh}」推断英文表名 ${nameEn}。`,
  };
}

export function recommendFields(fields: FieldInput[]): FieldRecommendResult[] {
  return fields.map((field) => {
    const match = matchStandard(field);
    if (match) {
      return buildFieldResult(field, match);
    }
    return buildMissingFieldResult(field);
  });
}
