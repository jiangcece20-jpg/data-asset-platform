import type {
  FieldInput,
  FieldRecommendResult,
  PublishedStandard,
  RootMatch,
  TableInput,
  TableRecommendResult,
} from '../../types/tableBuilder';
import { PUBLISHED_STANDARDS, WORD_ROOTS } from './mockStandards';
import { generateTableName } from './tableNaming';

export { PUBLISHED_STANDARDS, WORD_ROOTS } from './mockStandards';

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

type StandardMatch = {
  standard: PublishedStandard;
  confidence: 'high' | 'medium';
  matchedKeyword: string;
  matchedSource: 'nameZh' | 'nameEn' | 'comment';
};

const MATCH_SOURCE_LABELS: Record<StandardMatch['matchedSource'], string> = {
  nameZh: '中文名',
  nameEn: '英文名',
  comment: '注释',
};

function fieldContainsKeyword(text: string, needle: string): boolean {
  const normalized = normalizeText(text);
  return normalized === needle || normalized.includes(needle);
}

function matchStandard(field: FieldInput): StandardMatch | null {
  for (const standard of PUBLISHED_STANDARDS) {
    for (const keyword of standard.keywords) {
      const needle = normalizeText(keyword);

      if (fieldContainsKeyword(field.nameZh, needle)) {
        return { standard, confidence: 'high', matchedKeyword: keyword, matchedSource: 'nameZh' };
      }
      if (field.nameEn && fieldContainsKeyword(field.nameEn, needle)) {
        return { standard, confidence: 'high', matchedKeyword: keyword, matchedSource: 'nameEn' };
      }
      if (field.comment && fieldContainsKeyword(field.comment, needle)) {
        return { standard, confidence: 'high', matchedKeyword: keyword, matchedSource: 'comment' };
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

/**
 * 对中文名进行词根分词匹配：在词根库中查找所有出现于文本中的词根，
 * 按首次出现位置排序后拼接缩写生成推荐英文名。
 * 例如「销售金额」→ 命中 [销售→sale, 金额→amt] → 推荐英文名 sale_amt。
 */
export function matchWordRoots(nameZh: string): RootMatch | null {
  const matched: { root: (typeof WORD_ROOTS)[number]; index: number }[] = [];
  for (const root of WORD_ROOTS) {
    const idx = nameZh.indexOf(root.name);
    if (idx !== -1) {
      matched.push({ root, index: idx });
    }
  }
  if (matched.length === 0) return null;
  matched.sort((a, b) => a.index - b.index);
  const roots = matched.map((m) => m.root);
  const suggestedName = roots.map((r) => r.abbreviation).join('_');
  return { roots, suggestedName };
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

function buildFieldResult(field: FieldInput, match: StandardMatch): FieldRecommendResult {
  const { standard, confidence, matchedKeyword, matchedSource } = match;
  const sourceLabel = MATCH_SOURCE_LABELS[matchedSource];
  return {
    id: field.id,
    nameZh: standard.nameZh,
    nameEn: standard.nameEn,
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
    rationale: `命中已发布标准 ${standard.code}（${standard.nameZh}），${sourceLabel}匹配关键词「${matchedKeyword}」。`,
  };
}

/**
 * 未落标字段的技术属性默认值：不再挂载任何标准派生的技术属性（类型/长度/精度/主键/
 * 可空/码表/分类密级），供「缺标」与「忽略」两种状态复用，避免忽略后残留旧标准痕迹。
 */
export const UNSTANDARDIZED_TECH_DEFAULTS: Pick<
  FieldRecommendResult,
  'dataType' | 'length' | 'precision' | 'nullable' | 'primaryKey' | 'codeTable' | 'classificationPath' | 'grade'
> = {
  dataType: 'VARCHAR',
  length: 64,
  precision: undefined,
  nullable: true,
  primaryKey: undefined,
  codeTable: undefined,
  classificationPath: '待分类',
  grade: '待定',
};

function buildMissingFieldResult(field: FieldInput): FieldRecommendResult {
  const rootMatch = matchWordRoots(field.nameZh);
  const suggestedNameEn = rootMatch?.suggestedName ?? suggestEnglishName(field.nameZh);
  const rootRationale = rootMatch
    ? `词根匹配：${rootMatch.roots.map((r) => `${r.name}→${r.abbreviation}`).join('、')}，推荐英文名 ${rootMatch.suggestedName}。未匹配到已发布标准。`
    : `未在已发布标准集中找到与「${field.nameZh}」匹配的标准，建议新建标准或手工选择。`;
  return {
    id: field.id,
    nameZh: field.nameZh,
    nameEn: field.nameEn || suggestedNameEn,
    comment: field.comment,
    status: 'missing',
    confidence: 'low',
    ...UNSTANDARDIZED_TECH_DEFAULTS,
    rationale: rootRationale,
    suggestedNameEn,
    rootMatch: rootMatch ?? undefined,
  };
}

/**
 * 判断已有推荐结果是否仍与当前字段集合一一对应（数量与 id 集合均一致）。
 * 只要字段被新增/删除/替换导致 id 集合变化，即视为推荐结果已过期，需要重新生成。
 */
export function recommendationsMatchFields(
  fields: FieldInput[],
  recommendations: FieldRecommendResult[],
): boolean {
  if (fields.length !== recommendations.length) return false;
  const fieldIds = new Set(fields.map((field) => field.id));
  return recommendations.every((rec) => fieldIds.has(rec.id));
}

export function recommendTable(input: TableInput): TableRecommendResult {
  const nameZh = input.nameZh.trim() || '未命名表';

  if (input.namingConfig) {
    const autoName = generateTableName(input.namingConfig);
    const nameEn = input.nameEn.trim() || autoName;
    return {
      nameZh,
      nameEn,
      rationale: `根据建模分层（${input.namingConfig.layer}）与命名配置自动生成英文表名 ${nameEn}。`,
    };
  }

  const nameEn = input.nameEn.trim() || inferTableEnglishName(nameZh);
  return {
    nameZh,
    nameEn,
    rationale: input.description
      ? `根据表中文名「${nameZh}」与描述「${input.description}」推断英文表名 ${nameEn}。`
      : `根据表中文名「${nameZh}」推断英文表名 ${nameEn}。`,
  };
}

/**
 * 将字段的类型/长度/精度格式化为单一展示字符串，供推荐表格与结果页 DDL 预览复用。
 */
export function formatFieldType(row: Pick<FieldRecommendResult, 'dataType' | 'length' | 'precision'>): string {
  if (!row.length) return row.dataType;
  return row.precision !== undefined
    ? `${row.dataType}(${row.length},${row.precision})`
    : `${row.dataType}(${row.length})`;
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
