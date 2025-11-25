/**
 * Linear Regression Model for Daily Item Demand Prediction
 *
 * Uses Multiple Linear Regression with feature encoding
 * Features: Rain, MinTemp, MaxTemp, Day, Time, Season
 * Output: Predicted number of sales (item-specific or total daily)
 */

/**
 * Encode categorical features to numeric values
 */
const encodings = {
  Day: {
    'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
    'Friday': 4, 'Saturday': 5, 'Sunday': 6
  },
  TimeSlot: {
    'Morning': 0, 'Afternoon': 1, 'Evening': 2
  },
  Season: {
    'Winter': 0, 'Spring': 1, 'Summer': 2, 'Autumn': 3, 'Fall': 3
  }
};

/**
 * Determine season from month
 */
function getSeason(month) {
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Autumn';
  return 'Winter';
}

/**
 * Parse time string to hour
 */
function parseTimeToHour(timeStr) {
  if (!timeStr) return 12;

  // Handle HH:MM format
  if (typeof timeStr === 'string' && timeStr.includes(':')) {
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10);
  }

  // Handle numeric format
  const num = parseFloat(timeStr);
  if (!isNaN(num)) {
    // Excel time format (0-1 representing fraction of day)
    if (num < 1) {
      return Math.floor(num * 24);
    }
    return Math.floor(num);
  }

  return 12;
}

/**
 * Get time slot from hour
 */
function getTimeSlot(hour) {
  if (hour >= 6 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  return 'Evening';
}

/**
 * Preprocess data for regression
 * Converts raw data to numeric features
 */
export function preprocessForRegression(data) {
  const processed = [];

  // Find column names (case-insensitive)
  const columns = Object.keys(data[0] || {});
  const findCol = (patterns) => columns.find(c =>
    patterns.some(p => c.toLowerCase().includes(p.toLowerCase()))
  );

  const dayCol = findCol(['day']);
  const timeCol = findCol(['time']);
  const rainCol = findCol(['rain']);
  const minTempCol = findCol(['min', 'mintemp']);
  const maxTempCol = findCol(['max', 'maxtemp']);
  const dateCol = findCol(['date']);
  const itemCol = findCol(['item', 'product', 'coffee']);

  // Group data by date/day to count sales
  const salesByGroup = new Map();

  data.forEach(row => {
    // Extract day
    let day = row[dayCol];
    if (!day && dateCol) {
      const date = new Date(row[dateCol]);
      if (!isNaN(date)) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        day = days[date.getDay()];
      }
    }

    // Extract time slot
    let timeSlot = 'Afternoon';
    if (timeCol) {
      const hour = parseTimeToHour(row[timeCol]);
      timeSlot = getTimeSlot(hour);
    }

    // Extract weather
    const rain = row[rainCol] ? parseFloat(row[rainCol]) : 0;
    const minTemp = row[minTempCol] ? parseFloat(row[minTempCol]) : 10;
    const maxTemp = row[maxTempCol] ? parseFloat(row[maxTempCol]) : 20;

    // Extract season
    let season = 'Summer';
    if (dateCol && row[dateCol]) {
      const date = new Date(row[dateCol]);
      if (!isNaN(date)) {
        season = getSeason(date.getMonth() + 1);
      }
    }

    // Extract item
    const item = row[itemCol] || 'Unknown';

    // Create group key
    const groupKey = `${day}_${timeSlot}_${Math.round(rain)}_${Math.round(minTemp)}_${Math.round(maxTemp)}_${season}`;
    const itemGroupKey = `${groupKey}_${item}`;

    // Count total sales for this condition
    if (!salesByGroup.has(groupKey)) {
      salesByGroup.set(groupKey, {
        day, timeSlot, rain, minTemp, maxTemp, season,
        totalSales: 0,
        itemSales: new Map()
      });
    }

    const group = salesByGroup.get(groupKey);
    group.totalSales++;
    group.itemSales.set(item, (group.itemSales.get(item) || 0) + 1);
  });

  // Convert to training data
  const trainingData = [];
  const itemTrainingData = new Map();

  salesByGroup.forEach((group, key) => {
    const features = {
      Day: group.day,
      TimeSlot: group.timeSlot,
      Rain: group.rain,
      MinTemp: group.minTemp,
      MaxTemp: group.maxTemp,
      Season: group.season
    };

    // Total sales prediction data
    trainingData.push({
      ...features,
      Sales: group.totalSales
    });

    // Item-specific sales data
    group.itemSales.forEach((count, item) => {
      if (!itemTrainingData.has(item)) {
        itemTrainingData.set(item, []);
      }
      itemTrainingData.get(item).push({
        ...features,
        Sales: count
      });
    });
  });

  // Get unique items
  const items = Array.from(itemTrainingData.keys()).sort();

  return {
    totalSalesData: trainingData,
    itemSalesData: itemTrainingData,
    items,
    featureNames: ['Rain', 'MinTemp', 'MaxTemp', 'Day', 'TimeSlot', 'Season']
  };
}

