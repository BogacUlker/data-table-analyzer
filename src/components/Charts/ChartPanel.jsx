import { useCallback, useState } from 'react';
import useDataStore from '../../store/useDataStore';
import ChartCard from './ChartCard';
import EasyFilters from './EasyFilters';
import SmartChartGenerator from './SmartChartGenerator';

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export default function ChartPanel() {
  const { charts, addChart, updateChart, removeChart, duplicateChart, dataSets, activeDataSetId } = useDataStore();
  const [globalFilters, setGlobalFilters] = useState([]);
  const [filterSettings, setFilterSettings] = useState({});

  const handleFiltersChange = useCallback((filters, settings) => {
    setGlobalFilters(filters);
    setFilterSettings(settings);
  }, []);

  const handleAddChart = useCallback(() => {
    addChart({
      type: 'bar',
      config: {},
      dataSetId: activeDataSetId,
      filters: [...globalFilters],
    });
  }, [addChart, activeDataSetId, globalFilters]);

  const handleGenerateSmartCharts = useCallback((chartConfigs) => {
    chartConfigs.forEach(chartConfig => {
      addChart({
        type: chartConfig.type,
        config: chartConfig.config,
        dataSetId: activeDataSetId,
        filters: chartConfig.filters || [],
      });
    });
  }, [addChart, activeDataSetId]);

  const handleUpdateChart = useCallback((id, updates) => {
    updateChart(id, updates);
  }, [updateChart]);

  const handleRemoveChart = useCallback((id) => {
    removeChart(id);
  }, [removeChart]);

  const handleDuplicateChart = useCallback((id) => {
    duplicateChart(id);
  }, [duplicateChart]);

  // Filter charts for active dataset
  const activeCharts = charts.filter(
    (chart) => !chart.dataSetId || chart.dataSetId === activeDataSetId
  );

  if (dataSets.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-slate-300 dark:text-slate-600 flex justify-center mb-4">
          <ChartIcon />
        </div>
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
          No data to visualize
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload a dataset to start creating charts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Easy Filters for Coffee Data */}
      <EasyFilters
        onFiltersChange={handleFiltersChange}
        initialFilters={filterSettings}
      />

      {/* Smart Chart Generator */}
      <SmartChartGenerator
        filters={globalFilters}
        onGenerateCharts={handleGenerateSmartCharts}
      />

      {/* Add Chart Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Visualizations
          {globalFilters.length > 0 && (
            <span className="ml-2 text-sm font-normal text-amber-600 dark:text-amber-400">
              ({globalFilters.length} filters will be applied to new charts)
            </span>
          )}
        </h2>
        <button
          onClick={handleAddChart}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon />
          Add Chart
        </button>
      </div>

      {/* Charts Grid */}
      {activeCharts.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeCharts.map((chart) => (
            <ChartCard
              key={chart.id}
              chart={chart}
              onUpdate={(updates) => handleUpdateChart(chart.id, updates)}
              onRemove={() => handleRemoveChart(chart.id)}
              onDuplicate={() => handleDuplicateChart(chart.id)}
            />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="text-slate-300 dark:text-slate-600 flex justify-center mb-4">
            <ChartIcon />
          </div>
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
            No charts yet
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Create your first visualization to explore the data.
          </p>
          <button
            onClick={handleAddChart}
            className="btn-primary inline-flex items-center gap-2"
          >
            <PlusIcon />
            Create Chart
          </button>
        </div>
      )}
    </div>
  );
}
