import { useState, useEffect } from 'react';

// ─── useUndo ──────────────────────────────────────────────────────────────────
// Provides a 5-second undo window after destructive actions.
// Instead of deleting immediately, callers stash removed items via startUndo()
// and pass a restore callback. On timeout the deletion becomes permanent;
// clicking "Vrati" in the toast calls restore() and cancels the timer.
//
// Returns:
//   undoInfo   — { label, restore, timeoutId } | null
//   startUndo  — (label: string, restore: () => void) => void
//   doUndo     — () => void
// ─────────────────────────────────────────────────────────────────────────────
export function useUndo() {
  const [undoInfo, setUndoInfo] = useState(null);

  // Clear the pending timer on unmount to prevent leaks.
  useEffect(() => {
    return () => {
      if (undoInfo && undoInfo.timeoutId) clearTimeout(undoInfo.timeoutId);
    };
  }, [undoInfo]);

  // If the user triggers two deletions quickly, the first one commits immediately
  // (its timer fires before the second call replaces it) and the second gets its
  // own 5-second window.
  const startUndo = (label, restore) => {
    setUndoInfo(prev => {
      if (prev && prev.timeoutId) clearTimeout(prev.timeoutId);
      const tid = setTimeout(() => setUndoInfo(null), 5000);
      return { label, restore, timeoutId: tid };
    });
  };

  const doUndo = () => {
    if (!undoInfo) return;
    clearTimeout(undoInfo.timeoutId);
    undoInfo.restore();
    setUndoInfo(null);
  };

  return { undoInfo, startUndo, doUndo };
}
