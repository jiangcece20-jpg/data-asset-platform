/** 标准驱动建表向导 — 领域类型 */

export type FieldRecommendStatus =
  | 'adopted'
  | 'reselected'
  | 'ignored'
  | 'missing'
  | 'draft_started';

export type PublishedStandard = {
  code: string;
  nameZh: string;
  nameEn: string;
  setName: string;
  dataType: string;
  length?: number;
  precision?: number;
  nullable: boolean;
  primaryKey?: boolean;
  codeTable?: string;
  classificationPath: string;
  grade: string;
  keywords: string[];
};

export type TableRecommendResult = {
  nameZh: string;
  nameEn: string;
  rationale: string;
};

export type FieldRecommendResult = {
  id: string;
  nameZh: string;
  nameEn: string;
  comment: string;
  status: FieldRecommendStatus;
  standard?: PublishedStandard;
  confidence: 'high' | 'medium' | 'low';
  dataType: string;
  length?: number;
  precision?: number;
  nullable: boolean;
  primaryKey?: boolean;
  codeTable?: string;
  classificationPath: string;
  grade: string;
  rationale: string;
  suggestedNameEn?: string;
};

export type FieldInput = {
  id: string;
  nameZh: string;
  nameEn: string;
  comment: string;
};

export type TableInput = {
  nameZh: string;
  nameEn: string;
  description: string;
};
