# Machine Learning Models in Data Table Analyzer: A Technical Report

**Course:** Data Analytics & Machine Learning
**Project:** Data Table Analyzer Web Application
**Date:** December 2024

---

## Abstract

This report presents the design and implementation of four machine learning models integrated into the Data Table Analyzer web application. The models address distinct analytical challenges: classification using decision trees, demand forecasting through linear regression, time series prediction with exponential smoothing, and customer segmentation via ensemble methods. All implementations are developed in pure JavaScript, enabling client-side execution without external dependencies. This approach demonstrates the feasibility of deploying machine learning solutions directly in web browsers while maintaining computational efficiency and user accessibility.

---

## 1. Introduction

### 1.1 Background

The proliferation of data-driven decision making has created demand for accessible analytical tools that can be deployed without specialized infrastructure. Traditional machine learning implementations rely on server-side processing or specialized libraries, creating barriers for users who require quick insights from their data.

### 1.2 Objectives

This project aims to:

1. Implement fundamental machine learning algorithms in pure JavaScript
2. Provide intuitive user interfaces for non-technical users
3. Enable real-time model training and prediction in the browser
4. Support diverse data formats and analytical scenarios

### 1.3 Scope

The application includes four distinct models, each targeting specific analytical use cases:

- **Decision Tree Classifier** for categorical prediction
- **Demand Regression Model** for sales forecasting
- **Trade Volume Forecaster** for time series analysis
- **Price Sensitivity Predictor** for customer segmentation

---

## 2. Literature Review

### 2.1 Decision Trees

Decision trees, introduced by Quinlan (1986) with the ID3 algorithm, remain one of the most interpretable machine learning methods. The algorithm recursively partitions data based on feature values that maximize information gain, calculated as the reduction in entropy after a split. The mathematical foundation relies on Shannon's entropy:

$$H(S) = -\sum_{i=1}^{c} p_i \log_2(p_i)$$

where $p_i$ represents the proportion of samples belonging to class $i$.

### 2.2 Linear Regression

Linear regression, dating to Legendre (1805) and Gauss (1809), models the relationship between dependent and independent variables through a linear function. The ordinary least squares method minimizes the sum of squared residuals, yielding coefficients that can be computed directly via the normal equation:

$$\boldsymbol{\beta} = (\mathbf{X}^T\mathbf{X})^{-1}\mathbf{X}^T\mathbf{y}$$

### 2.3 Exponential Smoothing

Holt (1957) extended simple exponential smoothing to capture trends in time series data. The double exponential smoothing method maintains two components—level and trend—updated iteratively with smoothing parameters $\alpha$ and $\beta$.

### 2.4 Ensemble Methods

Breiman (2001) introduced Random Forests, demonstrating that aggregating predictions from multiple decision trees reduces variance and improves generalization. The method combines bootstrap aggregating (bagging) with random feature selection.

---

## 3. Methodology

### 3.1 Decision Tree Classifier

#### 3.1.1 Algorithm Description

The implementation follows the ID3 algorithm with the following procedure:

1. **Calculate base entropy** of the target variable
2. **Evaluate each feature** by computing information gain
3. **Select the optimal split** based on maximum information gain
4. **Recursively construct subtrees** for each branch
5. **Terminate** when stopping criteria are met

#### 3.1.2 Implementation Details

The classifier supports both categorical and discretized numeric features. Stopping criteria include:

- Maximum tree depth (default: 10)
- Minimum samples per leaf (default: 2)
- Pure nodes (all samples belong to one class)
- Information gain below threshold

#### 3.1.3 Feature Selection

Information gain is computed as:

$$IG(S, A) = H(S) - \sum_{v \in Values(A)} \frac{|S_v|}{|S|} H(S_v)$$

where $S$ is the dataset, $A$ is the feature being evaluated, and $S_v$ is the subset where feature $A$ has value $v$.

### 3.2 Demand Regression Model

#### 3.2.1 Problem Formulation

The demand prediction task models sales volume as a function of environmental and temporal factors:

$$\hat{y} = \beta_0 + \beta_1 x_{rain} + \beta_2 x_{temp} + \beta_3 x_{day} + \beta_4 x_{time} + \beta_5 x_{season}$$

