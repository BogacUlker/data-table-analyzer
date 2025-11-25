import { useState, useMemo, useCallback, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import useDataStore from '../../store/useDataStore';

const CHART_TYPES = [
  { id: 'bar', name: 'Bar Chart', icon: '📊' },
  { id: 'line', name: 'Line Chart', icon: '📈' },
  { id: 'pie', name: 'Pie Chart', icon: '🥧' },
  { id: 'scatter', name: 'Scatter Plot', icon: '🔵' },
  { id: 'area', name: 'Area Chart', icon: '📉' },
  { id: 'heatmap', name: 'Heatmap', icon: '🗺️' },
];

const AGGREGATION_TYPES = [
  { id: 'none', name: 'None' },
  { id: 'sum', name: 'Sum' },
  { id: 'avg', name: 'Average' },
  { id: 'count', name: 'Count' },
  { id: 'min', name: 'Min' },
  { id: 'max', name: 'Max' },
];

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function ChartCard({ chart, onUpdate, onRemove, onDuplicate }) {
  const { dataSets, activeDataSetId, darkMode } = useDataStore();
  const [showSettings, setShowSettings] = useState(true);

  const activeDataSet = useMemo(() => {
    return dataSets.find((ds) => ds.id === activeDataSetId);
  }, [dataSets, activeDataSetId]);

  const data = activeDataSet?.data || [];
  const columns = activeDataSet?.columns || [];
  const columnTypes = activeDataSet?.columnTypes || {};

  // Get numeric and categorical columns
  const numericColumns = useMemo(() => {
    return columns.filter((col) => columnTypes[col] === 'number');
  }, [columns, columnTypes]);

  const categoricalColumns = useMemo(() => {
    return columns.filter((col) => columnTypes[col] !== 'number');
  }, [columns, columnTypes]);

  // Get unique values for each column (for filter dropdowns)
  const columnUniqueValues = useMemo(() => {
    const uniqueValues = {};
    columns.forEach((col) => {
      if (columnTypes[col] !== 'number') {
        const values = [...new Set(data.map((row) => row[col]).filter(Boolean))];
        // Limit to 200 unique values for performance
        uniqueValues[col] = values.slice(0, 200).sort();
      }
    });
    return uniqueValues;
  }, [data, columns, columnTypes]);

  // Chart configuration state
  const [config, setConfig] = useState({
    type: chart.type || 'bar',
    xAxis: chart.config?.xAxis || '',
    yAxis: chart.config?.yAxis || '',
    groupBy: chart.config?.groupBy || '',
    aggregation: chart.config?.aggregation || 'sum',
    filters: chart.filters || [],
  });

  // Initialize with sensible defaults
  useEffect(() => {
    if (columns.length > 0 && !config.xAxis) {
      const defaultX = categoricalColumns[0] || columns[0];
      const defaultY = numericColumns[0] || columns[1] || columns[0];

      setConfig((prev) => ({
        ...prev,
        xAxis: defaultX,
        yAxis: defaultY,
      }));
    }
  }, [columns, categoricalColumns, numericColumns]);

  // Update parent when config changes
  useEffect(() => {
    onUpdate({
      type: config.type,
      config: {
        xAxis: config.xAxis,
        yAxis: config.yAxis,
        groupBy: config.groupBy,
        aggregation: config.aggregation,
      },
      filters: config.filters,
    });
  }, [config]);

  // Process data for chart
  const chartData = useMemo(() => {
    if (!data.length || !config.xAxis || !config.yAxis) return null;

    let processedData = [...data];

    // Apply filters - group by type for OR logic within same category
    const filtersByType = {};
    config.filters.forEach((filter) => {
      if (filter.column && filter.operator && filter.value !== '') {
        const type = filter._type || 'default';
        if (!filtersByType[type]) {
          filtersByType[type] = [];
        }
        filtersByType[type].push(filter);
      }
    });

    // Apply filters: OR within same type, AND between different types
    Object.values(filtersByType).forEach((typeFilters) => {
      if (typeFilters.length === 0) return;

      processedData = processedData.filter((row) => {
        // For each filter type, at least one filter must match (OR logic)
        return typeFilters.some((filter) => {
          const value = row[filter.column];
          const filterValue = filter.value;

          switch (filter.operator) {
            case 'equals':
              return String(value) === String(filterValue);
            case 'notEquals':
              return String(value) !== String(filterValue);
            case 'contains':
              return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
            case 'gt':
              return Number(value) > Number(filterValue);
            case 'lt':
              return Number(value) < Number(filterValue);
            case 'gte':
              return Number(value) >= Number(filterValue);
            case 'lte':
              return Number(value) <= Number(filterValue);
            default:
              return true;
          }
        });
      });
    });

    // Aggregate data
    if (config.aggregation !== 'none') {
      const grouped = {};

      processedData.forEach((row) => {
        const key = String(row[config.xAxis] || 'Unknown');
        if (!grouped[key]) {
          grouped[key] = {
            values: [],
            count: 0,
            label: key, // Preserve the original label
          };
        }
        const val = parseFloat(row[config.yAxis]);
        if (!isNaN(val)) {
          grouped[key].values.push(val);
        }
        // Count all rows, not just numeric ones (for 'count' aggregation)
        grouped[key].count++;
      });

      processedData = Object.entries(grouped).map(([key, { values, count, label }]) => {
        let aggregatedValue;
        switch (config.aggregation) {
          case 'sum':
            aggregatedValue = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            aggregatedValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            break;
          case 'count':
            aggregatedValue = count;
            break;
          case 'min':
            aggregatedValue = values.length > 0 ? Math.min(...values) : 0;
            break;
          case 'max':
            aggregatedValue = values.length > 0 ? Math.max(...values) : 0;
            break;
          default:
            aggregatedValue = values[0] || 0;
        }

        return {
          [config.xAxis]: label, // Use preserved label, not key
          [config.yAxis]: aggregatedValue,
        };
      });
    }

    // Limit data for performance
    if (processedData.length > 500) {
      processedData = processedData.slice(0, 500);
    }

    return processedData;
  }, [data, config]);

  // Generate ECharts options
  const chartOptions = useMemo(() => {
    if (!chartData || !chartData.length) {
      return null;
    }

    const xData = chartData.map((d) => d[config.xAxis]);
    const yData = chartData.map((d) => d[config.yAxis]);

    const baseOptions = {
      backgroundColor: 'transparent',
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      tooltip: {
        trigger: config.type === 'pie' ? 'item' : 'axis',
        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
        borderColor: darkMode ? '#334155' : '#e2e8f0',
        textStyle: {
          color: darkMode ? '#f1f5f9' : '#1e293b',
        },
      },
      toolbox: {
        feature: {
          saveAsImage: { title: 'Save' },
          dataZoom: { title: { zoom: 'Zoom', back: 'Reset' } },
          restore: { title: 'Reset' },
        },
        iconStyle: {
          borderColor: darkMode ? '#94a3b8' : '#64748b',
        },
      },
    };

    switch (config.type) {
      case 'bar':
        return {
          ...baseOptions,
          xAxis: {
            type: 'category',
            data: xData,
            axisLabel: {
              rotate: xData.length > 10 ? 45 : 0,
              color: darkMode ? '#94a3b8' : '#64748b',
            },
            axisLine: { lineStyle: { color: darkMode ? '#334155' : '#e2e8f0' } },
          },
          yAxis: {
            type: 'value',
            axisLabel: { color: darkMode ? '#94a3b8' : '#64748b' },
            splitLine: { lineStyle: { color: darkMode ? '#1e293b' : '#f1f5f9' } },
          },
          series: [{
            type: 'bar',
            data: yData,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: '#0ea5e9' },
                  { offset: 1, color: '#8b5cf6' },
                ],
              },
              borderRadius: [4, 4, 0, 0],
            },
          }],
          dataZoom: [
            { type: 'inside', start: 0, end: 100 },
            { type: 'slider', start: 0, end: 100 },
          ],
        };

      case 'line':
        return {
          ...baseOptions,
          xAxis: {
            type: 'category',
            data: xData,
            axisLabel: {
              rotate: xData.length > 10 ? 45 : 0,
              color: darkMode ? '#94a3b8' : '#64748b',
            },
            axisLine: { lineStyle: { color: darkMode ? '#334155' : '#e2e8f0' } },
          },
          yAxis: {
            type: 'value',
            axisLabel: { color: darkMode ? '#94a3b8' : '#64748b' },
            splitLine: { lineStyle: { color: darkMode ? '#1e293b' : '#f1f5f9' } },
          },
          series: [{
            type: 'line',
            data: yData,
            smooth: true,
            lineStyle: { color: '#0ea5e9', width: 3 },
            itemStyle: { color: '#0ea5e9' },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(14, 165, 233, 0.3)' },
                  { offset: 1, color: 'rgba(14, 165, 233, 0)' },
                ],
              },
            },
          }],
          dataZoom: [
            { type: 'inside', start: 0, end: 100 },
            { type: 'slider', start: 0, end: 100 },
          ],
        };

      case 'area':
        return {
          ...baseOptions,
          xAxis: {
            type: 'category',
            data: xData,
            boundaryGap: false,
            axisLabel: {
              rotate: xData.length > 10 ? 45 : 0,
              color: darkMode ? '#94a3b8' : '#64748b',
            },
            axisLine: { lineStyle: { color: darkMode ? '#334155' : '#e2e8f0' } },
          },
          yAxis: {
            type: 'value',
            axisLabel: { color: darkMode ? '#94a3b8' : '#64748b' },
            splitLine: { lineStyle: { color: darkMode ? '#1e293b' : '#f1f5f9' } },
          },
          series: [{
            type: 'line',
            data: yData,
            smooth: true,
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(139, 92, 246, 0.5)' },
                  { offset: 1, color: 'rgba(139, 92, 246, 0)' },
                ],
              },
            },
            lineStyle: { color: '#8b5cf6', width: 2 },
            itemStyle: { color: '#8b5cf6' },
          }],
          dataZoom: [
            { type: 'inside', start: 0, end: 100 },
            { type: 'slider', start: 0, end: 100 },
          ],
        };

      case 'pie':
        // For pie charts, sort by value and take top items
        const pieData = [...chartData]
          .sort((a, b) => (b[config.yAxis] || 0) - (a[config.yAxis] || 0))
          .slice(0, 20)
          .map((d) => ({
            value: parseFloat(d[config.yAxis]) || 0,
            name: String(d[config.xAxis] || 'Unknown'),
          }))
          .filter((d) => d.value > 0);

        return {
          ...baseOptions,
          legend: {
            type: 'scroll',
            orient: 'vertical',
            right: 10,
            top: 20,
            bottom: 20,
            textStyle: {
              color: darkMode ? '#94a3b8' : '#64748b',
            },
          },
          series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['40%', '50%'],
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 8,
              borderColor: darkMode ? '#1e1e2e' : '#ffffff',
              borderWidth: 2,
            },
            label: {
              show: true,
              formatter: '{b}: {c} ({d}%)',
              color: darkMode ? '#f1f5f9' : '#1e293b',
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: 'bold',
              },
            },
            data: pieData,
          }],
        };

      case 'scatter':
        return {
          ...baseOptions,
          xAxis: {
            type: 'value',
            name: config.xAxis,
            axisLabel: { color: darkMode ? '#94a3b8' : '#64748b' },
            axisLine: { lineStyle: { color: darkMode ? '#334155' : '#e2e8f0' } },
            splitLine: { lineStyle: { color: darkMode ? '#1e293b' : '#f1f5f9' } },
          },
          yAxis: {
            type: 'value',
            name: config.yAxis,
            axisLabel: { color: darkMode ? '#94a3b8' : '#64748b' },
            splitLine: { lineStyle: { color: darkMode ? '#1e293b' : '#f1f5f9' } },
          },
          series: [{
            type: 'scatter',
            data: chartData.map((d) => [d[config.xAxis], d[config.yAxis]]),
            symbolSize: 12,
            itemStyle: {
              color: {
                type: 'radial',
                x: 0.5, y: 0.5, r: 0.5,
                colorStops: [
                  { offset: 0, color: '#0ea5e9' },
                  { offset: 1, color: '#8b5cf6' },
                ],
              },
            },
          }],
        };

      case 'heatmap':
        // Create heatmap data structure
        const xCategories = [...new Set(chartData.map((d) => d[config.xAxis]))].slice(0, 20);
        const yCategories = [...new Set(chartData.map((d) => d[config.groupBy] || d[config.yAxis]))].slice(0, 20);

        const heatmapData = [];
        xCategories.forEach((x, xi) => {
          yCategories.forEach((y, yi) => {
            const matchingItems = chartData.filter((d) =>
              d[config.xAxis] === x && (d[config.groupBy] || d[config.yAxis]) === y
            );
            const value = matchingItems.length > 0
              ? matchingItems.reduce((sum, d) => sum + (parseFloat(d[config.yAxis]) || 0), 0) / matchingItems.length
              : 0;
            heatmapData.push([xi, yi, value || 0]);
          });
        });

        return {
          ...baseOptions,
          xAxis: {
            type: 'category',
            data: xCategories,
            axisLabel: {
              rotate: 45,
              color: darkMode ? '#94a3b8' : '#64748b',
            },
          },
          yAxis: {
            type: 'category',
            data: yCategories,
            axisLabel: { color: darkMode ? '#94a3b8' : '#64748b' },
          },
          visualMap: {
            min: 0,
            max: Math.max(...heatmapData.map((d) => d[2])) || 100,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 0,
            inRange: {
              color: ['#f0f9ff', '#0ea5e9', '#1e3a8a'],
            },
            textStyle: { color: darkMode ? '#94a3b8' : '#64748b' },
          },
          series: [{
            type: 'heatmap',
            data: heatmapData,
            label: { show: false },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          }],
        };

      default:
        return baseOptions;
    }
  }, [chartData, config, darkMode]);

  // Add filter
  const addFilter = () => {
    setConfig((prev) => ({
      ...prev,
      filters: [
        ...prev.filters,
        { column: columns[0] || '', operator: 'equals', value: '' },
      ],
    }));
  };

  // Remove filter
  const removeFilter = (index) => {
    setConfig((prev) => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
    }));
  };

  // Update filter
  const updateFilter = (index, field, value) => {
    setConfig((prev) => ({
      ...prev,
      filters: prev.filters.map((f, i) =>
        i === index ? { ...f, [field]: value } : f
      ),
    }));
  };

  if (!activeDataSet) {
    return (
      <div className="card p-8 text-center text-slate-500 dark:text-slate-400">
        Load a dataset to create charts
      </div>
    );
  }

  return (
    <div className="card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-xl">
            {CHART_TYPES.find((t) => t.id === config.type)?.icon || '📊'}
          </span>
          <select
            value={config.type}
            onChange={(e) => setConfig((prev) => ({ ...prev, type: e.target.value }))}
            className="select text-sm py-1 px-2 bg-transparent border-0 focus:ring-0"
          >
            {CHART_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors ${
              showSettings
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'
            }`}
            title="Toggle settings"
          >
            <SettingsIcon />
          </button>
          <button
            onClick={() => onDuplicate()}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
            title="Duplicate chart"
          >
            <CopyIcon />
          </button>
          <button
            onClick={() => onRemove()}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500 transition-colors"
            title="Remove chart"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
          {/* Axis Selection */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Group by
              </label>
              <select
                value={config.xAxis}
                onChange={(e) => setConfig((prev) => ({ ...prev, xAxis: e.target.value }))}
                className="select text-sm"
              >
                <option value="">Select...</option>
                {columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Measure
              </label>
              <select
                value={config.yAxis}
                onChange={(e) => setConfig((prev) => ({ ...prev, yAxis: e.target.value }))}
                className="select text-sm"
              >
                <option value="">Select...</option>
                {columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Calculate
              </label>
              <select
                value={config.aggregation}
                onChange={(e) => setConfig((prev) => ({ ...prev, aggregation: e.target.value }))}
                className="select text-sm"
              >
                {AGGREGATION_TYPES.map((agg) => (
                  <option key={agg.id} value={agg.id}>{agg.name}</option>
                ))}
              </select>
            </div>
            {config.type === 'heatmap' && (
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                  Group By
                </label>
                <select
                  value={config.groupBy}
                  onChange={(e) => setConfig((prev) => ({ ...prev, groupBy: e.target.value }))}
                  className="select text-sm"
                >
                  <option value="">Select...</option>
                  {columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Filters {config.filters.length > 0 && `(${config.filters.length})`}
              </span>
              <button
                onClick={addFilter}
                className="text-xs text-primary-500 hover:text-primary-600 font-medium"
              >
                + Add Filter
              </button>
            </div>
            {config.filters.map((filter, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <select
                  value={filter.column}
                  onChange={(e) => {
                    updateFilter(index, 'column', e.target.value);
                    updateFilter(index, 'value', ''); // Reset value when column changes
                  }}
                  className="select text-sm w-36"
                >
                  {columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                  className="select text-sm w-24"
                >
                  <option value="equals">=</option>
                  <option value="notEquals">≠</option>
                  <option value="contains">contains</option>
                  <option value="gt">&gt;</option>
                  <option value="lt">&lt;</option>
                  <option value="gte">≥</option>
                  <option value="lte">≤</option>
                </select>
                {/* Show dropdown for categorical columns, input for numeric */}
                {columnUniqueValues[filter.column] ? (
                  <select
                    value={filter.value}
                    onChange={(e) => updateFilter(index, 'value', e.target.value)}
                    className="select text-sm flex-1"
                  >
                    <option value="">Select value...</option>
                    {columnUniqueValues[filter.column].map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => updateFilter(index, 'value', e.target.value)}
                    placeholder="Value..."
                    className="input text-sm flex-1"
                  />
                )}
                <button
                  onClick={() => removeFilter(index)}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                >
                  <CloseIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="p-4">
        {chartOptions ? (
          <ReactECharts
            option={chartOptions}
            style={{ height: '350px', width: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
          />
        ) : (
          <div className="h-[350px] flex items-center justify-center text-slate-400 dark:text-slate-500">
            <div className="text-center">
              <p className="mb-2">Configure the chart settings above</p>
              <p className="text-sm">Select X and Y axis columns to visualize your data</p>
            </div>
          </div>
        )}
      </div>

      {/* Info Footer */}
      {chartData && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {chartData.length.toLocaleString()} data points
            {config.filters.length > 0 && ` (${config.filters.length} filter${config.filters.length > 1 ? 's' : ''} applied)`}
          </p>
        </div>
      )}
    </div>
  );
}
