/** Lowercase, accent-free form used for case- and accent-insensitive search. */
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .trim();
}

/** Escapes user input for safe use inside a RegExp (prevents regex injection). */
export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
