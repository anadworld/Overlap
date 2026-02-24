import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bookmark, LongWeekendOpportunity, Country } from '../types';

const STORAGE_KEY = 'overlap_bookmarks';

const bookmarkKey = (lw: LongWeekendOpportunity, year: number, countries: Country[]): string =>
  `${lw.startDate}_${lw.endDate}_${year}_${countries.map((c) => c.countryCode).sort().join(',')}`;

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const reload = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      setBookmarks(json ? JSON.parse(json) : []);
    } catch {
      setBookmarks([]);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const persist = useCallback(async (updated: Bookmark[]) => {
    setBookmarks(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const addBookmark = useCallback(
    async (
      lw: LongWeekendOpportunity,
      year: number,
      countries: Country[],
      countryNameMap: Record<string, string>
    ) => {
      const bookmark: Bookmark = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        savedAt: new Date().toISOString(),
        year,
        countries,
        lw,
        countryNameMap,
      };
      // Functional update to avoid stale-closure race condition
      setBookmarks((prev) => {
        const updated = [bookmark, ...prev];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const removeBookmark = useCallback(
    async (id: string) => {
      setBookmarks((prev) => {
        const updated = prev.filter((b) => b.id !== id);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const isBookmarked = useCallback(
    (lw: LongWeekendOpportunity, year: number, countries: Country[]): boolean =>
      bookmarks.some((b) => bookmarkKey(b.lw, b.year, b.countries) === bookmarkKey(lw, year, countries)),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    async (
      lw: LongWeekendOpportunity,
      year: number,
      countries: Country[],
      countryNameMap: Record<string, string>
    ) => {
      setBookmarks((prev) => {
        const key = bookmarkKey(lw, year, countries);
        const existing = prev.find((b) => bookmarkKey(b.lw, b.year, b.countries) === key);
        let updated: Bookmark[];
        if (existing) {
          updated = prev.filter((b) => b.id !== existing.id);
        } else {
          const bookmark: Bookmark = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            savedAt: new Date().toISOString(),
            year,
            countries,
            lw,
            countryNameMap,
          };
          updated = [bookmark, ...prev];
        }
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  return { bookmarks, reload, isBookmarked, toggleBookmark, removeBookmark };
}
