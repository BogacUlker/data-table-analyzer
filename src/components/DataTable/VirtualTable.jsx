import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import useDataStore from '../../store/useDataStore';

const TableIcon = () => (
  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
      d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

export default function VirtualTable() {
  const { dataSets, activeDataSetId } = useDataStore();
  const parentRef = useRef(null);

  const activeDataSet = useMemo(() => {
    return dataSets.find((ds) => ds.id === activeDataSetId);
  }, [dataSets, activeDataSetId]);

  const data = activeDataSet?.data || [];
  const columns = activeDataSet?.columns || [];
  const columnTypes = activeDataSet?.columnTypes || {};

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });

  const formatValue = (value, type) => {
    if (value === null || value === undefined) {
      return <span className="text-slate-400 italic">null</span>;
    }

    if (type === 'number') {
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
      }).format(num);
    }

    return String(value);
  };

  if (dataSets.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-slate-300 dark:text-slate-600 flex justify-center mb-4">
          <TableIcon />
        </div>
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
          No data loaded
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload a CSV/Excel file or load data from CSO.ie to get started.
        </p>
      </div>
    );
  }

  if (!activeDataSet) {
    return (
      <div className="card p-8 text-center text-slate-500 dark:text-slate-400">
        Select a dataset to view its contents.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Table Header Info */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-medium text-slate-900 dark:text-slate-100">
              {activeDataSet.name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {data.length.toLocaleString()} rows × {columns.length} columns
            </p>
          </div>
          {activeDataSet.source === 'cso' && (
            <span className="badge-primary">
              CSO.ie
            </span>
          )}
        </div>
      </div>

      {/* Scrollable Table Container */}
      <div
        ref={parentRef}
        className="overflow-auto max-h-[500px]"
        style={{ contain: 'strict' }}
      >
        <table className="w-full text-sm">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 dark:bg-slate-800">
              <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-slate-700 w-16">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-slate-700 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      columnTypes[col] === 'number'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : columnTypes[col] === 'date'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {columnTypes[col] || 'str'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Virtual Body */}
          <tbody
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = data[virtualRow.index];
              return (
                <tr
                  key={virtualRow.index}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className={`absolute w-full ${
                    virtualRow.index % 2 === 0
                      ? 'bg-white dark:bg-surface-dark'
                      : 'bg-slate-50/50 dark:bg-slate-800/30'
                  } hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors`}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <td className="px-3 py-2 text-slate-400 dark:text-slate-500 text-xs border-b border-slate-100 dark:border-slate-800 w-16">
                    {virtualRow.index + 1}
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-2 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 whitespace-nowrap max-w-xs truncate"
                      title={String(row[col] ?? '')}
                    >
                      {formatValue(row[col], columnTypes[col])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Showing {Math.min(data.length, 100).toLocaleString()} of {data.length.toLocaleString()} rows
            {data.length > 100 && ' (scroll for more)'}
          </span>
          <span>
            {activeDataSet.uploadedAt && (
              <>Loaded: {new Date(activeDataSet.uploadedAt).toLocaleString()}</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
