import { useState, useMemo } from 'react';
import useDataStore from '../../store/useDataStore';
import { PriceSensitivityModel, featureDisplayNames } from '../../ml/priceSensitivity';
import ReactECharts from 'echarts-for-react';

const INCOME_LEVELS = [
  { value: 5000, label: '€5,000 (Low)' },
  { value: 14000, label: '€14,000' },
  { value: 23500, label: '€23,500' },
  { value: 31500, label: '€31,500' },
  { value: 40000, label: '€40,000' },
  { value: 70000, label: '€70,000' },
  { value: 80000, label: '€80,000+ (High)' }
];

const AGE_GROUPS = [
  { value: 21, label: '18-24' },
  { value: 29.5, label: '25-34' },
  { value: 39.5, label: '35-44' },
  { value: 49.5, label: '45-54' },
  { value: 59.5, label: '55-64' },
  { value: 65, label: '65+' }
];

export default function PriceSensitivityPanel() {
  const { dataSets, activeDataSetId } = useDataStore();
  const activeDataSet = dataSets.find(ds => ds.id === activeDataSetId);
  const data = activeDataSet?.data || [];

  const [model, setModel] = useState(null);
  const [stats, setStats] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);

  const [formData, setFormData] = useState({
    age: 29.5,
    gender: 'woman',
    income: 31500,
    cups: 2,
    tempPreference: 'hot',
    chainPreference: 'both',
    productivity: 'yes',
    reusableCup: 'no',
    isStudent: false,
    isFulltime: true,
    energyFocused: true,
    tasteFocused: false
  });

  const darkMode = document.documentElement.classList.contains('dark');

  // Check if current dataset has survey-like columns
  const hasSurveyColumns = useMemo(() => {
    if (data.length === 0) return false;
    const columns = Object.keys(data[0]).map(c => c.toLowerCase());
    const hasPrice = columns.some(c => c.includes('pay') || c.includes('price') || c.includes('prepared'));
    const hasIncome = columns.some(c => c.includes('income'));
    return hasPrice && hasIncome;
  }, [data]);

  const handleTrain = async () => {
    setIsTraining(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const newModel = new PriceSensitivityModel();
      const trainStats = newModel.train(data);

      setModel(newModel);
      setStats(trainStats);
      setPrediction(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTraining(false);
    }
  };

  const handlePredict = () => {
    if (!model) return;

    try {
      const result = model.predict(formData);
      setPrediction(result);
    } catch (err) {
      setError(err.message);
    }
  };

  // Feature importance chart
  const featureImportanceOptions = useMemo(() => {
    if (!stats?.featureImportance) return null;

    const importance = stats.featureImportance.slice(0, 8);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
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
        data: importance.map(d => featureDisplayNames[d.feature] || d.feature).reverse(),
        axisLabel: { color: darkMode ? '#e5e7eb' : '#374151' },
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
              { offset: 0, color: '#f59e0b' },
              { offset: 1, color: '#ef4444' }
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

  // Distribution pie chart
  const distributionOptions = useMemo(() => {
    if (!stats?.distribution) return null;

    const data = [
      { name: 'Budget (€0-3)', value: stats.distribution.budget || 0, itemStyle: { color: '#22c55e' } },
      { name: 'Moderate (€3-4.50)', value: stats.distribution.moderate || 0, itemStyle: { color: '#3b82f6' } },
      { name: 'Premium (€4.50+)', value: stats.distribution.premium || 0, itemStyle: { color: '#a855f7' } }
    ];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { color: darkMode ? '#e5e7eb' : '#374151' }
      },
      series: [{
        name: 'Price Sensitivity',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: darkMode ? '#1f2937' : '#ffffff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            color: darkMode ? '#e5e7eb' : '#374151'
          }
        },
        labelLine: { show: false },
        data
      }]
    };
  }, [stats, darkMode]);

  // Prediction probability gauge
  const predictionGaugeOptions = useMemo(() => {
    if (!prediction?.probabilities) return null;

    const data = [
      { name: 'Budget', value: (prediction.probabilities.budget || 0) * 100 },
      { name: 'Moderate', value: (prediction.probabilities.moderate || 0) * 100 },
      { name: 'Premium', value: (prediction.probabilities.premium || 0) * 100 }
    ];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['Budget\n(€0-3)', 'Moderate\n(€3-4.50)', 'Premium\n(€4.50+)'],
        axisLabel: { color: darkMode ? '#e5e7eb' : '#374151' }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: {
          formatter: '{value}%',
          color: darkMode ? '#9ca3af' : '#6b7280'
        },
        splitLine: { lineStyle: { color: darkMode ? '#374151' : '#e5e7eb' } }
      },
      series: [{
        name: 'Probability',
        type: 'bar',
        data: data.map((d, i) => ({
          value: d.value,
          itemStyle: {
            color: i === 0 ? '#22c55e' : i === 1 ? '#3b82f6' : '#a855f7',
            borderRadius: [4, 4, 0, 0]
          }
        })),
        label: {
          show: true,
          position: 'top',
          formatter: (params) => `${params.value.toFixed(0)}%`,
          color: darkMode ? '#9ca3af' : '#6b7280'
        }
      }]
    };
  }, [prediction, darkMode]);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          💰 Price Sensitivity Predictor
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Load a survey dataset to train the price sensitivity model.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            💰 Price Sensitivity Predictor
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Predict customer willingness to pay based on demographics & preferences
          </p>
        </div>

        {!model ? (
          <button
            onClick={handleTrain}
            disabled={isTraining || !hasSurveyColumns}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-lg
                       hover:from-amber-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed
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
              setModel(null);
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

      {!hasSurveyColumns && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-amber-800 dark:text-amber-200 text-sm">
            ⚠️ Dataset needs Price/Willingness to Pay and Income columns.
            Try loading the "Coffee Personalisation Survey" dataset.
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
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30
                          rounded-lg p-4 border border-amber-200 dark:border-amber-700">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {(stats.accuracy * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-amber-700 dark:text-amber-300">Accuracy</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30
                          rounded-lg p-4 border border-green-200 dark:border-green-700">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                €{stats.avgPrices?.budget?.toFixed(2) || 'N/A'}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">Avg Budget Price</div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30
                          rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                €{stats.avgPrices?.moderate?.toFixed(2) || 'N/A'}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Avg Moderate Price</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30
                          rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                €{stats.avgPrices?.premium?.toFixed(2) || 'N/A'}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">Avg Premium Price</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribution Chart */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Customer Distribution
              </h3>
              {distributionOptions && (
                <ReactECharts option={distributionOptions} style={{ height: 250 }} />
              )}
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
          </div>

          {/* Prediction Form */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Predict Customer Price Sensitivity
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  👤 Age Group
                </label>
                <select
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  {AGE_GROUPS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ⚧ Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="woman">Woman</option>
                  <option value="man">Man</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Income */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  💵 Income Level
                </label>
                <select
                  value={formData.income}
                  onChange={(e) => setFormData({ ...formData, income: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  {INCOME_LEVELS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Cups per day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ☕ Cups/Day
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.cups}
                  onChange={(e) => setFormData({ ...formData, cups: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🌡️ Temp Preference
                </label>
                <select
                  value={formData.tempPreference}
                  onChange={(e) => setFormData({ ...formData, tempPreference: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="hot">Hot</option>
                  <option value="cold">Cold</option>
                  <option value="both">Both</option>
                </select>
              </div>

              {/* Chain Preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🏪 Shop Preference
                </label>
                <select
                  value={formData.chainPreference}
                  onChange={(e) => setFormData({ ...formData, chainPreference: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="large chain">Large Chains</option>
                  <option value="small , local business">Small/Local</option>
                  <option value="both">Both</option>
                </select>
              </div>

              {/* Productivity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  📈 For Productivity?
                </label>
                <select
                  value={formData.productivity}
                  onChange={(e) => setFormData({ ...formData, productivity: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="yes">Yes</option>
                  <option value="maybe">Maybe</option>
                  <option value="no">No</option>
                </select>
              </div>

              {/* Reusable Cup */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ♻️ Reusable Cup?
                </label>
                <select
                  value={formData.reusableCup}
                  onChange={(e) => setFormData({ ...formData, reusableCup: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="no">No</option>
                  <option value="sometimes">Sometimes</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>

            {/* Toggles Row */}
            <div className="flex flex-wrap gap-4 mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isStudent}
                  onChange={(e) => setFormData({ ...formData, isStudent: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">🎓 Student</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFulltime}
                  onChange={(e) => setFormData({ ...formData, isFulltime: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">💼 Full-time</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.energyFocused}
                  onChange={(e) => setFormData({ ...formData, energyFocused: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">⚡ Energy-focused</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.tasteFocused}
                  onChange={(e) => setFormData({ ...formData, tasteFocused: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">👅 Taste-focused</span>
              </label>
            </div>

            <button
              onClick={handlePredict}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-amber-500 to-red-500 text-white
                       rounded-lg hover:from-amber-600 hover:to-red-600 transition-all font-medium"
            >
              Predict Price Sensitivity
            </button>
          </div>

          {/* Prediction Result */}
          {prediction && (
            <div className={`rounded-lg p-6 border ${
              prediction.category === 'budget'
                ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-700'
                : prediction.category === 'moderate'
                ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700'
                : 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-700'
            }`}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Prediction Result
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`text-4xl font-bold ${
                      prediction.category === 'budget'
                        ? 'text-green-600 dark:text-green-400'
                        : prediction.category === 'moderate'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-purple-600 dark:text-purple-400'
                    }`}>
                      {prediction.categoryLabel}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Suggested Price Point:</span>{' '}
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        €{prediction.suggestedPrice?.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {prediction.category === 'budget' && (
                        <>💡 This customer is price-conscious. Focus on value propositions and deals.</>
                      )}
                      {prediction.category === 'moderate' && (
                        <>💡 This customer balances quality and price. Highlight quality at fair prices.</>
                      )}
                      {prediction.category === 'premium' && (
                        <>💡 This customer values quality over price. Emphasize premium offerings.</>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Probability Distribution
                  </h4>
                  {predictionGaugeOptions && (
                    <ReactECharts option={predictionGaugeOptions} style={{ height: 180 }} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
              📊 About This Model
            </h4>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• Uses <strong>Random Forest</strong> ensemble of decision trees</li>
              <li>• Classifies customers into Budget (€0-3), Moderate (€3-4.50), or Premium (€4.50+)</li>
              <li>• Trained on {stats.samples} survey responses</li>
              <li>• Best for: Pricing strategy, customer segmentation, targeted marketing</li>
              <li>• Accuracy shows how well the model predicts on training data</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
