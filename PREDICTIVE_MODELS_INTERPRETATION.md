# Predictive Models: Trade Volume Forecaster & Price Sensitivity Predictor

## Technical Report: Model Selection, Methodology, and Interpretation

---

## Executive Summary

This report provides an in-depth analysis of two predictive models implemented for coffee market analysis:

1. **Trade Volume Forecaster** - Time series model using Holt's Exponential Smoothing
2. **Price Sensitivity Predictor** - Classification model using Random Forest ensemble

Both models are implemented in pure JavaScript, enabling client-side execution without external dependencies.

---

## Model 1: Trade Volume Forecaster

### 1.1 Why We Chose This Model

#### The Problem
Coffee trade data (imports/exports) exhibits **temporal dependencies**—each month's value is influenced by previous months. Traditional regression models treat each observation as independent, ignoring these sequential relationships.

#### Why Holt's Exponential Smoothing?

| Consideration | Why Holt's Method Wins |
|---------------|------------------------|
| **Trend Detection** | Coffee trade shows clear upward/downward trends; Holt's explicitly models trend |
| **Data Availability** | Works with limited data (as few as 3 observations) |
| **Computational Efficiency** | O(n) complexity; runs instantly in browser |
| **Interpretability** | Two intuitive parameters (α for level, β for trend) |
| **No Stationarity Requirement** | Unlike ARIMA, no need to difference the data |

#### Alternatives Considered

| Model | Reason for Rejection |
|-------|---------------------|
| **ARIMA** | Requires stationarity testing, complex parameter selection (p,d,q), overkill for monthly data |
| **Prophet** | Requires external library, designed for daily data with multiple seasonalities |
| **LSTM/RNN** | Needs thousands of samples for training; we have ~20 monthly observations |
| **Simple Moving Average** | Cannot capture trend; forecasts are flat |
| **Holt-Winters** | Adds seasonal component we don't have evidence for; more parameters = overfitting risk |

---

### 1.2 How It Works

#### Mathematical Foundation

Holt's method decomposes the time series into two components:

1. **Level (Lₜ)**: The baseline value at time t
2. **Trend (Tₜ)**: The rate of change per period

**Update Equations:**

```
Level:     Lₜ = α × yₜ + (1 - α) × (Lₜ₋₁ + Tₜ₋₁)
Trend:     Tₜ = β × (Lₜ - Lₜ₋₁) + (1 - β) × Tₜ₋₁
Forecast:  ŷₜ₊ₕ = Lₜ + h × Tₜ
```

Where:
- `yₜ` = observed value at time t
- `α` = level smoothing parameter (0.3 default)
- `β` = trend smoothing parameter (0.1 default)
- `h` = forecast horizon (months ahead)

#### Algorithm Step-by-Step

```
┌─────────────────────────────────────────────────────────────┐
│                    HOLT'S METHOD FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: INITIALIZATION                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ L₀ = first observation                               │   │
│  │ T₀ = second observation - first observation          │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  Step 2: ITERATIVE SMOOTHING (for each observation)        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Update Level: blend current value + previous trend   │   │
│  │ Update Trend: blend current change + previous trend  │   │
│  │ Calculate fitted value and residual                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  Step 3: FORECASTING                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ For h months ahead: prediction = Level + h × Trend   │   │
│  │ Add confidence intervals based on residual variance  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Parameter Interpretation

| Parameter | Value | Interpretation |
|-----------|-------|----------------|
| **α = 0.3** | Low-moderate | Model is somewhat "sticky" - doesn't overreact to single-month spikes |
| **β = 0.1** | Low | Trend changes slowly - prevents erratic forecast swings |

**Effect of α:**
- **High α (→1)**: Quick response to recent values; good for volatile data
- **Low α (→0)**: Smooth response; good for noisy data with stable underlying level

**Effect of β:**
- **High β (→1)**: Trend changes rapidly based on recent movements
- **Low β (→0)**: Trend is stable; forecasts extend current trajectory

---

### 1.3 Interpretation of Results

#### Output Metrics Explained

| Metric | What It Measures | Good Value | Interpretation |
|--------|------------------|------------|----------------|
| **R² Score** | Variance explained by model | > 0.7 | "Model explains 70%+ of the variation in trade volumes" |
| **RMSE** | Average forecast error magnitude | Context-dependent | "On average, forecasts are off by €X million" |
| **MAPE** | Percentage error | < 15% | "Forecasts are within 15% of actual values" |
| **Last Level** | Current baseline value | N/A | "Current trade volume baseline is €X million/month" |
| **Last Trend** | Monthly change rate | Positive/Negative | "Trade is increasing/decreasing by €X million per month" |

#### Reading the Forecast Output

```
Example Output:
──────────────────────────────────────────────────
Historical: 2023 Jan (€100M) → 2023 Dec (€115M)
Forecast:   2024 Jan: €117M [€105M - €129M]
            2024 Feb: €119M [€104M - €134M]
            2024 Mar: €121M [€102M - €140M]
