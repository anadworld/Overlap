import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Country } from '../types';

const RECENT_KEY = 'recent_searches';
const MAX_RECENT = 2;

export interface RecentSearch {
  countries: Country[];
  timestamp: number;
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((data) => {
      if (data) setRecentSearches(JSON.parse(data));
    });
  }, []);

  const saveSearch = useCallback((countries: Country[]) => {
    if (countries.length === 0) return;
    setRecentSearches((prev) => {
      // Don't save if it's identical to the most recent search
      const codes = countries.map((c) => c.countryCode).sort().join(',');
      const isDuplicate = prev.some(
        (s) => s.countries.map((c) => c.countryCode).sort().join(',') === codes
      );
      if (isDuplicate) {
        // Move it to the top
        const filtered = prev.filter(
          (s) => s.countries.map((c) => c.countryCode).sort().join(',') !== codes
        );
        const next = [{ countries, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT);
        AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
        return next;
      }
      const next = [{ countries, timestamp: Date.now() }, ...prev].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { recentSearches, saveSearch };
}
