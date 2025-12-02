import { useState, useMemo } from 'react';
import useDataStore from '../../store/useDataStore';
import { TradeForecaster, calculateGrowthRate } from '../../ml/timeSeriesForecasting';
import ReactECharts from 'echarts-for-react';

export default function TradeForecasterPanel() {
  const { dataSets, activeDataSetId } = useDataStore();
  const activeDataSet = dataSets.find(ds => ds.id === activeDataSetId);
  const data = activeDataSet?.data || [];

  const [forecaster, setForecaster] = useState(null);
  const [trainResults, setTrainResults] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [forecastSteps, setForecastSteps] = useState(6);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const darkMode = document.documentElement.classList.contains('dark');

  // Check if current dataset has time series columns
  const hasTimeSeriesColumns = useMemo(() => {
    if (data.length === 0) return false;
    const columns = Object.keys(data[0]).map(c => c.toLowerCase());
    const hasMonth = columns.some(c => c.includes('month') || c.includes('date') || c.includes('period'));
    const hasValue = columns.some(c => c.includes('value') || c.includes('amount'));
    return hasMonth && hasValue;
  }, [data]);

  const handleTrain = async () => {
    setIsTraining(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const newForecaster = new TradeForecaster();
      const results = newForecaster.train(data);

      setForecaster(newForecaster);
      setTrainResults(results);

      // Set default selected type
      const types = newForecaster.getStatisticTypes();
      if (types.length > 0) {
        setSelectedType(types[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTraining(false);
    }
  };

  // Get forecast data for selected type
  const forecastData = useMemo(() => {
    if (!forecaster || !selectedType) return null;
    try {
      return forecaster.forecast(selectedType, forecastSteps);
    } catch (e) {
      return null;
    }
  }, [forecaster, selectedType, forecastSteps]);

  // Main forecast chart
  const forecastChartOptions = useMemo(() => {
    if (!forecastData) return null;

    const { historical, forecasts } = forecastData;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params) => {
          const point = params[0];
          if (!point) return '';

          const dataIndex = point.dataIndex;
          const isHistorical = dataIndex < historical.length;

          if (isHistorical) {
            const data = historical[dataIndex];
            return `
              <div style="font-weight:bold">${data.month}</div>
              <div>Value: ${data.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            `;
          } else {
            const forecastIndex = dataIndex - historical.length;
            const data = forecasts[forecastIndex];
            return `
              <div style="font-weight:bold">${data.month} (Forecast)</div>
              <div>Predicted: ${data.prediction.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              <div>Range: ${data.lower.toLocaleString(undefined, { maximumFractionDigits: 0 })} - ${data.upper.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            `;
          }
        }
      },
      legend: {
        data: ['Historical', 'Forecast', 'Confidence Interval'],
        textStyle: { color: darkMode ? '#e5e7eb' : '#374151' },
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: [
          ...historical.map(h => h.month),
          ...forecasts.map(f => f.month)
        ],
        axisLabel: {
          rotate: 45,
          color: darkMode ? '#9ca3af' : '#6b7280',
          fontSize: 10
        },
        axisLine: { lineStyle: { color: darkMode ? '#4b5563' : '#d1d5db' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (val) => val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val.toFixed(0),
          color: darkMode ? '#9ca3af' : '#6b7280'
        },
        splitLine: { lineStyle: { color: darkMode ? '#374151' : '#e5e7eb' } }
      },
      series: [
        // Confidence interval (area)
        {
          name: 'Confidence Interval',
          type: 'line',
          data: [
            ...historical.map(() => null),
            ...forecasts.map(f => [f.lower, f.upper])
          ],
          lineStyle: { opacity: 0 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.1)' }
              ]
            }
          },
          stack: 'confidence',
          symbol: 'none'
        },
        // Historical line
        {
          name: 'Historical',
          type: 'line',
          data: [
            ...historical.map(h => h.value),
            ...forecasts.map(() => null)
          ],
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 2 },
          symbol: 'circle',
          symbolSize: 6,
          smooth: true
        },
        // Forecast line
        {
          name: 'Forecast',
          type: 'line',
          data: [
            ...historical.map((_, i) => i === historical.length - 1 ? historical[i].value : null),
            ...forecasts.map(f => f.prediction)
          ],
          itemStyle: { color: '#3b82f6' },
          lineStyle: { width: 2, type: 'dashed' },
          symbol: 'circle',
          symbolSize: 8,
          smooth: true
        }
      ]
    };
  }, [forecastData, darkMode]);

  // Top countries chart
  const topCountriesOptions = useMemo(() => {
    if (!forecaster || !selectedType) return null;

    const countries = forecaster.getTopCountries(selectedType);
    if (!countries || countries.length === 0) return null;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const item = params[0];
          return `
            <div style="font-weight:bold">${item.name}</div>
            <div>Total: ${item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          `;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (val) => val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val.toFixed(0),
          color: darkMode ? '#9ca3af' : '#6b7280'
        },
        splitLine: { lineStyle: { color: darkMode ? '#374151' : '#e5e7eb' } }
      },
      yAxis: {
        type: 'category',
        data: countries.map(c => c.country).reverse(),
        axisLabel: {
          color: darkMode ? '#e5e7eb' : '#374151',
          width: 100,
          overflow: 'truncate'
        },
        axisLine: { lineStyle: { color: darkMode ? '#4b5563' : '#d1d5db' } }
      },
      series: [{
        name: 'Total Value',
        type: 'bar',
        data: countries.map(c => c.value).reverse(),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#8b5cf6' },
              { offset: 1, color: '#3b82f6' }
            ]
          },
          borderRadius: [0, 4, 4, 0]
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params) => params.value >= 1000
            ? `${(params.value / 1000).toFixed(1)}K`
            : params.value.toFixed(0),
          color: darkMode ? '#9ca3af' : '#6b7280',
          fontSize: 10
        }
      }]
    };
  }, [forecaster, selectedType, darkMode]);

  // Calculate growth rate
  const growthRate = useMemo(() => {
    if (!forecastData) return null;
    const values = forecastData.historical.map(h => h.value);
    return calculateGrowthRate(values);
  }, [forecastData]);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📈 Trade Volume Forecaster
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Load a dataset with time series data to train the forecasting model.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            📈 Trade Volume Forecaster
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Predict future trade values using exponential smoothing
          </p>
        </div>

        {!forecaster ? (
          <button
            onClick={handleTrain}
            disabled={isTraining || !hasTimeSeriesColumns}
            className="px-4 py-2 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-lg
                       hover:from-violet-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 font-medium"
          >
            {isTraining ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Training...
              </span>
            ) : (
              'Train Forecaster'
            )}
          </button>
        ) : (
          <button
            onClick={() => {
              setForecaster(null);
              setTrainResults(null);
              setSelectedType(null);
            }}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                       rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Reset Model
          </button>
        )}
      </div>

      {!hasTimeSeriesColumns && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-amber-800 dark:text-amber-200 text-sm">
            ⚠️ Dataset needs Month/Date and Value columns for time series forecasting.
            Try loading the coffee/tea/cocoa trade data.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {trainResults && (
        <div className="space-y-6">
          {/* Type Selector & Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Type
              </label>
              <select
                value={selectedType || ''}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                         rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {forecaster?.getStatisticTypes().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Forecast Months
              </label>
              <select
                value={forecastSteps}
                onChange={(e) => setForecastSteps(parseInt(e.target.value))}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                         rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {[3, 6, 9, 12].map(n => (
                  <option key={n} value={n}>{n} months</option>
                ))}
              </select>
            </div>
          </div>

          {/* Statistics Cards */}
          {selectedType && trainResults[selectedType] && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-800/30
                            rounded-lg p-4 border border-violet-200 dark:border-violet-700">
                <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {(trainResults[selectedType].r2 * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-violet-700 dark:text-violet-300">R² Score</div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30
                            rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {trainResults[selectedType].mape?.toFixed(1) || 'N/A'}%
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">MAPE</div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30
                            rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {trainResults[selectedType].dataPoints}
                </div>
                <div className="text-sm text-emerald-700 dark:text-emerald-300">Data Points</div>
              </div>

              <div className={`bg-gradient-to-br rounded-lg p-4 border ${
                growthRate >= 0
                  ? 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-700'
                  : 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-700'
              }`}>
                <div className={`text-2xl font-bold ${
                  growthRate >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {growthRate >= 0 ? '+' : ''}{growthRate?.toFixed(1)}%
                </div>
                <div className={`text-sm ${
                  growthRate >= 0
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>Overall Growth</div>
              </div>
            </div>
          )}

          {/* Forecast Chart */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {selectedType} Forecast
            </h3>
            {forecastChartOptions ? (
              <ReactECharts option={forecastChartOptions} style={{ height: 350 }} />
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No data available for chart</p>
            )}
          </div>

          {/* Top Countries */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top 10 Countries/Territories
            </h3>
            {topCountriesOptions ? (
              <ReactECharts option={topCountriesOptions} style={{ height: 300 }} />
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No country data available</p>
            )}
          </div>

          {/* Forecast Table */}
          {forecastData && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Forecast Values
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400">Month</th>
                      <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Predicted</th>
                      <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Lower Bound</th>
                      <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Upper Bound</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastData.forecasts.map((f, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 px-3 text-gray-900 dark:text-white font-medium">{f.month}</td>
                        <td className="text-right py-2 px-3 text-blue-600 dark:text-blue-400 font-semibold">
                          {f.prediction.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right py-2 px-3 text-gray-500 dark:text-gray-400">
                          {f.lower.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right py-2 px-3 text-gray-500 dark:text-gray-400">
                          {f.upper.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Advanced Details Toggle */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showAdvanced ? '▼ Hide' : '▶ Show'} Model Details
            </button>

            {showAdvanced && selectedType && trainResults[selectedType] && (
              <div className="mt-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Alpha (Level):</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {trainResults[selectedType].alpha}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Beta (Trend):</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {trainResults[selectedType].beta}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">RMSE:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {trainResults[selectedType].rmse?.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Date Range:</span>
                    <span className="ml-2 text-gray-900 dark:text-white text-xs">
                      {trainResults[selectedType].dateRange?.start} → {trainResults[selectedType].dateRange?.end}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-4">
            <h4 className="font-medium text-violet-800 dark:text-violet-200 mb-2">
              📊 About This Model
            </h4>
            <ul className="text-sm text-violet-700 dark:text-violet-300 space-y-1">
              <li>• Uses <strong>Holt's Exponential Smoothing</strong> (double exponential smoothing)</li>
              <li>• Captures both level and trend in time series data</li>
              <li>• R² indicates how well the model fits historical data</li>
              <li>• MAPE shows average percentage error (lower is better)</li>
              <li>• 95% confidence intervals show prediction uncertainty</li>
              <li>• Best for: Trade forecasting, demand planning, budget projections</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
