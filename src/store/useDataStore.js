import { create } from 'zustand';

const useDataStore = create((set, get) => ({
  // Data state
  dataSets: [], // Array of { id, name, data, columns, source }
  activeDataSetId: null,

  // UI state
  darkMode: typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false,
  isLoading: false,
  error: null,

  // Charts state
  charts: [], // Array of { id, type, config, dataSetId, filters }

  // Actions - Theme
  toggleDarkMode: () => {
    set((state) => {
      const newDarkMode = !state.darkMode;
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', newDarkMode);
      }
      return { darkMode: newDarkMode };
    });
  },

  setDarkMode: (value) => {
    set({ darkMode: value });
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', value);
    }
  },

  // Actions - Data
  addDataSet: (dataSet) => {
    const id = `ds_${Date.now()}`;
    set((state) => ({
      dataSets: [...state.dataSets, { ...dataSet, id }],
      activeDataSetId: state.activeDataSetId || id,
    }));
    return id;
  },

  removeDataSet: (id) => {
    set((state) => {
      const newDataSets = state.dataSets.filter((ds) => ds.id !== id);
      const newCharts = state.charts.filter((c) => c.dataSetId !== id);
      return {
        dataSets: newDataSets,
        charts: newCharts,
        activeDataSetId: state.activeDataSetId === id
          ? (newDataSets[0]?.id || null)
          : state.activeDataSetId,
      };
    });
  },

  setActiveDataSet: (id) => {
    set({ activeDataSetId: id });
  },

  getActiveDataSet: () => {
    const state = get();
    return state.dataSets.find((ds) => ds.id === state.activeDataSetId) || null;
  },

  // Actions - Charts
  addChart: (chart) => {
    const id = `chart_${Date.now()}`;
    set((state) => ({
      charts: [...state.charts, { ...chart, id }],
    }));
    return id;
  },

  updateChart: (id, updates) => {
    set((state) => ({
      charts: state.charts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  removeChart: (id) => {
    set((state) => ({
      charts: state.charts.filter((c) => c.id !== id),
    }));
  },

  duplicateChart: (id) => {
    const state = get();
    const chart = state.charts.find((c) => c.id === id);
    if (chart) {
      const newId = `chart_${Date.now()}`;
      set((state) => ({
        charts: [...state.charts, { ...chart, id: newId }],
      }));
      return newId;
    }
    return null;
  },

  // Actions - Loading/Error
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Actions - Reset
  reset: () => set({
    dataSets: [],
    activeDataSetId: null,
    charts: [],
    isLoading: false,
    error: null,
  }),
}));

export default useDataStore;
