/**
 * Time Series Forecasting Model for Trade Data
 *
 * Uses Exponential Smoothing with Trend (Holt's Method)
 * Suitable for trade data with trends but limited seasonality data
 */

/**
 * Parse month string to sortable date
 * Handles formats like "2023 January", "2024 February"
 */
function parseMonthToDate(monthStr) {
  if (!monthStr) return null;

  const parts = monthStr.trim().split(' ');
  if (parts.length !== 2) return null;

  const year = parseInt(parts[0], 10);
  const monthNames = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3,
    'may': 4, 'june': 5, 'july': 6, 'august': 7,
    'september': 8, 'october': 9, 'november': 10, 'december': 11
  };

  const month = monthNames[parts[1].toLowerCase()];
  if (isNaN(year) || month === undefined) return null;

  return new Date(year, month, 1);
}

/**
 * Format date to month string
 */
function formatDateToMonth(date) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${date.getFullYear()} ${monthNames[date.getMonth()]}`;
}

/**
 * Add months to a date
 */
function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Preprocess trade data for time series analysis
 */
export function preprocessTradeData(data) {
  // Find relevant columns
  const columns = Object.keys(data[0] || {});
  const findCol = (patterns) => columns.find(c =>
    patterns.some(p => c.toLowerCase().includes(p.toLowerCase()))
  );

  const monthCol = findCol(['month', 'date', 'period']);
  const countryCol = findCol(['country', 'countries', 'territory', 'region']);
  const valueCol = findCol(['value', 'amount', 'volume']);
  const statisticCol = findCol(['statistic', 'type', 'stat']);

  if (!monthCol || !valueCol) {
    throw new Error('Dataset must have Month and Value columns');
  }

  // Group data by month and statistic type
  const monthlyData = new Map();
  const countryTotals = new Map();
  const statisticTypes = new Set();

  data.forEach(row => {
    const monthStr = row[monthCol];
    const value = parseFloat(row[valueCol]);
    const country = countryCol ? row[countryCol] : 'All';
    const statistic = statisticCol ? row[statisticCol] : 'Value';

    if (!monthStr || isNaN(value)) return;

    statisticTypes.add(statistic);

    // Aggregate by month and statistic type
    const key = `${monthStr}_${statistic}`;
    if (!monthlyData.has(key)) {
      monthlyData.set(key, {
        month: monthStr,
        statistic,
        totalValue: 0,
        count: 0,
        countries: new Map()
      });
    }

    const entry = monthlyData.get(key);
    entry.totalValue += value;
    entry.count++;
    entry.countries.set(country, (entry.countries.get(country) || 0) + value);

    // Track country totals
    const countryKey = `${country}_${statistic}`;
    countryTotals.set(countryKey, (countryTotals.get(countryKey) || 0) + value);
  });

  // Convert to sorted arrays by date
  const seriesByType = new Map();

  Array.from(monthlyData.values()).forEach(entry => {
    const date = parseMonthToDate(entry.month);
    if (!date) return;

    if (!seriesByType.has(entry.statistic)) {
      seriesByType.set(entry.statistic, []);
    }

    seriesByType.get(entry.statistic).push({
      month: entry.month,
      date,
      timestamp: date.getTime(),
      value: entry.totalValue,
      count: entry.count,
      topCountries: Array.from(entry.countries.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([country, val]) => ({ country, value: val }))
    });
  });

  // Sort each series by date
  seriesByType.forEach((series, type) => {
    series.sort((a, b) => a.timestamp - b.timestamp);
  });

  // Get top countries overall
  const topCountries = new Map();
  Array.from(statisticTypes).forEach(stat => {
    const countries = Array.from(countryTotals.entries())
      .filter(([key]) => key.endsWith(`_${stat}`))
      .map(([key, value]) => ({
        country: key.replace(`_${stat}`, ''),
        value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    topCountries.set(stat, countries);
  });

  return {
    seriesByType,
    statisticTypes: Array.from(statisticTypes),
    topCountries,
    monthCol,
    valueCol,
    countryCol
  };
}

/**
 * Holt's Exponential Smoothing (Double Exponential Smoothing)
 * For time series with trend but no seasonality
 */
export class HoltForecaster {
  constructor(alpha = 0.3, beta = 0.1) {
    this.alpha = alpha; // Level smoothing
    this.beta = beta;   // Trend smoothing
    this.level = null;
    this.trend = null;
    this.fitted = [];
    this.residuals = [];
    this.trainData = [];
  }

  /**
   * Fit the model to time series data
   */
  fit(values) {
    if (values.length < 2) {
      throw new Error('Need at least 2 data points');
    }

    this.trainData = [...values];

    // Initialize level and trend
    this.level = values[0];
    this.trend = values[1] - values[0];

    this.fitted = [this.level];
    this.residuals = [values[0] - this.level];

    // Apply exponential smoothing
    for (let i = 1; i < values.length; i++) {
      const prevLevel = this.level;
      const prevTrend = this.trend;

      // Update level
      this.level = this.alpha * values[i] + (1 - this.alpha) * (prevLevel + prevTrend);

      // Update trend
      this.trend = this.beta * (this.level - prevLevel) + (1 - this.beta) * prevTrend;

      const fitted = prevLevel + prevTrend;
      this.fitted.push(fitted);
      this.residuals.push(values[i] - fitted);
    }

    return this;
  }

  /**
   * Forecast future values
   */
  forecast(steps = 6) {
    if (this.level === null) {
      throw new Error('Model not fitted');
    }

    const predictions = [];
    for (let i = 1; i <= steps; i++) {
      predictions.push(Math.max(0, this.level + i * this.trend));
    }

    return predictions;
  }

  /**
   * Calculate confidence intervals
   */
  getConfidenceIntervals(steps = 6, confidence = 0.95) {
    const predictions = this.forecast(steps);

    // Calculate standard error from residuals
    const mse = this.residuals.reduce((sum, r) => sum + r * r, 0) / this.residuals.length;
    const se = Math.sqrt(mse);

    // Z-score for confidence level
    const z = confidence === 0.95 ? 1.96 : confidence === 0.9 ? 1.645 : 1.96;

    return predictions.map((pred, i) => {
      // Uncertainty grows with forecast horizon
      const uncertainty = se * Math.sqrt(1 + (i + 1) * 0.1);
      return {
        prediction: pred,
        lower: Math.max(0, pred - z * uncertainty),
        upper: pred + z * uncertainty
      };
    });
  }

  /**
   * Get model statistics
   */
  getStats() {
    if (this.trainData.length === 0) return null;

    const values = this.trainData;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    // R² score
    const ssRes = this.residuals.reduce((sum, r) => sum + r * r, 0);
    const ssTot = values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
    const r2 = 1 - (ssRes / ssTot);

    // RMSE
    const rmse = Math.sqrt(ssRes / values.length);

    // MAPE (Mean Absolute Percentage Error)
    const mape = values.reduce((sum, v, i) => {
      if (v === 0) return sum;
      return sum + Math.abs(this.residuals[i] / v);
    }, 0) / values.filter(v => v !== 0).length * 100;

    return {
      r2: Math.max(0, Math.min(1, r2)),
      rmse,
      mape,
      samples: values.length,
      alpha: this.alpha,
      beta: this.beta,
      lastLevel: this.level,
      lastTrend: this.trend
    };
  }
}

/**
 * Simple Moving Average forecaster (alternative)
 */
export class MovingAverageForecaster {
  constructor(window = 3) {
    this.window = window;
    this.values = [];
  }

  fit(values) {
    this.values = [...values];
    return this;
  }

  forecast(steps = 6) {
    const lastN = this.values.slice(-this.window);
    const avg = lastN.reduce((a, b) => a + b, 0) / lastN.length;
    return Array(steps).fill(avg);
  }
}

/**
 * Trade Data Forecaster - main class
 */
export class TradeForecaster {
  constructor() {
    this.models = new Map();
    this.processedData = null;
    this.trained = false;
  }

  /**
   * Train models for each statistic type
   */
  train(data, options = {}) {
    const { alpha = 0.3, beta = 0.1 } = options;

    this.processedData = preprocessTradeData(data);

    const trainResults = {};

    this.processedData.seriesByType.forEach((series, type) => {
      if (series.length < 3) {
        console.warn(`Skipping ${type}: not enough data points`);
        return;
      }

      const values = series.map(s => s.value);
      const model = new HoltForecaster(alpha, beta);

      try {
        model.fit(values);
        this.models.set(type, {
          model,
          series,
          lastDate: series[series.length - 1].date
        });

        trainResults[type] = {
          ...model.getStats(),
          dataPoints: series.length,
          dateRange: {
            start: series[0].month,
            end: series[series.length - 1].month
          }
        };
      } catch (e) {
        console.warn(`Failed to train ${type}:`, e.message);
      }
    });

    this.trained = true;
    return trainResults;
  }

  /**
   * Forecast future values
   */
  forecast(type, steps = 6) {
    if (!this.trained) throw new Error('Model not trained');

    const modelData = this.models.get(type);
    if (!modelData) throw new Error(`No model for type: ${type}`);

    const { model, series, lastDate } = modelData;
    const intervals = model.getConfidenceIntervals(steps);

    // Generate future month labels
    const forecasts = intervals.map((interval, i) => {
      const futureDate = addMonths(lastDate, i + 1);
      return {
        month: formatDateToMonth(futureDate),
        date: futureDate,
        ...interval,
        isForecast: true
      };
    });

    // Include historical data
    const historical = series.map(s => ({
      month: s.month,
      date: s.date,
      value: s.value,
      isForecast: false
    }));

    return {
      historical,
      forecasts,
      combined: [...historical, ...forecasts]
    };
  }

  /**
   * Get all available statistic types
   */
  getStatisticTypes() {
    return this.processedData?.statisticTypes || [];
  }

  /**
   * Get top countries for a statistic type
   */
  getTopCountries(type) {
    return this.processedData?.topCountries.get(type) || [];
  }

  /**
   * Get model statistics
   */
  getStats(type) {
    const modelData = this.models.get(type);
    if (!modelData) return null;
    return modelData.model.getStats();
  }

  /**
   * Get all stats
   */
  getAllStats() {
    const stats = {};
    this.models.forEach((modelData, type) => {
      stats[type] = {
        ...modelData.model.getStats(),
        dataPoints: modelData.series.length
      };
    });
    return stats;
  }
}

/**
 * Utility: Calculate growth rate
 */
export function calculateGrowthRate(values) {
  if (values.length < 2) return 0;

  const first = values[0];
  const last = values[values.length - 1];

  if (first === 0) return last > 0 ? 100 : 0;
  return ((last - first) / first) * 100;
}

/**
 * Utility: Calculate moving average
 */
export function movingAverage(values, window = 3) {
  const result = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}
