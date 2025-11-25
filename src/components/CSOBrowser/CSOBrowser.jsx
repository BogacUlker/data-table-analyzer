import { useState, useEffect, useCallback } from 'react';
import useDataStore from '../../store/useDataStore';

const GlobeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const LoadingIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Predefined CSO datasets for consumption and imports
const CSO_DATASETS = [
  {
    id: 'TSM01',
    name: 'Goods Exports and Imports',
    description: 'Monthly trade statistics for goods',
    category: 'Trade',
  },
  {
    id: 'TSM06',
    name: 'Imports by Commodity Group',
    description: 'Detailed import data by commodity classification',
    category: 'Imports',
  },
  {
    id: 'TSM09',
    name: 'Imports by Country',
    description: 'Import statistics by country of origin',
    category: 'Imports',
  },
  {
    id: 'TSM14',
    name: 'Imports by Country and SITC',
    description: 'Detailed imports by country and commodity (SITC Rev.4)',
    category: 'Imports',
  },
  {
    id: 'TSM13',
    name: 'Exports by Country and SITC',
    description: 'Detailed exports by country and commodity (SITC Rev.4)',
    category: 'Trade',
  },
  {
    id: 'CPM01',
    name: 'Consumer Price Index',
    description: 'Monthly consumer price index data',
    category: 'Consumption',
  },
  {
    id: 'CPM02',
    name: 'CPI by Commodity Group',
    description: 'Price indices by commodity categories',
    category: 'Consumption',
  },
  {
    id: 'RSM01',
    name: 'Retail Sales Index',
    description: 'Monthly retail sales volume and value indices',
    category: 'Consumption',
  },
  {
    id: 'NDQ01',
    name: 'Household Consumption',
    description: 'Quarterly household final consumption expenditure',
    category: 'Consumption',
  },
  {
    id: 'EHQ10',
    name: 'Average Household Expenditure',
    description: 'Household budget survey data',
    category: 'Consumption',
  },
];

