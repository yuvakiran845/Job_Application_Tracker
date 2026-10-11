// CSV per RFC 4180, safe to open in spreadsheet software.

// Spreadsheets run cells starting with these characters as formulas, so a value
// like "=HYPERLINK(...)" could execute when the export is opened (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]|^\s|\s$/;
const UTF8_BOM = String.fromCharCode(0xfeff);

export function escapeCsvValue(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * `columns` is a list of `{ header, value: (row) => any }`. Lines end with CRLF as
 * the RFC specifies; a UTF-8 byte-order mark lets Excel detect the encoding.
 */
export function toCsv(rows, columns) {
  const lines = [columns.map((column) => escapeCsvValue(column.header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvValue(column.value(row))).join(','));
  }
  return `${UTF8_BOM}${lines.join('\r\n')}\r\n`;
}
