import { defineCapability } from '../types.ts';
import { sheetsListTool, sheetReadTool, sheetSummaryTool } from './tools.ts';

/**
 * Spreadsheet analysis — give memclaw the ability to read and analyze local
 * Excel/CSV files. A good example of a real, observable skill: every tool call
 * is traced in Mastra Studio.
 */
export const spreadsheetCapability = defineCapability({
  id: 'spreadsheet',
  name: 'Spreadsheet',
  description: 'Read and analyze local Excel (.xlsx) and CSV files: sheets, rows, and column stats.',
  version: '0.1.0',
  author: 'memclaw',
  tools: {
    spreadsheetSheets: sheetsListTool,
    spreadsheetRead: sheetReadTool,
    spreadsheetSummary: sheetSummaryTool,
  },
});