/**
 * Convert features to numeric array
 */
function featuresToNumeric(features) {
  return [
    features.Rain || 0,
    features.MinTemp || 10,
    features.MaxTemp || 20,
    encodings.Day[features.Day] ?? 3,
    encodings.TimeSlot[features.TimeSlot] ?? 1,
    encodings.Season[features.Season] ?? 2
  ];
}

/**
 * Multiple Linear Regression using Normal Equation
 * θ = (X^T X)^(-1) X^T y
 */
export class LinearRegressionModel {
  constructor() {
    this.weights = null;
    this.bias = 0;
    this.featureMeans = null;
    this.featureStds = null;
    this.trainStats = null;
  }

  /**
   * Normalize features (z-score normalization)
   */
  normalize(X, fit = false) {
    if (fit) {
      this.featureMeans = X[0].map((_, colIdx) => {
        const col = X.map(row => row[colIdx]);
        return col.reduce((a, b) => a + b, 0) / col.length;
      });

      this.featureStds = X[0].map((_, colIdx) => {
        const col = X.map(row => row[colIdx]);
        const mean = this.featureMeans[colIdx];
        const variance = col.reduce((a, b) => a + (b - mean) ** 2, 0) / col.length;
        return Math.sqrt(variance) || 1;
      });
    }

    return X.map(row =>
      row.map((val, idx) => (val - this.featureMeans[idx]) / this.featureStds[idx])
    );
  }

  /**
   * Matrix transpose
   */
  transpose(matrix) {
    return matrix[0].map((_, colIdx) => matrix.map(row => row[colIdx]));
  }

  /**
   * Matrix multiplication
   */
  matMul(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;

    const result = Array(rowsA).fill(null).map(() => Array(colsB).fill(0));

    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        for (let k = 0; k < colsA; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }

    return result;
  }

  /**
   * Matrix-vector multiplication
   */
  matVecMul(A, v) {
    return A.map(row => row.reduce((sum, val, idx) => sum + val * v[idx], 0));
  }

  /**
   * Invert matrix using Gauss-Jordan elimination
   */
  invertMatrix(matrix) {
    const n = matrix.length;
    const augmented = matrix.map((row, i) => {
      const identity = Array(n).fill(0);
      identity[i] = 1;
      return [...row, ...identity];
    });

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Check for singular matrix
      if (Math.abs(augmented[i][i]) < 1e-10) {
        // Add small regularization
        augmented[i][i] += 1e-6;
      }

      // Scale pivot row
      const scale = augmented[i][i];
      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= scale;
      }

      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }

    // Extract inverse
    return augmented.map(row => row.slice(n));
  }

  /**
   * Train the model using Normal Equation with regularization
   */
  train(data) {
    if (data.length < 2) {
      throw new Error('Need at least 2 data points to train');
    }

    // Prepare feature matrix and target vector
    const X = data.map(d => featuresToNumeric(d));
    const y = data.map(d => d.Sales);

    // Normalize features
    const X_norm = this.normalize(X, true);

    // Add bias column (column of 1s)
    const X_bias = X_norm.map(row => [1, ...row]);

    // Calculate X^T
    const X_T = this.transpose(X_bias);

    // Calculate X^T * X
    const XTX = this.matMul(X_T, X_bias);

    // Add regularization (Ridge regression, λ = 0.01)
    const lambda = 0.01;
    for (let i = 1; i < XTX.length; i++) {
      XTX[i][i] += lambda;
    }

    // Calculate (X^T * X)^(-1)
    const XTX_inv = this.invertMatrix(XTX);

    // Calculate X^T * y
    const XTy = this.matVecMul(X_T, y);

    // Calculate weights: θ = (X^T X)^(-1) X^T y
    const theta = this.matVecMul(XTX_inv, XTy);

    this.bias = theta[0];
    this.weights = theta.slice(1);

    // Calculate training statistics
    const predictions = X_norm.map(x => this.predictNormalized(x));
    const yMean = y.reduce((a, b) => a + b, 0) / y.length;

    // R² score
    const ssRes = y.reduce((sum, yi, i) => sum + (yi - predictions[i]) ** 2, 0);
    const ssTot = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
    const r2 = 1 - (ssRes / ssTot);

    // RMSE
    const rmse = Math.sqrt(ssRes / y.length);

    // MAE
    const mae = y.reduce((sum, yi, i) => sum + Math.abs(yi - predictions[i]), 0) / y.length;

    this.trainStats = {
      r2: Math.max(0, Math.min(1, r2)),
      rmse,
      mae,
      samples: data.length,
      yMean,
      yMin: Math.min(...y),
      yMax: Math.max(...y)
    };

    return this.trainStats;
  }

  /**
   * Predict for normalized features
   */
  predictNormalized(x_norm) {
    const prediction = this.bias + x_norm.reduce((sum, xi, i) => sum + xi * this.weights[i], 0);
    return Math.max(0, prediction); // Sales can't be negative
  }

  /**
   * Predict sales for given features
   */
  predict(features) {
    if (!this.weights) {
      throw new Error('Model not trained');
    }

    const x = featuresToNumeric(features);
    const x_norm = x.map((val, idx) => (val - this.featureMeans[idx]) / this.featureStds[idx]);

    return Math.round(Math.max(0, this.predictNormalized(x_norm)));
  }

  /**
   * Get feature importance based on absolute weights
   */
  getFeatureImportance() {
    if (!this.weights) return [];

    const featureNames = ['Rain', 'MinTemp', 'MaxTemp', 'Day', 'TimeSlot', 'Season'];
    const absWeights = this.weights.map(Math.abs);
    const totalWeight = absWeights.reduce((a, b) => a + b, 0) || 1;

    return featureNames.map((name, i) => ({
      feature: name,
      importance: absWeights[i] / totalWeight,
      coefficient: this.weights[i]
    })).sort((a, b) => b.importance - a.importance);
  }

  /**
   * Get model statistics
   */
  getStats() {
    return {
      ...this.trainStats,
      featureImportance: this.getFeatureImportance()
    };
  }
}

