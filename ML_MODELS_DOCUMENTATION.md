# Machine Learning Models Documentation

This document describes the four predictive models available in the Data Table Analyzer application. All models are implemented in pure JavaScript without external ML dependencies.

---

## 1. Decision Tree Classifier

**File:** `src/ml/decisionTree.js`
**Panel:** `DecisionTreePanel.jsx`

### Purpose
Classifies data into categories based on feature values using a tree-based decision structure. Ideal for understanding which features most influence a particular outcome.

### Algorithm
- **ID3 (Iterative Dichotomiser 3)** algorithm
- Uses **entropy** and **information gain** to select the best splitting feature at each node
- Recursively builds a tree until stopping criteria are met (max depth, min samples, or pure nodes)

### How It Works
1. Calculate entropy (measure of randomness) for the target variable
2. For each feature, calculate information gain (reduction in entropy after splitting)
3. Select the feature with highest information gain as the split point
4. Recursively build subtrees for each branch
5. Stop when max depth reached, node is pure, or insufficient samples

### Key Features
- **Automatic feature detection:** Identifies categorical and numeric columns
- **Tree visualization:** Displays the decision tree structure
- **Feature importance:** Shows which features contribute most to predictions
- **Accuracy metrics:** Reports training accuracy and tree depth

### Best Use Cases
- Classification problems (e.g., "Will this customer buy?")
- Understanding decision factors
- Data with mixed categorical and numeric features
- When interpretability is important

### Input Requirements
- Target column (what you want to predict)
- At least one feature column
- Minimum 10 samples recommended

---

## 2. Demand Regression Model

**File:** `src/ml/linearRegression.js`
**Panel:** `DemandRegressionPanel.jsx`

### Purpose
Predicts numeric demand/sales values based on environmental and temporal factors. Designed for retail and inventory forecasting scenarios.

### Algorithm
- **Multiple Linear Regression** using the Normal Equation
- Formula: `y = β₀ + β₁x₁ + β₂x₂ + ... + βₙxₙ`
- Solves for coefficients using least squares optimization

### How It Works
1. Preprocess data to extract features (weather, time, day, season)
2. Encode categorical variables to numeric values
3. Build feature matrix X and target vector y
4. Solve normal equation: `β = (XᵀX)⁻¹Xᵀy`
5. Use coefficients to make predictions

### Encoded Features
| Feature | Encoding |
|---------|----------|
| Day | Monday=0, Tuesday=1, ..., Sunday=6 |
| Time Slot | Morning=0, Afternoon=1, Evening=2 |
| Season | Winter=0, Spring=1, Summer=2, Autumn=3 |
| Rain | Boolean (0 or 1) |
| Temperature | Numeric (min/max) |

### Key Features
- **Weather-aware:** Incorporates rain and temperature
- **Temporal patterns:** Day of week and time of day effects
- **Seasonal adjustment:** Automatically detects seasonal patterns
- **Coefficient analysis:** Shows impact of each factor on demand

### Metrics Provided
- **R² Score:** How well the model explains variance (0-1, higher is better)
- **RMSE:** Root Mean Square Error (lower is better)
- **Coefficients:** Impact weight of each feature

### Best Use Cases
- Sales forecasting
- Inventory planning
- Demand prediction based on weather
- Understanding temporal demand patterns

### Input Requirements
- Numeric target column (sales/quantity)
- Date/time information
- Weather data (optional but improves accuracy)

---

## 3. Trade Volume Forecaster

**File:** `src/ml/timeSeriesForecasting.js`
**Panel:** `TradeForecasterPanel.jsx`

### Purpose
Forecasts future trade values (imports/exports) based on historical time series data. Uses exponential smoothing to capture trends.

### Algorithm
- **Holt's Exponential Smoothing** (Double Exponential Smoothing)
- Captures both **level** and **trend** components
- Suitable for data with trends but without strong seasonality

### How It Works
1. Parse monthly trade data and aggregate by statistic type
2. Initialize level (L₀) and trend (T₀) from first two observations
3. Update equations:
   - Level: `Lₜ = α·yₜ + (1-α)·(Lₜ₋₁ + Tₜ₋₁)`
   - Trend: `Tₜ = β·(Lₜ - Lₜ₋₁) + (1-β)·Tₜ₋₁`