──────────────────────────────────────────────────

Interpretation:
• Central forecast shows +€2M monthly trend
• Widening confidence intervals = growing uncertainty
• 95% CI: We're 95% confident actual value falls in this range
```

#### Business Interpretation Framework

**Scenario 1: Positive Trend + Narrow Confidence Interval**
```
Trend: +3.5% monthly | CI width: ±8%
→ Strong, consistent growth pattern
→ High confidence in continued import growth
→ Action: Plan for increased procurement needs
```

**Scenario 2: Negative Trend + Wide Confidence Interval**
```
Trend: -2.1% monthly | CI width: ±25%
→ Declining but volatile pattern
→ Could reverse or accelerate
→ Action: Monitor closely; build inventory buffer
```

**Scenario 3: Flat Trend + Narrow Confidence Interval**
```
Trend: +0.3% monthly | CI width: ±6%
→ Stable, predictable market
→ Action: Maintain current procurement strategy
```

---

## Model 2: Price Sensitivity Predictor

### 2.1 Why We Chose This Model

#### The Problem
Customer willingness to pay varies significantly based on demographics, preferences, and behaviors. A single price point either:
- Loses budget-conscious customers (too high)
- Leaves money on the table from premium customers (too low)

We need a model that can **classify customers into price tiers** based on survey responses.

#### Why Random Forest?

| Consideration | Why Random Forest Wins |
|---------------|------------------------|
| **Noisy Data** | Survey responses contain inconsistencies; ensemble averaging reduces variance |
| **Non-linear Boundaries** | Students may pay premium for specialty drinks but budget for daily coffee—complex interactions |
| **Feature Importance** | Automatically identifies which factors matter most |
| **Probability Outputs** | Voting proportions give confidence levels, not just binary predictions |
| **Robustness** | Bootstrap sampling prevents overfitting to any single pattern |

#### Alternatives Considered

| Model | Reason for Rejection |
|-------|---------------------|
| **Logistic Regression** | Assumes linear decision boundaries; can't capture "income × age" interactions |
| **Single Decision Tree** | High variance; overfits to training quirks |
| **SVM** | Requires careful kernel selection; no probability outputs without calibration |
| **K-Nearest Neighbors** | Sensitive to feature scaling; no feature importance |
| **Neural Network** | Overkill for ~50 samples; black-box predictions unhelpful for marketing |

---

### 2.2 How It Works

#### Algorithm Overview

Random Forest builds multiple decision trees, each trained on a random subset of the data and features, then combines their predictions through voting.

```
┌────────────────────────────────────────────────────────────────────┐
│                    RANDOM FOREST ARCHITECTURE                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                        Training Data                               │
│                             │                                      │
│          ┌──────────────────┼──────────────────┐                  │
│          │                  │                  │                  │
│          ▼                  ▼                  ▼                  │
│    ┌──────────┐       ┌──────────┐       ┌──────────┐            │
│    │ Bootstrap │       │ Bootstrap │       │ Bootstrap │  ... ×15 │
│    │ Sample 1  │       │ Sample 2  │       │ Sample 3  │            │
│    └────┬─────┘       └────┬─────┘       └────┬─────┘            │
│         │                  │                  │                  │
│         ▼                  ▼                  ▼                  │
│    ┌──────────┐       ┌──────────┐       ┌──────────┐            │
│    │  Random   │       │  Random   │       │  Random   │            │
│    │ Features  │       │ Features  │       │ Features  │            │
│    │  (√n)     │       │  (√n)     │       │  (√n)     │            │
│    └────┬─────┘       └────┬─────┘       └────┬─────┘            │
│         │                  │                  │                  │
│         ▼                  ▼                  ▼                  │
│    ┌──────────┐       ┌──────────┐       ┌──────────┐            │
│    │  Tree 1   │       │  Tree 2   │       │  Tree 3   │            │
│    │ (Gini)    │       │ (Gini)    │       │ (Gini)    │            │
│    └────┬─────┘       └────┬─────┘       └────┬─────┘            │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                      │
│                            ▼                                      │
│                   ┌────────────────┐                              │
│                   │  Majority Vote  │                              │
│                   │  + Probability  │                              │
│                   └────────────────┘                              │
│                            │                                      │
│                            ▼                                      │
│              Final Prediction + Confidence                        │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

