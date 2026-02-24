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
      const updated = [bookmark, ...bookmarks];
      await persist(updated);
    },
    [bookmarks, persist]
  );

  const removeBookmark = useCallback(
    async (id: string) => {
      await persist(bookmarks.filter((b) => b.id !== id));
    },
    [bookmarks, persist]
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
      const key = bookmarkKey(lw, year, countries);
      const existing = bookmarks.find((b) => bookmarkKey(b.lw, b.year, b.countries) === key);
      if (existing) {
        await removeBookmark(existing.id);
      } else {
        await addBookmark(lw, year, countries, countryNameMap);
      }
    },
    [bookmarks, addBookmark, removeBookmark]
  );

  return { bookmarks, reload, isBookmarked, toggleBookmark, removeBookmark };
}
