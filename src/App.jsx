import { useEffect } from 'react';
import useDataStore from './store/useDataStore';
import Header from './components/Layout/Header';
import FileUpload from './components/FileUpload/FileUpload';
import CSOBrowser from './components/CSOBrowser/CSOBrowser';
import DatasetSelector from './components/DatasetSelector/DatasetSelector';
import VirtualTable from './components/DataTable/VirtualTable';
import ChartPanel from './components/Charts/ChartPanel';
import MergePanel from './components/MergePanel/MergePanel';
import DecisionTreePanel from './components/MLModels/DecisionTreePanel';
import DemandRegressionPanel from './components/MLModels/DemandRegressionPanel';
import TradeForecasterPanel from './components/MLModels/TradeForecasterPanel';
import ErrorNotification from './components/ErrorNotification/ErrorNotification';

function App() {
  const { darkMode, setDarkMode, dataSets } = useDataStore();

  // Initialize dark mode from system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setDarkMode(e.matches);

    // Set initial value
    setDarkMode(mediaQuery.matches);
    document.documentElement.classList.toggle('dark', mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setDarkMode]);

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-200">
      <Header />

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Data Input Section */}
        <section className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File Upload */}
            <div className="lg:col-span-2">
              <FileUpload />
            </div>

            {/* CSO Browser */}
            <div>
              <CSOBrowser />
            </div>
          </div>
        </section>

        {/* Dataset Management */}
        {dataSets.length > 0 && (
          <section className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Data Sources
              </h2>
              <MergePanel />
            </div>
            <DatasetSelector />
          </section>
        )}

        {/* Data Preview */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Data Preview
          </h2>
          <VirtualTable />
        </section>

        {/* ML Models Section */}
        <section className="mb-8 space-y-6">
          <DecisionTreePanel />
          <DemandRegressionPanel />
          <TradeForecasterPanel />
        </section>

        {/* Charts Section */}
        <section className="mb-8">
          <ChartPanel />
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Data Table Analyzer — Built with React, ECharts, and Tailwind CSS
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            CSO data provided by the Central Statistics Office of Ireland
          </p>
        </footer>
      </main>

      {/* Error Notifications */}
      <ErrorNotification />
    </div>
  );
}

export default App;
