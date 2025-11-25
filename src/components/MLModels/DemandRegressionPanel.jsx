import { useState, useMemo } from 'react';
import useDataStore from '../../store/useDataStore';
import { DemandForecaster, formatFeaturesForDisplay } from '../../ml/linearRegression';
import ReactECharts from 'echarts-for-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = ['Morning', 'Afternoon', 'Evening'];
const SEASONS = ['Winter', 'Spring', 'Summer', 'Autumn'];

export default function DemandRegressionPanel() {
  const { dataSets, activeDataSetId } = useDataStore();
  const activeDataSet = dataSets.find(ds => ds.id === activeDataSetId);
  const data = activeDataSet?.data || [];

  const [forecaster, setForecaster] = useState(null);
  const [stats, setStats] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [predictionMode, setPredictionMode] = useState('total'); // 'total' or 'item'
  const [selectedItem, setSelectedItem] = useState('');

  const [formData, setFormData] = useState({
    Day: 'Monday',
    TimeSlot: 'Morning',
    Season: 'Summer',
    Rain: 0,
    MinTemp: 10,
    MaxTemp: 20
  });

  const darkMode = document.documentElement.classList.contains('dark');

  // Check if current dataset has required columns
  const hasRequiredColumns = useMemo(() => {
    if (data.length === 0) return false;
    const columns = Object.keys(data[0]).map(c => c.toLowerCase());
    const hasDay = columns.some(c => c.includes('day'));
    const hasTime = columns.some(c => c.includes('time'));
    const hasItem = columns.some(c => c.includes('item') || c.includes('product') || c.includes('coffee'));
    return hasDay && hasTime && hasItem;
  }, [data]);

  const handleTrain = async () => {
    setIsTraining(true);
    setError(null);

    try {
      // Small delay for UI feedback
      await new Promise(resolve => setTimeout(resolve, 100));

      const newForecaster = new DemandForecaster();
      const trainStats = newForecaster.train(data);

      setForecaster(newForecaster);
      setStats(newForecaster.getStats());

      // Set default selected item
      if (newForecaster.items.length > 0) {
        setSelectedItem(newForecaster.items[0]);
      }

      setPrediction(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTraining(false);
    }
  };

  const handlePredict = () => {
    if (!forecaster) return;

    try {
      if (predictionMode === 'total') {
        const totalPredicted = forecaster.predictTotal(formData);
        const allItems = forecaster.predictAllItems(formData);
        setPrediction({
          mode: 'total',
          total: totalPredicted,
          breakdown: allItems.slice(0, 5)
        });
      } else {
        const itemPredicted = forecaster.predictItem(formData, selectedItem);
        setPrediction({
          mode: 'item',
          item: selectedItem,
          predicted: itemPredicted
        });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Feature importance chart
  const featureImportanceOptions = useMemo(() => {
    if (!stats?.totalModel?.featureImportance) return null;

    const importance = stats.totalModel.featureImportance;
    const icons = {
      'Rain': '🌧️',
      'MinTemp': '❄️',
      'MaxTemp': '🌡️',
      'Day': '📅',
      'TimeSlot': '🕐',
      'Season': '🍂'
    };

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const item = params[0];
          const data = importance.find(d => d.feature === item.name);
          return `
            <div style="font-weight:bold">${icons[item.name] || ''} ${item.name}</div>
            <div>Importance: ${(item.value * 100).toFixed(1)}%</div>
            <div>Coefficient: ${data?.coefficient?.toFixed(3) || 'N/A'}</div>
          `;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
        type: 'value',
        max: 1,
        axisLabel: {
          formatter: (val) => `${(val * 100).toFixed(0)}%`,
          color: darkMode ? '#9ca3af' : '#6b7280'
        },
        splitLine: { lineStyle: { color: darkMode ? '#374151' : '#e5e7eb' } }
      },
      yAxis: {
        type: 'category',
        data: importance.map(d => d.feature).reverse(),
        axisLabel: {
          formatter: (val) => `${icons[val] || ''} ${val}`,
          color: darkMode ? '#e5e7eb' : '#374151'
        },
        axisLine: { lineStyle: { color: darkMode ? '#4b5563' : '#d1d5db' } }
      },
      series: [{
        name: 'Importance',
        type: 'bar',
        data: importance.map(d => d.importance).reverse(),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#8b5cf6' }
            ]
          },
          borderRadius: [0, 4, 4, 0]
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params) => `${(params.value * 100).toFixed(1)}%`,
          color: darkMode ? '#9ca3af' : '#6b7280'
        }
      }]
    };
  }, [stats, darkMode]);

  // Prediction breakdown chart
  const breakdownOptions = useMemo(() => {
    if (!prediction?.breakdown) return null;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: darkMode ? '#9ca3af' : '#6b7280' },
        splitLine: { lineStyle: { color: darkMode ? '#374151' : '#e5e7eb' } }
      },
      yAxis: {
        type: 'category',
        data: prediction.breakdown.map(d => d.item).reverse(),
        axisLabel: { color: darkMode ? '#e5e7eb' : '#374151' },
        axisLine: { lineStyle: { color: darkMode ? '#4b5563' : '#d1d5db' } }
      },
      series: [{
        name: 'Predicted Sales',
        type: 'bar',
        data: prediction.breakdown.map(d => d.predicted).reverse(),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#10b981' },
              { offset: 1, color: '#3b82f6' }
            ]
          },
          borderRadius: [0, 4, 4, 0]
        },
        label: {
          show: true,
          position: 'right',
          color: darkMode ? '#9ca3af' : '#6b7280'
        }
      }]
    };
  }, [prediction, darkMode]);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📈 Demand Regression Model
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Load a dataset to train the demand forecasting model.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            📈 Demand Regression Model
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Predict daily item demand using weather and time features
          </p>
        </div>

        {!forecaster ? (
          <button
            onClick={handleTrain}
            disabled={isTraining || !hasRequiredColumns}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg
                       hover:from-emerald-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
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
              'Train Model'
            )}
          </button>
        ) : (
          <button
            onClick={() => {
              setForecaster(null);
              setStats(null);
              setPrediction(null);
            }}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                       rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Reset Model
          </button>
        )}
      </div>

      {!hasRequiredColumns && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-amber-800 dark:text-amber-200 text-sm">
            ⚠️ Dataset needs columns for Day, Time, and Item/Product to train the model.
            Try loading the "Project Data.xlsx" dataset.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {stats && (
        <div className="space-y-6">
          {/* Model Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30
                          rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {(stats.totalModel.r2 * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">R² Score</div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30
                          rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.totalModel.rmse.toFixed(2)}
              </div>
              <div className="text-sm text-emerald-700 dark:text-emerald-300">RMSE</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30
                          rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.totalModel.samples}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">Training Samples</div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30
                          rounded-lg p-4 border border-amber-200 dark:border-amber-700">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.items.length}
              </div>
              <div className="text-sm text-amber-700 dark:text-amber-300">Items Tracked</div>
            </div>
          </div>

          {/* Feature Importance */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Feature Importance
            </h3>
            {featureImportanceOptions && (
              <ReactECharts option={featureImportanceOptions} style={{ height: 250 }} />
            )}
          </div>

          {/* Prediction Form */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Demand Prediction
            </h3>

            {/* Prediction Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPredictionMode('total')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  predictionMode === 'total'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Total Sales
              </button>
              <button
                onClick={() => setPredictionMode('item')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  predictionMode === 'item'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Item-Specific
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  📅 Day
                </label>
                <select
                  value={formData.Day}
                  onChange={(e) => setFormData({ ...formData, Day: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {DAYS.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              {/* Time Slot */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🕐 Time
                </label>
                <select
                  value={formData.TimeSlot}
                  onChange={(e) => setFormData({ ...formData, TimeSlot: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {TIME_SLOTS.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              {/* Season */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🍂 Season
                </label>
                <select
                  value={formData.Season}
                  onChange={(e) => setFormData({ ...formData, Season: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {SEASONS.map(season => (
                    <option key={season} value={season}>{season}</option>
                  ))}
                </select>
              </div>

              {/* Rain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🌧️ Rain (mm)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.Rain}
                  onChange={(e) => setFormData({ ...formData, Rain: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Min Temp */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ❄️ Min Temp (°C)
                </label>
                <input
                  type="number"
                  min="-20"
                  max="40"
                  value={formData.MinTemp}
                  onChange={(e) => setFormData({ ...formData, MinTemp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Max Temp */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🌡️ Max Temp (°C)
                </label>
                <input
                  type="number"
                  min="-20"
                  max="50"
                  value={formData.MaxTemp}
                  onChange={(e) => setFormData({ ...formData, MaxTemp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Item Selection (for item-specific mode) */}
              {predictionMode === 'item' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ☕ Item
                  </label>
                  <select
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                             rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {stats.items.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={handlePredict}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white
                       rounded-lg hover:from-emerald-600 hover:to-blue-600 transition-all font-medium"
            >
              Predict Demand
            </button>
          </div>

          {/* Prediction Result */}
          {prediction && (
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/30 dark:to-blue-900/30
                          rounded-lg p-6 border border-emerald-200 dark:border-emerald-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Prediction Results
              </h3>

              {prediction.mode === 'total' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                      {prediction.total}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      <div className="font-medium">Predicted Total Sales</div>
                      <div className="text-sm">for given conditions</div>
                    </div>
                  </div>

                  {/* Top Items Breakdown */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Top 5 Items Breakdown
                    </h4>
                    {breakdownOptions && (
                      <ReactECharts option={breakdownOptions} style={{ height: 200 }} />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {prediction.predicted}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    <div className="font-medium">Predicted Sales for {prediction.item}</div>
                    <div className="text-sm">for given conditions</div>
                  </div>
                </div>
              )}

              {/* Conditions Summary */}
              <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Conditions:</span>{' '}
                  {formData.Day}, {formData.TimeSlot}, {formData.Season} |{' '}
                  Rain: {formData.Rain}mm, Temp: {formData.MinTemp}°C - {formData.MaxTemp}°C
                </div>
              </div>
            </div>
          )}

          {/* Model Details Toggle */}
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showDetails ? '▼ Hide' : '▶ Show'} Item Model Details
            </button>

            {showDetails && stats.itemModels && (
              <div className="mt-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 text-gray-600 dark:text-gray-400">Item</th>
                      <th className="text-right py-2 text-gray-600 dark:text-gray-400">R²</th>
                      <th className="text-right py-2 text-gray-600 dark:text-gray-400">RMSE</th>
                      <th className="text-right py-2 text-gray-600 dark:text-gray-400">Samples</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.itemModels.map(({ item, stats: itemStats }) => (
                      <tr key={item} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 text-gray-900 dark:text-white">{item}</td>
                        <td className="text-right py-2 text-gray-600 dark:text-gray-400">
                          {(itemStats.r2 * 100).toFixed(1)}%
                        </td>
                        <td className="text-right py-2 text-gray-600 dark:text-gray-400">
                          {itemStats.rmse.toFixed(2)}
                        </td>
                        <td className="text-right py-2 text-gray-600 dark:text-gray-400">
                          {itemStats.samples}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              📊 About This Model
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Uses <strong>Multiple Linear Regression</strong> with Ridge regularization</li>
              <li>• Features are normalized using Z-score standardization</li>
              <li>• R² indicates how well the model explains variance (higher is better)</li>
              <li>• RMSE shows average prediction error (lower is better)</li>
              <li>• Good for: Forecasting demand, staffing planning, inventory management</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