#### 3.2.2 Feature Engineering

Categorical variables require numeric encoding:

| Variable | Encoding Scheme |
|----------|----------------|
| Day of Week | Ordinal (0-6) |
| Time Slot | Morning=0, Afternoon=1, Evening=2 |
| Season | Winter=0, Spring=1, Summer=2, Autumn=3 |
| Rain | Binary (0/1) |

#### 3.2.3 Model Fitting

The normal equation provides a closed-form solution, avoiding iterative optimization. Matrix operations are implemented using nested array manipulations to compute the inverse and matrix products.

#### 3.2.4 Evaluation Metrics

Model performance is assessed using:

- **R-squared (R²):** Proportion of variance explained
- **Root Mean Square Error (RMSE):** Average prediction error magnitude

### 3.3 Trade Volume Forecaster

#### 3.3.1 Holt's Method

Double exponential smoothing maintains level ($L_t$) and trend ($T_t$) components:

**Level update:**
$$L_t = \alpha y_t + (1-\alpha)(L_{t-1} + T_{t-1})$$

**Trend update:**
$$T_t = \beta(L_t - L_{t-1}) + (1-\beta)T_{t-1}$$

**Forecast:**
$$\hat{y}_{t+h} = L_t + h \cdot T_t$$

#### 3.3.2 Parameter Selection

Default parameters ($\alpha = 0.3$, $\beta = 0.1$) provide balanced responsiveness to recent observations while maintaining stability. Lower values produce smoother forecasts; higher values respond more quickly to changes.

#### 3.3.3 Confidence Intervals

Prediction uncertainty is quantified using the standard error of residuals:

$$SE = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(y_i - \hat{y}_i)^2}$$

The 95% confidence interval expands with forecast horizon to reflect increasing uncertainty.

### 3.4 Price Sensitivity Predictor

#### 3.4.1 Classification Framework

Customers are categorized into three price sensitivity segments based on willingness to pay:

| Category | Price Range | Interpretation |
|----------|-------------|----------------|
| Budget | €0 - €3.00 | Price-conscious consumers |
| Moderate | €3.00 - €4.50 | Value-oriented consumers |
| Premium | > €4.50 | Quality-focused consumers |

#### 3.4.2 Random Forest Implementation

The ensemble consists of 15 decision trees, each trained on:

- **Bootstrap sample:** Random sampling with replacement
- **Feature subset:** Square root of total features, randomly selected

#### 3.4.3 Prediction Aggregation

Final predictions are determined by majority voting:

$$\hat{y} = \text{mode}\{h_1(x), h_2(x), ..., h_B(x)\}$$

Probability estimates are computed as vote proportions across trees.

#### 3.4.4 Feature Space

The model utilizes 12 features spanning demographics and behavioral indicators:

1. Age (numeric)
2. Annual income (numeric)
3. Daily coffee consumption (numeric)
4. Gender (categorical)
5. Temperature preference (categorical)
6. Retail preference (categorical)
7. Productivity motivation (categorical)
8. Reusable cup usage (categorical)
9. Student status (binary)
10. Full-time employment (binary)
11. Energy focus (binary)
12. Taste focus (binary)

---

## 4. Implementation

### 4.1 Technical Architecture

All models are implemented in ES6 JavaScript modules, enabling:

- **Tree-shaking:** Unused code elimination during bundling
- **Lazy loading:** Models loaded only when needed
- **Type coercion:** Automatic handling of CSV string values

### 4.2 User Interface Design

Each model features a dedicated panel component built with React, incorporating:

- **Training controls:** Single-click model initialization
- **Parameter configuration:** Adjustable model settings
- **Visualization:** ECharts-based interactive graphics
- **Prediction interface:** Form-based input for new predictions

### 4.3 Data Preprocessing

The application implements robust preprocessing pipelines:

```
Raw CSV → Type Detection → Missing Value Handling →
Feature Encoding → Normalization → Model Input
```

---

## 5. Results and Discussion

### 5.1 Decision Tree Performance

The decision tree classifier demonstrates strong interpretability, producing human-readable decision rules. Feature importance rankings help users understand which variables most influence predictions. However, the model may overfit with deep trees on small datasets.

