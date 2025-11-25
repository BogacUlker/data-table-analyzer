import { useMemo } from 'react';
import useDataStore from '../../store/useDataStore';

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

// Dataset type detection (same as EasyFilters)
const DATASET_TYPES = {
  CSO_TRADE: 'cso_trade',
  COFFEE_SHOP: 'coffee_shop',
  GENERIC: 'generic'
};

function detectDatasetType(columns) {
  const colLower = columns.map(c => c.toLowerCase());

  if (
    colLower.some(c => c.includes('commodity')) &&
    colLower.some(c => c.includes('countr') || c.includes('territory')) &&
    colLower.some(c => c.includes('statistic'))
  ) {
    return DATASET_TYPES.CSO_TRADE;
  }

  if (
    colLower.some(c => c.includes('item') || c.includes('product')) &&
    colLower.some(c => c.includes('day')) &&
    colLower.some(c => c.includes('rain') || c.includes('temp'))
  ) {
    return DATASET_TYPES.COFFEE_SHOP;
  }

  return DATASET_TYPES.GENERIC;
}

// Generate smart chart configurations based on filters and dataset type
function generateSmartCharts(datasetType, filters, columns, data) {
  const charts = [];

  // Analyze active filters
  const hasCountryFilter = filters.some(f => f._type === 'country');
  const hasMonthFilter = filters.some(f => f._type === 'month');
  const hasCommodityFilter = filters.some(f => f._type === 'commodity');
  const hasProductFilter = filters.some(f => f._type === 'product');
  const hasDayFilter = filters.some(f => f._type === 'day');
  const hasRainFilter = filters.some(f => f._type === 'rain');
  const hasTempFilter = filters.some(f => f._type === 'minTemp' || f._type === 'maxTemp');

  const selectedCountries = filters.filter(f => f._type === 'country').map(f => f.value);
  const selectedProducts = filters.filter(f => f._type === 'product').map(f => f.value);
  const selectedDays = filters.filter(f => f._type === 'day').map(f => f.value);

  // Find column names
  const findCol = (patterns) => columns.find(c => patterns.some(p => c.toLowerCase().includes(p)));

  if (datasetType === DATASET_TYPES.CSO_TRADE) {
    const countryCol = findCol(['countr', 'territory']);
    const monthCol = findCol(['month']);
    const commodityCol = findCol(['commodity', 'group']);
    const valueCol = columns.find(c => c.toLowerCase() === 'value');

    // Chart 1: Value by Country (Bar) - if countries selected
    if (hasCountryFilter && countryCol && valueCol) {
      charts.push({
        type: 'bar',
        title: `Import Values by Selected Countries`,
        config: {
          xAxis: countryCol,
          yAxis: valueCol,
          aggregation: 'sum',
        },
        filters: [...filters],
        description: 'Compare import values across selected countries'
      });
    }

    // Chart 2: Time Trend (Line) - if months selected
    if (hasMonthFilter && monthCol && valueCol) {
      charts.push({
        type: 'line',
        title: `Import Trend Over Time`,
        config: {
          xAxis: monthCol,
          yAxis: valueCol,
          aggregation: 'sum',
        },
        filters: [...filters],
        description: 'See how imports change over selected time periods'
      });
    }

    // Chart 3: Top Countries Pie - always useful
    if (countryCol && valueCol) {
      charts.push({
        type: 'pie',
        title: `Top Importing Countries Distribution`,
        config: {
          xAxis: countryCol,
          yAxis: valueCol,
          aggregation: 'sum',
        },
        filters: [...filters],
        description: 'Distribution of import values by country'
      });
    }

    // Chart 4: Commodity breakdown - if commodity filtered
    if (hasCommodityFilter && commodityCol && valueCol && countryCol) {
      charts.push({
        type: 'bar',
        title: `Commodity Import Analysis`,
        config: {
          xAxis: countryCol,
          yAxis: valueCol,
          aggregation: 'sum',
        },
        filters: [...filters],
        description: 'Analyze filtered commodity imports'
      });
    }

    // Default chart if no specific filters
    if (charts.length === 0 && countryCol && valueCol) {
      charts.push({
        type: 'bar',
        title: `Import Values Overview`,
        config: {
          xAxis: countryCol,
          yAxis: valueCol,
          aggregation: 'sum',
        },
        filters: [...filters],
        description: 'Overview of import values'
      });
    }

  } else if (datasetType === DATASET_TYPES.COFFEE_SHOP) {
    const productCol = findCol(['item', 'product']);
    const dayCol = columns.find(c => c.toLowerCase() === 'day');
    const rainCol = findCol(['rain']);
    const maxTempCol = findCol(['max']) && findCol(['temp']) ? columns.find(c => c.toLowerCase().includes('max') && c.toLowerCase().includes('temp')) : null;

    // Find a numeric column for counting (or use any column - ChartCard handles count aggregation)
    // For count aggregation, we need a different column for yAxis to avoid key collision
    const countCol = columns.find(c => c.toLowerCase() !== productCol?.toLowerCase() && c.toLowerCase() !== dayCol?.toLowerCase()) || columns[0];

    // Chart 1: Product Sales (Bar) - if products selected
    if (hasProductFilter && productCol) {
      charts.push({
        type: 'bar',
        title: `Sales by Selected Products`,
        config: {
          xAxis: productCol,
          yAxis: countCol,
          aggregation: 'count',
        },
        filters: [...filters],
        description: 'Compare sales of selected products'
      });
    }

    // Chart 2: Sales by Day (Bar) - if days selected
    if (hasDayFilter && dayCol) {
      charts.push({
        type: 'bar',
        title: `Sales by Day of Week`,
        config: {
          xAxis: dayCol,
          yAxis: countCol,
          aggregation: 'count',
        },
        filters: [...filters],
        description: 'Sales distribution across selected days'
      });
    }

    // Chart 3: Product Distribution Pie
    if (productCol) {
      charts.push({
        type: 'pie',
        title: `Product Sales Distribution`,
        config: {
          xAxis: productCol,
          yAxis: countCol,
          aggregation: 'count',
        },
        filters: [...filters],
        description: 'See which products sell the most'
      });
    }

    // Chart 4: Weather Impact - if rain/temp filtered
    if ((hasRainFilter || hasTempFilter) && productCol) {
      charts.push({
        type: 'bar',
        title: `Weather Impact on Sales`,
        config: {
          xAxis: productCol,
          yAxis: countCol,
          aggregation: 'count',
        },
        filters: [...filters],
        description: 'How weather conditions affect product sales'
      });
    }

    // Chart 5: Day breakdown
    if (dayCol && productCol) {
      charts.push({
        type: 'bar',
        title: `Daily Sales Pattern`,
        config: {
          xAxis: dayCol,
          yAxis: countCol,
          aggregation: 'count',
        },
        filters: [...filters],
        description: 'Sales patterns across days'
      });
    }

    // Default chart if no specific filters
    if (charts.length === 0 && productCol) {
      charts.push({
        type: 'bar',
        title: `Product Sales Overview`,
        config: {
          xAxis: productCol,
          yAxis: countCol,
          aggregation: 'count',
        },
        filters: [...filters],
        description: 'Overview of all product sales'
      });
    }

  } else {
    // Generic dataset - create basic charts
    const categoricalCols = columns.filter(c => {
      const sampleValues = data.slice(0, 100).map(row => row[c]);
      return sampleValues.some(v => typeof v === 'string' && isNaN(Number(v)));
    });

    const numericCols = columns.filter(c => {
      const sampleValues = data.slice(0, 100).map(row => row[c]).filter(v => v !== null && v !== undefined);
      return sampleValues.every(v => !isNaN(Number(v)));
    });

    if (categoricalCols.length > 0) {
      charts.push({
        type: 'bar',
        title: `Distribution by ${categoricalCols[0]}`,
        config: {
          xAxis: categoricalCols[0],
          yAxis: numericCols[0] || categoricalCols[0],
          aggregation: numericCols[0] ? 'sum' : 'count',
        },
        filters: [...filters],
        description: 'Data distribution overview'
      });

      charts.push({
        type: 'pie',
        title: `${categoricalCols[0]} Breakdown`,
        config: {
          xAxis: categoricalCols[0],
          yAxis: numericCols[0] || categoricalCols[0],
          aggregation: numericCols[0] ? 'sum' : 'count',
        },
        filters: [...filters],
        description: 'Proportional breakdown'
      });
    }
  }

  // Limit to 4 charts max
  return charts.slice(0, 4);
}

