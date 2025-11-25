import { useEffect } from 'react';
import useDataStore from '../../store/useDataStore';

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function ErrorNotification() {
  const { error, clearError } = useDataStore();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  if (!error) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-lg flex items-start gap-3 max-w-md">
        <div className="text-red-500 dark:text-red-400 shrink-0">
          <AlertIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-red-800 dark:text-red-200">Error</p>
          <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{error}</p>
        </div>
        <button
          onClick={clearError}
          className="shrink-0 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-800/50 text-red-500 transition-colors"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