#### Key Components Explained

**1. Bootstrap Sampling**
Each tree sees a random subset of customers (sampling with replacement).
- Tree 1 might see: Customer [1, 3, 3, 7, 12, 12, 15, ...]
- Tree 2 might see: Customer [2, 2, 5, 8, 9, 11, 14, ...]

This diversity prevents any single outlier from dominating.

**2. Random Feature Selection**
For 12 total features, each tree considers only √12 ≈ 4 features at each split.
- Forces trees to learn different patterns
- Reduces correlation between trees
- Improves ensemble diversity

**3. Gini Impurity (Splitting Criterion)**
At each node, the algorithm finds the split that maximizes "purity":

```
Gini = 1 - Σ(pᵢ²)

Where pᵢ = proportion of class i in the node

Pure node (all same class): Gini = 0
Maximum impurity (even split): Gini = 0.67 (for 3 classes)
```

**4. Majority Voting**
For a new customer, each tree votes:
- Tree 1: "Premium"
- Tree 2: "Moderate"
- Tree 3: "Premium"
- ...
- Tree 15: "Premium"

**Result:** 9 Premium, 4 Moderate, 2 Budget → Predict "Premium" with 60% confidence

---

### 2.3 Features Used

The model uses 12 features extracted from survey responses:

| Feature | Type | Encoding | Rationale |
|---------|------|----------|-----------|
| **Age** | Numeric | Raw value | Income potential increases with age |
| **Income** | Numeric | Raw value (€) | Direct ability to pay |
| **Cups/Day** | Numeric | Raw value | Heavy users may seek value |
| **Gender** | Categorical | 0=Male, 1=Female, 2=Other | Preference patterns differ |
| **Temperature Preference** | Categorical | 0=Hot, 1=Cold, 2=Both | Cold drinks often premium-priced |
| **Chain Preference** | Categorical | 0=Chain, 1=Local, 2=Both | Local preference suggests quality focus |
| **Productivity Focus** | Categorical | 0=No, 1=Maybe, 2=Yes | Productivity buyers are price-insensitive |
| **Reusable Cup** | Categorical | 0=No, 1=Sometimes, 2=Yes | Environmental awareness correlates with premium |
| **Is Student** | Binary | 0/1 | Students are typically budget-conscious |
| **Is Fulltime** | Binary | 0/1 | Stable income enables higher spending |
| **Energy Focused** | Binary | 0/1 | Energy seekers may pay for effectiveness |
| **Taste Focused** | Binary | 0/1 | Taste focus indicates quality preference |

---

### 2.4 Price Categories

Customers are classified into three tiers based on their stated willingness to pay:

| Category | Price Range | Typical Profile |
|----------|-------------|-----------------|
| **Budget** | €0 - €3 | Students, low income, high consumption, price-driven |
| **Moderate** | €3 - €4.50 | Working professionals, value-conscious, balanced priorities |
| **Premium** | €4.50+ | High income, quality-focused, experience-seekers |

---

### 2.5 Interpretation of Results

#### Output Metrics Explained

| Metric | What It Measures | Interpretation |
|--------|------------------|----------------|
| **Accuracy** | % of correct predictions on training data | "Model correctly classifies X% of customers" |
| **Distribution** | Count per category | "Our customer base is X% budget, Y% moderate, Z% premium" |
| **Average Prices** | Mean willingness by category | "Budget customers average €2.50, Premium average €5.20" |
| **Feature Importance** | Relative predictive power | "Income contributes 25% to predictions" |

#### Reading Prediction Output

```
Example Prediction for New Customer:
──────────────────────────────────────────────────
Input:
  Age: 28, Income: €35,000, Cups: 2
  Student: No, Fulltime: Yes
  Prefers: Local coffee shops, Hot drinks
  Focus: Taste, Productivity: Yes

Output:
  Category: Premium
  Probability: Budget=10%, Moderate=25%, Premium=65%
  Suggested Price: €4.85
──────────────────────────────────────────────────

Interpretation:
• Strong premium signal (65% confidence)
• Some moderate potential (25%)—could be price-promoted
• Very unlikely to be budget-driven
• Profile: Working professional, quality-focused, willing to pay for taste
```

#### Feature Importance Interpretation