export default function SmartChartGenerator({ filters, onGenerateCharts }) {
  const { dataSets, activeDataSetId } = useDataStore();

  const activeDataSet = useMemo(() => {
    return dataSets.find((ds) => ds.id === activeDataSetId);
  }, [dataSets, activeDataSetId]);

  const data = activeDataSet?.data || [];
  const columns = activeDataSet?.columns || [];

  const datasetType = useMemo(() => {
    return detectDatasetType(columns);
  }, [columns]);

  const suggestedCharts = useMemo(() => {
    if (!columns.length) return [];
    return generateSmartCharts(datasetType, filters, columns, data);
  }, [datasetType, filters, columns, data]);

  const handleGenerateAll = () => {
    onGenerateCharts(suggestedCharts);
  };

  const handleGenerateSingle = (chart) => {
    onGenerateCharts([chart]);
  };

  if (!activeDataSet || suggestedCharts.length === 0) return null;

  // Get theme based on dataset type
  const getTheme = () => {
    switch (datasetType) {
      case DATASET_TYPES.CSO_TRADE:
        return {
          gradient: 'from-blue-500 to-cyan-500',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-300',
          button: 'bg-blue-500 hover:bg-blue-600'
        };
      case DATASET_TYPES.COFFEE_SHOP:
        return {
          gradient: 'from-amber-500 to-orange-500',
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-300',
          button: 'bg-amber-500 hover:bg-amber-600'
        };
      default:
        return {
          gradient: 'from-slate-500 to-gray-500',
          bg: 'bg-slate-50 dark:bg-slate-900/20',
          border: 'border-slate-200 dark:border-slate-800',
          text: 'text-slate-700 dark:text-slate-300',
          button: 'bg-slate-500 hover:bg-slate-600'
        };
    }
  };

  const theme = getTheme();
  const chartIcons = {
    bar: '📊',
    line: '📈',
    pie: '🥧',
    scatter: '🔵',
    area: '📉',
    heatmap: '🗺️'
  };

  return (
    <div className={`card ${theme.bg} ${theme.border} border mb-4 overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 bg-gradient-to-r ${theme.gradient} text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon />
            <div>
              <h3 className="font-semibold">Smart Chart Suggestions</h3>
              <p className="text-xs opacity-90">
                {filters.length > 0
                  ? `${suggestedCharts.length} charts based on your ${filters.length} filter${filters.length > 1 ? 's' : ''}`
                  : `${suggestedCharts.length} recommended charts for this data`
                }
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateAll}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <SparklesIcon />
            Generate All
          </button>
        </div>
      </div>

      {/* Chart Suggestions */}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {suggestedCharts.map((chart, index) => (
            <button
              key={index}
              onClick={() => handleGenerateSingle(chart)}
              className={`p-4 rounded-xl border-2 border-dashed ${theme.border} hover:border-solid hover:shadow-md transition-all text-left group`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{chartIcons[chart.type]}</span>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium ${theme.text} text-sm truncate group-hover:text-clip`}>
                    {chart.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {chart.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${theme.bg} ${theme.text}`}>
                      {chart.type}
                    </span>
                    {chart.filters.length > 0 && (
                      <span className="text-xs text-slate-400">
                        +{chart.filters.length} filters
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