### 5.2 Regression Model Accuracy

The demand regression model effectively captures linear relationships between environmental factors and sales. The R² metric provides immediate feedback on model fit. Limitations include the assumption of linear relationships, which may not hold for all datasets.

### 5.3 Forecasting Capabilities

The trade volume forecaster successfully identifies trends in historical data and projects future values with confidence bounds. The method performs well for data exhibiting consistent trends but may struggle with highly volatile or seasonal patterns.

### 5.4 Classification Results

The Random Forest classifier benefits from ensemble averaging, reducing overfitting compared to single decision trees. The probability outputs enable nuanced business decisions beyond simple category assignments.

---

## 6. Model Interpretations and Business Insights

This section provides practical interpretations of each model's outputs and their implications for business decision-making.

### 6.1 Decision Tree Classifier: Understanding Decision Pathways

#### 6.1.1 Interpretation Framework

The decision tree model produces hierarchical rules that mirror human reasoning processes. When analyzing the tree structure, practitioners should consider:

**Feature Importance Analysis:**
- Features appearing near the root of the tree have the highest discriminative power
- The depth at which a feature appears correlates inversely with its overall importance
- Features that never appear in the tree may be redundant or irrelevant to the classification task

**Rule Extraction:**
Each path from root to leaf represents a classification rule. For example:
```
IF temperature > 20°C AND day = "Saturday" AND time = "Afternoon"
THEN category = "High Traffic"
```

Such rules provide actionable insights for operational planning and resource allocation.

#### 6.1.2 Business Applications

**Customer Behavior Analysis:**
- Identify the primary factors driving customer decisions
- Segment customers based on decision pathways
- Detect unexpected decision patterns that may indicate market opportunities

**Quality Control:**
- Establish clear criteria for product categorization
- Create transparent audit trails for classification decisions
- Enable non-technical stakeholders to understand and validate model logic

**Risk Assessment:**
- Map risk factors to outcomes through interpretable paths
- Identify high-risk combinations of attributes
- Support regulatory compliance through explainable predictions

#### 6.1.3 Limitations in Interpretation

- Deep trees may produce rules that appear logical but represent overfitting
- Categorical variables with many values can dominate the tree structure
- The greedy splitting algorithm may miss globally optimal decision boundaries

### 6.2 Demand Regression Model: Quantifying Environmental Impact

#### 6.2.1 Coefficient Interpretation

The regression coefficients ($\beta$ values) provide direct measurements of each factor's impact on demand:

**Weather Effects:**
- **Rain coefficient ($\beta_{rain}$):** A negative coefficient indicates reduced demand during rainy periods. The magnitude represents the average decrease in units sold when rain occurs.
- **Temperature coefficient ($\beta_{temp}$):** Positive values suggest increased demand with warmer temperatures, common for beverages, outdoor products, and seasonal items.

**Temporal Patterns:**
- **Day of week effects:** Coefficients reveal weekly demand cycles. Weekend coefficients higher than weekdays may indicate leisure-oriented purchasing behavior.
- **Time slot effects:** Morning, afternoon, and evening coefficients quantify intraday demand variations, supporting shift scheduling and inventory timing.

**Seasonal Adjustments:**
- **Season coefficients:** Capture longer-term demand cycles beyond weather effects. The difference between summer and winter coefficients indicates seasonal demand amplitude.

#### 6.2.2 Practical Business Insights

**Inventory Management:**
- Use weather forecasts combined with regression coefficients to predict next-day demand
- Calculate safety stock levels based on prediction uncertainty (RMSE)
- Optimize order quantities by accounting for day-of-week patterns

**Staffing Optimization:**
- Align workforce scheduling with predicted demand peaks
- Quantify the staffing impact of weather changes (e.g., "Rainy Saturdays require 15% fewer staff")
- Plan promotional events during predicted high-demand periods

**Financial Planning:**
- Project revenue under different weather scenarios
- Build weather-adjusted sales forecasts for budgeting
- Assess the financial risk of adverse weather conditions

#### 6.2.3 Model Diagnostics

