# Data Table Analyzer

A powerful web-based data analysis tool built with React that enables users to upload, visualize, and analyze tabular data from various sources including local files and Ireland's Central Statistics Office (CSO) API.

## Features

### Data Import
- **File Upload**: Drag & drop support for CSV and Excel files
- **CSO Integration**: Browse and load datasets from Ireland's CSO PxStat API
- **Multiple Datasets**: Manage and switch between multiple loaded datasets

### Data Visualization
- **Virtual Table**: High-performance table rendering for large datasets using `@tanstack/react-virtual`
- **Smart Charts**: Auto-generated chart suggestions based on data patterns
- **Chart Types**: Line, Bar, Pie, Scatter, Area, and Stacked charts via ECharts

### Data Processing
- **Easy Filters**: Dataset-aware filtering with appropriate controls per column type
- **Data Merging**: Combine multiple datasets with configurable merge strategies
- **Column Selection**: Show/hide columns for focused analysis

### Machine Learning
- **Decision Tree Classifier**: Pure JavaScript ID3 algorithm implementation
- **Product Prediction**: Predict likely purchases based on Day, Time, Weather
- **Interactive Visualization**: ECharts tree with edge labels, icons, and tooltips
- **Model Statistics**: Accuracy, feature importance, tree depth analysis

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19.2 |
| Build Tool | Vite 7.2 |
| State Management | Zustand 5.0 |
| Styling | Tailwind CSS 3.4 |
| Charts | ECharts 5.6 + echarts-for-react |
| Data Parsing | PapaParse (CSV), xlsx (Excel) |
| Virtualization | @tanstack/react-virtual |

## Architecture

```
src/
├── components/
│   ├── Charts/           # ChartPanel, SmartChartGenerator
│   ├── CSOBrowser/       # CSO API integration
│   ├── DataTable/        # VirtualTable, EasyFilters
│   ├── DatasetSelector/  # Multi-dataset management
│   ├── FileUpload/       # Drag & drop file handling
│   ├── Layout/           # Header, navigation
│   ├── MergePanel/       # Dataset merging
│   └── MLModels/         # DecisionTreePanel
├── ml/
│   └── decisionTree.js   # ID3 algorithm implementation
├── store/
│   └── useDataStore.js   # Zustand global state
└── App.jsx               # Main application
```

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/data-table-analyzer.git

# Navigate to project directory
cd data-table-analyzer

# Install dependencies
npm install

# Start development server
npm run dev
```

## Usage

### Loading Data
1. Drag and drop CSV/Excel files onto the upload area
2. Or browse CSO datasets and click to load

### Analyzing Data
1. Use the virtual table to explore your data
2. Apply filters using the Easy Filters panel
3. View auto-generated chart suggestions
4. Customize charts with different types and aggregations

### Machine Learning
1. Load a dataset with Day, Time, and Weather columns
2. Click "Train Model" in the Decision Tree section
3. Use the prediction form to predict likely purchases
4. Explore the interactive decision tree visualization

## Decision Tree Model

The ML model uses the ID3 (Iterative Dichotomiser 3) algorithm:

- **Features**: Day of week, Time slot (Morning/Afternoon/Evening), Weather conditions
- **Target**: Product/Item purchased
- **Metrics**: Accuracy, feature importance, tree statistics
- **Visualization**: Interactive tree with:
  - Edge labels showing decision values
  - Feature icons for each node type
  - Information gain percentages
  - Sample counts and class distributions

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Browser Support

Modern browsers with ES6+ support:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
