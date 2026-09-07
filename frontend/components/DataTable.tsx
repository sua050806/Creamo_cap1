export interface DataTableColumn<T> {
  key: keyof T;
  header: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
}

// 관리자 콘솔의 목록 화면(신청 심사, 상품 관리 등)에서 공통으로 쓰는 테이블.
export default function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
}: DataTableProps<T>) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-black/10 text-left">
          {columns.map((col) => (
            <th key={String(col.key)} className="py-2 pr-4 font-medium text-foreground/50">
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-black/5 transition-colors hover:bg-black/[0.02]">
            {columns.map((col) => (
              <td key={String(col.key)} className="py-2.5 pr-4">
                {String(row[col.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
