import { useState, useMemo } from 'react';
import useDataStore from '../../store/useDataStore';

const MergeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function MergePanel() {
  const { dataSets, addDataSet } = useDataStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mergeType, setMergeType] = useState('union'); // union, inner, left
  const [dataset1, setDataset1] = useState('');
  const [dataset2, setDataset2] = useState('');
  const [joinColumn, setJoinColumn] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedDataset1 = useMemo(() => {
    return dataSets.find((ds) => ds.id === dataset1);
  }, [dataSets, dataset1]);

  const selectedDataset2 = useMemo(() => {
    return dataSets.find((ds) => ds.id === dataset2);
  }, [dataSets, dataset2]);

  // Find common columns between selected datasets
  const commonColumns = useMemo(() => {
    if (!selectedDataset1 || !selectedDataset2) return [];
    return selectedDataset1.columns.filter((col) =>
      selectedDataset2.columns.includes(col)
    );
  }, [selectedDataset1, selectedDataset2]);

  const handleMerge = async () => {
    if (!selectedDataset1 || !selectedDataset2) return;

    setIsProcessing(true);

    try {
      let mergedData = [];
      let mergedColumns = [];

      if (mergeType === 'union') {
        // Union: Stack datasets vertically (same columns)
        const allColumns = [
          ...new Set([...selectedDataset1.columns, ...selectedDataset2.columns]),
        ];
        mergedColumns = allColumns;

        // Add data from dataset1
        selectedDataset1.data.forEach((row) => {
          const newRow = {};
          allColumns.forEach((col) => {
            newRow[col] = row[col] ?? null;
          });
          mergedData.push(newRow);
        });

        // Add data from dataset2
        selectedDataset2.data.forEach((row) => {
          const newRow = {};
          allColumns.forEach((col) => {
            newRow[col] = row[col] ?? null;
          });
          mergedData.push(newRow);
        });
      } else {
        // Join operations require a common column
        if (!joinColumn) {
          throw new Error('Please select a column to join on');
        }

        // Get all columns (prefixing duplicates)
        const ds1Cols = selectedDataset1.columns.map((col) =>
          col === joinColumn ? col : `${selectedDataset1.name.slice(0, 10)}_${col}`
        );
        const ds2Cols = selectedDataset2.columns
          .filter((col) => col !== joinColumn)
          .map((col) => `${selectedDataset2.name.slice(0, 10)}_${col}`);

        mergedColumns = [...new Set([joinColumn, ...ds1Cols.filter(c => c !== joinColumn), ...ds2Cols])];

        // Create lookup for dataset2
        const ds2Lookup = new Map();
        selectedDataset2.data.forEach((row) => {
          const key = String(row[joinColumn]);
          if (!ds2Lookup.has(key)) {
            ds2Lookup.set(key, []);
          }
          ds2Lookup.get(key).push(row);
        });

        if (mergeType === 'inner') {
          // Inner join: Only matching rows
          selectedDataset1.data.forEach((row1) => {
            const key = String(row1[joinColumn]);
            const matchingRows = ds2Lookup.get(key) || [];

            matchingRows.forEach((row2) => {
              const newRow = { [joinColumn]: row1[joinColumn] };

              // Add dataset1 columns
              selectedDataset1.columns.forEach((col) => {
                if (col !== joinColumn) {
                  newRow[`${selectedDataset1.name.slice(0, 10)}_${col}`] = row1[col];
                }
              });

              // Add dataset2 columns
              selectedDataset2.columns.forEach((col) => {
                if (col !== joinColumn) {
                  newRow[`${selectedDataset2.name.slice(0, 10)}_${col}`] = row2[col];
                }
              });

              mergedData.push(newRow);
            });
          });
        } else if (mergeType === 'left') {
          // Left join: All rows from dataset1, matching from dataset2
          selectedDataset1.data.forEach((row1) => {
            const key = String(row1[joinColumn]);
            const matchingRows = ds2Lookup.get(key) || [null];

            matchingRows.forEach((row2) => {
              const newRow = { [joinColumn]: row1[joinColumn] };

              // Add dataset1 columns
              selectedDataset1.columns.forEach((col) => {
                if (col !== joinColumn) {
                  newRow[`${selectedDataset1.name.slice(0, 10)}_${col}`] = row1[col];
                }
              });

              // Add dataset2 columns
              selectedDataset2.columns.forEach((col) => {
                if (col !== joinColumn) {
                  newRow[`${selectedDataset2.name.slice(0, 10)}_${col}`] = row2?.[col] ?? null;
                }
              });

              mergedData.push(newRow);
            });
          });
        }
      }

      // Detect column types
      const columnTypes = {};
      mergedColumns.forEach((col) => {
        const sampleValues = mergedData.slice(0, 100).map((row) => row[col]).filter((v) => v != null);
        const numericCount = sampleValues.filter((v) => !isNaN(parseFloat(v)) && isFinite(v)).length;

        if (numericCount / sampleValues.length > 0.8) {
          columnTypes[col] = 'number';
        } else {
          columnTypes[col] = 'string';
        }
      });

      // Add merged dataset
      addDataSet({
        name: `Merged_${selectedDataset1.name.slice(0, 15)}_${selectedDataset2.name.slice(0, 15)}`,
        data: mergedData,
        columns: mergedColumns,
        columnTypes,
        source: 'merged',
        rowCount: mergedData.length,
        uploadedAt: new Date().toISOString(),
      });

      // Close panel
      setIsOpen(false);
      setDataset1('');
      setDataset2('');
      setJoinColumn('');
    } catch (error) {
      console.error('Merge error:', error);
      alert(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (dataSets.length < 2) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary flex items-center gap-2"
      >
        <MergeIcon />
        Merge Datasets
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="absolute right-0 top-full mt-2 w-96 card p-4 z-50 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                Merge Datasets
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-4">
              {/* Merge Type */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Merge Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'union', name: 'Union', desc: 'Stack vertically' },
                    { id: 'inner', name: 'Inner', desc: 'Only matching' },
                    { id: 'left', name: 'Left', desc: 'All from first' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setMergeType(type.id)}
                      className={`p-2 rounded-xl text-center transition-all ${
                        mergeType === type.id
                          ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500'
                          : 'bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                      }`}
                    >
                      <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                        {type.name}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {type.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dataset 1 */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  First Dataset
                </label>
                <select
                  value={dataset1}
                  onChange={(e) => {
                    setDataset1(e.target.value);
                    setJoinColumn('');
                  }}
                  className="select"
                >
                  <option value="">Select dataset...</option>
                  {dataSets.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name} ({ds.data.length.toLocaleString()} rows)
                    </option>
                  ))}
                </select>
              </div>

              {/* Dataset 2 */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Second Dataset
                </label>
                <select
                  value={dataset2}
                  onChange={(e) => {
                    setDataset2(e.target.value);
                    setJoinColumn('');
                  }}
                  className="select"
                >
                  <option value="">Select dataset...</option>
                  {dataSets
                    .filter((ds) => ds.id !== dataset1)
                    .map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name} ({ds.data.length.toLocaleString()} rows)
                      </option>
                    ))}
                </select>
              </div>

              {/* Join Column (for inner/left joins) */}
              {mergeType !== 'union' && dataset1 && dataset2 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Join on Column
                  </label>
                  {commonColumns.length > 0 ? (
                    <select
                      value={joinColumn}
                      onChange={(e) => setJoinColumn(e.target.value)}
                      className="select"
                    >
                      <option value="">Select column...</option>
                      {commonColumns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                      No common columns found between datasets. Try Union merge instead.
                    </p>
                  )}
                </div>
              )}

              {/* Preview */}
              {dataset1 && dataset2 && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <strong>Result preview:</strong>
                    {mergeType === 'union' ? (
                      <span className="block mt-1">
                        ≈ {((selectedDataset1?.data.length || 0) + (selectedDataset2?.data.length || 0)).toLocaleString()} rows
                        × {new Set([...(selectedDataset1?.columns || []), ...(selectedDataset2?.columns || [])]).size} columns
                      </span>
                    ) : (
                      <span className="block mt-1">
                        Result size depends on matching values in "{joinColumn || '(select column)'}"
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Merge Button */}
              <button
                onClick={handleMerge}
                disabled={!dataset1 || !dataset2 || (mergeType !== 'union' && !joinColumn) || isProcessing}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Merging...
                  </>
                ) : (
                  <>
                    <MergeIcon />
                    Merge Datasets
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
