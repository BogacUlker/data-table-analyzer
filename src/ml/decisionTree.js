/**
 * Decision Tree Classifier - ID3 Algorithm Implementation
 * Pure JavaScript - No external dependencies
 */

// Calculate entropy of a dataset
function calculateEntropy(data, targetColumn) {
  const total = data.length;
  if (total === 0) return 0;

  const counts = {};
  data.forEach(row => {
    const label = row[targetColumn];
    counts[label] = (counts[label] || 0) + 1;
  });

  let entropy = 0;
  Object.values(counts).forEach(count => {
    const probability = count / total;
    if (probability > 0) {
      entropy -= probability * Math.log2(probability);
    }
  });

  return entropy;
}

// Calculate information gain for a feature
function calculateInformationGain(data, feature, targetColumn) {
  const totalEntropy = calculateEntropy(data, targetColumn);
  const total = data.length;

  // Group data by feature values
  const groups = {};
  data.forEach(row => {
    const value = row[feature];
    if (!groups[value]) groups[value] = [];
    groups[value].push(row);
  });

  // Calculate weighted entropy
  let weightedEntropy = 0;
  Object.values(groups).forEach(group => {
    const weight = group.length / total;
    weightedEntropy += weight * calculateEntropy(group, targetColumn);
  });

  return totalEntropy - weightedEntropy;
}

// Find the best feature to split on
function findBestFeature(data, features, targetColumn) {
  let bestFeature = null;
  let bestGain = -Infinity;

  features.forEach(feature => {
    const gain = calculateInformationGain(data, feature, targetColumn);
    if (gain > bestGain) {
      bestGain = gain;
      bestFeature = feature;
    }
  });

  return { feature: bestFeature, gain: bestGain };
}

// Get the majority class in data
function getMajorityClass(data, targetColumn) {
  const counts = {};
  data.forEach(row => {
    const label = row[targetColumn];
    counts[label] = (counts[label] || 0) + 1;
  });

  let majorityClass = null;
  let maxCount = 0;
  Object.entries(counts).forEach(([label, count]) => {
    if (count > maxCount) {
      maxCount = count;
      majorityClass = label;
    }
  });

  return { label: majorityClass, count: maxCount, total: data.length };
}

// Build the decision tree recursively
function buildTree(data, features, targetColumn, depth = 0, maxDepth = 5) {
  // Base cases
  if (data.length === 0) {
    return { type: 'leaf', label: 'Unknown', confidence: 0, samples: 0 };
  }

  const { label: majorityClass, count, total } = getMajorityClass(data, targetColumn);
  const confidence = count / total;

  // If all samples have same class or max depth reached or no features left
  if (confidence === 1 || depth >= maxDepth || features.length === 0) {
    return {
      type: 'leaf',
      label: majorityClass,
      confidence: confidence,
      samples: total,
      distribution: getClassDistribution(data, targetColumn)
    };
  }

  // Find best feature to split
  const { feature: bestFeature, gain } = findBestFeature(data, features, targetColumn);

  // If no information gain, return leaf
  if (gain <= 0) {
    return {
      type: 'leaf',
      label: majorityClass,
      confidence: confidence,
      samples: total,
      distribution: getClassDistribution(data, targetColumn)
    };
  }

  // Create node and split
  const node = {
    type: 'node',
    feature: bestFeature,
    gain: gain,
    samples: total,
    children: {}
  };

  // Get unique values for the best feature
  const featureValues = [...new Set(data.map(row => row[bestFeature]))];
  const remainingFeatures = features.filter(f => f !== bestFeature);

  featureValues.forEach(value => {
    const subset = data.filter(row => row[bestFeature] === value);
    node.children[value] = buildTree(subset, remainingFeatures, targetColumn, depth + 1, maxDepth);
  });

  // Store default prediction for unseen values
  node.defaultPrediction = majorityClass;

  return node;
}

// Get class distribution
function getClassDistribution(data, targetColumn) {
  const counts = {};
  data.forEach(row => {
    const label = row[targetColumn];
    counts[label] = (counts[label] || 0) + 1;
  });

  const total = data.length;
  const distribution = {};
  Object.entries(counts).forEach(([label, count]) => {
    distribution[label] = {
      count: count,
      percentage: (count / total * 100).toFixed(1)
    };
  });

  return distribution;
}

// Predict a single sample
function predict(tree, sample) {
  if (tree.type === 'leaf') {
    return {
      prediction: tree.label,
      confidence: tree.confidence,
      distribution: tree.distribution
    };
  }

  const featureValue = sample[tree.feature];

  if (tree.children[featureValue]) {
    return predict(tree.children[featureValue], sample);
  }

  // If value not seen during training, use default prediction
  return {
    prediction: tree.defaultPrediction,
    confidence: 0.5,
    distribution: {}
  };
}

