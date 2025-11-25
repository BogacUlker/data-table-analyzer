import useDataStore from '../../store/useDataStore';

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

export default function DatasetSelector() {
  const { dataSets, activeDataSetId, setActiveDataSet, removeDataSet } = useDataStore();

  const handleExportCSV = () => {
    const activeDataSet = dataSets.find((ds) => ds.id === activeDataSetId);
    if (!activeDataSet) return;

    const { data, columns, name } = activeDataSet;

    // Create CSV content
    const csvRows = [];

    // Header row
    csvRows.push(columns.map((col) => `"${col.replace(/"/g, '""')}"`).join(','));

    // Data rows
    data.forEach((row) => {
      const values = columns.map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${name.replace(/\.[^/.]+$/, '')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (dataSets.length === 0) {
    return null;
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Loaded Datasets
        </h3>
        {activeDataSetId && (
          <button
            onClick={handleExportCSV}
            className="btn-ghost text-xs flex items-center gap-1.5 py-1 px-2"
            title="Export filtered data as CSV"
          >
            <DownloadIcon />
            Export CSV
          </button>
        )}
      </div>

      <div className="space-y-2">
        {dataSets.map((dataset) => (
          <div
            key={dataset.id}
            onClick={() => setActiveDataSet(dataset.id)}
            className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
              dataset.id === activeDataSetId
                ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                : 'bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              dataset.source === 'cso'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            }`}>
              {dataset.source === 'cso' ? <GlobeIcon /> : <FileIcon />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                {dataset.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dataset.rowCount?.toLocaleString() || dataset.data?.length?.toLocaleString()} rows
                × {dataset.columns?.length} cols
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                removeDataSet(dataset.id);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Remove dataset"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
