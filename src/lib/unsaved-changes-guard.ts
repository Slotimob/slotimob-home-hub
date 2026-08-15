import { useEffect } from 'react';

/**
 * Global "unsaved changes" guard.
 *
 * Pages with forms register while they hold unsaved data. While at least one
 * registration is active, destructive global actions (e.g. the PWA auto-reload)
 * must not happen.
 */
let activeCount = 0;
const listeners = new Set<(dirty: boolean) => void>();

const notify = () => {
  const dirty = activeCount > 0;
  listeners.forEach((l) => l(dirty));
};

export const hasUnsavedChanges = () => activeCount > 0;

export const registerUnsavedChanges = (): (() => void) => {
  activeCount += 1;
  notify();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeCount = Math.max(0, activeCount - 1);
    notify();
  };
};

export const subscribeUnsavedChanges = (listener: (dirty: boolean) => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Marks the current page as holding unsaved changes while `isDirty` is true.
 * Also enables the native beforeunload confirmation.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const release = registerUnsavedChanges();

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);

    return () => {
      release();
      window.removeEventListener('beforeunload', handler);
    };
  }, [isDirty]);
}
