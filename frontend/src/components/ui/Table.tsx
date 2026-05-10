import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selectedKey,
  emptyMessage = "No records found",
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/5">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "pb-5 text-[10px] font-heading tracking-[0.2em] uppercase text-muted-foreground",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-xs font-heading tracking-widest uppercase text-muted-foreground/40"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const key = keyExtractor(row);
              const isSelected = key === selectedKey;
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "group transition-all duration-300",
                    onRowClick && "cursor-pointer hover:bg-white/5",
                    isSelected && "bg-primary/10"
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("py-5 pr-6 text-sm text-foreground/80 font-light", col.className)}>
                      <div className="group-hover:text-foreground transition-colors">
                        {col.render(row)}
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
