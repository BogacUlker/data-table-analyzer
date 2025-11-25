import useDataStore from '../../store/useDataStore';

const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const Logo = () => (
  <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="20" fill="url(#logoGrad)" />
    <path
      d="M25 70 L25 30 L40 30 L40 70 M45 50 L60 30 L60 70 M65 45 L80 30 L80 70 L65 55"
      stroke="white"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export default function Header() {
  const { darkMode, toggleDarkMode, dataSets } = useDataStore();

  return (
    <header className="glass sticky top-0 z-50 border-b border-slate-200/50 dark:border-slate-700/50">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-lg font-semibold gradient-text">
                Data Table Analyzer
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Visualize & analyze your data
              </p>
            </div>
          </div>

          {/* Status & Controls */}
          <div className="flex items-center gap-4">
            {/* Dataset count badge */}
            {dataSets.length > 0 && (
              <div className="badge-primary">
                {dataSets.length} dataset{dataSets.length > 1 ? 's' : ''} loaded
              </div>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300 group"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <div className="relative w-5 h-5">
                <div className={`absolute inset-0 transition-all duration-300 ${darkMode ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`}>
                  <SunIcon />
                </div>
                <div className={`absolute inset-0 transition-all duration-300 ${darkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`}>
                  <MoonIcon />
                </div>
              </div>
              <span className="tooltip -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                {darkMode ? 'Light mode' : 'Dark mode'}
              </span>
            </button>

            {/* GitHub link */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
              aria-label="GitHub repository"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
              </svg>
              <span className="tooltip -bottom-10 left-1/2 -translate-x-1/2">GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
