import { useState } from 'react';
import { PipelineColumn } from '../components/pipeline/PipelineColumn';
import { APPLICATION_STATUSES } from '../constants/applications';
import { useApplicationActions } from '../hooks/useApplicationActions';

/**
 * Kanban board: one column per status. Drag a card to another column to change its
 * status (saved optimistically and rolled back on failure), or use the status menu
 * on each card — the keyboard and touch alternative to dragging.
 */
export default function PipelinePage() {
  const { changeStatus } = useApplicationActions();
  const [dragging, setDragging] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  function endDrag() {
    setDragging(null);
    setDropTarget(null);
  }

  function handleDrop(status) {
    if (dragging) changeStatus(dragging, status);
    endDrag();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Drag a card to another column to change its status, or use the status menu on the card.
      </p>

      {/* The board scrolls sideways on its own, so the page itself never does. It is the
          positioning context (relative) so absolutely positioned bits inside cards — like
          screen-reader-only text — are clipped by it instead of widening the page. */}
      <div className="relative -mx-4 snap-x overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="flex items-start gap-3" onDragEnd={endDrag}>
          {APPLICATION_STATUSES.map((status) => (
            <PipelineColumn
              key={status.value}
              status={status}
              dragging={dragging}
              isDropTarget={dropTarget === status.value}
              onDragStart={setDragging}
              onDragEnd={endDrag}
              onDragOverColumn={setDropTarget}
              onDropOnColumn={handleDrop}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
