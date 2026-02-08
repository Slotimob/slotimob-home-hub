import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFormDraftOptions<T> {
  /** Unique key for the draft (e.g., 'edit-property-123' or 'edit-unit-456') */
  key: string;
  /** Initial data to use when no draft exists */
  initialData: T;
  /** Whether drafts are enabled (e.g., only when dialog is open) */
  enabled?: boolean;
  /** Debounce time in ms for saving (default: 500) */
  debounceMs?: number;
}

interface UseFormDraftReturn<T> {
  /** Current form data (from draft or initial) */
  data: T;
  /** Update form data (also saves to draft) */
  setData: (data: T | ((prev: T) => T)) => void;
  /** Clear the draft from storage */
  clearDraft: () => void;
  /** Whether a draft was restored */
  hasDraft: boolean;
  /** Discard draft and reset to initial data */
  discardDraft: () => void;
}

const DRAFT_PREFIX = 'form-draft-';
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface DraftEntry<T> {
  data: T;
  timestamp: number;
}

function getDraftKey(key: string): string {
  return `${DRAFT_PREFIX}${key}`;
}

/** Compare two objects for deep equality (simple JSON comparison) */
function isDataEqual<T>(a: T, b: T): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function loadDraft<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(getDraftKey(key));
    if (!stored) return null;

    const entry: DraftEntry<T> = JSON.parse(stored);
    
    // Check if draft has expired
    if (Date.now() - entry.timestamp > DRAFT_EXPIRY_MS) {
      localStorage.removeItem(getDraftKey(key));
      return null;
    }

    return entry.data;
  } catch (error) {
    console.warn('Failed to load draft:', error);
    return null;
  }
}

function saveDraft<T>(key: string, data: T): void {
  try {
    const entry: DraftEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(getDraftKey(key), JSON.stringify(entry));
  } catch (error) {
    console.warn('Failed to save draft:', error);
  }
}

function deleteDraft(key: string): void {
  try {
    localStorage.removeItem(getDraftKey(key));
  } catch (error) {
    console.warn('Failed to delete draft:', error);
  }
}

export function useFormDraft<T>({
  key,
  initialData,
  enabled = true,
  debounceMs = 500,
}: UseFormDraftOptions<T>): UseFormDraftReturn<T> {
  const [hasDraft, setHasDraft] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const initialDataRef = useRef(initialData);
  initialDataRef.current = initialData;

  // Initialize data - check for existing draft on mount
  const [data, setDataInternal] = useState<T>(() => {
    if (!enabled) return initialData;
    
    const draft = loadDraft<T>(key);
    if (draft) {
      return draft;
    }
    return initialData;
  });

  // Check for draft on key/enabled change
  useEffect(() => {
    if (!enabled) {
      setDataInternal(initialData);
      setHasDraft(false);
      isInitializedRef.current = false;
      return;
    }

    const draft = loadDraft<T>(key);
    if (draft) {
      // Only show hasDraft if the draft is actually different from initial data
      const isDifferent = !isDataEqual(draft, initialData);
      if (isDifferent) {
        setDataInternal(draft);
        setHasDraft(true);
      } else {
        // Draft is identical to initial data, silently discard it
        deleteDraft(key);
        setDataInternal(initialData);
        setHasDraft(false);
      }
    } else {
      setDataInternal(initialData);
      setHasDraft(false);
    }
    isInitializedRef.current = true;
  }, [key, enabled, JSON.stringify(initialData)]);

  // Debounced save function
  const saveDebounced = useCallback((newData: T) => {
    if (!enabled) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // Only save and show hasDraft if data is actually different from initial
      const isDifferent = !isDataEqual(newData, initialDataRef.current);
      if (isDifferent) {
        saveDraft(key, newData);
        setHasDraft(true);
      } else {
        // Data is back to initial state, clear the draft
        deleteDraft(key);
        setHasDraft(false);
      }
    }, debounceMs);
  }, [key, enabled, debounceMs]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Wrapper to update data and save draft
  const setData = useCallback((update: T | ((prev: T) => T)) => {
    setDataInternal((prev) => {
      const newData = typeof update === 'function' ? (update as (prev: T) => T)(prev) : update;
      saveDebounced(newData);
      return newData;
    });
  }, [saveDebounced]);

  // Clear draft from storage
  const clearDraft = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    deleteDraft(key);
    setHasDraft(false);
  }, [key]);

  // Discard draft and reset to initial
  const discardDraft = useCallback(() => {
    clearDraft();
    setDataInternal(initialData);
  }, [clearDraft, initialData]);

  return {
    data,
    setData,
    clearDraft,
    hasDraft,
    discardDraft,
  };
}

// Utility to clean up old drafts
export function cleanupExpiredDrafts(): void {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const entry = JSON.parse(stored);
            if (Date.now() - entry.timestamp > DRAFT_EXPIRY_MS) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to cleanup drafts:', error);
  }
}