**R² Interpretation:**
- R² = 0.70 indicates that 70% of demand variation is explained by the model
- Remaining variation (1 - R²) represents factors not captured: promotions, competitor actions, special events

**Residual Analysis:**
- Consistent over-prediction on certain days suggests missing categorical variables
- Increasing residuals at extreme temperatures may indicate non-linear relationships
- Clustered residuals by location could justify location-specific models

### 6.3 Trade Volume Forecaster: Trend Analysis and Economic Indicators

#### 6.3.1 Interpreting Forecast Components

**Level Component ($L_t$):**
The level represents the baseline trade volume after filtering out noise. Sudden changes in level may indicate:
- Policy changes (tariffs, trade agreements)
- Economic shocks (recessions, booms)
- Structural shifts in trading relationships

**Trend Component ($T_t$):**
The trend captures the direction and velocity of change:
- Positive trend: Growing trade relationship, expanding markets
- Negative trend: Declining trade, possible market saturation or substitution
- Trend magnitude: Rate of market evolution (steep vs. gradual changes)

#### 6.3.2 Confidence Interval Interpretation

The 95% confidence bands provide crucial risk information:

**Narrow Bands:**
- Stable, predictable trade patterns
- High confidence in short-term forecasts
- Lower inventory risk for import-dependent businesses

**Wide Bands:**
- Volatile trade environment
- Need for contingency planning
- Consider hedging strategies for currency and commodity exposure

**Expanding Bands:**
The natural widening of confidence intervals over the forecast horizon reflects increasing uncertainty. Decision-makers should:
- Place higher weight on near-term forecasts
- Revisit long-term plans as new data arrives
- Build flexibility into supply chain commitments

#### 6.3.3 Strategic Applications

**Supply Chain Planning:**
- Anticipate import/export volume changes for logistics planning
- Identify leading indicators of supply disruptions
- Negotiate contracts with trend-informed volume projections

**Market Entry Decisions:**
- Assess market growth trajectories before investment
- Compare trend directions across potential markets
- Time market entry to align with upward trends

**Policy Impact Assessment:**
- Measure the effect of trade policies on volume trends
- Quantify the disruption and recovery periods following policy changes
- Support advocacy with data-driven trend analysis

### 6.4 Price Sensitivity Predictor: Customer Segmentation Insights

#### 6.4.1 Segment Profiles

The three-tier classification reveals distinct customer archetypes:

**Budget Segment (€0-3):**
- **Behavioral Profile:** Price-conscious consumers prioritizing value over premiumization
- **Demographics:** Often includes students, lower-income individuals, or those viewing the product as commodity
- **Marketing Implications:** Emphasize value propositions, discounts, and functional benefits

**Moderate Segment (€3-4.50):**
- **Behavioral Profile:** Balanced consumers weighing price against quality
- **Demographics:** Broad middle market, including young professionals and value-conscious quality seekers
- **Marketing Implications:** Highlight quality-price balance, reliability, and mainstream appeal

**Premium Segment (€4.50+):**
- **Behavioral Profile:** Quality-focused consumers willing to pay for perceived value
- **Demographics:** Higher income, brand-conscious, or those with strong product preferences
- **Marketing Implications:** Emphasize quality, exclusivity, brand story, and superior experience

#### 6.4.2 Feature Importance Insights

The Random Forest model identifies which customer attributes most strongly predict price sensitivity:

**High-Impact Features:**
- **Income Level:** Typically the strongest predictor—higher income correlates with premium segment membership
- **Daily Consumption:** Frequent users often justify premium pricing for quality improvement
- **Employment Status:** Full-time employment often indicates greater willingness to pay

**Moderate-Impact Features:**
- **Age:** May show non-linear effects (younger budget-conscious, middle-aged premium, older value-focused)
- **Preferences:** Product preferences (temperature, purchase location) reveal underlying value orientations

**Low-Impact Features:**
- Features with minimal importance may be safely excluded from targeting criteria
- Collecting such data provides limited return on investment

#### 6.4.3 Probability-Based Decision Making

The model outputs probability distributions rather than hard classifications, enabling nuanced strategies:

