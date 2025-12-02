/**
 * Price Sensitivity Predictor
 *
 * Uses Random Forest-style ensemble of Decision Trees
 * to predict willingness to pay based on demographics and preferences
 */

/**
 * Parse price string to numeric value
 */
function parsePrice(priceStr) {
  if (!priceStr || priceStr === '') return null;

  // Remove currency symbols and clean
  const cleaned = String(priceStr)
    .replace(/[€$£¥]/g, '')
    .replace(/[^\d.]/g, '')
    .trim();

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse income string to numeric value
 */
function parseIncome(incomeStr) {
  if (!incomeStr || incomeStr === '') return null;

  const cleaned = String(incomeStr).replace(/[,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Categorize price into buckets
 */
function categorizePriceWillingness(price) {
  if (price === null) return null;
  if (price <= 3) return 'budget';      // €0-3: Budget conscious
  if (price <= 4.5) return 'moderate';  // €3-4.5: Moderate spender
  return 'premium';                      // €4.5+: Premium buyer
}

/**
 * Encode categorical variables
 */
const encodings = {
  gender: {
    'man': 0, 'male': 0,
    'woman': 1, 'female': 1,
    'other': 2,
    'prefer not to say': 2
  },
  ageGroup: {
    '21': 0, '21.0': 0,
    '29.5': 1,
    '39.5': 2,
    '49.5': 3,
    '59.5': 4,
    '65': 5, '65.0': 5
  },
  incomeLevel: {
    '5000': 0, '5,000': 0,
    '14000': 1, '14,000': 1,
    '23500': 2, '23,500': 2,
    '31500': 3, '31,500': 3,
    '40000': 4, '40,000': 4,
    '70000': 5, '70,000': 5,
    '80000': 6, '80,000': 6
  },
  tempPreference: {
    'hot': 0,
    'cold': 1,
    'both': 2
  },
  chainPreference: {
    'large chain': 0,
    'small , local business': 1,
    'both': 2
  },
  productivity: {
    'no': 0,
    'maybe': 1,
    'yes': 2
  },
  reusableCup: {
    'no': 0,
    'sometimes': 1,
    'yes': 2
  },
  priceCategory: {
    'budget': 0,
    'moderate': 1,
    'premium': 2
  }
};

/**
 * Preprocess survey data for price sensitivity model
 */
export function preprocessSurveyData(data) {
  const processed = [];
  const columns = Object.keys(data[0] || {});

  // Find columns (case-insensitive partial match)
  const findCol = (patterns) => columns.find(c =>
    patterns.some(p => c.toLowerCase().includes(p.toLowerCase()))
  );

  const ageCol = findCol(['age']);
  const genderCol = findCol(['gender']);
  const incomeCol = findCol(['income']);
  const cupsCol = findCol(['cups', 'how many']);
  const priceCol = findCol(['pay', 'price', 'prepared']);
  const tempCol = findCol(['hot', 'cold']);
  const chainCol = findCol(['chain', 'local']);
  const productivityCol = findCol(['productive']);
  const reusableCol = findCol(['reusable']);
  const reasonCol = findCol(['reason']);

  // Employment columns (binary)
  const studentCol = findCol(['student']);
  const fulltimeCol = findCol(['fulltime', 'full time']);
  const parttimeCol = findCol(['parttime', 'part time']);
  const selfEmployedCol = findCol(['self-employed', 'self employed']);

  if (!priceCol) {
    throw new Error('Dataset must have a price/willingness to pay column');
  }

  // Process each row
  data.forEach((row, idx) => {
    const price = parsePrice(row[priceCol]);
    const priceCategory = categorizePriceWillingness(price);

    if (priceCategory === null) return; // Skip rows without valid price

    // Extract features
    const age = row[ageCol] ? parseFloat(row[ageCol]) : null;
    const gender = genderCol ? String(row[genderCol]).toLowerCase().trim() : null;
    const income = incomeCol ? parseIncome(row[incomeCol]) : null;
    const cups = cupsCol ? parseFloat(row[cupsCol]) : null;
    const temp = tempCol ? String(row[tempCol]).toLowerCase().trim().split('\n')[0] : null;
    const chain = chainCol ? String(row[chainCol]).toLowerCase().trim().split('\n')[0] : null;
    const productivity = productivityCol ? String(row[productivityCol]).toLowerCase().trim().split('\n')[0] : null;
    const reusable = reusableCol ? String(row[reusableCol]).toLowerCase().trim().split('\n')[0] : null;
    const reason = reasonCol ? String(row[reasonCol]).toLowerCase() : '';

    // Employment status
    const isStudent = studentCol && row[studentCol] == 1;
    const isFulltime = fulltimeCol && row[fulltimeCol] == 1;
    const isParttime = parttimeCol && row[parttimeCol] == 1;
    const isSelfEmployed = selfEmployedCol && row[selfEmployedCol] == 1;

    // Derived features
    const energyFocused = reason.includes('energy') || reason.includes('caffeine');
    const tasteFocused = reason.includes('taste');
    const lifestyleFocused = reason.includes('lifestyle');

    processed.push({
      // Raw values for display
      rawPrice: price,
      rawAge: age,
      rawIncome: income,
      rawGender: gender,

      // Target
      priceCategory,
      priceCategoryEncoded: encodings.priceCategory[priceCategory],

      // Numeric features
      age: age || 30,
      income: income || 20000,
      cups: cups || 2,

      // Encoded categorical
      genderEncoded: encodings.gender?.[gender] ?? 2,
      tempEncoded: encodings.tempPreference?.[temp?.split(' ')[0]] ?? 0,
      chainEncoded: encodings.chainPreference?.[chain] ?? 2,
      productivityEncoded: encodings.productivity?.[productivity] ?? 1,
      reusableEncoded: encodings.reusableCup?.[reusable] ?? 0,

      // Binary features
      isStudent: isStudent ? 1 : 0,
      isFulltime: isFulltime ? 1 : 0,
      isParttime: isParttime ? 1 : 0,
      isSelfEmployed: isSelfEmployed ? 1 : 0,
      energyFocused: energyFocused ? 1 : 0,
      tasteFocused: tasteFocused ? 1 : 0,
      lifestyleFocused: lifestyleFocused ? 1 : 0
    });
  });

  return processed;
}

/**
 * Simple Decision Tree Node
 */
class TreeNode {
  constructor() {
    this.featureIndex = null;
    this.threshold = null;
    this.left = null;
    this.right = null;
    this.prediction = null;
    this.isLeaf = false;
  }
}

/**
 * Decision Tree Classifier for Price Sensitivity
 */
class DecisionTreeClassifier {
  constructor(maxDepth = 5, minSamplesSplit = 5) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.root = null;
    this.featureNames = [];
    this.classes = [];
  }

  /**
   * Calculate Gini impurity
   */
  gini(y) {
    const counts = {};
    y.forEach(val => counts[val] = (counts[val] || 0) + 1);

    let impurity = 1;
    const total = y.length;
    Object.values(counts).forEach(count => {
      const prob = count / total;
      impurity -= prob * prob;
    });

    return impurity;
  }

  /**
   * Find best split
   */
  findBestSplit(X, y, featureIndices) {
    let bestGain = -Infinity;
    let bestFeature = null;
    let bestThreshold = null;

    const parentGini = this.gini(y);

    featureIndices.forEach(featureIdx => {
      const values = X.map(row => row[featureIdx]);
      const uniqueValues = [...new Set(values)].sort((a, b) => a - b);

      // Try thresholds between unique values
      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;

        const leftIndices = [];
        const rightIndices = [];

        X.forEach((row, idx) => {
          if (row[featureIdx] <= threshold) {
            leftIndices.push(idx);
          } else {
            rightIndices.push(idx);
          }
        });

        if (leftIndices.length === 0 || rightIndices.length === 0) continue;

        const leftY = leftIndices.map(i => y[i]);
        const rightY = rightIndices.map(i => y[i]);

        const leftGini = this.gini(leftY);
        const rightGini = this.gini(rightY);

        const weightedGini = (leftY.length * leftGini + rightY.length * rightGini) / y.length;
        const gain = parentGini - weightedGini;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = featureIdx;
          bestThreshold = threshold;
        }
      }
    });

    return { feature: bestFeature, threshold: bestThreshold, gain: bestGain };
  }

  /**
   * Get majority class
   */
  majorityClass(y) {
    const counts = {};
    y.forEach(val => counts[val] = (counts[val] || 0) + 1);
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Build tree recursively
   */
  buildTree(X, y, depth, featureIndices) {
    const node = new TreeNode();

    // Check stopping conditions
    const uniqueClasses = [...new Set(y)];
    if (uniqueClasses.length === 1 || depth >= this.maxDepth || y.length < this.minSamplesSplit) {
      node.isLeaf = true;
      node.prediction = this.majorityClass(y);
      return node;
    }

    // Find best split
    const { feature, threshold, gain } = this.findBestSplit(X, y, featureIndices);

    if (feature === null || gain <= 0) {
      node.isLeaf = true;
      node.prediction = this.majorityClass(y);
      return node;
    }

    node.featureIndex = feature;
    node.threshold = threshold;

    // Split data
    const leftIndices = [];
    const rightIndices = [];

    X.forEach((row, idx) => {
      if (row[feature] <= threshold) {
        leftIndices.push(idx);
      } else {
        rightIndices.push(idx);
      }
    });

    const leftX = leftIndices.map(i => X[i]);
    const leftY = leftIndices.map(i => y[i]);
    const rightX = rightIndices.map(i => X[i]);
    const rightY = rightIndices.map(i => y[i]);

    node.left = this.buildTree(leftX, leftY, depth + 1, featureIndices);
    node.right = this.buildTree(rightX, rightY, depth + 1, featureIndices);

    return node;
  }

  /**
   * Train the tree
   */
  fit(X, y, featureNames) {
    this.featureNames = featureNames;
    this.classes = [...new Set(y)];
    const featureIndices = X[0].map((_, i) => i);
    this.root = this.buildTree(X, y, 0, featureIndices);
    return this;
  }

  /**
   * Predict single sample
   */
  predictOne(x) {
    let node = this.root;
    while (!node.isLeaf) {
      if (x[node.featureIndex] <= node.threshold) {
        node = node.left;
      } else {
        node = node.right;
      }
    }
    return node.prediction;
  }

  /**
   * Predict multiple samples
   */
  predict(X) {
    return X.map(x => this.predictOne(x));
  }
}

/**
 * Random Forest Classifier (ensemble of decision trees)
 */
export class RandomForestClassifier {
  constructor(nTrees = 10, maxDepth = 5, minSamplesSplit = 5, maxFeatures = 'sqrt') {
    this.nTrees = nTrees;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.maxFeatures = maxFeatures;
    this.trees = [];
    this.featureSubsets = [];
    this.featureNames = [];
    this.classes = [];
  }

  /**
   * Bootstrap sample
   */
  bootstrap(X, y) {
    const n = X.length;
    const indices = [];
    for (let i = 0; i < n; i++) {
      indices.push(Math.floor(Math.random() * n));
    }
    return {
      X: indices.map(i => X[i]),
      y: indices.map(i => y[i])
    };
  }

  /**
   * Select random features
   */
  selectFeatures(nFeatures) {
    const nSelect = this.maxFeatures === 'sqrt'
      ? Math.ceil(Math.sqrt(nFeatures))
      : Math.ceil(nFeatures * 0.7);

    const indices = [];
    const available = [...Array(nFeatures).keys()];

    for (let i = 0; i < nSelect; i++) {
      const idx = Math.floor(Math.random() * available.length);
      indices.push(available.splice(idx, 1)[0]);
    }

    return indices;
  }

  /**
   * Train the forest
   */
  fit(X, y, featureNames) {
    this.featureNames = featureNames;
    this.classes = [...new Set(y)];
    this.trees = [];
    this.featureSubsets = [];

    for (let i = 0; i < this.nTrees; i++) {
      // Bootstrap sample
      const { X: bootX, y: bootY } = this.bootstrap(X, y);

      // Select random features
      const featureSubset = this.selectFeatures(X[0].length);
      this.featureSubsets.push(featureSubset);

      // Subset features
      const subsetX = bootX.map(row => featureSubset.map(f => row[f]));

      // Train tree
      const tree = new DecisionTreeClassifier(this.maxDepth, this.minSamplesSplit);
      tree.fit(subsetX, bootY, featureSubset.map(f => featureNames[f]));

      this.trees.push(tree);
    }

    return this;
  }

  /**
   * Predict with voting
   */
  predict(X) {
    const predictions = X.map(x => {
      const votes = {};

      this.trees.forEach((tree, i) => {
        const subset = this.featureSubsets[i];
        const subsetX = subset.map(f => x[f]);
        const pred = tree.predictOne(subsetX);
        votes[pred] = (votes[pred] || 0) + 1;
      });

      return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
    });

    return predictions;
  }

  /**
   * Predict with probabilities
   */
  predictProba(X) {
    return X.map(x => {
      const votes = {};
      this.classes.forEach(c => votes[c] = 0);

      this.trees.forEach((tree, i) => {
        const subset = this.featureSubsets[i];
        const subsetX = subset.map(f => x[f]);
        const pred = tree.predictOne(subsetX);
        votes[pred] = (votes[pred] || 0) + 1;
      });

      const probs = {};
      this.classes.forEach(c => {
        probs[c] = votes[c] / this.nTrees;
      });

      return probs;
    });
  }

  /**
   * Get feature importance (based on frequency of use)
   */
  getFeatureImportance() {
    const importance = {};
    this.featureNames.forEach(name => importance[name] = 0);

    this.featureSubsets.forEach(subset => {
      subset.forEach(idx => {
        importance[this.featureNames[idx]] += 1;
      });
    });

    const total = Object.values(importance).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(importance)
      .map(([feature, count]) => ({
        feature,
        importance: count / total
      }))
      .sort((a, b) => b.importance - a.importance);
  }
}

/**
 * Main Price Sensitivity Model
 */
export class PriceSensitivityModel {
  constructor() {
    this.model = null;
    this.trained = false;
    this.featureNames = [
      'age', 'income', 'cups', 'genderEncoded', 'tempEncoded',
      'chainEncoded', 'productivityEncoded', 'reusableEncoded',
      'isStudent', 'isFulltime', 'energyFocused', 'tasteFocused'
    ];
    this.stats = null;
    this.categoryLabels = ['Budget (€0-3)', 'Moderate (€3-4.50)', 'Premium (€4.50+)'];
  }

  /**
   * Extract feature vector from processed data
   */
  extractFeatures(item) {
    return [
      item.age,
      item.income,
      item.cups,
      item.genderEncoded,
      item.tempEncoded,
      item.chainEncoded,
      item.productivityEncoded,
      item.reusableEncoded,
      item.isStudent,
      item.isFulltime,
      item.energyFocused,
      item.tasteFocused
    ];
  }

  /**
   * Train the model
   */
  train(data) {
    const processed = preprocessSurveyData(data);

    if (processed.length < 10) {
      throw new Error('Need at least 10 valid samples to train');
    }

    // Prepare training data
    const X = processed.map(p => this.extractFeatures(p));
    const y = processed.map(p => p.priceCategory);

    // Train random forest
    this.model = new RandomForestClassifier(15, 6, 3);
    this.model.fit(X, y, this.featureNames);

    // Calculate training accuracy
    const predictions = this.model.predict(X);
    const correct = predictions.filter((p, i) => p === y[i]).length;
    const accuracy = correct / y.length;

    // Class distribution
    const distribution = {};
    y.forEach(cat => distribution[cat] = (distribution[cat] || 0) + 1);

    // Calculate average price by category
    const avgPrices = {};
    ['budget', 'moderate', 'premium'].forEach(cat => {
      const items = processed.filter(p => p.priceCategory === cat);
      avgPrices[cat] = items.length > 0
        ? items.reduce((sum, p) => sum + p.rawPrice, 0) / items.length
        : 0;
    });

    this.stats = {
      samples: processed.length,
      accuracy,
      distribution,
      avgPrices,
      featureImportance: this.model.getFeatureImportance()
    };

    this.trained = true;
    return this.stats;
  }

  /**
   * Predict price sensitivity for new customer
   */
  predict(customerData) {
    if (!this.trained) throw new Error('Model not trained');

    const features = this.extractFeatures({
      age: customerData.age || 30,
      income: customerData.income || 20000,
      cups: customerData.cups || 2,
      genderEncoded: encodings.gender?.[customerData.gender?.toLowerCase()] ?? 2,
      tempEncoded: encodings.tempPreference?.[customerData.tempPreference?.toLowerCase()] ?? 0,
      chainEncoded: encodings.chainPreference?.[customerData.chainPreference?.toLowerCase()] ?? 2,
      productivityEncoded: encodings.productivity?.[customerData.productivity?.toLowerCase()] ?? 1,
      reusableEncoded: encodings.reusableCup?.[customerData.reusableCup?.toLowerCase()] ?? 0,
      isStudent: customerData.isStudent ? 1 : 0,
      isFulltime: customerData.isFulltime ? 1 : 0,
      energyFocused: customerData.energyFocused ? 1 : 0,
      tasteFocused: customerData.tasteFocused ? 1 : 0
    });

    const prediction = this.model.predict([features])[0];
    const probabilities = this.model.predictProba([features])[0];

    return {
      category: prediction,
      categoryLabel: this.categoryLabels[encodings.priceCategory[prediction]],
      probabilities,
      suggestedPrice: this.stats.avgPrices[prediction]
    };
  }

  /**
   * Get model statistics
   */
  getStats() {
    return this.stats;
  }
}

/**
 * Feature display names for UI
 */
export const featureDisplayNames = {
  'age': 'Age',
  'income': 'Income Level',
  'cups': 'Cups per Day',
  'genderEncoded': 'Gender',
  'tempEncoded': 'Temperature Preference',
  'chainEncoded': 'Chain vs Local',
  'productivityEncoded': 'Productivity Focus',
  'reusableEncoded': 'Uses Reusable Cup',
  'isStudent': 'Is Student',
  'isFulltime': 'Full-time Employed',
  'energyFocused': 'Energy Focused',
  'tasteFocused': 'Taste Focused'
};
