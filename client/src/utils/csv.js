// Used by the sample-data service only; the API generates real exports
// (server/src/utils/csv.js has the same rules).

const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]|^\s|\s$/;
const UTF8_BOM = String.fromCharCode(0xfeff);

export function escapeCsvValue(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(rows, columns) {
  const lines = [columns.map((column) => escapeCsvValue(column.header)).join(',')];
  for (const row of rows) lines.push(columns.map((column) => escapeCsvValue(column.value(row))).join(','));
  return `${UTF8_BOM}${lines.join('\r\n')}\r\n`;
}
