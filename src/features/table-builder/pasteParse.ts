export type ParsedFieldRow = { nameZh: string; nameEn: string; comment: string };

const EXAMPLE_HINT = '客户编号,customer_code,客户唯一编号';

export function parsePastedFields(
  text: string,
): { ok: true; rows: ParsedFieldRow[] } | { ok: false; message: string } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return {
      ok: false,
      message: `未识别到有效字段行，请按「中文名,英文名,注释」格式粘贴，例如：${EXAMPLE_HINT}`,
    };
  }

  const rows: ParsedFieldRow[] = lines.map((line) => {
    const sep = line.includes('\t') ? '\t' : ',';
    const cols = line.split(sep).map((c) => c.trim());
    return {
      nameZh: cols[0] ?? '',
      nameEn: cols[1] ?? '',
      comment: cols[2] ?? '',
    };
  });

  const validRows = rows.filter((r) => r.nameZh || r.nameEn || r.comment);
  if (validRows.length === 0) {
    return {
      ok: false,
      message: `未识别到有效字段行，请按「中文名,英文名,注释」格式粘贴，例如：${EXAMPLE_HINT}`,
    };
  }

  return { ok: true, rows: validRows };
}
