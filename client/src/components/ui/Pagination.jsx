import { useId } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function Pagination({ page, pageCount, pageSize, pageSizes, total, rangeStart, rangeEnd, onPageChange, onPageSizeChange }) {
  const pageSizeId = useId();

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-slate-100 px-4 py-3 sm:px-5"
    >
      <p className="text-sm text-slate-600" aria-live="polite">
        Showing <span className="font-medium text-slate-900">{rangeStart}</span>–
        <span className="font-medium text-slate-900">{rangeEnd}</span> of{' '}
        <span className="font-medium text-slate-900">{total}</span>
      </p>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          <label htmlFor={pageSizeId} className="text-sm text-slate-600">
            Rows per page
          </label>
          <select
            id={pageSizeId}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-8 cursor-pointer rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 shadow-xs focus:border-brand-500 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            iconOnly
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <span className="min-w-20 text-center text-sm text-slate-600 tabular-nums">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="secondary"
            size="sm"
            iconOnly
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
