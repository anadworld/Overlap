import { Bookmark } from '../types';

// Module-level singleton for passing a bookmark restore request between tabs
let _pending: Bookmark | null = null;

export const setPendingRestore = (bookmark: Bookmark): void => { _pending = bookmark; };
export const getPendingRestore = (): Bookmark | null => _pending;
export const clearPendingRestore = (): void => { _pending = null; };