// Predict with top-N results
function predictTopN(tree, sample, n = 3) {
  const result = predict(tree, sample);

  if (!result.distribution || Object.keys(result.distribution).length === 0) {
    return [{
      label: result.prediction,
      confidence: result.confidence * 100
    }];
  }

  const sorted = Object.entries(result.distribution)
    .map(([label, data]) => ({
      label,
      confidence: parseFloat(data.percentage)
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, n);

  return sorted;
}

// Feature preprocessing for Coffee Shop data
export function preprocessCoffeeData(data) {
  return data.map(row => {
    const processed = { ...row };

    // Time to time slot (Morning: 6-12, Afternoon: 12-17, Evening: 17-22)
    if (row.Time) {
      const timeParts = String(row.Time).split(':');
      const hour = parseInt(timeParts[0], 10);

      if (hour >= 6 && hour < 12) {
        processed.TimeSlot = 'Morning';
      } else if (hour >= 12 && hour < 17) {
        processed.TimeSlot = 'Afternoon';
      } else {
        processed.TimeSlot = 'Evening';
      }
    }

    // Temperature to category
    const maxTemp = parseFloat(row['Max Temp'] || row.MaxTemp || row['Max temp']);
    if (!isNaN(maxTemp)) {
      if (maxTemp < 10) {
        processed.TempCategory = 'Cold';
      } else if (maxTemp < 18) {
        processed.TempCategory = 'Mild';
      } else {
        processed.TempCategory = 'Warm';
      }
    }

    // Rain to boolean string
    if (row.Rain !== undefined) {
      const rainVal = String(row.Rain).toLowerCase();
      processed.IsRainy = (rainVal === 'yes' || rainVal === 'true' || rainVal === '1') ? 'Yes' : 'No';
    }

    return processed;
  });
}

// Train/Test split
function trainTestSplit(data, testRatio = 0.2) {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(data.length * (1 - testRatio));

  return {
    train: shuffled.slice(0, splitIndex),
    test: shuffled.slice(splitIndex)
  };
}

// Calculate accuracy
function calculateAccuracy(tree, testData, targetColumn) {
  let correct = 0;

  testData.forEach(row => {
    const result = predict(tree, row);
    if (result.prediction === row[targetColumn]) {
      correct++;
    }
  });

  return correct / testData.length;
}

// Get feature importance from tree
function getFeatureImportance(tree, importance = {}, depth = 0) {
  if (tree.type === 'leaf') return importance;

  const feature = tree.feature;
  const gain = tree.gain || 0;
  const samples = tree.samples || 1;

  // Weight importance by samples at this node
  importance[feature] = (importance[feature] || 0) + gain * samples;

  Object.values(tree.children).forEach(child => {
    getFeatureImportance(child, importance, depth + 1);
  });

  return importance;
}

// Convert tree to visualization format for ECharts (Enhanced)
export function treeToEChartsFormat(tree, edgeLabel = null, depth = 0) {
  if (tree.type === 'leaf') {
    // Get top 2 classes for display
    const topClasses = tree.distribution
      ? Object.entries(tree.distribution)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 2)
      : [];

    const distributionText = topClasses.length > 1
      ? `\n${topClasses[1][0]}: ${topClasses[1][1].percentage}%`
      : '';

    return {
      name: `🎯 ${tree.label}`,
      value: tree.samples,
      label: {
        formatter: [
          `{title|${tree.label}}`,
          `{confidence|${(tree.confidence * 100).toFixed(0)}% confidence}`,
          `{samples|n=${tree.samples}}`
        ].join('\n'),
        rich: {
          title: { fontSize: 12, fontWeight: 'bold', padding: [0, 0, 4, 0] },
          confidence: { fontSize: 10, color: '#10b981' },
          samples: { fontSize: 9, color: '#6b7280' }
        }
      },
      itemStyle: {
        color: getColorForLabel(tree.label),
        borderWidth: 3,
        borderColor: '#10b981'
      },
      symbolSize: 16,
      edgeLabel: edgeLabel,
      isLeaf: true,
      distribution: tree.distribution
    };
  }

  // Feature icons for better visual
  const featureIcons = {
    'Day': '📅',
    'TimeSlot': '🕐',
    'IsRainy': '🌧️',
    'TempCategory': '🌡️'
  };

  const icon = featureIcons[tree.feature] || '❓';

  const children = Object.entries(tree.children).map(([value, child]) => {
    return treeToEChartsFormat(child, value, depth + 1);
  });

  return {
    name: `${icon} ${tree.feature}`,
    value: tree.samples,
    label: {
      formatter: [
        `{title|${icon} ${tree.feature}}`,
        `{gain|IG: ${(tree.gain * 100).toFixed(1)}%}`,
        `{samples|n=${tree.samples}}`
      ].join('\n'),
      rich: {
        title: { fontSize: 12, fontWeight: 'bold', padding: [0, 0, 4, 0] },
        gain: { fontSize: 10, color: '#0ea5e9' },
        samples: { fontSize: 9, color: '#6b7280' }
      }
    },
    children: children,
    collapsed: depth >= 3,
    edgeLabel: edgeLabel,
    itemStyle: {
      color: depth === 0 ? '#0ea5e9' : '#6366f1',
      borderWidth: 2,
      borderColor: '#0284c7'
    },
    symbolSize: depth === 0 ? 20 : 14
  };
}

// Get detailed tree statistics
export function getTreeStats(tree, stats = { nodes: 0, leaves: 0, maxDepth: 0 }, depth = 0) {
  if (tree.type === 'leaf') {
    stats.leaves++;
    stats.maxDepth = Math.max(stats.maxDepth, depth);
    return stats;
  }

  stats.nodes++;
  stats.maxDepth = Math.max(stats.maxDepth, depth);

  Object.values(tree.children).forEach(child => {
    getTreeStats(child, stats, depth + 1);
  });

  return stats;
}

// Get color for product label
function getColorForLabel(label) {
  const colors = {
    'Hot Chocolate': '#8B4513',
    'Latte': '#D2691E',
    'Americano': '#4A2C2A',
    'Cortado': '#CD853F',
    'Cappuccino': '#DEB887',
    'Espresso': '#3C1414',
    'Mocha': '#5C4033',
    'Flat White': '#F5DEB3',
    'default': '#6B7280'
  };
  return colors[label] || colors.default;
}

// Main class for the Decision Tree
export class DecisionTreeClassifier {
  constructor(maxDepth = 5) {
    this.maxDepth = maxDepth;
    this.tree = null;
    this.features = [];
    this.targetColumn = null;
    this.accuracy = 0;
    this.featureImportance = {};
    this.trainSize = 0;
    this.testSize = 0;
  }

  train(data, features, targetColumn) {
    this.features = features;
    this.targetColumn = targetColumn;

    // Split data
    const { train, test } = trainTestSplit(data, 0.2);
    this.trainSize = train.length;
    this.testSize = test.length;

    // Build tree
    this.tree = buildTree(train, features, targetColumn, 0, this.maxDepth);

    // Calculate accuracy
    this.accuracy = calculateAccuracy(this.tree, test, targetColumn);

    // Calculate feature importance
    const rawImportance = getFeatureImportance(this.tree);
    const totalImportance = Object.values(rawImportance).reduce((a, b) => a + b, 0);

    this.featureImportance = {};
    Object.entries(rawImportance).forEach(([feature, value]) => {
      this.featureImportance[feature] = totalImportance > 0 ? value / totalImportance : 0;
    });

    return {
      accuracy: this.accuracy,
      trainSize: this.trainSize,
      testSize: this.testSize,
      featureImportance: this.featureImportance
    };
  }

  predict(sample) {
    if (!this.tree) {
      throw new Error('Model not trained yet');
    }
    return predict(this.tree, sample);
  }

  predictTopN(sample, n = 3) {
    if (!this.tree) {
      throw new Error('Model not trained yet');
    }
    return predictTopN(this.tree, sample, n);
  }

  getTreeForVisualization() {
    if (!this.tree) return null;
    return treeToEChartsFormat(this.tree);
  }

  getModelStats() {
    const treeStats = this.tree ? getTreeStats(this.tree) : { nodes: 0, leaves: 0, maxDepth: 0 };
    return {
      accuracy: this.accuracy,
      trainSize: this.trainSize,
      testSize: this.testSize,
      features: this.features,
      featureImportance: this.featureImportance,
      maxDepth: this.maxDepth,
      treeNodes: treeStats.nodes,
      treeLeaves: treeStats.leaves,
      actualDepth: treeStats.maxDepth
    };
  }

  // Serialize model for storage
  toJSON() {
    return {
      tree: this.tree,
      features: this.features,
      targetColumn: this.targetColumn,
      accuracy: this.accuracy,
      featureImportance: this.featureImportance,
      trainSize: this.trainSize,
      testSize: this.testSize,
      maxDepth: this.maxDepth
    };
  }

  // Load model from JSON
  fromJSON(json) {
    this.tree = json.tree;
    this.features = json.features;
    this.targetColumn = json.targetColumn;
    this.accuracy = json.accuracy;
    this.featureImportance = json.featureImportance;
    this.trainSize = json.trainSize;
    this.testSize = json.testSize;
    this.maxDepth = json.maxDepth;
    return this;
  }
}

export default DecisionTreeClassifier;
