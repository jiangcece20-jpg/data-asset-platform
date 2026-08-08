export type EngineType = 'Hive' | 'MaxCompute' | 'MySQL';

type DdlField = {
  nameEn: string;
  dataType: string;
  nullable: boolean;
  comment: string;
};

type BuildDdlInput = {
  engine: EngineType;
  database: string;
  tableNameEn: string;
  tableComment: string;
  fields: DdlField[];
};

function buildHiveLikeDdl(input: BuildDdlInput): string {
  const { database, tableNameEn, tableComment, fields } = input;
  const columnLines = fields.map((f) => {
    const nullClause = f.nullable ? '' : ' NOT NULL';
    return `  ${f.nameEn} ${f.dataType}${nullClause} COMMENT '${f.comment}'`;
  });
  return [
    `CREATE TABLE ${database}.${tableNameEn} (`,
    columnLines.join(',\n'),
    `)`,
    `COMMENT '${tableComment}'`,
  ].join('\n');
}

function buildMySqlDdl(input: BuildDdlInput): string {
  const { database, tableNameEn, tableComment, fields } = input;
  const columnLines = fields.map((f) => {
    const nullClause = f.nullable ? ' NULL' : ' NOT NULL';
    return `  \`${f.nameEn}\` ${f.dataType}${nullClause} COMMENT '${f.comment}'`;
  });
  return [
    `CREATE TABLE \`${database}\`.\`${tableNameEn}\` (`,
    columnLines.join(',\n'),
    `) COMMENT='${tableComment}';`,
  ].join('\n');
}

export function buildDdl(input: BuildDdlInput): string {
  if (input.engine === 'MySQL') {
    return buildMySqlDdl(input);
  }
  return buildHiveLikeDdl(input);
}