**Customer A:** 70% Premium, 20% Moderate, 10% Budget
- Strong candidate for premium product lines
- May respond to exclusive offers and loyalty programs
- Lower churn risk if premium quality maintained

**Customer B:** 40% Premium, 35% Moderate, 25% Budget
- Uncertain segment membership—highly persuadable
- Target with value messaging that emphasizes quality
- Test different price points to optimize conversion

**Customer C:** 10% Premium, 25% Moderate, 65% Budget
- Price-sensitive—unlikely to upsell
- Focus on volume and basic product lines
- May respond to promotional pricing and bundles

#### 6.4.4 Strategic Pricing Applications

**Dynamic Pricing:**
- Adjust prices based on predicted segment distribution of current customers
- Optimize promotional timing for price-sensitive segments
- Maintain premium pricing when serving premium-predicted customers

**Product Line Strategy:**
- Ensure product offerings align with segment size distribution
- Avoid over-investment in premium products if segment is small
- Consider value lines if budget segment dominates

**Customer Acquisition:**
- Target marketing spend toward segments with favorable unit economics
- Craft segment-specific messaging and channel selection
- Set acquisition cost targets based on predicted lifetime value by segment

---

## 7. Conclusions

### 7.1 Summary

This project successfully demonstrates the implementation of four machine learning models in a web-based environment. The pure JavaScript approach eliminates server dependencies while maintaining computational feasibility for typical dataset sizes.

### 7.2 Contributions

Key contributions include:

1. Browser-native implementations of classical ML algorithms
2. Integration with modern React-based user interfaces
3. Real-time training and prediction capabilities
4. Comprehensive visualization of model outputs
5. Practical business interpretation frameworks for each model type

### 7.3 Limitations

Current limitations include:

- Dataset size constraints due to browser memory
- Lack of cross-validation for model selection
- Limited hyperparameter optimization
- No support for deep learning architectures

### 7.4 Future Work

Potential extensions include:

- Web Worker implementation for background computation
- Additional algorithms (k-means clustering, neural networks)
- Model persistence using IndexedDB
- Automated feature selection and engineering
- Enhanced interpretation dashboards with automated insight generation

---

## References

Breiman, L. (2001). Random Forests. *Machine Learning*, 45(1), 5-32.

Gauss, C. F. (1809). *Theoria motus corporum coelestium in sectionibus conicis solem ambientium*.

Holt, C. C. (1957). Forecasting seasonals and trends by exponentially weighted moving averages. *ONR Research Memorandum*, Carnegie Institute of Technology.

Legendre, A. M. (1805). *Nouvelles méthodes pour la détermination des orbites des comètes*.

Quinlan, J. R. (1986). Induction of decision trees. *Machine Learning*, 1(1), 81-106.

Shannon, C. E. (1948). A mathematical theory of communication. *Bell System Technical Journal*, 27(3), 379-423.

---

## Appendix A: Model Parameters

### A.1 Decision Tree Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| maxDepth | 10 | Maximum tree depth |
| minSamplesSplit | 2 | Minimum samples to split |
| minSamplesLeaf | 1 | Minimum samples per leaf |

### A.2 Regression Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| regularization | None | No regularization applied |
| intercept | True | Include bias term |

### A.3 Forecasting Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| alpha (α) | 0.3 | Level smoothing factor |
| beta (β) | 0.1 | Trend smoothing factor |
| horizon | 6 | Forecast periods |

### A.4 Random Forest Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| nTrees | 15 | Number of trees |
| maxDepth | 6 | Maximum tree depth |
| maxFeatures | sqrt | Features per split |
| minSamplesSplit | 3 | Minimum samples to split |

---

## Appendix B: File Structure

```
src/
├── ml/
│   ├── decisionTree.js        # Decision Tree Classifier
│   ├── linearRegression.js    # Demand Regression Model
│   ├── timeSeriesForecasting.js   # Trade Volume Forecaster
│   └── priceSensitivity.js    # Price Sensitivity Predictor
│
└── components/MLModels/
    ├── DecisionTreePanel.jsx
    ├── DemandRegressionPanel.jsx
    ├── TradeForecasterPanel.jsx
    └── PriceSensitivityPanel.jsx
```

---

*Prepared for Data Table Analyzer Project*
