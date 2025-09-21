/**
 * Utility functions for exporting data to CSV format
 */

export interface ExportOptions {
  filename: string;
  includeHeaders?: boolean;
  delimiter?: string;
}

/**
 * Escapes CSV values to handle commas, quotes, and newlines
 */
export function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Converts an array of objects to CSV format
 */
export function arrayToCSV(
  data: Record<string, any>[],
  options: ExportOptions = { filename: 'export.csv' }
): string {
  if (data.length === 0) {
    return '';
  }

  const { delimiter = ',' } = options;
  const headers = Object.keys(data[0]);
  
  // Create header row
  const headerRow = headers.map(header => escapeCSVValue(header)).join(delimiter);
  
  // Create data rows
  const dataRows = data.map(row => 
    headers.map(header => escapeCSVValue(row[header])).join(delimiter)
  );
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Downloads a CSV file to the user's device
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Formats currency for CSV export (removes currency symbols for better Excel compatibility)
 */
export function formatCurrencyForCSV(amount: number): string {
  return amount.toFixed(4);
}

/**
 * Formats date for CSV export
 */
export function formatDateForCSV(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US');
}

/**
 * Creates a filename with timestamp
 */
export function createTimestampedFilename(baseName: string, extension: string = 'csv'): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `${baseName}_${timestamp}.${extension}`;
}

/**
 * Sanitizes filename by removing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Export data as CSV with automatic download
 */
export function exportDataAsCSV(
  data: Record<string, any>[],
  filename: string,
  options: Partial<ExportOptions> = {}
): void {
  const csvContent = arrayToCSV(data, { filename, ...options });
  const sanitizedFilename = sanitizeFilename(filename);
  downloadCSV(csvContent, sanitizedFilename);
}

/**
 * Export multiple datasets as separate sheets in a single CSV
 * Note: This creates a simple multi-section CSV, not a true Excel file
 */
export function exportMultiSectionCSV(
  sections: Array<{
    title: string;
    data: Record<string, any>[];
    headers?: string[];
  }>,
  filename: string
): void {
  let csvContent = '';
  
  sections.forEach((section, index) => {
    if (index > 0) {
      csvContent += '\n\n';
    }
    
    csvContent += `${section.title}\n`;
    
    if (section.data.length > 0) {
      const headers = section.headers || Object.keys(section.data[0]);
      const headerRow = headers.map(header => escapeCSVValue(header)).join(',');
      csvContent += headerRow + '\n';
      
      section.data.forEach(row => {
        const dataRow = headers.map(header => escapeCSVValue(row[header])).join(',');
        csvContent += dataRow + '\n';
      });
    }
  });
  
  const sanitizedFilename = sanitizeFilename(filename);
  downloadCSV(csvContent, sanitizedFilename);
}
