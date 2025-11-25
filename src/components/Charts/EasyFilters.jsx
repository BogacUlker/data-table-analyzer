import { useState, useMemo, useCallback, useEffect } from 'react';
import useDataStore from '../../store/useDataStore';

// Icons
const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronIcon = ({ isOpen }) => (
  <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// Dataset type detection
const DATASET_TYPES = {
  CSO_TRADE: 'cso_trade',
  COFFEE_SHOP: 'coffee_shop',
  GENERIC: 'generic'
};

// Detect dataset type based on columns
function detectDatasetType(columns) {
  const colLower = columns.map(c => c.toLowerCase());

  // CSO Trade Data detection
  if (
    colLower.some(c => c.includes('commodity')) &&
    colLower.some(c => c.includes('countr') || c.includes('territory')) &&
    colLower.some(c => c.includes('statistic'))
  ) {
    return DATASET_TYPES.CSO_TRADE;
  }

  // Coffee Shop Data detection
  if (
    colLower.some(c => c.includes('item') || c.includes('product')) &&
    colLower.some(c => c.includes('day')) &&
    colLower.some(c => c.includes('rain') || c.includes('temp'))
  ) {
    return DATASET_TYPES.COFFEE_SHOP;
  }

  return DATASET_TYPES.GENERIC;
}

// Top coffee countries for CSO data
const TOP_COFFEE_COUNTRIES = [
  'Germany', 'Switzerland', 'Belgium', 'France', 'Brazil',
  'Colombia', 'Ethiopia', 'India', 'Indonesia', 'China',
  'United States', 'Italy', 'Netherlands', 'Spain', 'United Kingdom'
];

// Coffee product categories
const COFFEE_PRODUCTS = [
  'Americano', 'Cappuccino', 'Cappucino', 'Latte', 'Flat White', 'Long Black',
  'Espresso', 'Mocha', 'Hot Chocolate', 'Hot Choclate'
];

const FOOD_PRODUCTS = [
  'Croissant', 'Sandwich', 'Muffin', 'Cake', 'Cookie', 'Scone'
];

const TEA_PRODUCTS = [
  'English Breakfast', 'Green Tea', 'Herbal Tea', 'Earl Grey'
];

// ==================== CSO TRADE FILTERS ====================
function CSOTradeFilters({ data, columns, onFiltersChange, activeFilterCount, clearAllFilters }) {
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [searchCountry, setSearchCountry] = useState('');

  // Find relevant columns
  const colInfo = useMemo(() => {
    return {
      countryCol: columns.find(c =>
        c.toLowerCase().includes('countr') || c.toLowerCase().includes('territory')
      ),
      monthCol: columns.find(c =>
        c.toLowerCase().includes('month')
      ),
      commodityCol: columns.find(c =>
        c.toLowerCase().includes('commodity') || c.toLowerCase().includes('group')
      ),
      valueCol: columns.find(c =>
        c.toLowerCase() === 'value'
      )
    };
  }, [columns]);

  // Extract unique values
  const uniqueValues = useMemo(() => {
    const countries = new Set();
    const months = new Set();
    const commodities = new Set();

    data.forEach(row => {
      if (colInfo.countryCol && row[colInfo.countryCol]) countries.add(row[colInfo.countryCol]);
      if (colInfo.monthCol && row[colInfo.monthCol]) months.add(row[colInfo.monthCol]);
      if (colInfo.commodityCol && row[colInfo.commodityCol]) commodities.add(row[colInfo.commodityCol]);
    });

    return {
      countries: [...countries].sort(),
      months: [...months].sort(),
      commodities: [...commodities].sort()
    };
  }, [data, colInfo]);

  // Filter countries
  const filteredCountries = useMemo(() => {
    if (!searchCountry) return uniqueValues.countries;
    return uniqueValues.countries.filter(c =>
      c.toLowerCase().includes(searchCountry.toLowerCase())
    );
  }, [uniqueValues.countries, searchCountry]);

  // Generate filters
  const generateFilters = useCallback(() => {
    const filters = [];

    if (selectedCountries.length > 0 && colInfo.countryCol) {
      selectedCountries.forEach(country => {
        filters.push({ column: colInfo.countryCol, operator: 'equals', value: country, _type: 'country' });
      });
    }

    if (selectedMonths.length > 0 && colInfo.monthCol) {
      selectedMonths.forEach(month => {
        filters.push({ column: colInfo.monthCol, operator: 'equals', value: month, _type: 'month' });
      });
    }

    if (selectedCommodity && colInfo.commodityCol) {
      filters.push({ column: colInfo.commodityCol, operator: 'contains', value: selectedCommodity, _type: 'commodity' });
    }

    if (colInfo.valueCol) {
      if (minValue !== '') {
        filters.push({ column: colInfo.valueCol, operator: 'gte', value: minValue, _type: 'minValue' });
      }
      if (maxValue !== '') {
        filters.push({ column: colInfo.valueCol, operator: 'lte', value: maxValue, _type: 'maxValue' });
      }
    }

    return filters;
  }, [selectedCountries, selectedMonths, selectedCommodity, minValue, maxValue, colInfo]);

  // Notify parent
  useEffect(() => {
    onFiltersChange(generateFilters());
  }, [generateFilters, onFiltersChange]);

  const toggleCountry = (country) => {
    setSelectedCountries(prev => prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]);
  };

  const toggleMonth = (month) => {
    setSelectedMonths(prev => prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]);
  };

  const localClear = () => {
    setSelectedCountries([]);
    setSelectedMonths([]);
    setSelectedCommodity('');
    setMinValue('');
    setMaxValue('');
    setSearchCountry('');
    clearAllFilters();
  };

  const selectTopCoffeeCountries = () => {
    const available = TOP_COFFEE_COUNTRIES.filter(c => uniqueValues.countries.includes(c));
    setSelectedCountries(available);
  };

  const localFilterCount = selectedCountries.length + selectedMonths.length +
    (selectedCommodity ? 1 : 0) + (minValue ? 1 : 0) + (maxValue ? 1 : 0);

  return (
    <div className="p-4 space-y-4">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCommodity('Coffee')}
          className="px-3 py-1.5 text-sm font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
        >
          ☕ Coffee Only
        </button>
        <button
          onClick={selectTopCoffeeCountries}
          className="px-3 py-1.5 text-sm font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
        >
          🌍 Top Coffee Countries
        </button>
        <button
          onClick={() => setSelectedMonths(uniqueValues.months.filter(m => m.includes('2023')))}
          className="px-3 py-1.5 text-sm font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
        >
          📅 2023 Data
        </button>
        {localFilterCount > 0 && (
          <button onClick={localClear} className="px-3 py-1.5 text-sm font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1">
            <CloseIcon /> Clear All
          </button>
        )}
      </div>

      {/* Commodity Filter */}
      {uniqueValues.commodities.length > 0 && (
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">📦 Commodity Group</label>
          <select value={selectedCommodity} onChange={(e) => setSelectedCommodity(e.target.value)} className="select w-full">
            <option value="">All Commodities</option>
            {uniqueValues.commodities.map(comm => (
              <option key={comm} value={comm.includes('Coffee') ? 'Coffee' : comm}>{comm}</option>
            ))}
          </select>
        </div>
      )}

      {/* Country Filter */}
      {uniqueValues.countries.length > 0 && (
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">🌍 Countries ({selectedCountries.length} selected)</label>
          <input type="text" value={searchCountry} onChange={(e) => setSearchCountry(e.target.value)} placeholder="Search countries..." className="input w-full mb-2" />
          <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
            <div className="flex flex-wrap gap-1">
              {filteredCountries.slice(0, 100).map(country => (
                <button key={country} onClick={() => toggleCountry(country)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${selectedCountries.includes(country) ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                  {country}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Month Filter */}
      {uniqueValues.months.length > 0 && (
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">📅 Time Period ({selectedMonths.length} selected)</label>
          <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
            <div className="flex flex-wrap gap-1">
              {uniqueValues.months.map(month => (
                <button key={month} onClick={() => toggleMonth(month)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${selectedMonths.includes(month) ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                  {month}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Value Range */}
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">💰 Import Value Range</label>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" value={minValue} onChange={(e) => setMinValue(e.target.value)} placeholder="Min value..." className="input w-full" />
          <input type="number" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} placeholder="Max value..." className="input w-full" />
        </div>
      </div>

      {/* Active Filters Summary */}
      {localFilterCount > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Active Filters:</p>
          <div className="flex flex-wrap gap-2">
            {selectedCountries.map(c => (
              <span key={c} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">
                🌍 {c} <button onClick={() => toggleCountry(c)}><CloseIcon /></button>
              </span>
            ))}
            {selectedMonths.map(m => (
              <span key={m} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full">
                📅 {m} <button onClick={() => toggleMonth(m)}><CloseIcon /></button>
              </span>
            ))}
            {selectedCommodity && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full">
                ☕ {selectedCommodity} <button onClick={() => setSelectedCommodity('')}><CloseIcon /></button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== COFFEE SHOP FILTERS ====================
function CoffeeShopFilters({ data, columns, onFiltersChange, activeFilterCount, clearAllFilters }) {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minTemp, setMinTemp] = useState('');
  const [maxTemp, setMaxTemp] = useState('');
  const [rainFilter, setRainFilter] = useState('');
  const [searchProduct, setSearchProduct] = useState('');

  // Find relevant columns
  const colInfo = useMemo(() => {
    return {
      productCol: columns.find(c =>
        c.toLowerCase().includes('item') || c.toLowerCase().includes('product')
      ),
      dayCol: columns.find(c =>
        c.toLowerCase() === 'day'
      ),
      rainCol: columns.find(c =>
        c.toLowerCase().includes('rain')
      ),
      minTempCol: columns.find(c =>
        c.toLowerCase().includes('min') && c.toLowerCase().includes('temp')
      ),
      maxTempCol: columns.find(c =>
        c.toLowerCase().includes('max') && c.toLowerCase().includes('temp')
      )
    };
  }, [columns]);

  // Extract unique values
  const uniqueValues = useMemo(() => {
    const products = new Set();
    const days = new Set();

    data.forEach(row => {
      if (colInfo.productCol && row[colInfo.productCol]) products.add(row[colInfo.productCol]);
      if (colInfo.dayCol && row[colInfo.dayCol]) days.add(row[colInfo.dayCol]);
    });

    // Sort days in week order
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sortedDays = [...days].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

    return {
      products: [...products].sort(),
      days: sortedDays
    };
  }, [data, colInfo]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = uniqueValues.products;
    if (searchProduct) {
      filtered = filtered.filter(p => p.toLowerCase().includes(searchProduct.toLowerCase()));
    }
    if (selectedCategory === 'coffee') {
      filtered = filtered.filter(p => COFFEE_PRODUCTS.some(cp => p.toLowerCase().includes(cp.toLowerCase())));
    } else if (selectedCategory === 'food') {
      filtered = filtered.filter(p => FOOD_PRODUCTS.some(fp => p.toLowerCase().includes(fp.toLowerCase())));
    } else if (selectedCategory === 'tea') {
      filtered = filtered.filter(p => TEA_PRODUCTS.some(tp => p.toLowerCase().includes(tp.toLowerCase())));
    }
    return filtered;
  }, [uniqueValues.products, searchProduct, selectedCategory]);

  // Generate filters
  const generateFilters = useCallback(() => {
    const filters = [];

    if (selectedProducts.length > 0 && colInfo.productCol) {
      selectedProducts.forEach(product => {
        filters.push({ column: colInfo.productCol, operator: 'equals', value: product, _type: 'product' });
      });
    }

    if (selectedDays.length > 0 && colInfo.dayCol) {
      selectedDays.forEach(day => {
        filters.push({ column: colInfo.dayCol, operator: 'equals', value: day, _type: 'day' });
      });
    }

    if (colInfo.maxTempCol) {
      if (minTemp !== '') {
        filters.push({ column: colInfo.maxTempCol, operator: 'gte', value: minTemp, _type: 'minTemp' });
      }
      if (maxTemp !== '') {
        filters.push({ column: colInfo.maxTempCol, operator: 'lte', value: maxTemp, _type: 'maxTemp' });
      }
    }

    if (rainFilter && colInfo.rainCol) {
      if (rainFilter === 'rainy') {
        filters.push({ column: colInfo.rainCol, operator: 'gt', value: '0', _type: 'rain' });
      } else if (rainFilter === 'dry') {
        filters.push({ column: colInfo.rainCol, operator: 'equals', value: '0', _type: 'rain' });
      }
    }

    return filters;
  }, [selectedProducts, selectedDays, minTemp, maxTemp, rainFilter, colInfo]);

  // Notify parent
  useEffect(() => {
    onFiltersChange(generateFilters());
  }, [generateFilters, onFiltersChange]);

  const toggleProduct = (product) => {
    setSelectedProducts(prev => prev.includes(product) ? prev.filter(p => p !== product) : [...prev, product]);
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const localClear = () => {
    setSelectedProducts([]);
    setSelectedDays([]);
    setSelectedCategory('');
    setMinTemp('');
    setMaxTemp('');
    setRainFilter('');
    setSearchProduct('');
    clearAllFilters();
  };

  const localFilterCount = selectedProducts.length + selectedDays.length +
    (minTemp ? 1 : 0) + (maxTemp ? 1 : 0) + (rainFilter ? 1 : 0);

  return (
    <div className="p-4 space-y-4">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSelectedCategory('coffee')}
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${selectedCategory === 'coffee' ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 hover:bg-amber-200'}`}>
          ☕ Coffee Drinks
        </button>
        <button onClick={() => setSelectedCategory('tea')}
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${selectedCategory === 'tea' ? 'bg-green-500 text-white' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200'}`}>
          🍵 Tea
        </button>
        <button onClick={() => setSelectedCategory('food')}
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${selectedCategory === 'food' ? 'bg-orange-500 text-white' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 hover:bg-orange-200'}`}>
          🥐 Food Items
        </button>
        <button onClick={() => setSelectedDays(['Saturday', 'Sunday'])}
          className="px-3 py-1.5 text-sm font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
          📅 Weekends
        </button>
        <button onClick={() => setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])}
          className="px-3 py-1.5 text-sm font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
          📅 Weekdays
        </button>
        {localFilterCount > 0 && (
          <button onClick={localClear} className="px-3 py-1.5 text-sm font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 hover:bg-red-200 transition-colors flex items-center gap-1">
            <CloseIcon /> Clear All
          </button>
        )}
      </div>

      {/* Product Filter */}
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
          🛒 Products ({selectedProducts.length} selected)
          {selectedCategory && <span className="ml-2 text-xs text-slate-500">- Showing {selectedCategory}</span>}
        </label>
        <input type="text" value={searchProduct} onChange={(e) => setSearchProduct(e.target.value)} placeholder="Search products..." className="input w-full mb-2" />
        <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
          <div className="flex flex-wrap gap-1">
            {filteredProducts.slice(0, 50).map(product => (
              <button key={product} onClick={() => toggleProduct(product)}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${selectedProducts.includes(product) ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}>
                {product}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Day Filter */}
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">📅 Days ({selectedDays.length} selected)</label>
        <div className="flex flex-wrap gap-2">
          {uniqueValues.days.map(day => (
            <button key={day} onClick={() => toggleDay(day)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${selectedDays.includes(day)
                ? (day === 'Saturday' || day === 'Sunday' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white')
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}>
              {day.substring(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Weather Filters */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">🌡️ Temperature Range (°C)</label>
          <div className="flex gap-2">
            <input type="number" value={minTemp} onChange={(e) => setMinTemp(e.target.value)} placeholder="Min" className="input w-full" />
            <input type="number" value={maxTemp} onChange={(e) => setMaxTemp(e.target.value)} placeholder="Max" className="input w-full" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">🌧️ Weather Condition</label>
          <select value={rainFilter} onChange={(e) => setRainFilter(e.target.value)} className="select w-full">
            <option value="">All Weather</option>
            <option value="rainy">🌧️ Rainy Days</option>
            <option value="dry">☀️ Dry Days</option>
          </select>
        </div>
      </div>

      {/* Active Filters Summary */}
      {localFilterCount > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Active Filters:</p>
          <div className="flex flex-wrap gap-2">
            {selectedProducts.map(p => (
              <span key={p} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full">
                ☕ {p} <button onClick={() => toggleProduct(p)}><CloseIcon /></button>
              </span>
            ))}
            {selectedDays.map(d => (
              <span key={d} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">
                📅 {d} <button onClick={() => toggleDay(d)}><CloseIcon /></button>
              </span>
            ))}
            {rainFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 rounded-full">
                {rainFilter === 'rainy' ? '🌧️ Rainy' : '☀️ Dry'} <button onClick={() => setRainFilter('')}><CloseIcon /></button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== GENERIC FILTERS ====================
function GenericFilters({ data, columns, onFiltersChange, clearAllFilters }) {
  const [selectedColumn, setSelectedColumn] = useState('');
  const [filterOperator, setFilterOperator] = useState('equals');
  const [filterValue, setFilterValue] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);

  // Get unique values for selected column
  const uniqueValues = useMemo(() => {
    if (!selectedColumn || !data.length) return [];
    const values = new Set();
    data.forEach(row => {
      if (row[selectedColumn] !== undefined && row[selectedColumn] !== null) {
        values.add(row[selectedColumn]);
      }
    });
    return [...values].slice(0, 100).sort();
  }, [data, selectedColumn]);

  const addFilter = () => {
    if (selectedColumn && filterValue) {
      const newFilter = {
        column: selectedColumn,
        operator: filterOperator,
        value: filterValue,
        _type: `filter_${Date.now()}`
      };
      setActiveFilters(prev => [...prev, newFilter]);
      setFilterValue('');
    }
  };

  const removeFilter = (index) => {
    setActiveFilters(prev => prev.filter((_, i) => i !== index));
  };

  // Notify parent
  useEffect(() => {
    onFiltersChange(activeFilters);
  }, [activeFilters, onFiltersChange]);

  const localClear = () => {
    setActiveFilters([]);
    setSelectedColumn('');
    setFilterValue('');
    clearAllFilters();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <select value={selectedColumn} onChange={(e) => setSelectedColumn(e.target.value)} className="select">
          <option value="">Select Column</option>
          {columns.map(col => <option key={col} value={col}>{col}</option>)}
        </select>
        <select value={filterOperator} onChange={(e) => setFilterOperator(e.target.value)} className="select">
          <option value="equals">=</option>
          <option value="notEquals">≠</option>
          <option value="contains">contains</option>
          <option value="gt">&gt;</option>
          <option value="lt">&lt;</option>
        </select>
        {uniqueValues.length > 0 && uniqueValues.length <= 50 ? (
          <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className="select">
            <option value="">Select Value</option>
            {uniqueValues.map(v => <option key={v} value={v}>{String(v)}</option>)}
          </select>
        ) : (
          <input type="text" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} placeholder="Value..." className="input" />
        )}
        <button onClick={addFilter} className="btn-primary">Add Filter</button>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-full">
              {f.column} {f.operator} {f.value}
              <button onClick={() => removeFilter(i)}><CloseIcon /></button>
            </span>
          ))}
          <button onClick={localClear} className="text-xs text-red-500 hover:text-red-700">Clear All</button>
        </div>
      )}
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function EasyFilters({ onFiltersChange, initialFilters = {} }) {
  const { dataSets, activeDataSetId } = useDataStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const activeDataSet = useMemo(() => {
    return dataSets.find((ds) => ds.id === activeDataSetId);
  }, [dataSets, activeDataSetId]);

  const data = activeDataSet?.data || [];
  const columns = activeDataSet?.columns || [];

  // Detect dataset type
  const datasetType = useMemo(() => {
    return detectDatasetType(columns);
  }, [columns]);

  const handleFiltersChange = useCallback((filters) => {
    setActiveFilterCount(filters.length);
    onFiltersChange?.(filters, {});
  }, [onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    setActiveFilterCount(0);
    onFiltersChange?.([], {});
  }, [onFiltersChange]);

  if (!activeDataSet) return null;

  // Get header info based on dataset type
  const getHeaderInfo = () => {
    switch (datasetType) {
      case DATASET_TYPES.CSO_TRADE:
        return {
          icon: '🌍',
          title: 'CSO Trade Data Filters',
          subtitle: 'Filter by countries, commodities, and time periods',
          gradient: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
          border: 'border-blue-200 dark:border-blue-800'
        };
      case DATASET_TYPES.COFFEE_SHOP:
        return {
          icon: '☕',
          title: 'Coffee Shop Sales Filters',
          subtitle: 'Filter by products, days, and weather conditions',
          gradient: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
          border: 'border-amber-200 dark:border-amber-800'
        };
      default:
        return {
          icon: '🔍',
          title: 'Data Filters',
          subtitle: 'Create custom filters for your data',
          gradient: 'from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20',
          border: 'border-slate-200 dark:border-slate-800'
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="card mb-4 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r ${headerInfo.gradient} border-b ${headerInfo.border}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{headerInfo.icon}</span>
          <div className="text-left">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{headerInfo.title}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">{headerInfo.subtitle}</p>
          </div>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary-500 text-white rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>
        <ChevronIcon isOpen={isExpanded} />
      </button>

      {/* Filter Content - rendered based on dataset type */}
      {isExpanded && (
        <>
          {datasetType === DATASET_TYPES.CSO_TRADE && (
            <CSOTradeFilters
              data={data}
              columns={columns}
              onFiltersChange={handleFiltersChange}
              activeFilterCount={activeFilterCount}
              clearAllFilters={clearAllFilters}
            />
          )}
          {datasetType === DATASET_TYPES.COFFEE_SHOP && (
            <CoffeeShopFilters
              data={data}
              columns={columns}
              onFiltersChange={handleFiltersChange}
              activeFilterCount={activeFilterCount}
              clearAllFilters={clearAllFilters}
            />
          )}
          {datasetType === DATASET_TYPES.GENERIC && (
            <GenericFilters
              data={data}
              columns={columns}
              onFiltersChange={handleFiltersChange}
              clearAllFilters={clearAllFilters}
            />
          )}
        </>
      )}
    </div>
  );
}