export default function CSOBrowser() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loadingDataset, setLoadingDataset] = useState(null);
  const [loadedDatasets, setLoadedDatasets] = useState(new Set());
  const [customDatasetId, setCustomDatasetId] = useState('');
  const { addDataSet, setError } = useDataStore();

  const categories = ['All', ...new Set(CSO_DATASETS.map((d) => d.category))];

  const filteredDatasets = CSO_DATASETS.filter((dataset) => {
    const matchesSearch = dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dataset.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || dataset.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const parseJSONStat = (jsonstat) => {
    const dataset = jsonstat;
    const dimensions = dataset.dimension;
    const values = dataset.value;

    if (!dimensions || !values) {
      throw new Error('Invalid JSON-stat format');
    }

    const dimIds = dataset.id || Object.keys(dimensions);
    const dimSizes = dataset.size || dimIds.map((id) => {
      const cat = dimensions[id].category;
      if (Array.isArray(cat.index)) {
        return cat.index.length;
      } else if (cat.index) {
        return Object.keys(cat.index).length;
      } else {
        return Object.keys(cat.label).length;
      }
    });

    // Get dimension labels and categories
    const dimInfo = dimIds.map((id, idx) => {
      const dim = dimensions[id];
      const categories = dim.category;
      const indices = categories.index;
      const labels = categories.label || {};

      // Build category list - handle both array and object index formats
      let catList;
      if (Array.isArray(indices)) {
        // JSON-stat 2.0 format: index is an array of category IDs
        catList = indices.map((catId) => ({
          id: catId,
          label: labels[catId] || catId,
        }));
      } else if (indices && typeof indices === 'object') {
        // Old format: index is an object {categoryId: position}
        catList = Object.entries(indices)
          .sort((a, b) => a[1] - b[1])
          .map(([key]) => ({
            id: key,
            label: labels[key] || key,
          }));
      } else {
        // Fallback: use labels directly
        catList = Object.entries(labels).map(([key, label]) => ({
          id: key,
          label,
        }));
      }

      return {
        id,
        label: dim.label || id,
        categories: catList,
        size: dimSizes[idx],
      };
    });

    // Convert flat values array to rows
    const rows = [];
    const totalRows = Object.keys(values).length;

    // Calculate strides for index calculation
    const strides = [];
    let stride = 1;
    for (let i = dimSizes.length - 1; i >= 0; i--) {
      strides.unshift(stride);
      stride *= dimSizes[i];
    }

    // Limit rows for performance (100K max)
    const MAX_ROWS = 100000;
    const valueEntries = Object.entries(values);
    const totalValues = valueEntries.length;
    const limitedEntries = valueEntries.slice(0, MAX_ROWS);

    // Iterate through value indices (limited)
    limitedEntries.forEach(([flatIndex, value]) => {
      const idx = parseInt(flatIndex);
      const row = {};

      // Calculate category index for each dimension
      let remaining = idx;
      dimInfo.forEach((dim, dimIdx) => {
        const catIndex = Math.floor(remaining / strides[dimIdx]);
        remaining = remaining % strides[dimIdx];
        const category = dim.categories[catIndex];
        row[dim.label] = category ? category.label : `Unknown (${catIndex})`;
      });

      row['Value'] = value;
      rows.push(row);
    });

    const columns = [...dimInfo.map((d) => d.label), 'Value'];

    return {
      data: rows,
      columns,
      totalRows: totalValues,
      wasLimited: totalValues > MAX_ROWS
    };
  };

  const fetchCSOData = async (datasetId) => {
    setLoadingDataset(datasetId);

    try {
      // CSO PxStat API endpoint
      const url = `https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/${datasetId}/JSON-stat/2.0/en`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }

      const jsonstat = await response.json();

      // Parse JSON-stat format
      const { data, columns, totalRows, wasLimited } = parseJSONStat(jsonstat);

      if (data.length === 0) {
        throw new Error('No data found in dataset');
      }

      // Detect column types
      const columnTypes = {};
      columns.forEach((col) => {
        if (col === 'Value') {
          columnTypes[col] = 'number';
        } else {
          const sampleValues = data.slice(0, 50).map((row) => row[col]);
          const datePattern = /^\d{4}M\d{2}$|^\d{4}Q\d$|^\d{4}$/;
          const isDate = sampleValues.some((v) => datePattern.test(String(v)));
          columnTypes[col] = isDate ? 'date' : 'string';
        }
      });

      const datasetInfo = CSO_DATASETS.find((d) => d.id === datasetId);

      addDataSet({
        name: `CSO - ${datasetInfo?.name || datasetId}${wasLimited ? ' (Limited)' : ''}`,
        data,
        columns,
        columnTypes,
        source: 'cso',
        sourceId: datasetId,
        rowCount: data.length,
        totalRows: totalRows,
        wasLimited: wasLimited,
        uploadedAt: new Date().toISOString(),
      });

      setLoadedDatasets((prev) => new Set([...prev, datasetId]));

      // Show warning if data was limited
      if (wasLimited) {
        setError(`Dataset ${datasetId} has ${totalRows.toLocaleString()} rows. Showing first 100,000 for performance.`);
      }
    } catch (error) {
      console.error('CSO fetch error:', error);
      setError(`Failed to load CSO dataset: ${error.message}`);
    } finally {
      setLoadingDataset(null);
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full btn-secondary flex items-center justify-center gap-2"
      >
        <GlobeIcon />
        <span>Browse CSO.ie Datasets</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-4 card p-4 animate-fade-in">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search datasets..."
                className="input pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="select sm:w-40"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Dataset List */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredDatasets.map((dataset) => (
              <div
                key={dataset.id}
                className={`p-3 rounded-xl border transition-all duration-200 ${
                  loadedDatasets.has(dataset.id)
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {dataset.name}
                      </h4>
                      <span className="badge bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs">
                        {dataset.id}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {dataset.description}
                    </p>
                    <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                      {dataset.category}
                    </span>
                  </div>
                  <button
                    onClick={() => fetchCSOData(dataset.id)}
                    disabled={loadingDataset === dataset.id}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      loadedDatasets.has(dataset.id)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-primary-500 hover:bg-primary-600 text-white'
                    } disabled:opacity-50`}
                  >
                    {loadingDataset === dataset.id ? (
                      <LoadingIcon />
                    ) : loadedDatasets.has(dataset.id) ? (
                      <span className="flex items-center gap-1">
                        <CheckIcon />
                        Loaded
                      </span>
                    ) : (
                      'Load'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredDatasets.length === 0 && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              No datasets found matching your search.
            </div>
          )}

          {/* Custom Dataset ID Input */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Load Custom Dataset by ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customDatasetId}
                onChange={(e) => setCustomDatasetId(e.target.value.toUpperCase())}
                placeholder="e.g. TSM14, CPM01..."
                className="input flex-1"
              />
              <button
                onClick={() => {
                  if (customDatasetId.trim()) {
                    fetchCSOData(customDatasetId.trim());
                    setCustomDatasetId('');
                  }
                }}
                disabled={!customDatasetId.trim() || loadingDataset}
                className="btn-primary px-4"
              >
                {loadingDataset === customDatasetId.trim() ? (
                  <LoadingIcon />
                ) : (
                  'Load'
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Find dataset IDs at{' '}
              <a
                href="https://data.cso.ie"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600"
              >
                data.cso.ie
              </a>
            </p>
          </div>

          {/* Info */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Data provided by the Central Statistics Office of Ireland (CSO.ie).
              <a
                href="https://data.cso.ie"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600 ml-1"
              >
                Learn more →
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