/**
 * Demand Forecaster - manages multiple regression models
 */
export class DemandForecaster {
  constructor() {
    this.totalModel = new LinearRegressionModel();
    this.itemModels = new Map();
    this.items = [];
    this.trained = false;
  }

  /**
   * Train all models
   */
  train(data) {
    const processed = preprocessForRegression(data);
    this.items = processed.items;

    // Train total sales model
    const totalStats = this.totalModel.train(processed.totalSalesData);

    // Train item-specific models
    const itemStats = {};
    processed.itemSalesData.forEach((itemData, item) => {
      if (itemData.length >= 3) {
        const model = new LinearRegressionModel();
        try {
          itemStats[item] = model.train(itemData);
          this.itemModels.set(item, model);
        } catch (e) {
          console.warn(`Could not train model for ${item}:`, e.message);
        }
      }
    });

    this.trained = true;

    return {
      totalModel: totalStats,
      itemModels: itemStats,
      itemCount: this.itemModels.size,
      totalItems: this.items.length
    };
  }

  /**
   * Predict total sales
   */
  predictTotal(features) {
    if (!this.trained) throw new Error('Model not trained');
    return this.totalModel.predict(features);
  }

  /**
   * Predict sales for specific item
   */
  predictItem(features, item) {
    if (!this.trained) throw new Error('Model not trained');

    const model = this.itemModels.get(item);
    if (!model) {
      // Fall back to average based on total model
      const total = this.totalModel.predict(features);
      return Math.round(total / this.items.length);
    }

    return model.predict(features);
  }

  /**
   * Predict all items
   */
  predictAllItems(features) {
    if (!this.trained) throw new Error('Model not trained');

    const predictions = [];
    this.items.forEach(item => {
      predictions.push({
        item,
        predicted: this.predictItem(features, item)
      });
    });

    return predictions.sort((a, b) => b.predicted - a.predicted);
  }

  /**
   * Get model statistics
   */
  getStats() {
    if (!this.trained) return null;

    return {
      totalModel: this.totalModel.getStats(),
      itemModels: Array.from(this.itemModels.entries()).map(([item, model]) => ({
        item,
        stats: model.getStats()
      })),
      items: this.items
    };
  }
}

/**
 * Format features for display
 */
export function formatFeaturesForDisplay(features) {
  return {
    Day: features.Day,
    TimeSlot: features.TimeSlot,
    Season: features.Season,
    Rain: `${features.Rain}mm`,
    MinTemp: `${features.MinTemp}°C`,
    MaxTemp: `${features.MaxTemp}°C`
  };
}
