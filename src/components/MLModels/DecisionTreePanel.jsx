import { useState, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import useDataStore from '../../store/useDataStore';
import { DecisionTreeClassifier, preprocessCoffeeData } from '../../ml/decisionTree';

const TreeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// Product emoji mapping
const productEmojis = {
  'Hot Chocolate': '🍫',
  'Latte': '☕',
  'Americano': '🖤',
  'Cortado': '🤎',
  'Cappuccino': '🤍',
  'Espresso': '⚫',
  'Mocha': '🍫',
  'Flat White': '🥛',
};

export default function DecisionTreePanel() {
  const { dataSets, activeDataSetId, darkMode } = useDataStore();
  const [model, setModel] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [showTree, setShowTree] = useState(false);

  // Form state for prediction
  const [formData, setFormData] = useState({
    Day: 'Monday',
    TimeSlot: 'Morning',
    IsRainy: 'No',
    TempCategory: 'Mild'
  });

  // Get active dataset
  const activeDataSet = useMemo(() => {
    return dataSets.find((ds) => ds.id === activeDataSetId);
  }, [dataSets, activeDataSetId]);

  // Check if dataset is Coffee Shop type
  const isCoffeeShopData = useMemo(() => {
    if (!activeDataSet?.columns) return false;
    const cols = activeDataSet.columns.map(c => c.toLowerCase());
    return cols.some(c => c.includes('item') || c.includes('product')) &&
           cols.some(c => c === 'day') &&
           cols.some(c => c.includes('rain') || c.includes('temp'));
  }, [activeDataSet]);

  // Train the model
  const handleTrain = useCallback(() => {
    if (!activeDataSet?.data) return;

    setIsTraining(true);
    setPrediction(null);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        // Preprocess data
        const processedData = preprocessCoffeeData(activeDataSet.data);

        // Define features and target
        const features = ['Day', 'TimeSlot', 'IsRainy', 'TempCategory'];
        const targetColumn = activeDataSet.columns.find(c =>
          c.toLowerCase().includes('item') || c.toLowerCase().includes('product')
        ) || 'Item';

        // Create and train model
        const classifier = new DecisionTreeClassifier(5);
        const stats = classifier.train(processedData, features, targetColumn);

        setModel(classifier);
        console.log('Model trained:', stats);
      } catch (error) {
        console.error('Training error:', error);
      } finally {
        setIsTraining(false);
      }
    }, 100);
  }, [activeDataSet]);

  // Make prediction
  const handlePredict = useCallback(() => {
    if (!model) return;

    const results = model.predictTopN(formData, 3);
    setPrediction(results);
  }, [model, formData]);

  // Get tree visualization options
  const treeOptions = useMemo(() => {
    if (!model || !showTree) return null;

    const treeData = model.getTreeForVisualization();
    if (!treeData) return null;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
        borderColor: darkMode ? '#334155' : '#e2e8f0',
        textStyle: { color: darkMode ? '#f1f5f9' : '#1e293b' },
        formatter: (params) => {
          const data = params.data;
          if (data.isLeaf) {
            // Leaf node tooltip
            let html = `<div style="font-weight:bold;margin-bottom:8px;">🎯 Prediction: ${data.name.replace('🎯 ', '')}</div>`;
            html += `<div>Samples: <b>${data.value}</b></div>`;
            if (data.distribution) {
              html += `<div style="margin-top:8px;border-top:1px solid ${darkMode ? '#475569' : '#e2e8f0'};padding-top:8px;">`;
              html += `<div style="font-weight:500;margin-bottom:4px;">Class Distribution:</div>`;
              Object.entries(data.distribution)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5)
                .forEach(([label, info]) => {
                  const emoji = productEmojis[label] || '☕';
                  html += `<div style="display:flex;justify-content:space-between;gap:16px;">`;
                  html += `<span>${emoji} ${label}</span>`;
                  html += `<span><b>${info.percentage}%</b> (${info.count})</span>`;
                  html += `</div>`;
                });
              html += `</div>`;
            }
            return html;
          } else {
            // Decision node tooltip
            let html = `<div style="font-weight:bold;margin-bottom:8px;">${data.name}</div>`;
            html += `<div>Total Samples: <b>${data.value}</b></div>`;
            if (data.children) {
              html += `<div style="margin-top:8px;border-top:1px solid ${darkMode ? '#475569' : '#e2e8f0'};padding-top:8px;">`;
              html += `<div style="font-weight:500;margin-bottom:4px;">Branches:</div>`;
              data.children.forEach(child => {
                const branchLabel = child.edgeLabel || 'Unknown';
                html += `<div>→ <b>${branchLabel}</b>: ${child.value} samples</div>`;
              });
              html += `</div>`;
            }
            return html;
          }
        }
      },
      series: [{
        type: 'tree',
        data: [treeData],
        top: '8%',
        left: '5%',
        bottom: '15%',
        right: '5%',
        symbolSize: 14,
        orient: 'TB',
        edgeShape: 'polyline',
        edgeForkPosition: '50%',
        initialTreeDepth: 4,
        label: {
          position: 'top',
          verticalAlign: 'bottom',
          align: 'center',
          fontSize: 11,
          color: darkMode ? '#e2e8f0' : '#1e293b',
          backgroundColor: darkMode ? '#1e293b' : '#ffffff',
          padding: [6, 10],
          borderRadius: 6,
          borderWidth: 1,
          borderColor: darkMode ? '#475569' : '#e2e8f0',
          shadowBlur: 4,
          shadowColor: 'rgba(0,0,0,0.1)',
          rich: {
            title: {
              fontSize: 12,
              fontWeight: 'bold',
              color: darkMode ? '#f1f5f9' : '#1e293b',
              padding: [0, 0, 4, 0]
            },
            gain: {
              fontSize: 10,
              color: '#0ea5e9',
            },
            confidence: {
              fontSize: 10,
              color: '#10b981',
            },
            samples: {
              fontSize: 9,
              color: darkMode ? '#94a3b8' : '#64748b',
            }
          }
        },
        leaves: {
          label: {
            position: 'bottom',
            verticalAlign: 'top',
            align: 'center',
            backgroundColor: darkMode ? '#064e3b' : '#d1fae5',
            borderColor: '#10b981',
          }
        },
        emphasis: {
          focus: 'ancestor',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.3)'
          }
        },
        expandAndCollapse: true,
        animationDuration: 550,
        animationDurationUpdate: 750,
        lineStyle: {
          color: darkMode ? '#475569' : '#94a3b8',
          width: 2,
          curveness: 0.3,
        },
        itemStyle: {
          color: '#0ea5e9',
          borderColor: '#0284c7',
          borderWidth: 2,
        },
        // Edge labels showing branch values
        edgeLabel: {
          show: true,
          formatter: (params) => {
            return params.data?.edgeLabel || '';
          },
          fontSize: 10,
          color: darkMode ? '#94a3b8' : '#64748b',
          backgroundColor: darkMode ? '#334155' : '#f8fafc',
          padding: [2, 6],
          borderRadius: 4,
        }
      }]
    };
  }, [model, showTree, darkMode]);

  // Don't render if not coffee shop data
  if (!isCoffeeShopData) {
    return null;
  }

  const modelStats = model?.getModelStats();

  return (
    <div className="card overflow-hidden mb-6">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TreeIcon />
            <div>
              <h3 className="font-semibold">Item Purchase Predictor</h3>
              <p className="text-xs opacity-90">Decision Tree Classification Model</p>
            </div>
          </div>
          <button
            onClick={handleTrain}
            disabled={isTraining}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isTraining ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Training...
              </>
            ) : (
              <>
                <SparklesIcon />
                {model ? 'Retrain Model' : 'Train Model'}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-4">
        {!model ? (
          // No model trained yet
          <div className="text-center py-8">
            <div className="text-slate-300 dark:text-slate-600 flex justify-center mb-4">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
              Train Your Prediction Model
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
              Click "Train Model" to build a Decision Tree that predicts which item a customer
              is likely to purchase based on day, time, and weather conditions.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded">
                Day of Week
              </span>
              <span className="px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded">
                Time of Day
              </span>
              <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded">
                Weather
              </span>
            </div>
          </div>
        ) : (
          // Model trained - show stats over prediction
          <div className="space-y-4">
            {/* Model Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {(modelStats.accuracy * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Accuracy</div>
              </div>
              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {modelStats.trainSize.toLocaleString()}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Training Samples</div>
              </div>
              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                  {modelStats.features.length}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Features</div>
              </div>
              <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {modelStats.actualDepth || modelStats.maxDepth}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Tree Depth</div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {modelStats.treeNodes || 0}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Decision Nodes</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {modelStats.treeLeaves || 0}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Leaf Nodes</div>
              </div>
            </div>

            {/* Feature Importance */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <ChartIcon />
                Feature Importance
              </h5>
              <div className="space-y-2">
                {Object.entries(modelStats.featureImportance)
                  .sort((a, b) => b[1] - a[1])
                  .map(([feature, importance]) => (
                    <div key={feature} className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 dark:text-slate-400 w-24 truncate">
                        {feature}
                      </span>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all"
                          style={{ width: `${importance * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-12 text-right">
                        {(importance * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Prediction Form */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Make a Prediction
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Day</label>
                  <select
                    value={formData.Day}
                    onChange={(e) => setFormData(prev => ({ ...prev, Day: e.target.value }))}
                    className="select text-sm w-full"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Time</label>
                  <select
                    value={formData.TimeSlot}
                    onChange={(e) => setFormData(prev => ({ ...prev, TimeSlot: e.target.value }))}
                    className="select text-sm w-full"
                  >
                    <option value="Morning">Morning (6-12)</option>
                    <option value="Afternoon">Afternoon (12-17)</option>
                    <option value="Evening">Evening (17-22)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Rain</label>
                  <select
                    value={formData.IsRainy}
                    onChange={(e) => setFormData(prev => ({ ...prev, IsRainy: e.target.value }))}
                    className="select text-sm w-full"
                  >
                    <option value="No">No Rain</option>
                    <option value="Yes">Rainy</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Temperature</label>
                  <select
                    value={formData.TempCategory}
                    onChange={(e) => setFormData(prev => ({ ...prev, TempCategory: e.target.value }))}
                    className="select text-sm w-full"
                  >
                    <option value="Cold">Cold (&lt;10°C)</option>
                    <option value="Mild">Mild (10-18°C)</option>
                    <option value="Warm">Warm (&gt;18°C)</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handlePredict}
                className="btn-primary w-full sm:w-auto"
              >
                Predict Item
              </button>
            </div>

            {/* Prediction Results */}
            {prediction && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-4">
                <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Prediction Results
                </h5>
                <div className="space-y-2">
                  {prediction.map((result, index) => (
                    <div
                      key={result.label}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        index === 0
                          ? 'bg-white dark:bg-slate-800 shadow-sm'
                          : 'bg-white/50 dark:bg-slate-800/50'
                      }`}
                    >
                      <span className="text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      <span className="text-xl">
                        {productEmojis[result.label] || '☕'}
                      </span>
                      <div className="flex-1">
                        <div className={`font-medium ${
                          index === 0
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {result.label}
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${
                        index === 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-500'
                      }`}>
                        {result.confidence.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tree Visualization Toggle */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <button
                onClick={() => setShowTree(!showTree)}
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showTree ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {showTree ? 'Hide' : 'Show'} Decision Tree Visualization
              </button>

              {showTree && treeOptions && (
                <div className="mt-4 space-y-3">
                  {/* Tree Legend */}
                  <div className="flex flex-wrap gap-4 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-sky-500 border-2 border-sky-600"></div>
                      <span className="text-slate-600 dark:text-slate-400">Decision Node (split feature)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-600"></div>
                      <span className="text-slate-600 dark:text-slate-400">Leaf Node (prediction)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">IG:</span>
                      <span className="text-slate-600 dark:text-slate-400">Information Gain</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">n:</span>
                      <span className="text-slate-600 dark:text-slate-400">Sample count</span>
                    </div>
                  </div>

                  {/* Tree Visualization */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 overflow-hidden">
                    <ReactECharts
                      option={treeOptions}
                      style={{ height: '500px', width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                    />
                  </div>

                  {/* Tree Reading Guide */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-xs">
                    <div className="font-medium text-amber-800 dark:text-amber-300 mb-2">How to Read the Tree:</div>
                    <ul className="text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
                      <li><b>Start at the top</b> - the root shows the most important feature</li>
                      <li><b>Follow branches</b> - labels show the feature value (e.g., "Monday", "Morning", "Yes")</li>
                      <li><b>Reach a leaf</b> - this is the predicted item with confidence %</li>
                      <li><b>Hover nodes</b> - see detailed distribution of all products</li>
                      <li><b>Click to expand/collapse</b> - explore different branches</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer with use cases */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span>📈</span> Marketing campaigns
          </span>
          <span className="flex items-center gap-1">
            <span>📋</span> Menu optimization
          </span>
          <span className="flex items-center gap-1">
            <span>👥</span> Staff planning
          </span>
          <span className="flex items-center gap-1">
            <span>📦</span> Inventory management
          </span>
        </div>
      </div>
    </div>
  );
}