4. Forecast: `ŷₜ₊ₕ = Lₜ + h·Tₜ`

### Parameters
| Parameter | Default | Description |
|-----------|---------|-------------|
| α (alpha) | 0.3 | Level smoothing factor (0-1) |
| β (beta) | 0.1 | Trend smoothing factor (0-1) |

### Key Features
- **Multi-series support:** Handles imports/exports separately
- **Confidence intervals:** 95% prediction intervals
- **Top countries analysis:** Shows major trading partners
- **Growth rate calculation:** Year-over-year trend analysis

### Metrics Provided
- **R² Score:** Model fit quality
- **RMSE:** Forecast error magnitude
- **MAPE:** Mean Absolute Percentage Error
- **Trend direction:** Increasing/decreasing indicator

### Visualization
- Historical data line chart
- Forecast with confidence bands
- Top trading countries bar chart

### Best Use Cases
- Trade volume forecasting
- Economic trend analysis
- Import/export planning
- Government statistics analysis

### Input Requirements
- Month column (format: "YYYY Month", e.g., "2023 January")
- Value column (numeric trade values)
- Statistic type column (optional, for multi-series)

---

## 4. Price Sensitivity Predictor

**File:** `src/ml/priceSensitivity.js`
**Panel:** `PriceSensitivityPanel.jsx`

### Purpose
Predicts customer willingness to pay based on demographics and preferences. Classifies customers into price sensitivity categories for targeted pricing strategies.

### Algorithm
- **Random Forest Classifier** (ensemble of decision trees)
- Uses **Gini impurity** for splitting decisions
- Aggregates predictions from multiple trees via voting

### How It Works
1. Preprocess survey data to extract features
2. Categorize price willingness into buckets:
   - **Budget:** €0-3
   - **Moderate:** €3-4.50
   - **Premium:** €4.50+
3. Train ensemble of 15 decision trees with:
   - Bootstrap sampling (random data subsets)
   - Random feature selection (sqrt of total features)
4. Predict by majority voting across all trees
5. Calculate probability as vote proportion

### Features Used
| Feature | Type | Description |
|---------|------|-------------|
| Age | Numeric | Customer age group |
| Income | Numeric | Annual income level |
| Cups/Day | Numeric | Coffee consumption |
| Gender | Categorical | Gender identity |
| Temperature | Categorical | Hot/Cold preference |
| Chain Preference | Categorical | Large chain vs local |
| Productivity | Categorical | Buys for productivity |
| Reusable Cup | Categorical | Environmental awareness |
| Employment | Binary | Student, Full-time, etc. |
| Focus | Binary | Energy vs Taste focused |

### Key Features
- **Customer profiling:** Interactive prediction form
- **Probability distribution:** Shows likelihood for each category
- **Feature importance:** Identifies key pricing factors
- **Suggested price point:** Recommends optimal price per category

### Metrics Provided
- **Accuracy:** Classification accuracy on training data
- **Distribution:** Customer breakdown by category
- **Average prices:** Mean willingness to pay per category

### Best Use Cases
- Pricing strategy development
- Customer segmentation
- Market research analysis
- Targeted marketing campaigns

### Input Requirements
- Price/willingness to pay column
- Demographic columns (age, gender, income)
- Preference columns (optional but improve accuracy)

---

## Model Comparison

| Model | Type | Output | Best For |
|-------|------|--------|----------|
| Decision Tree | Classification | Categories | Understanding decisions |
| Demand Regression | Regression | Numbers | Sales forecasting |
| Trade Forecaster | Time Series | Future values | Trend prediction |
| Price Sensitivity | Classification | Price categories | Customer segmentation |

---

## Technical Notes

### No External Dependencies
All models are implemented in pure JavaScript, making them:
- Fast to load (no large ML libraries)
- Easy to deploy (no Python/R backend needed)
- Browser-compatible (runs entirely client-side)

### Limitations
- **Decision Tree:** May overfit with deep trees
- **Linear Regression:** Assumes linear relationships
- **Holt's Method:** Doesn't handle strong seasonality
- **Random Forest:** Training time increases with data size

### Performance Tips
- Keep datasets under 10,000 rows for smooth UI
- Use representative training data
- Retrain models when data changes significantly

---

*Generated for Data Table Analyzer - Built with React, ECharts, and Tailwind CSS*
