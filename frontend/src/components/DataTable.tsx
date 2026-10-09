import React from 'react';
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T | ((row: T) => string);
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  renderExpandedRow?: (row: T) => React.ReactNode;
  expandedRowKeys?: Set<string>;
  onToggleExpandRow?: (key: string) => void;
  flashingRowKeys?: Set<string>;
  emptyMessage?: React.ReactNode;
  isLoading?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  sortColumn,
  sortDirection,
  onSort,
  renderExpandedRow,
  expandedRowKeys = new Set(),
  onToggleExpandRow,
  flashingRowKeys = new Set(),
  emptyMessage = 'No records found',
  isLoading = false,
}: DataTableProps<T>) {
  const getRowKey = (row: T): string => {
    if (typeof keyField === 'function') {
      return keyField(row);
    }
    return String(row[keyField]);
  };

  if (isLoading) {
    return (
      <div className="data-table-container" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: '42px',
                background: 'rgba(148, 163, 184, 0.06)',
                borderRadius: '4px',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="data-table-container"
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            {renderExpandedRow && <th style={{ width: '40px' }} />}
            {columns.map((col) => {
              const isSorted = sortColumn === col.key;
              return (
                <th
                  key={col.key}
                  className={col.sortable ? 'sortable' : ''}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && onSort?.(col.key)}
                  tabIndex={col.sortable ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (col.sortable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSort?.(col.key);
                    }
                  }}
                  aria-sort={
                    isSorted
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span style={{ display: 'inline-flex', flexDirection: 'column', color: isSorted ? 'var(--accent-blue)' : 'var(--text-dim)' }}>
                        {isSorted && sortDirection === 'asc' && <ChevronUp size={14} />}
                        {isSorted && sortDirection === 'desc' && <ChevronDown size={14} />}
                        {!isSorted && <ChevronDown size={14} style={{ opacity: 0.3 }} />}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const key = getRowKey(row);
            const isExpanded = expandedRowKeys.has(key);
            const isFlashing = flashingRowKeys.has(key);

            return (
              <React.Fragment key={key}>
                <tr className={isFlashing ? 'row-flashing' : ''}>
                  {renderExpandedRow && (
                    <td style={{ width: '40px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onToggleExpandRow?.(key)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px',
                        }}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                      >
                        {isExpanded ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </button>
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(row, index)
                        : (row as any)[col.key] !== undefined
                        ? String((row as any)[col.key])
                        : '--'}
                    </td>
                  ))}
                </tr>
                {renderExpandedRow && isExpanded && (
                  <tr style={{ background: 'rgba(6, 9, 17, 0.6)' }}>
                    <td colSpan={columns.length + 1} style={{ padding: '16px 20px' }}>
                      {renderExpandedRow(row)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
