import './data-display.css';

export type DataTableColumn<Row extends Record<string, unknown>> = {
  key: keyof Row & string;
  title: string;
  render?: (value: Row[keyof Row], row: Row) => React.ReactNode;
};

type DataTableProps<Row extends Record<string, unknown>> = {
  columns: Array<DataTableColumn<Row>>;
  rows: Row[];
  rowKey?: keyof Row & string;
};

export function DataTable<Row extends Record<string, unknown>>({ columns, rows, rowKey = 'id' as keyof Row & string }: DataTableProps<Row>) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row[rowKey] ?? index)}>
              {columns.map((column) => {
                const value = row[column.key];
                return <td key={column.key}>{column.render ? column.render(value, row) : String(value ?? '-')}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