```
Example Feature Importance:
──────────────────────────────────────────────────
1. Income Level      ████████████████████  23%
2. Age               ████████████████      18%
3. Is Student        ██████████████        16%
4. Productivity      ████████████          14%
5. Chain Preference  ████████████          13%
6. Taste Focused     ██████████            11%
7. Cups per Day      ██████                 5%
──────────────────────────────────────────────────

Interpretation:
• Income dominates—ability to pay is the strongest signal
• Age matters—older customers trend premium
• Student status is a strong budget indicator
• Productivity buyers are less price-sensitive
• Local coffee preference signals quality focus
```

#### Business Application Framework

**Customer Profiling:**

```
Profile A: "The Premium Professional"
├─ Age: 35-50
├─ Income: €50,000+
├─ Fulltime employed
├─ Prefers local coffee shops
├─ Taste-focused, productivity-driven
└─ Prediction: Premium (85%+ probability)
   → Strategy: Premium menu, origin stories, loyalty program

Profile B: "The Budget Student"
├─ Age: 18-25
├─ Income: <€15,000
├─ Student status
├─ Prefers chains (convenience)
├─ Energy-focused
└─ Prediction: Budget (75%+ probability)
   → Strategy: Student discounts, smaller sizes, value combos

Profile C: "The Moderate Worker"
├─ Age: 25-35
├─ Income: €25,000-40,000
├─ Fulltime or parttime
├─ Mixed chain/local preference
├─ Balanced focus
└─ Prediction: Moderate (60%+ probability)
   → Strategy: Standard menu, occasional promotions
```

---

## Model Comparison

| Aspect | Trade Volume Forecaster | Price Sensitivity Predictor |
|--------|-------------------------|----------------------------|
| **Purpose** | Predict future trade values | Classify customers by price tier |
| **Algorithm** | Holt's Exponential Smoothing | Random Forest (15 trees) |
| **Input** | Time-ordered trade data | Customer survey responses |
| **Output** | Numeric forecast + confidence | Category + probabilities |
| **Complexity** | O(n) linear | O(n × trees × depth) |
| **Key Metric** | R², RMSE, MAPE | Accuracy, Feature Importance |
| **Interpretability** | High (2 parameters) | Medium (ensemble voting) |
| **Best For** | Supply planning, procurement | Pricing strategy, segmentation |

---

## Practical Usage Guide

### Trade Volume Forecaster

**When to Use:**
- Planning procurement 3-6 months ahead
- Identifying supply trends before they affect prices
- Setting inventory buffers based on uncertainty

**Key Questions It Answers:**
1. "Will coffee imports increase or decrease?"
2. "How confident are we in this forecast?"
3. "What's the worst-case scenario for supply?"

### Price Sensitivity Predictor

**When to Use:**
- Designing tiered pricing strategies
- Targeting promotions to specific segments
- Understanding what drives willingness to pay

**Key Questions It Answers:**
1. "Which customers will pay premium prices?"
2. "What percentage of our base is budget-conscious?"
3. "What factors most influence price sensitivity?"

---

## Technical Notes

### Implementation Details

Both models are implemented in pure JavaScript:

```javascript
// Trade Forecaster
const forecaster = new TradeForecaster();
forecaster.train(tradeData, { alpha: 0.3, beta: 0.1 });
const forecast = forecaster.forecast('Value of Imports', 6);

// Price Sensitivity
const model = new PriceSensitivityModel();
model.train(surveyData);
const prediction = model.predict({
  age: 28,
  income: 35000,
  isStudent: false,
  // ... other features
});
```

### Limitations

| Model | Limitation | Mitigation |
|-------|------------|------------|
| Trade Forecaster | No seasonality component | Monitor for seasonal patterns; upgrade to Holt-Winters if needed |
| Trade Forecaster | Confidence intervals widen with horizon | Limit forecasts to 6 months; refresh model monthly |
| Price Sensitivity | Limited training data (~50 samples) | Collect more survey responses; use cross-validation |
| Price Sensitivity | Feature importance is approximate | Based on selection frequency, not true Gini importance |

---

## Conclusion

These two models provide complementary capabilities for coffee market analysis:

- **Trade Volume Forecaster** enables supply-side planning by predicting future import/export volumes with quantified uncertainty
- **Price Sensitivity Predictor** enables demand-side optimization by classifying customers into price tiers for targeted strategies

Together, they form the backbone of a data-driven approach to navigating rising coffee prices and evolving consumer preferences.

---

*Report prepared for Data Table Analyzer - Coffee Market Analysis Module*
