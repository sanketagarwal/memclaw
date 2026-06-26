/**
 * Spreadsheet tools — read and analyze local .xlsx / .csv files with SheetJS.
 *
 * These are ordinary Mastra tools, so every call is captured as a span under the
 * agent run and shows up in Mastra Studio (timing, inputs, outputs). That's the
 * point: a real, observable skill.
 */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as XLSXNamespace from 'xlsx';

// `xlsx` is a CommonJS package; depending on the bundler/loader its API lands
// either on the namespace or under `.default`. Normalize so this works under
// tsx and Mastra's bundler alike.
const XLSX = ((XLSXNamespace as unknown as { default?: typeof XLSXNamespace }).default ??
  XLSXNamespace) as typeof XLSXNamespace;

type Row = Record<string, unknown>;

function loadSheet(path: string, sheetName?: string): { name: string; rows: Row[] } {
  const wb = XLSX.readFile(path, { cellDates: true });
  const name = sheetName ?? wb.SheetNames[0];
  const ws = wb.Sheets[name];
  if (!ws) {
    throw new Error(`Sheet "${name}" not found. Available: ${wb.SheetNames.join(', ')}`);
  }
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: null, raw: true });
  return { name, rows };
}

/** List the sheets in a workbook with their dimensions. */
export const sheetsListTool = createTool({
  id: 'spreadsheet-sheets',
  description:
    'List the sheets (tabs) in a local .xlsx or .csv file, with each sheet\'s row and column counts. Use this first to discover what a workbook contains.',
  inputSchema: z.object({
    path: z.string().describe('Absolute or relative path to the .xlsx/.csv file'),
  }),
  outputSchema: z.object({
    file: z.string(),
    sheets: z.array(z.object({ name: z.string(), rows: z.number(), columns: z.number() })),
  }),
  execute: async ({ path }) => {
    const wb = XLSX.readFile(path, { cellDates: true });
    const sheets = wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name];
      const ref = ws['!ref'];
      const range = ref ? XLSX.utils.decode_range(ref) : undefined;
      return {
        name,
        rows: range ? range.e.r - range.s.r + 1 : 0,
        columns: range ? range.e.c - range.s.c + 1 : 0,
      };
    });
    return { file: path, sheets };
  },
});

/** Read rows from a sheet (optionally a subset of columns), capped. */
export const sheetReadTool = createTool({
  id: 'spreadsheet-read',
  description:
    'Read rows from a sheet of a local .xlsx/.csv file as JSON objects keyed by the header row. Use to inspect actual data. Always capped by maxRows to protect the context window.',
  inputSchema: z.object({
    path: z.string().describe('Path to the .xlsx/.csv file'),
    sheet: z.string().optional().describe('Sheet name (defaults to the first sheet)'),
    columns: z
      .array(z.string())
      .optional()
      .describe('Only return these columns (by header name). Omit for all columns.'),
    maxRows: z.number().int().positive().max(1000).default(50),
  }),
  outputSchema: z.object({
    sheet: z.string(),
    columns: z.array(z.string()),
    totalRows: z.number(),
    returnedRows: z.number(),
    rows: z.array(z.record(z.string(), z.unknown())),
  }),
  execute: async ({ path, sheet, columns, maxRows }) => {
    const limit = maxRows ?? 50;
    const { name, rows } = loadSheet(path, sheet);
    const allColumns = rows.length ? Object.keys(rows[0]) : [];
    const picked = columns?.length ? columns : allColumns;
    const sliced = rows.slice(0, limit).map((r) => {
      if (!columns?.length) return r;
      const out: Row = {};
      for (const c of picked) out[c] = r[c] ?? null;
      return out;
    });
    return {
      sheet: name,
      columns: picked,
      totalRows: rows.length,
      returnedRows: sliced.length,
      rows: sliced,
    };
  },
});

/** Per-column summary statistics for a sheet. */
export const sheetSummaryTool = createTool({
  id: 'spreadsheet-summary',
  description:
    'Compute per-column summary statistics for a sheet: type, non-empty count, and for numeric columns min/max/mean/sum, or distinct counts for text columns. Use to analyze a dataset without reading every row.',
  inputSchema: z.object({
    path: z.string().describe('Path to the .xlsx/.csv file'),
    sheet: z.string().optional().describe('Sheet name (defaults to the first sheet)'),
  }),
  outputSchema: z.object({
    sheet: z.string(),
    rowCount: z.number(),
    columns: z.array(
      z.object({
        name: z.string(),
        type: z.enum(['number', 'text', 'mixed', 'empty']),
        nonEmpty: z.number(),
        min: z.number().nullable(),
        max: z.number().nullable(),
        mean: z.number().nullable(),
        sum: z.number().nullable(),
        distinct: z.number().nullable(),
        sample: z.array(z.string()),
      }),
    ),
  }),
  execute: async ({ path, sheet }) => {
    const { name, rows } = loadSheet(path, sheet);
    const colNames = rows.length ? Object.keys(rows[0]) : [];

    const columns = colNames.map((col) => {
      const values = rows.map((r) => r[col]).filter((v) => v !== null && v !== undefined && v !== '');
      const numbers = values.filter((v): v is number => typeof v === 'number');
      const isAllNumeric = values.length > 0 && numbers.length === values.length;
      const isSomeNumeric = numbers.length > 0 && numbers.length < values.length;

      const type: 'number' | 'text' | 'mixed' | 'empty' =
        values.length === 0 ? 'empty' : isAllNumeric ? 'number' : isSomeNumeric ? 'mixed' : 'text';

      const sum = numbers.length ? numbers.reduce((a, b) => a + b, 0) : null;
      const distinctVals = new Set(values.map((v) => String(v)));

      return {
        name: col,
        type,
        nonEmpty: values.length,
        min: numbers.length ? Math.min(...numbers) : null,
        max: numbers.length ? Math.max(...numbers) : null,
        mean: sum !== null && numbers.length ? Number((sum / numbers.length).toFixed(4)) : null,
        sum,
        distinct: type === 'number' ? null : distinctVals.size,
        sample: [...distinctVals].slice(0, 5),
      };
    });

    return { sheet: name, rowCount: rows.length, columns };
  },
});
