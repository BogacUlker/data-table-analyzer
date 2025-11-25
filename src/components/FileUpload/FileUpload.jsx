import { useState, useRef, useCallback } from 'react';
import useDataStore from '../../store/useDataStore';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const UploadIcon = () => (
  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function FileUpload() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState('');
  const fileInputRef = useRef(null);
  const { addDataSet, setError } = useDataStore();

  const detectColumnTypes = (data, columns) => {
    const columnTypes = {};

    columns.forEach((col) => {
      const sampleValues = data.slice(0, 100).map((row) => row[col]).filter((v) => v != null && v !== '');

      if (sampleValues.length === 0) {
        columnTypes[col] = 'string';
        return;
      }

      // Check for numbers
      const numericCount = sampleValues.filter((v) => !isNaN(parseFloat(v)) && isFinite(v)).length;
      if (numericCount / sampleValues.length > 0.8) {
        columnTypes[col] = 'number';
        return;
      }

      // Check for dates
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/,
        /^\d{2}\/\d{2}\/\d{4}$/,
        /^\d{2}-\d{2}-\d{4}$/,
        /^\d{4}\/\d{2}\/\d{2}$/,
        /^\d{4}M\d{2}$/, // CSO format like 2024M01
        /^\d{4}Q\d$/, // Quarter format like 2024Q1
      ];
      const dateCount = sampleValues.filter((v) =>
        datePatterns.some((pattern) => pattern.test(String(v))) || !isNaN(Date.parse(v))
      ).length;
      if (dateCount / sampleValues.length > 0.8) {
        columnTypes[col] = 'date';
        return;
      }

      columnTypes[col] = 'string';
    });

    return columnTypes;
  };

  const processCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        worker: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }
          const columns = results.meta.fields || [];
          const columnTypes = detectColumnTypes(results.data, columns);
          resolve({
            data: results.data,
            columns,
            columnTypes,
          });
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    });
  };

  // Convert Excel serial date to JS Date string
  const excelDateToString = (serial, includeTime = false) => {
    // Excel epoch starts at 1900-01-01 (but Excel incorrectly thinks 1900 was a leap year)
    // Serial 1 = 1900-01-01, Serial 2 = 1900-01-02, etc.
    // We need to subtract 1 because JS Date months are 0-indexed
    const utcDays = Math.floor(serial - 25569); // 25569 = days from 1900-01-01 to 1970-01-01
    const utcValue = utcDays * 86400 * 1000; // Convert to milliseconds
    const date = new Date(utcValue);

    if (includeTime && serial % 1 !== 0) {
      // Has time component
      const timeFraction = serial % 1;
      const totalSeconds = Math.round(timeFraction * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      date.setUTCHours(hours, minutes, seconds);
      return date.toISOString().replace('T', ' ').substring(0, 19);
    }

    return date.toISOString().split('T')[0];
  };

  // Check if a value looks like an Excel date serial number
  const isExcelDateSerial = (value, colName) => {
    if (typeof value !== 'number') return false;
    // Excel dates are typically between 1 (1900-01-01) and 2958465 (9999-12-31)
    // But realistically, most dates are between 30000 (1982) and 55000 (2050)
    // Also check column name hints
    const dateHints = ['date', 'time', 'tarih', 'saat', 'datetime', 'timestamp', 'created', 'updated', 'modified'];
    const colLower = colName.toLowerCase();
    const hasDateHint = dateHints.some(hint => colLower.includes(hint));

    // If column name suggests date, be more lenient with range
    if (hasDateHint && value > 1 && value < 2958465) {
      return true;
    }
    // Otherwise, use a narrower range (1980-2050)
    return value > 29221 && value < 54789 && Number.isFinite(value);
  };

  const processExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          // Enable cellDates to parse dates, and use raw values for inspection
          const workbook = XLSX.read(data, {
            type: 'array',
            cellDates: true,  // Parse dates as JS Date objects
            cellNF: true,     // Keep number formats
            cellText: false,  // Don't generate text
          });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // First, get raw data to detect date columns
          const rawData = XLSX.utils.sheet_to_json(worksheet, {
            defval: null,
            raw: true,  // Get raw values to detect date serials
          });

          // Get data with dates parsed
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            defval: null,
            raw: false,  // Format values
            dateNF: 'YYYY-MM-DD HH:mm:ss',  // Date format
          });

          const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

          // Post-process: detect and convert any remaining Excel date serials
          const processedData = jsonData.map((row, rowIndex) => {
            const newRow = { ...row };
            columns.forEach(col => {
              const value = row[col];
              const rawValue = rawData[rowIndex]?.[col];

              // If value is a Date object, format it
              if (value instanceof Date) {
                newRow[col] = value.toISOString().split('T')[0];
                if (value.getHours() !== 0 || value.getMinutes() !== 0) {
                  newRow[col] = value.toISOString().replace('T', ' ').substring(0, 19);
                }
              }
              // Check if raw value is a date serial that wasn't converted
              else if (typeof rawValue === 'number' && isExcelDateSerial(rawValue, col)) {
                const hasTime = rawValue % 1 !== 0;
                newRow[col] = excelDateToString(rawValue, hasTime);
              }
            });
            return newRow;
          });

          const columnTypes = detectColumnTypes(processedData, columns);
          resolve({
            data: processedData,
            columns,
            columnTypes,
          });
        } catch (error) {
          reject(new Error(`Excel parsing failed: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const processFile = useCallback(async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();

    if (!['csv', 'xlsx', 'xls'].includes(extension)) {
      setError('Unsupported file type. Please upload CSV or Excel files.');
      return;
    }

    setIsProcessing(true);
    setProcessingFile(file.name);

    try {
      let result;
      if (extension === 'csv') {
        result = await processCSV(file);
      } else {
        result = await processExcel(file);
      }

      if (result.data.length === 0) {
        throw new Error('The file appears to be empty');
      }

      addDataSet({
        name: file.name,
        data: result.data,
        columns: result.columns,
        columnTypes: result.columnTypes,
        source: 'file',
        rowCount: result.data.length,
        uploadedAt: new Date().toISOString(),
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
      setProcessingFile('');
    }
  }, [addDataSet, setError]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(processFile);
  }, [processFile]);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    files.forEach(processFile);
    e.target.value = '';
  }, [processFile]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`upload-zone p-8 text-center ${isDragOver ? 'dragover' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary-200 dark:border-primary-800" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-slate-700 dark:text-slate-200">
                Processing file...
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {processingFile}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className={`text-slate-400 dark:text-slate-500 transition-transform duration-300 ${isDragOver ? 'scale-110 text-primary-500' : ''}`}>
              <UploadIcon />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
                {isDragOver ? 'Drop files here' : 'Drop CSV or Excel files here'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                or <span className="text-primary-500 hover:text-primary-600 font-medium">browse</span> to select
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <FileIcon />
                <span className="ml-1.5">.csv</span>
              </span>
              <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <FileIcon />
                <span className="ml-1.5">.xlsx</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
